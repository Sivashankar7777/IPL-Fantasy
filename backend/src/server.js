import "dotenv/config";
import express from "express";
import http from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { getAuctionManager } from "./auctionManager.js";
import { registerSocketHandlers } from "./socketHandlers.js";
import { samplePlayers } from "./data/samplePlayers.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ipl-auction-backend" });
});

// support retention UI player list
app.get("/api/players", async (_req, res) => {
  try {
    // in this app sample players are static but may be seeded to DB
    const players = await prisma.player.findMany({ where: { status: "AVAILABLE" } });
    if (players?.length > 0) {
      return res.json(players);
    }
    return res.json(samplePlayers);
  } catch (error) {
    console.error("/api/players error", error);
    return res.json(samplePlayers);
  }
});

// retention lock endpoint (for frontend POST path)
app.post("/api/retain", async (req, res) => {
  const { roomCode, userId, selectedPlayers } = req.body;
  if (!roomCode || !userId || !Array.isArray(selectedPlayers) || selectedPlayers.length !== 2) {
    return res.status(400).json({ ok: false, error: "roomCode, userId, and exactly 2 selectedPlayers required" });
  }

  try {
    const manager = getAuctionManager(roomCode);
    const result = await manager.runAtomically(() => Promise.resolve(manager.lockRetention(userId, selectedPlayers)));
    // broadcast completion state
    io.to(roomCode).emit("retention_updated", result);
    io.to(roomCode).emit("room_state", manager.getPublicState());

    if (manager.allRetentionsLocked()) {
      manager.setAuctionPool(samplePlayers);
      const adminUserId = manager.state.users.find((u) => u.isAdmin)?.userId;
      if (adminUserId) {
        const nextLot = manager.startAuction(adminUserId);
        io.to(roomCode).emit("new_player", nextLot);
      }
    }

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("/api/retain error", error);
    return res.status(500).json({ ok: false, error: error.message || "Retention lock failed" });
  }
});

app.post("/api/admin/seed", async (_req, res, next) => {
  try {
    for (const player of samplePlayers) {
      await prisma.player.upsert({
        where: { id: `${player.name.toLowerCase().replace(/\s+/g, "-")}` },
        update: {
          name: player.name,
          role: player.role,
          country: player.country,
          countryType: player.countryType,
          basePrice: 50,
          matchesPlayed: player.matchesPlayed,
          rating: player.rating,
        },
        create: {
          id: `${player.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: player.name,
          role: player.role,
          country: player.country,
          countryType: player.countryType,
          basePrice: 50,
          matchesPlayed: player.matchesPlayed,
          rating: player.rating,
        },
      });
    }

    res.json({ ok: true, players: samplePlayers.length });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/replacements", async (req, res, next) => {
  try {
    const { injuredPlayerId, replacementPlayerId } = req.body;
    const injuredPlayer = await prisma.player.findUnique({ where: { id: injuredPlayerId } });
    if (!injuredPlayer) {
      return res.status(404).json({ ok: false, error: "Injured player not found." });
    }

    if (injuredPlayer.matchesPlayed !== 0) {
      return res.status(400).json({ ok: false, error: "Replacement is allowed only if matchesPlayed is 0." });
    }

    const replacement = await prisma.player.findUnique({ where: { id: replacementPlayerId } });
    if (!replacement) {
      return res.status(404).json({ ok: false, error: "Replacement player not found." });
    }

    res.json({
      ok: true,
      ruleValidated: true,
      injuredPlayerId,
      replacementPlayerId,
    });
  } catch (error) {
    next(error);
  }
});

registerSocketHandlers(io);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, error: error.message ?? "Internal server error" });
});

const port = Number(process.env.BACKEND_PORT ?? 4000);
server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
