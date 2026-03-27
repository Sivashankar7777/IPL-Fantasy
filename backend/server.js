import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { load as loadHtml } from 'cheerio';

dotenv.config({ path: new URL('./.env', import.meta.url) });

const FANTASY_ROOM_CODE = 'GLOBAL_DASHBOARD';
const FANTASY_TEAM_DEFINITIONS = [
  { code: 'CSK', displayName: 'Chennai Super Kings', shortName: 'CSK', primaryColor: '#F9CD05', secondaryColor: '#13418B' },
  { code: 'MI', displayName: 'Mumbai Indians', shortName: 'MI', primaryColor: '#004BA0', secondaryColor: '#D1AB3E' },
  { code: 'RCB', displayName: 'Royal Challengers Bengaluru', shortName: 'RCB', primaryColor: '#D11D1D', secondaryColor: '#1C1C1C' },
  { code: 'KKR', displayName: 'Kolkata Knight Riders', shortName: 'KKR', primaryColor: '#3A225D', secondaryColor: '#F2D159' },
  { code: 'SRH', displayName: 'Sunrisers Hyderabad', shortName: 'SRH', primaryColor: '#FF822A', secondaryColor: '#000000' },
  { code: 'RR', displayName: 'Rajasthan Royals', shortName: 'RR', primaryColor: '#EA1A85', secondaryColor: '#254AA5' },
  { code: 'DC', displayName: 'Delhi Capitals', shortName: 'DC', primaryColor: '#004C93', secondaryColor: '#EF1B23' },
  { code: 'PBKS', displayName: 'Punjab Kings', shortName: 'PBKS', primaryColor: '#ED1B24', secondaryColor: '#A7A9AC' },
  { code: 'LSG', displayName: 'Lucknow Super Giants', shortName: 'LSG', primaryColor: '#254AA5', secondaryColor: '#F9CD05' },
  { code: 'GT', displayName: 'Gujarat Titans', shortName: 'GT', primaryColor: '#1B2133', secondaryColor: '#B59E5D' },
];

function buildFallbackFantasyTeams() {
  return FANTASY_TEAM_DEFINITIONS.map((team, index) => ({
    id: `fallback-${team.code}`,
    roomId: FANTASY_ROOM_CODE,
    ownerUserId: null,
    ...team,
    totalDream11Points: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    owner: null,
    currentSquadPlayers: [],
    rank: index + 1,
  }));
}

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// Enable CORS so your Next.js frontend can connect
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize WebSockets
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.FRONTEND_URL || '*',
    methods: ["GET", "POST"],
    credentials: true
  }
});

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'cricbuzz-cricket.p.rapidapi.com';

function getEmptyFantasyPlayerStats() {
  return {
    runs: 0,
    fours: 0,
    sixes: 0,
    ballsFaced: 0,
    wickets: 0,
    maidens: 0,
    isBowler: false,
    catches: 0,
    stumpings: 0,
    runOutsDirect: 0,
    runOutsIndirect: 0,
    lbwBowled: 0,
  };
}

function creditFielder(parsedName, statKey, playerStatsMap) {
  if (!parsedName) return;

  const safeParsedName = parsedName.toLowerCase().replace(/^sub\s*\((.*?)\)$/, '$1').trim();

  let matchedKey = Object.keys(playerStatsMap).find((fullName) => {
    const safeFullName = fullName.toLowerCase();
    return safeFullName.includes(safeParsedName) || safeParsedName.includes(safeFullName);
  });

  if (!matchedKey) {
    matchedKey = parsedName;
    playerStatsMap[matchedKey] = getEmptyFantasyPlayerStats();
  }

  playerStatsMap[matchedKey][statKey] += 1;
}

function calculateDream11Points(stats) {
  let points = 0;

  points += stats.runs;
  points += stats.fours;
  points += stats.sixes * 2;

  if (stats.runs >= 100) points += 16;
  else if (stats.runs >= 50) points += 8;
  else if (stats.runs >= 30) points += 4;

  if (stats.runs === 0 && stats.ballsFaced > 0 && stats.isBowler === false) {
    points -= 2;
  }

  points += stats.wickets * 25;
  points += stats.maidens * 12;

  if (stats.wickets >= 5) points += 16;
  else if (stats.wickets >= 4) points += 8;
  else if (stats.wickets >= 3) points += 4;

  points += stats.lbwBowled * 8;
  points += stats.catches * 8;
  if (stats.catches >= 3) points += 4;
  points += stats.stumpings * 12;
  points += stats.runOutsDirect * 12;
  points += stats.runOutsIndirect * 6;

  return points;
}

function extractMatchIdFromScorecardUrl(scorecardUrl) {
  if (!scorecardUrl) return null;

  const patterns = [
    /\/(\d{4,})\/?(?:[#?].*)?$/,
    /live-cricket-scorecard\/(\d{4,})/i,
    /live-cricket-scores\/(\d{4,})/i,
    /match(?:es)?\/(\d{4,})/i,
    /mcenter\/v1\/(\d{4,})\/hscard/i,
  ];

  for (const pattern of patterns) {
    const match = scorecardUrl.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function normalizePlayerDisplayName(name = '') {
  return String(name)
    .replace(/\s*\((wk|c)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRunOutFielders(outString) {
  const match = outString.match(/^run out\s+\((.+?)\)/i);
  if (!match?.[1]) return [];

  return match[1]
    .split('/')
    .map((fielder) => fielder.trim())
    .filter(Boolean);
}

function applyDismissalFieldingPoints(outDescription, playerStatsMap) {
  const outString = String(outDescription || '').trim();
  const lower = outString.toLowerCase();

  try {
    if (lower.startsWith('c & b ')) {
      const match = outString.match(/^c\s*&\s*b\s+(.+)$/i);
      if (match?.[1]) {
        creditFielder(match[1].trim(), 'catches', playerStatsMap);
        creditFielder(match[1].trim(), 'lbwBowled', playerStatsMap);
      }
      return;
    }

    if (lower.startsWith('c ')) {
      const match = outString.match(/^c\s+(.+?)\s+b\s+/i);
      if (match?.[1]) creditFielder(match[1].trim(), 'catches', playerStatsMap);
      return;
    }

    if (lower.startsWith('st ')) {
      const match = outString.match(/^st\s+(.+?)\s+b\s+/i);
      if (match?.[1]) creditFielder(match[1].trim(), 'stumpings', playerStatsMap);
      return;
    }

    if (lower.startsWith('run out ')) {
      const fielders = parseRunOutFielders(outString);
      if (fielders.length === 1) {
        creditFielder(fielders[0], 'runOutsDirect', playerStatsMap);
      } else {
        fielders.forEach((fielder) => creditFielder(fielder, 'runOutsIndirect', playerStatsMap));
      }
    }
  } catch {}
}

function applyBowlerDismissalPoints(outDescription, playerStatsMap) {
  const outString = String(outDescription || '').trim();
  const lower = outString.toLowerCase();

  try {
    if (lower.startsWith('c & b ')) {
      const match = outString.match(/^c\s*&\s*b\s+(.+)$/i);
      if (match?.[1]) creditFielder(match[1].trim(), 'lbwBowled', playerStatsMap);
      return;
    }

    if (lower.includes('lbw b ')) {
      const match = outString.match(/lbw\s+b\s+(.+)$/i);
      if (match?.[1]) creditFielder(match[1].trim(), 'lbwBowled', playerStatsMap);
      return;
    }

    if (lower.startsWith('b ')) {
      const match = outString.match(/^b\s+(.+)$/i);
      if (match?.[1]) creditFielder(match[1].trim(), 'lbwBowled', playerStatsMap);
    }
  } catch {}
}

function extractScorecardStatsFromHtml(html) {
  const $ = loadHtml(html);
  const inningsSections = new Map();

  $('div[id^="scard-team-"]').each((_, element) => {
    const id = $(element).attr('id');
    if (id && !inningsSections.has(id)) {
      inningsSections.set(id, $(element));
    }
  });

  const playerStatsMap = {};

  for (const innings of inningsSections.values()) {
    const battingRows = innings.children().eq(0).find('.scorecard-bat-grid');
    battingRows.each((index, row) => {
      if (index === 0) return;

      const cells = $(row).children();
      const batterCell = cells.eq(0);
      const rawName = batterCell.find('a').first().text().trim();
      const name = normalizePlayerDisplayName(rawName);
      if (!name) return;

      if (!playerStatsMap[name]) playerStatsMap[name] = getEmptyFantasyPlayerStats();

      const outDescription = batterCell.find('div').last().text().trim();
      playerStatsMap[name].runs += Number(cells.eq(1).text().trim() || 0);
      playerStatsMap[name].fours += Number(cells.eq(3).text().trim() || 0);
      playerStatsMap[name].sixes += Number(cells.eq(4).text().trim() || 0);
      playerStatsMap[name].ballsFaced += Number(cells.eq(2).text().trim() || 0);

      applyDismissalFieldingPoints(outDescription, playerStatsMap);
      applyBowlerDismissalPoints(outDescription, playerStatsMap);
    });

    const bowlingRows = innings.children().eq(1).find('.scorecard-bowl-grid');
    bowlingRows.each((index, row) => {
      if (index === 0) return;

      const cells = $(row).children();
      const name = normalizePlayerDisplayName(cells.eq(0).text().trim());
      if (!name) return;

      if (!playerStatsMap[name]) playerStatsMap[name] = getEmptyFantasyPlayerStats();

      playerStatsMap[name].wickets += Number(cells.eq(4).text().trim() || 0);
      playerStatsMap[name].maidens += Number(cells.eq(2).text().trim() || 0);
      playerStatsMap[name].isBowler = true;
    });
  }

  return Object.entries(playerStatsMap).map(([name, stats]) => ({
    name,
    points: calculateDream11Points(stats),
  }));
}

async function recomputeFantasyTeamTotals() {
  const allTeams = await prisma.team.findMany({ include: { currentSquadPlayers: true } });
  for (const team of allTeams) {
    const totalPoints = team.currentSquadPlayers.reduce((sum, player) => sum + player.dream11Points, 0);
    await prisma.team.update({
      where: { id: team.id },
      data: { totalDream11Points: totalPoints },
    });
  }
}

async function applyFantasyPoints(pointsData) {
  let updatedCounter = 0;

  for (const data of pointsData) {
    const { name, points } = data;
    if (!name || points === undefined) continue;

    const result = await prisma.player.updateMany({
      where: { name: { contains: name.trim() } },
      data: { dream11Points: Number(points) },
    });

    if (result.count > 0) {
      updatedCounter += result.count;
    }
  }

  await recomputeFantasyTeamTotals();
  return updatedCounter;
}

async function ensureFantasyLeaderboardBaseData() {
  const room = await prisma.room.upsert({
    where: { code: FANTASY_ROOM_CODE },
    update: {},
    create: { code: FANTASY_ROOM_CODE },
  });

  const existingTeams = await prisma.team.findMany({
    where: { roomId: room.id },
    select: { code: true },
  });

  const existingCodes = new Set(existingTeams.map((team) => team.code));
  const missingTeams = FANTASY_TEAM_DEFINITIONS.filter((team) => !existingCodes.has(team.code));

  if (missingTeams.length === 0) {
    return;
  }

  await prisma.team.createMany({
    data: missingTeams.map((team) => ({
      ...team,
      roomId: room.id,
    })),
  });

  console.log(`Initialized ${missingTeams.length} fantasy leaderboard teams in Neon.`);
}

function parseUploadedPrice(rawPrice) {
  if (!rawPrice) return undefined;
  const num = parseInt(String(rawPrice).replace(/[^0-9]/g, ''));
  return Number.isNaN(num) || num <= 0 ? undefined : num;
}

async function upsertFantasyPlayerFromUpload({ playerName, teamId, soldPrice }) {
  const normalizedName = playerName.trim().toLowerCase();
  const candidatePlayers = await prisma.player.findMany({
    where: {
      name: {
        contains: playerName.trim(),
      },
    },
    take: 25,
  });

  const exactPlayer =
    candidatePlayers.find((player) => player.name.trim().toLowerCase() === normalizedName) ||
    candidatePlayers[0];

  const updatePayload = {
    status: 'SOLD',
    currentTeamId: teamId,
    soldPrice: soldPrice ?? null,
  };

  if (exactPlayer) {
    await prisma.player.update({
      where: { id: exactPlayer.id },
      data: updatePayload,
    });
    return { created: false };
  }

  await prisma.player.create({
    data: {
      name: playerName,
      role: 'Unknown',
      country: 'India',
      countryType: 'INDIAN',
      basePrice: soldPrice ?? 50,
      soldPrice: soldPrice ?? null,
      status: 'SOLD',
      currentTeamId: teamId,
    },
  });

  return { created: true };
}

// A simple health check route for the home page
app.get('/', (req, res) => {
  res.send('🏏 IPL Auction API is up and running!');
});

// ==========================================
// REST APIs (For Lobby & Retention Phase)
// ==========================================

// 1. Fetch all available players for the Retention Screen
// Get available lots
app.get('/api/lots', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      select: { lot: true },
      where: { status: 'AVAILABLE', lot: { not: null } }
    });
    const lots = [...new Set(players.map(p => p.lot))].filter(Boolean);
    res.json(lots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { status: 'AVAILABLE' }
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// 1.5 Fetch player image (Actual Photo) via iplt20 / Wikipedia / DuckDuckGo Scraping
let playerImageMap = {};
try {
  playerImageMap = JSON.parse(fs.readFileSync('./playerImageMap.json', 'utf8'));
} catch (e) {
  console.log("No playerImageMap.json found, will rely on fallbacks");
}

app.get('/api/player-image', async (req, res) => {
  const name = req.query.name || 'Unknown';
  try {
    // Attempt 1: Official IPL Website Mapping
    if (playerImageMap[name] && !playerImageMap[name].includes("Default-Men.png")) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.redirect(playerImageMap[name]);
    }

    const apiFetch = global.fetch; // using native fetch
    
    // Attempt 2: Wikipedia API (High Quality Headshots)
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=300`;
    const wikiRes = await apiFetch(wikiUrl);
    const wikiData = await wikiRes.json();
    const pages = wikiData.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId !== "-1" && pages[pageId].thumbnail) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.redirect(pages[pageId].thumbnail.source);
      }
    }

    // Attempt 3: DuckDuckGo HTML Search Scrape (Google Alternative)
    const ddgRes = await apiFetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(name + " ipl")}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    const html = await ddgRes.text();
    const match = html.match(/src="(\/\/external-content\.duckduckgo\.com\/iu\/\?u=[^"]+)"/);
    if (match) {
      let imageUrl = match[1];
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.redirect(imageUrl);
    }
  } catch (err) {
    console.error("Player Image Error for", name, ":", err.message);
  }

  // Attempt 4: Fallback Avatar
  res.redirect(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&rounded=true&bold=true&size=128`);
});

// 2. Lock in Retention (1 Indian, 1 Overseas)
app.post('/api/retain', async (req, res) => {
  const { roomCode, teamId, indianPlayerId, overseasPlayerId } = req.body;

  try {
    const auctionState = rooms.get(roomCode);
    if (!auctionState) return res.status(404).json({ error: "Room not found" });

    // In-memory team update
    let updatedTeam = auctionState.teams.find(t => t.teamId === teamId);
    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }
    updatedTeam.budget -= 100;
    updatedTeam.totalPlayers += 2;
    updatedTeam.overseasPlayers += 1;

    // Prisma player update
    const indPlayer = await prisma.player.update({
      where: { id: indianPlayerId },
      data: { status: 'RETAINED', isRetained: true }
    });

    const osPlayer = await prisma.player.update({
      where: { id: overseasPlayerId },
      data: { status: 'RETAINED', isRetained: true }
    });

    updatedTeam.players.push({ name: indPlayer.name, role: indPlayer.role, price: 50 });
    updatedTeam.players.push({ name: osPlayer.name, role: osPlayer.role, price: 50 });

    io.to(roomCode).emit('room_state', auctionState);

    res.json({ success: true, team: updatedTeam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process retention." });
  }
});

// ==========================================
// IN-MEMORY MULTI-ROOM STATE
// ==========================================
const rooms = new Map(); // roomCode -> auctionState
const socketToRoom = new Map(); // socket.id -> roomCode

const createRoomState = () => ({
  phase: 'LOBBY', // LOBBY, RANDOMIZING, RETENTION, ACTIVE, PAUSED, COMPLETED
  users: [],      // Array to hold connected franchise owners
  teams: [],      // Array to hold the generated teams
  currentPlayer: null,
  currentBid: 0,
  highestBidderId: null, // teamId
  timeLeft: 15,
  timerInterval: null,
  marqueePlayer: null
});

// ==========================================
// WEBSOCKETS (Live Auction Engine Setup)
// ==========================================

// ------------------------------------------------------------------
// EXCEL UPLOAD API
// ------------------------------------------------------------------
const upload = multer({ dest: 'uploads/' });
app.post('/api/players/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    // Delete existing available/unsold players to refresh the draft pool
    await prisma.player.deleteMany({
      where: { status: { in: ['AVAILABLE', 'UNSOLD'] } }
    });

    const playersToInsert = rawData.map(row => {
      const name = row['Name'] || row['Player Name'] || row['Player'] || 'Unknown';
      const role = row['Role'] || row['Type'] || row['Speciality'] || 'Batsman';
      const country = row['Country'] || row['Nation'] || 'India';
      const lot = String(row['Lot'] || row['Set'] || 'Uncategorized');
      
      let basePrice = 50;
      if (row['Base Price']) basePrice = parseInt(String(row['Base Price']).replace(/[^0-9]/g, '')) || 50;

      const countryType = country.toLowerCase() === 'india' ? 'INDIAN' : 'FOREIGN';

      return {
        name,
        role,
        country,
        countryType,
        basePrice,
        lot,
        status: 'AVAILABLE'
      };
    });

    await prisma.player.createMany({
      data: playersToInsert
    });

    fs.unlinkSync(req.file.path);
    
    // Extract unique lots
    const allLots = [...new Set(playersToInsert.map(p => p.lot))];

    res.status(200).json({ 
      success: true, 
      count: playersToInsert.length,
      lots: allLots
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message ? error.message : String(error) });
  }
});

// ------------------------------------------------------------------
// FANTASY DASHBOARD APIS
// ------------------------------------------------------------------
app.post('/api/fantasy/upload-squads', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    await ensureFantasyLeaderboardBaseData();

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    // Get all teams from DB to map team codes
    const allTeams = await prisma.team.findMany();
    const teamMap = {}; // Maps "Chennai Super Kings" or "CSK" to "teamId"
    allTeams.forEach(t => {
      teamMap[t.displayName.toLowerCase()] = t.id;
      teamMap[t.code.toLowerCase()] = t.id;
    });

    let mappedCount = 0;
    let createdCount = 0;
    const debugRows = [];
    const failedRows = [];

    // Loop through EVERY sheet in the workbook (e.g. "Eshwar - CSK", "Hari - DC")
    for (const sheetName of workbook.SheetNames) {
      const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (debugRows.length < 2 && rawData.length > 0) debugRows.push(rawData[0]);
      
      // Determine the Franchise from the Sheet Name! (e.g. "Siva - KKR" -> "kkr")
      const lowerSheetName = sheetName.toLowerCase();
      let teamId = teamMap[lowerSheetName];
      if (!teamId) {
        const fuzzyTeam = allTeams.find(t => 
           lowerSheetName.includes(t.code.toLowerCase()) || 
           lowerSheetName.includes(t.displayName.toLowerCase().split(' ')[0]) ||
           (lowerSheetName.includes('pk') && t.code === 'PBKS')
        );
        if (fuzzyTeam) teamId = fuzzyTeam.id;
      }

      // If we couldn't figure out which team this sheet belongs to, skip it
      if (!teamId) {
         failedRows.push(`Could not identify franchise for Sheet Tab: ${sheetName}`);
         continue;
      }

      // Try capturing the owner name from the sheet tab (e.g "Eshwar - CSK")
      const dashSplit = sheetName.split('-');
      if (dashSplit.length > 1) {
         const ownerName = dashSplit[0].trim();
         await prisma.team.update({
           where: { id: teamId },
           data: { displayName: ownerName }
         });
      }

      for (const row of rawData) {
        // Find the player column (could be "Player", "Player Name", or just the second column)
        const playerName = String(row['Player'] || row['Player Name'] || row['Name'] || Object.values(row)[1] || Object.values(row)[0] || '').trim();

        if (playerName && playerName !== 'undefined') {
          const rawPrice = row['Price'] || row['Sold For'] || row['Final Price'] || row['Base Price'] || '';
          const parsedPrice = parseUploadedPrice(rawPrice);

          try {
            const result = await upsertFantasyPlayerFromUpload({
              playerName,
              teamId,
              soldPrice: parsedPrice,
            });
            mappedCount++;
            if (result.created) createdCount++;
          } catch (error) {
            failedRows.push(`Failed to import ${playerName} (Sheet: ${sheetName}): ${error.message || String(error)}`);
          }
        }
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ 
       success: true, 
       mappedPlayers: mappedCount,
       createdPlayers: createdCount,
       debug: debugRows,
       failed: failedRows.slice(0, 15) // Send up to 15 failures for inspection
    });
  } catch (error) {
    console.error("Squad Upload Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post('/api/fantasy/reset-squads', async (req, res) => {
  try {
    // Reset all player assignments, points, and prices completely
    await prisma.player.updateMany({
      data: { 
        dream11Points: 0,
        currentTeamId: null,
        status: 'AVAILABLE',
        soldPrice: null,
        isRetained: false
      }
    });
    // Reset all team totals
    await prisma.team.updateMany({
      data: { totalDream11Points: 0 }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/fantasy/sync-points', async (req, res) => {
  try {
    const expectedSecret = process.env.GOOGLE_APPS_SCRIPT_SYNC_SECRET;
    const providedSecret = req.body?.secret;

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized sync request' });
    }

    // Expected payload: [ { name: "MS Dhoni", points: 85 }, { name: "Sanju Samson", points: 104 } ]
    const { pointsData } = req.body;
    if (!Array.isArray(pointsData)) return res.status(400).json({ error: 'Invalid payload' });

    const updatedCounter = await applyFantasyPoints(pointsData);

    res.json({ success: true, updatedPlayers: updatedCounter });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Points sync failed' });
  }
});

app.post('/api/fantasy/scorecard-sync', async (req, res) => {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const { scorecardUrl } = req.body ?? {};

  const matchId = extractMatchIdFromScorecardUrl(scorecardUrl);
  if (!matchId) {
    return res.status(400).json({ error: 'Could not extract a Cricbuzz match ID from the scorecard link.' });
  }

  try {
    let pointsData = [];
    let source = 'cricbuzz-page';

    try {
      const response = await fetch(scorecardUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      const html = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to fetch scorecard page (${response.status})`);
      }
      pointsData = extractScorecardStatsFromHtml(html);
    } catch (pageError) {
      if (!rapidApiKey) {
        throw pageError;
      }

      const statsUrl = `https://${RAPIDAPI_HOST}/mcenter/v1/${matchId}/hscard`;
      const response = await fetch(statsUrl, {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
          'Content-Type': 'application/json',
        },
      });

      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(rawText || 'Failed to fetch scorecard from Cricbuzz.');
      }

      const matchStatsData = JSON.parse(rawText);
      const playerStatsMap = {};

      for (const innings of matchStatsData.scoreCard ?? []) {
        for (const batter of Object.values(innings.batTeamDetails?.batsmenData ?? {})) {
          const name = normalizePlayerDisplayName(batter.batName);
          if (!name) continue;

          if (!playerStatsMap[name]) playerStatsMap[name] = getEmptyFantasyPlayerStats();

          playerStatsMap[name].runs += Number(batter.runs || 0);
          playerStatsMap[name].fours += Number(batter.fours || 0);
          playerStatsMap[name].sixes += Number(batter.sixes || 0);
          playerStatsMap[name].ballsFaced += Number(batter.balls || 0);

          applyDismissalFieldingPoints(batter.outDesc, playerStatsMap);
          applyBowlerDismissalPoints(batter.outDesc, playerStatsMap);
        }

        for (const bowler of Object.values(innings.bowlTeamDetails?.bowlersData ?? {})) {
          const name = normalizePlayerDisplayName(bowler.bowlName);
          if (!name) continue;

          if (!playerStatsMap[name]) playerStatsMap[name] = getEmptyFantasyPlayerStats();

          playerStatsMap[name].wickets += Number(bowler.wickets || 0);
          playerStatsMap[name].maidens += Number(bowler.maidens || 0);
          playerStatsMap[name].isBowler = true;
        }
      }

      pointsData = Object.entries(playerStatsMap).map(([name, stats]) => ({
        name,
        points: calculateDream11Points(stats),
      }));
      source = 'rapidapi';
    }

    if (pointsData.length === 0) {
      return res.status(422).json({
        error: 'No player stats could be parsed from that Cricbuzz scorecard.',
      });
    }

    const updatedPlayers = await applyFantasyPoints(pointsData);

    return res.json({
      success: true,
      matchId,
      source,
      calculatedPlayers: pointsData.length,
      updatedPlayers,
    });
  } catch (error) {
    console.error('Scorecard sync failed:', error);
    return res.status(500).json({
      error: 'Failed to sync fantasy points from scorecard link.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/fantasy/live-sync', async (req, res) => {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_SYNC_URL;
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SYNC_SECRET;

  if (!scriptUrl) {
    return res.status(500).json({
      error: 'GOOGLE_APPS_SCRIPT_SYNC_URL is not configured on the backend.',
    });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_live_points',
        secret: scriptSecret || undefined,
      }),
    });

    const rawText = await response.text();
    let data;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Apps Script trigger failed.',
        details: data,
      });
    }

    return res.json({
      success: true,
      message: 'Live sync triggered successfully.',
      scriptResponse: data,
    });
  } catch (error) {
    console.error('Live sync trigger failed:', error);
    return res.status(500).json({
      error: 'Failed to trigger Google Apps Script sync.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/fantasy/leaderboard', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
         currentSquadPlayers: {
            orderBy: { dream11Points: 'desc' }
         },
         owner: true
      },
      orderBy: { totalDream11Points: 'desc' }
    });
    res.json(teams);
  } catch (error) {
    console.error('Leaderboard fetch failed, serving fallback teams:', error);
    res.json(buildFallbackFantasyTeams());
  }
});


io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // ==========================================
  // LOBBY & RANDOMIZER EVENTS
  // ==========================================

  // 1. User joins the lobby using a room code
  socket.on('join_room', (payload, callback) => {
    const { username, roomCode, role } = payload;
    if (!username || !roomCode) {
      if (callback) callback({ error: "Username and Room Code required!" });
      return;
    }
    
    // Join the Socket.io room
    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);

    // Initialize the room if it doesn't exist
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, createRoomState());
    }
    const auctionState = rooms.get(roomCode);

    // Generate a unique ID for the user
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = { 
      userId, 
      username, 
      role: role || 'PLAYER',
      socketId: socket.id, 
      assignedTeamId: null, 
      retentionLocked: false 
    };
    
    auctionState.users.push(newUser);
    
    // Acknowledge the request so the Next.js await Promise resolves
    if (callback) callback({ ok: true, userId });
    
    // Broadcast the updated user list to everyone in THIS room
    io.to(roomCode).emit('room_state', auctionState);
  });

  // 2. Admin triggers the team assignment
  socket.on('trigger_randomizer', (payload, callback) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const auctionState = rooms.get(roomCode);
    if (!auctionState || auctionState.phase !== 'LOBBY') return;
    
    auctionState.phase = 'RANDOMIZING';
    if (callback) callback({ ok: true });

    // Broadcast to start the Framer Motion spinning animation
    io.to(roomCode).emit('start_randomizer_animation');

    // Wait exactly 5 seconds, then calculate and broadcast results
    setTimeout(() => {
      const TEAM_NAMES = [
        "Chennai Super Kings", "Delhi Capitals", "Gujarat Titans", 
        "Kolkata Knight Riders", "Lucknow Super Giants", "Mumbai Indians", 
        "Punjab Kings", "Rajasthan Royals", "Royal Challengers Bengaluru", 
        "Sunrisers Hyderabad"
      ];
      
      // Shuffle the teams randomly
      const shuffledTeams = TEAM_NAMES.sort(() => 0.5 - Math.random());
      
      // Assign teams to the users
      const assignments = auctionState.users.map((user, index) => {
        const teamId = `team_${index}`; 
        const newTeam = { 
          teamId, 
          name: shuffledTeams[index], 
          budget: 1000, 
          totalPlayers: 0, 
          overseasPlayers: 0,
          players: []
        };
        
        user.assignedTeamId = teamId;
        auctionState.teams.push(newTeam);
        
        return { userId: user.userId, team: newTeam };
      });

      auctionState.phase = 'RETENTION';
      
      io.to(roomCode).emit('teams_assigned', { assignments });
      io.to(roomCode).emit('room_state', auctionState); 
    }, 5000); 
  });

  // ==========================================
  // LIVE AUCTION EVENTS
  // ==========================================

  // 3. ADMIN COMMAND: Fetch Next Player & Start Bidding
  socket.on('admin_next_player', async (payload, callback) => {
    const { selectedLot } = payload || {};
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) {
      if (callback) callback({ error: "No room code" });
      return;
    }
    const auctionState = rooms.get(roomCode);
    if (!auctionState) {
      if (callback) callback({ error: "No room state" });
      return;
    }

    try {
      const whereClause = { status: 'AVAILABLE' };
      if (selectedLot && selectedLot !== 'All') {
        whereClause.lot = String(selectedLot);
      }

      // NOTE: For true multi-room independence with shared DB, players should actually be tracked exclusively IN MEMORY.
      // But we proceed exactly with Prisma tracking for simplicity in this iteration.
      const remainingCount = await prisma.player.count({ where: whereClause });
      
      if (remainingCount === 0) {
        clearInterval(auctionState.timerInterval);
        
        const marqueePlayer = await prisma.player.findFirst({
           where: { status: 'SOLD' },
           orderBy: { soldPrice: 'desc' }
        });

        auctionState.phase = 'COMPLETED';
        auctionState.marqueePlayer = marqueePlayer;
        auctionState.currentPlayer = null;
        auctionState.currentBid = 0;
        auctionState.highestBidderId = null;
        
        io.to(roomCode).emit('auction_finished', { message: 'All players have been auctioned!' });
        io.to(roomCode).emit('room_state', auctionState);
        if (callback) callback({ ok: true });
        return;
      }

      const nextPlayer = await prisma.player.findFirst({
        where: whereClause
      });

      if (!nextPlayer) {
        io.to(roomCode).emit('auction_finished', { message: 'All players have been auctioned!' });
        if (callback) callback({ ok: true });
        return;
      }

      const availablePlayers = await prisma.player.findMany({
        where: { ...whereClause, id: { not: nextPlayer.id } }
      });

      clearInterval(auctionState.timerInterval);
      auctionState.phase = 'ACTIVE';
      auctionState.currentPlayer = nextPlayer;
      auctionState.currentBid = 0; 
      auctionState.highestBidderId = null;
      auctionState.timeLeft = 15;
      auctionState.availablePlayers = availablePlayers;
      
      io.to(roomCode).emit('new_player', {
        phase: auctionState.phase,
        player: auctionState.currentPlayer,
        currentBid: auctionState.currentBid,
        highestBidderUserId: null,
        timeRemaining: auctionState.timeLeft,
        availablePlayers: auctionState.availablePlayers
      });
      io.to(roomCode).emit('room_state', auctionState);
      if (callback) callback({ ok: true });

    } catch (error) {
      console.error("Error fetching next player:", error);
    }
  });

  // Admin select specific player
  socket.on('admin_select_player', async (payload, callback) => {
    const { roomCode, userId, playerId } = payload;
    const auctionState = rooms.get(roomCode);
    if (!auctionState) return;

    try {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player) return;

      const availablePlayers = await prisma.player.findMany({
        where: { status: 'AVAILABLE', id: { not: playerId } }
      });

      clearInterval(auctionState.timerInterval);
      auctionState.phase = 'ACTIVE';
      auctionState.currentPlayer = player;
      auctionState.currentBid = 0; 
      auctionState.highestBidderId = null;
      auctionState.timeLeft = 15;
      auctionState.availablePlayers = availablePlayers;
      
      io.to(roomCode).emit('new_player', {
        phase: auctionState.phase,
        player: auctionState.currentPlayer,
        currentBid: auctionState.currentBid,
        highestBidderUserId: null,
        timeRemaining: auctionState.timeLeft,
        availablePlayers: auctionState.availablePlayers
      });
      io.to(roomCode).emit('room_state', auctionState);
      if (callback) callback({ ok: true });
    } catch (e) {
      console.error(e);
    }
  });

  // Admin Pause
  socket.on('admin_pause', (payload, callback) => {
    const { roomCode } = payload;
    const auctionState = rooms.get(roomCode);
    if (!auctionState) return;
    clearInterval(auctionState.timerInterval);
    auctionState.phase = 'PAUSED';
    io.to(roomCode).emit('room_state', auctionState);
    if (callback) callback({ ok: true });
  });

  // Admin Resume
  socket.on('admin_resume', (payload, callback) => {
    const { roomCode } = payload;
    const auctionState = rooms.get(roomCode);
    if (!auctionState || auctionState.phase !== 'PAUSED' || !auctionState.currentPlayer) return;
    
    auctionState.phase = 'ACTIVE';
    io.to(roomCode).emit('room_state', auctionState);
    
    // Start the clock ticking exactly like place_bid did
    auctionState.timerInterval = setInterval(async () => {
      auctionState.timeLeft--;
      io.to(roomCode).emit('timer_tick', { timeRemaining: auctionState.timeLeft });

      if (auctionState.timeLeft <= 0) {
        clearInterval(auctionState.timerInterval);
        auctionState.phase = 'PAUSED';

        if (auctionState.highestBidderId) {
          try {
            const winningTeam = auctionState.teams.find(t => t.teamId === auctionState.highestBidderId);
            if (winningTeam) {
              winningTeam.budget -= auctionState.currentBid;
              winningTeam.totalPlayers += 1;
              winningTeam.players.push({
                 name: auctionState.currentPlayer.name,
                 role: auctionState.currentPlayer.role,
                 price: auctionState.currentBid
              });
              if (auctionState.currentPlayer.countryType === 'FOREIGN') {
                winningTeam.overseasPlayers += 1;
              }
            }

            await prisma.player.update({
              where: { id: auctionState.currentPlayer.id },
              data: { status: 'SOLD', soldPrice: auctionState.currentBid }
            });

            io.to(roomCode).emit('player_sold', {
              player: auctionState.currentPlayer.name,
              team: winningTeam,
              amount: auctionState.currentBid
            });
            io.to(roomCode).emit('room_state', auctionState);
          } catch (error) {
            console.error("DB Error selling player:", error);
          }
        } else {
          io.to(roomCode).emit('player_unsold', { player: auctionState.currentPlayer.name });
          io.to(roomCode).emit('room_state', auctionState);
        }
      }
    }, 1000);

    if (callback) callback({ ok: true });
  });

  // Admin Stop
  socket.on('admin_stop', async (payload, callback) => {
    const { roomCode } = payload;
    const auctionState = rooms.get(roomCode);
    if (!auctionState) return;
    clearInterval(auctionState.timerInterval);
    
    const marqueePlayer = await prisma.player.findFirst({
        where: { status: 'SOLD' },
        orderBy: { soldPrice: 'desc' }
    });

    auctionState.phase = 'COMPLETED';
    auctionState.marqueePlayer = marqueePlayer;
    auctionState.currentPlayer = null;
    auctionState.currentBid = 0;
    auctionState.highestBidderId = null;
    
    io.to(roomCode).emit('auction_finished', { message: 'Auction manually stopped.' });
    io.to(roomCode).emit('room_state', auctionState);
    if (callback) callback({ ok: true });
  });

  // 4. CORE LOGIC: Handle Live Bids
  socket.on('place_bid', async (payload, callback) => {
    const { teamId, amount } = payload;
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) {
       if (callback) callback({ error: "Room not found" });
       return;
    }
    const auctionState = rooms.get(roomCode);
    if (!auctionState) return;

    if (auctionState.phase !== 'ACTIVE') return;
    if (amount <= auctionState.currentBid) {
      socket.emit('bid_failed', { message: 'Bid too low. Someone beat you to it!' });
      if (callback) return callback({ error: 'Bid too low.' });
      return;
    }
    if (teamId === auctionState.highestBidderId) {
      socket.emit('bid_failed', { message: 'You already hold the highest bid.' });
      if (callback) return callback({ error: 'You hold highest bid.' });
      return;
    }

    const team = auctionState.teams.find(t => t.teamId === teamId);
    if (!team) {
       if (callback) return callback({ error: 'Team not found.' });
       return;
    }

    if (team.budget < amount) {
       socket.emit('bid_failed', { message: 'Insufficient budget!' });
       if (callback) return callback({ error: 'Insufficient budget!' });
       return;
    }
    if (team.totalPlayers >= 15) {
       socket.emit('bid_failed', { message: 'Squad full (15/15)!' });
       if (callback) return callback({ error: 'Squad full!' });
       return;
    }
    if (auctionState.currentPlayer.countryType === 'FOREIGN' && team.overseasPlayers >= 6) {
       socket.emit('bid_failed', { message: 'Foreigner limit reached (6/6)!' });
       if (callback) return callback({ error: 'Foreigner limit reached!' });
       return;
    }

    auctionState.currentBid = amount;
    auctionState.highestBidderId = teamId;
    auctionState.timeLeft = 15; // Reset the clock

    io.to(roomCode).emit('bid_updated', {
      player: auctionState.currentPlayer, 
      currentBid: auctionState.currentBid,
      highestBidderUserId: auctionState.highestBidderId,
      timeRemaining: auctionState.timeLeft,
      teams: auctionState.teams 
    });

    if (callback) callback({ ok: true });

    clearInterval(auctionState.timerInterval);
    auctionState.timerInterval = setInterval(async () => {
      auctionState.timeLeft--;
      io.to(roomCode).emit('timer_tick', { timeRemaining: auctionState.timeLeft });

      // HAMMER FALLS
      if (auctionState.timeLeft <= 0) {
        clearInterval(auctionState.timerInterval);
        auctionState.phase = 'PAUSED';

        if (auctionState.highestBidderId) {
          try {
            const winningTeam = auctionState.teams.find(t => t.teamId === auctionState.highestBidderId);
            if (winningTeam) {
              winningTeam.budget -= auctionState.currentBid;
              winningTeam.totalPlayers += 1;
              winningTeam.players.push({
                 name: auctionState.currentPlayer.name,
                 role: auctionState.currentPlayer.role,
                 price: auctionState.currentBid
              });
              if (auctionState.currentPlayer.countryType === 'FOREIGN') {
                winningTeam.overseasPlayers += 1;
              }
            }

            await prisma.player.update({
              where: { id: auctionState.currentPlayer.id },
              data: { status: 'SOLD', soldPrice: auctionState.currentBid }
            });

            io.to(roomCode).emit('player_sold', {
              player: auctionState.currentPlayer.name,
              team: winningTeam,
              amount: auctionState.currentBid
            });
          } catch (error) {
            console.error("DB Error selling player:", error);
          }
        } else {
          io.to(roomCode).emit('player_unsold', { player: auctionState.currentPlayer.name });
        }
      }
    }, 1000); 
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      socketToRoom.delete(socket.id);
      // NOTE: We could remove them from auctionState.users here, but keeping them logic for reconnections isn't bad for now.
    }
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await ensureFantasyLeaderboardBaseData();
  } catch (error) {
    console.error('Fantasy leaderboard bootstrap skipped:', error);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 IPL Auction Engine running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start IPL Auction Engine:', error);
  process.exit(1);
});
