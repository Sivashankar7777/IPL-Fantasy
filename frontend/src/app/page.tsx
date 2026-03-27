"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { Users, Dices, Trophy, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

const TEAM_NAMES = [
  "Chennai Super Kings", "Delhi Capitals", "Gujarat Titans", 
  "Kolkata Knight Riders", "Lucknow Super Giants", "Mumbai Indians", 
  "Punjab Kings", "Rajasthan Royals", "Royal Challengers Bengaluru", 
  "Sunrisers Hyderabad"
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function AuctionLobby() {
  const { isConnected, state, emitWithAck } = useSocket();
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAllSquads, setShowAllSquads] = useState(false);

  // Retention State
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedIndian, setSelectedIndian] = useState<string | null>(null);
  const [selectedOverseas, setSelectedOverseas] = useState<string | null>(null);
  const [retentionLocked, setRetentionLocked] = useState(false);

  // Excel Upload & Lots State
  const [lots, setLots] = useState<string[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("All");

  useEffect(() => {
    if (state?.phase === "ACTIVE" || state?.phase === "PAUSED") {
      fetch(`${BACKEND_URL}/api/lots`)
        .then(res => res.json())
        .then(data => setLots(data))
        .catch(console.error);
    }
  }, [state?.phase]);

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/players/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (data.success) {
        alert(`Successfully imported ${data.count} players across ${data.lots.length} lots!`);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Upload failed.");
    }
  };

  // Fetch players when entering RETENTION phase safely
  useEffect(() => {
    if (state?.phase === "RETENTION" && players.length === 0) {
      fetch(`${BACKEND_URL}/api/players`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPlayers(data);
          } else {
            console.error("Backend did not return an array of players:", data);
            setPlayers([]); // Safe fallback to prevent crashes
          }
        })
        .catch((err) => {
          console.error("Failed to fetch players:", err);
          setPlayers([]); // Safe fallback on network error
        });
    }
  }, [state?.phase, players.length]);

  // Confetti effect when auction finishes
  useEffect(() => {
    if (state?.phase !== "COMPLETED") return;
    const end = Date.now() + 5 * 1000;
    const interval: any = setInterval(function() {
      if (Date.now() > end) return clearInterval(interval);
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
    }, 250);
    return () => clearInterval(interval);
  }, [state?.phase]);

  // --- ACTIONS ---
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) return;

    const userRole = username === "SivaAdmin" ? "ADMIN" : "PLAYER";
    const generatedUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (userRole === "ADMIN") setIsAdmin(true);

    try {
      const resp: any = await emitWithAck("join_room", { username, roomCode, role: userRole });
      setMyUserId(resp.userId);
      setJoined(true);
      setShowRules(true);
    } catch (error) {
      console.error(error);
      alert("Failed to join lobby.");
    }
  };

  const handleTriggerRandomizer = async () => {
    try {
      await emitWithAck("trigger_randomizer", { roomCode, userId: myUserId });
    } catch (error) {
      alert("Only the Admin can do this!");
    }
  };

  const submitRetention = async () => {
    if (!selectedIndian || !selectedOverseas) return;

    if (!myUserId) {
      alert("User not identified yet. Please rejoin.");
      return;
    }

    const myUserData = state?.users?.find((u: any) => u.userId === myUserId);
    const myTeam = state?.teams?.find((t: any) => t.teamId === myUserData?.assignedTeamId);

    const safePlayers = Array.isArray(players) ? players : [];
    const franchisePlayers = safePlayers.filter(
      (p) => p.baseTeam === myTeam?.name
    );

    const indianPlayers = franchisePlayers.filter((p) =>
      p.country === "India" ||
      String(p.countryType).toUpperCase() === "INDIAN" ||
      String(p.countryType).toUpperCase() === "DOMESTIC"
    );

    const overseasPlayers = franchisePlayers.filter((p) =>
      (p.country && p.country !== "India") ||
      String(p.countryType).toUpperCase() === "OVERSEAS" ||
      String(p.countryType).toUpperCase() === "FOREIGN"
    );

    const selectedIndianPlayer = indianPlayers.find((p) => p.id === selectedIndian);
    const selectedOverseasPlayer = overseasPlayers.find((p) => p.id === selectedOverseas);

    if (!selectedIndianPlayer || !selectedOverseasPlayer) {
      alert("Please select both Indian and Overseas players before confirming.");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/retain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode,
          teamId: myTeam?.teamId,
          indianPlayerId: selectedIndianPlayer.id,
          overseasPlayerId: selectedOverseasPlayer.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit retentions.");
      }

      const result = await response.json();
      setRetentionLocked(true);
      console.log("Retention locked result", result);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Retention lock failed.");
    }
  };

  // --- RENDERERS ---

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-base text-white font-mono animate-pulse sm:text-xl">
        Establishing secure connection to Auction Engine...
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-10">
          <h1 className="mb-2 text-center text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent sm:text-4xl">
            IPL MEGA AUCTION
          </h1>
          <p className="mb-8 text-center text-sm text-slate-400 sm:text-base">Enter your franchise owner name</p>
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., Mukesh Ambani"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-base focus:border-blue-500 focus:outline-none sm:text-lg"
              required
            />
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code (ex: IPL2026)"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center font-mono text-base uppercase tracking-widest focus:border-blue-500 focus:outline-none sm:text-lg"
              required
            />
            <button type="submit" className="rounded-lg bg-blue-600 py-3 font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-500">
              ENTER LOBBY
            </button>
          </form>
        </div>
      </div>
    );
  }

  const phase = state?.phase || "LOBBY";

  if (phase === "LOBBY") {
    return (
      <div className="relative flex min-h-screen flex-col items-center bg-slate-950 px-4 py-10 text-white sm:py-20">
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-white"
              >
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6 flex items-center gap-3">
                  <Trophy size={32} /> Auction Rules
                </h2>
                <ul className="space-y-4 mb-8 text-slate-300">
                  <li className="flex items-start gap-3"><div className="mt-1.5 h-2 w-2 shrink-0 bg-blue-500 rounded-full" /> <strong>₹1000L Starting Budget</strong> for every franchise.</li>
                  <li className="flex items-start gap-3"><div className="mt-1.5 h-2 w-2 shrink-0 bg-emerald-500 rounded-full" /> <strong>Mandatory Retentions:</strong> 1 Indian & 1 Overseas player. Costs flat 100L.</li>
                  <li className="flex items-start gap-3"><div className="mt-1.5 h-2 w-2 shrink-0 bg-yellow-500 rounded-full" /> <strong>15-Second Clock:</strong> Timer resets cleanly after any valid new bid.</li>
                  <li className="flex items-start gap-3"><div className="mt-1.5 h-2 w-2 shrink-0 bg-red-500 rounded-full" /> <strong>Fixed Increments:</strong> All bids are placed in intervals of exactly ₹10L.</li>
                </ul>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                >
                  I UNDERSTAND
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAdmin && (
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-yellow-500/50 bg-yellow-500/20 px-3 py-1.5 text-xs font-bold text-yellow-500 sm:right-6 sm:top-6 sm:px-4 sm:py-2 sm:text-sm">
            👑 Admin Mode
          </div>
        )}

        <h2 className="mb-8 flex flex-wrap items-center justify-center gap-3 text-center text-2xl font-bold sm:text-3xl">
          <Users className="text-blue-400" /> Waiting for Franchise Owners...
        </h2>
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {state?.users?.map((user: any) => (
            <div key={user.userId} className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center font-semibold">
              {user.username} {user.userId === myUserId && "(You)"} {user.role === "ADMIN" && " 👑"}
            </div>
          ))}
        </div>
        
        {isAdmin ? (
          <div className="mt-12 flex w-full flex-col items-center gap-4">
            <label className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-6 py-3 text-center text-sm font-bold text-slate-300 shadow-lg transition-colors hover:bg-slate-700">
              Upload Player Spreadsheet (Excel/CSV)
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </label>
            <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
              <button 
                onClick={handleTriggerRandomizer}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-base font-bold transition-all shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:bg-emerald-500 sm:text-xl"
              >
                <Dices size={28} />
                ASSIGN TEAMS
              </button>
              <button 
                onClick={() => window.open("/dashboard?admin=true", "_blank")}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-base font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 sm:text-xl"
              >
                <Trophy size={28} />
                FANTASY DASHBOARD
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-4">
            <p className="text-slate-400 font-medium italic animate-pulse">Waiting for Auctioneer to start...</p>
            <button 
              onClick={() => window.open("/dashboard", "_blank")}
              className="flex items-center gap-2 rounded-full border border-blue-500 px-6 py-4 text-base font-bold text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all hover:bg-blue-900/30 sm:px-8 sm:text-xl"
            >
              <Trophy size={28} />
              FANTASY DASHBOARD
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "RANDOMIZING") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
        <h2 className="mb-12 text-center text-2xl font-black text-yellow-400 animate-pulse sm:text-4xl">ALLOCATING FRANCHISES...</h2>
        <div className="relative flex h-28 w-full max-w-2xl items-center justify-center overflow-hidden border-y-4 border-yellow-500 bg-slate-900 shadow-[0_0_50px_rgba(234,179,8,0.2)] sm:h-32">
          <motion.div
            animate={{ y: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="flex flex-col items-center gap-8 absolute top-4"
          >
            {[...TEAM_NAMES, ...TEAM_NAMES, ...TEAM_NAMES].map((team, idx) => (
              <div key={idx} className="text-center text-3xl font-extrabold text-slate-300 opacity-50 sm:text-5xl">{team}</div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "RETENTION") {
    const myUserData = state?.users?.find((u: any) => u.userId === myUserId);
    const myTeam = state?.teams?.find((t: any) => t.teamId === myUserData?.assignedTeamId);

    const safePlayers = Array.isArray(players) ? players : [];
    
    // 🔥 NEW: Isolate ONLY the players that belong to this assigned franchise!
    const franchisePlayers = safePlayers.filter(
      (p) => p.baseTeam === myTeam?.name
    );
    
    const indianPlayers = franchisePlayers.filter((p) => 
      p.country === "India" || 
      String(p.countryType).toUpperCase() === "INDIAN" ||
      String(p.countryType).toUpperCase() === "DOMESTIC"
    );
    
    const overseasPlayers = franchisePlayers.filter((p) => 
      (p.country && p.country !== "India") || 
      String(p.countryType).toUpperCase() === "OVERSEAS" ||
      String(p.countryType).toUpperCase() === "FOREIGN"
    );

if (retentionLocked) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
          <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
          <h2 className="text-3xl font-bold mb-2">Retentions Locked!</h2>
          <p className="text-slate-400 mb-12">Waiting for Admin to start the live auction...</p>
          
          {/* 🔥 ADMIN OVERRIDE BUTTON: This will force the state to ACTIVE */}
          {isAdmin ? (
            <button 
              onClick={() => emitWithAck("admin_next_player", {})}
              className="rounded-lg bg-red-600 px-6 py-3 font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 hover:bg-red-500 sm:px-8"
            >
              ADMIN: START LIVE AUCTION ➔
            </button>
          ) : (
            <p className="border border-slate-700 bg-slate-800 text-slate-400 px-8 py-3 rounded-lg flex items-center gap-2 italic animate-pulse">
              Waiting for Auctioneer...
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 sm:text-4xl">
              {myTeam?.name || myTeam?.displayName || "YOUR FRANCHISE"}
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">Select 1 Indian and 1 Overseas player to retain (Deducts 100 Points)</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {/* Indian Players Column */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400 sm:text-2xl">Indian Players ({indianPlayers.length})</h3>
              <div className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1 sm:pr-2">
                {indianPlayers.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedIndian(p.id)}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex justify-between ${selectedIndian === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-sm text-slate-400">{p.role}</div>
                    </div>
                    <div className="font-mono text-yellow-500">{p.basePrice} L</div>
                  </div>
                ))}
                {indianPlayers.length === 0 && (
                  <div className="text-slate-500 text-center mt-10">No Indian players found...</div>
                )}
              </div>
            </div>

            {/* Overseas Players Column */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h3 className="mb-4 text-xl font-bold text-emerald-400 sm:text-2xl">Overseas Players ({overseasPlayers.length})</h3>
              <div className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1 sm:pr-2">
                {overseasPlayers.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedOverseas(p.id)}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex justify-between ${selectedOverseas === p.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-sm text-slate-400">{p.role} • {p.country}</div>
                    </div>
                    <div className="font-mono text-yellow-500">{p.basePrice} L</div>
                  </div>
                ))}
                {overseasPlayers.length === 0 && (
                  <div className="text-slate-500 text-center mt-10">No Overseas players found...</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-8 flex justify-center">
            <button 
              onClick={submitRetention}
              disabled={!selectedIndian || !selectedOverseas}
              className={`w-full max-w-md rounded-full px-8 py-4 text-base font-bold transition-all shadow-lg sm:px-12 sm:text-xl ${
                selectedIndian && selectedOverseas 
                  ? "bg-yellow-500 hover:bg-yellow-400 text-slate-900 hover:scale-105" 
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              CONFIRM RETENTIONS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 6: GRAND FINALE (COMPLETED)
  // ==========================================
  if (phase === "COMPLETED") {
    const myUserData = state?.users?.find((u: any) => u.userId === myUserId);
    const myTeam = state?.teams?.find((t: any) => t.teamId === myUserData?.assignedTeamId);

    const sortedTeams = [...(state?.teams || [])].sort((a: any, b: any) => (b.totalPlayers ?? b.players?.length ?? 0) - (a.totalPlayers ?? a.players?.length ?? 0));
    const marqueePlayer = state?.marqueePlayer;

    const downloadSquad = () => {
      if (!myTeam || !myTeam.players) return;
      const teamName = myTeam.name || myTeam.displayName || myTeam.code || 'MyTeam';
      const totalPlayers = myTeam.totalPlayers ?? myTeam.players?.length ?? 0;
      let text = `SQUAD: ${teamName}\nTotal Players: ${totalPlayers}\n\n`;
      myTeam.players.forEach((p: any) => {
        text += `- ${p.name} (${p.role}) : ₹${p.price}L\n`;
      });
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${teamName.replace(/\\s+/g, '_')}_Squad.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const downloadAllSquads = () => {
      let csvContent = "data:text/csv;charset=utf-8,Franchise,Player Name,Role,Price (Lakhs)\\n";
      state?.teams?.forEach((team: any) => {
        if (team.players) {
          const teamName = team.name || team.displayName || team.code || 'Team';
          team.players.forEach((p: any) => {
            csvContent += `"${teamName}","${p.name}","${p.role}","${p.price}"\n`;
          });
        }
      });
      const encodedUri = encodeURI(csvContent);
      const a = document.createElement('a');
      a.href = encodedUri;
      a.download = "IPL_Mega_Auction_Results.csv";
      a.click();
    };

    return (
      <div className="flex min-h-screen flex-col items-center overflow-y-auto bg-[#020617] p-4 text-white sm:p-10">
        <h1 className="mb-8 text-center text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 sm:text-5xl">
          Auction Concluded
        </h1>

        {/* Action Button */}
        <div className="mb-12 flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
          {myTeam && (
            <button onClick={downloadSquad} className="rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95 hover:bg-emerald-500 sm:px-8 sm:text-lg">
              📥 Download My Squad (.txt)
            </button>
          )}
          {isAdmin && (
            <button onClick={downloadAllSquads} className="rounded-2xl bg-purple-600 px-6 py-4 text-base font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95 hover:bg-purple-500 sm:px-8 sm:text-lg">
              📊 Export All Squads (CSV)
            </button>
          )}
          <button onClick={() => window.open(isAdmin ? "/dashboard?admin=true" : "/dashboard", "_blank")} className="flex items-center justify-center gap-2 rounded-2xl border border-blue-500 px-6 py-4 text-base font-bold text-blue-400 shadow-lg shadow-blue-500/20 transition-all active:scale-95 hover:bg-blue-900/30 sm:px-8 sm:text-lg">
            <Trophy size={20} /> View Fantasy Dashboard
          </button>
        </div>

        {/* Marquee Player */}
        {marqueePlayer && (
          <div className="w-full max-w-4xl bg-white/5 border-2 border-yellow-500/50 rounded-3xl p-8 mb-12 shadow-[0_0_50px_rgba(234,179,8,0.2)] flex flex-col items-center text-center">
            <p className="text-yellow-400 font-bold tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
              <Trophy size={20} /> Marquee Purchase of the Auction
            </p>
            <h2 className="mb-2 text-3xl font-black text-white sm:text-5xl">{marqueePlayer.name}</h2>
            <p className="text-lg text-slate-300 sm:text-2xl">{marqueePlayer.role} • {marqueePlayer.country}</p>
            <div className="mt-6 px-8 py-4 bg-yellow-500/20 border border-yellow-500/50 rounded-2xl">
              <p className="text-sm text-yellow-500 font-bold uppercase tracking-widest">Sold For</p>
              <p className="relative z-10 text-3xl font-mono font-black text-yellow-400 sm:text-5xl">₹{marqueePlayer.soldPrice}L</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="w-full max-w-4xl pb-20">
          <h3 className="text-2xl font-bold mb-6 text-slate-300 uppercase tracking-widest text-center">Franchise Leaderboard (Squad Strength)</h3>
          <div className="flex flex-col gap-4">
            {sortedTeams.map((team: any, index: number) => (
              <div key={team.teamId} className={`p-6 rounded-2xl border flex justify-between items-center ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-slate-900/50 border-slate-800'}`}>
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 flex items-center justify-center rounded-full font-black ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{team.name}</p>
                    <p className="text-sm text-slate-400 font-mono">Purse Remaining: ₹{team.budget}L</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-emerald-400">{team.totalPlayers}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Players Signed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

// ==========================================
  // SCREEN 5: PREMIUM LIVE AUCTION DASHBOARD
  // ==========================================
  if (phase === "ACTIVE" || phase === "PAUSED") {
    const activePlayer = state?.activeBid?.player;
    const currentBid = state?.activeBid?.amount || 0;
    const highestBidderId = state?.activeBid?.highestBidderUserId;
    const leadingTeam = state?.teams?.find((t: any) => t.teamId === highestBidderId);
    
    const myUserData = state?.users?.find((u: any) => u.userId === myUserId);
    const myTeam = state?.teams?.find((t: any) => t.teamId === myUserData?.assignedTeamId);
    
    // Timer sync from Socket state
    const timeLeft = state?.timeRemaining ?? 15;
    const nextBidAmount = currentBid === 0 ? (activePlayer?.basePrice || 50) : currentBid + 10;

    const handleBid = async () => {
      try {
        await emitWithAck("place_bid", { 
          roomCode, 
          teamId: myTeam?.teamId, 
          amount: nextBidAmount 
        });
      } catch (error: any) {
        alert(error.message || "Bid failed!");
      }
    };

    const handleAdminNextPlayer = async () => {
      try {
        await emitWithAck("admin_next_player", { roomCode, userId: myUserId, selectedLot });
      } catch (error: any) {
        console.error(error);
      }
    };

    const handleAdminPause = async () => {
      try {
        await emitWithAck("admin_pause", { roomCode, userId: myUserId });
      } catch (error: any) {
        alert(error.message || "Pause request failed.");
      }
    };

    const handleAdminResume = async () => {
      try {
        await emitWithAck("admin_resume", { roomCode, userId: myUserId });
      } catch (error: any) {
        alert(error.message || "Resume request failed.");
      }
    };

    const handleAdminStop = async () => {
      try {
        await emitWithAck("admin_stop", { roomCode, userId: myUserId });
      } catch (error: any) {
        alert(error.message || "Stop request failed.");
      }
    };

    const handleAdminSelectPlayer = async (playerId: string) => {
      try {
        await emitWithAck("admin_select_player", { roomCode, userId: myUserId, playerId });
      } catch (error: any) {
        alert(error.message || "Select player request failed.");
      }
    };

    return (
      <div className="flex min-h-screen flex-col bg-[#020617] p-3 font-sans text-white selection:bg-yellow-500/30 sm:p-6">
        
        {/* ALL SQUADS MODAL */}
        <AnimatePresence>
          {showAllSquads && (
            <motion.div 
               initial={{ opacity: 0, y: 50 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 50 }} 
               className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950 p-4 text-white sm:p-10"
            >
               <div className="mx-auto mb-10 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <h1 className="flex items-center gap-4 text-2xl font-black sm:text-4xl"><Users className="text-emerald-400" size={40}/> All Franchises</h1>
                 <button onClick={() => setShowAllSquads(false)} className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 font-bold transition shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-slate-700 sm:px-8">Close ✖</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto pb-20">
                 {state?.teams?.map((team: any) => (
                    <div key={team.teamId} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                       <h2 className="text-2xl font-bold text-white mb-4 relative z-10">{team.name}</h2>
                       <div className="flex justify-between items-center mb-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800 relative z-10">
                         <p className="text-emerald-400 font-mono text-xl font-black">Purse: ₹{team.budget}L</p>
                         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{team.totalPlayers}/15 Squad</p>
                       </div>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 border-t border-slate-800 pt-4 relative z-10">
                          {team.players?.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                               <div>
                                  <p className="font-bold text-sm tracking-wide text-white">{p.name}</p>
                                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{p.role}</p>
                               </div>
                               <p className="text-yellow-400 font-mono text-sm font-black">₹{p.price}L</p>
                            </div>
                          ))}
                          {(!team.players || team.players.length === 0) && <p className="text-slate-500 italic text-sm text-center py-8">No players signed yet</p>}
                       </div>
                    </div>
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Background Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
        </div>

        {/* Top Navbar: Status Bar */}
        <div className="relative z-10 mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="h-14 w-14 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Trophy className="text-white" size={30} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Current Franchise</p>
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-black text-white sm:text-2xl">
                {myTeam?.name || myTeam?.displayName || myTeam?.code || "Lobby"} {isAdmin && <span className="whitespace-nowrap rounded-full border border-yellow-500/50 bg-yellow-500/20 px-3 py-1 text-xs text-yellow-500">👑 Admin Mode</span>}
              </h2>
            </div>
          </div>
          
          <div className="h-12 w-[1px] bg-white/10 hidden md:block" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setShowAllSquads(true)} className="flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-300 shadow-lg transition-all hover:bg-slate-700 sm:px-6">
              <Users size={18} className="mr-2"/> View Squads
            </button>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Available Purse</p>
              <h2 className="text-3xl font-mono font-black text-emerald-400">₹{myTeam?.budget ?? 0} <span className="text-sm">L</span></h2>
            </div>
          </div>
        </div>

        {/* Main Arena */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full">
          {!activePlayer ? (
            <div className="text-center space-y-6">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <h2 className="text-2xl font-bold text-slate-500 italic">Waiting for the Auctioneer to draw...</h2>
              {isAdmin && (
                <button onClick={handleAdminNextPlayer} className="px-6 py-2 bg-blue-600 mt-4 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all">Admin: Draw Player</button>
              )}
            </div>
          ) : (
            <div className="relative z-10 grid w-full items-stretch gap-6 lg:grid-cols-12 lg:gap-10">
              
              {/* Left: Player Poster */}
              <motion.div 
                key={activePlayer.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-1 shadow-2xl group backdrop-blur-md lg:col-span-5 lg:rounded-[40px]"
              >
                {/* 🔨 SOLD OVERLAY */}
                <AnimatePresence>
                  {phase === "PAUSED" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center rounded-[36px] overflow-hidden"
                    >
                      {leadingTeam ? (
                        <>
                          <div className="text-7xl mb-4 animate-bounce">🔨</div>
                          <h2 className="text-6xl font-black text-red-500 uppercase tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">SOLD!</h2>
                          <p className="text-3xl font-bold text-white mb-2">{activePlayer.name}</p>
                          <p className="text-xl text-slate-300 mb-6">to <span className="text-emerald-400 font-black">{leadingTeam.name || leadingTeam.displayName || leadingTeam.code}</span></p>
                          <div className="px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-2xl">
                             <p className="text-5xl font-mono text-yellow-400 font-black">₹{currentBid}L</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-7xl mb-4 opacity-70">❌</div>
                          <h2 className="text-6xl font-black text-slate-500 uppercase tracking-widest mb-4">UNSOLD</h2>
                          <p className="text-3xl font-bold text-white">{activePlayer.name}</p>
                          <p className="text-slate-400 mt-4 font-bold tracking-widest uppercase">No bids were placed</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative flex h-full flex-col justify-between rounded-[24px] bg-slate-900/50 p-6 sm:p-8 lg:rounded-[36px] lg:p-10">
                  <div className="absolute right-0 top-0 p-5 sm:p-6 lg:p-8">
                     <span className="rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/40 sm:px-5 sm:text-xs">
                       {activePlayer.role}
                     </span>
                  </div>

                  <div>
                    <p className="text-blue-400 font-black tracking-widest uppercase mb-2">{activePlayer.country}</p>
                    <h1 className="mb-4 break-words text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
                      {activePlayer.name.split(' ')[0]}<br/>
                      <span className="text-blue-500">{activePlayer.name.split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <div className="inline-block rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Base Price</p>
                      <p className="text-xl font-mono font-bold text-yellow-500">₹{activePlayer.basePrice}L</p>
                    </div>
                  </div>

                  <div className="mt-8 sm:mt-10 lg:mt-12">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Original Franchise</p>
                    <p className="text-xl font-bold opacity-80">{activePlayer.baseTeam || "None"}</p>
                  </div>
                </div>
              </motion.div>

              {/* Right: Bidding Controls */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-8">
                
                {/* Timer & Leading Bid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:rounded-[32px] sm:p-8">
                    <div className={`absolute inset-0 opacity-10 transition-colors ${timeLeft <= 5 ? 'bg-red-600' : 'bg-blue-600'}`} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Time Left</p>
                    <p className={`relative z-10 text-5xl font-mono font-black sm:text-7xl ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
                      {timeLeft}<span className="text-2xl">s</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:rounded-[32px] sm:p-8">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Current Bid</p>
                    <p className="text-4xl font-mono font-black text-yellow-400 sm:text-7xl">
                      {currentBid === 0 ? '—' : `₹${currentBid}`}
                    </p>
                  </div>
                </div>

                {/* Leading Team Banner */}
                <div className={`p-6 rounded-2xl border transition-all duration-500 flex items-center justify-center gap-4 ${
                  leadingTeam ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
                }`}>
                  {leadingTeam ? (
                    <>
                      <div className="h-3 w-3 bg-emerald-500 rounded-full animate-ping" />
                      <p className="text-lg font-bold">Leading: <span className="text-emerald-400 uppercase">{leadingTeam.name || leadingTeam.displayName || leadingTeam.code}</span></p>
                    </>
                  ) : (
                    <p className="text-slate-500 font-bold uppercase tracking-widest">No Bids Placed Yet</p>
                  )}
                </div>

                {/* Big Bid Button */}
                <button 
                  onClick={handleBid}
                  disabled={phase === "PAUSED" || leadingTeam?.teamId === myTeam?.teamId}
                  className={`group relative h-24 overflow-hidden rounded-[24px] transition-all active:scale-95 sm:h-32 sm:rounded-[32px] ${
                    leadingTeam?.teamId === myTeam?.teamId 
                    ? 'bg-slate-800 cursor-not-allowed opacity-80' 
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_20px_50px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] mb-1 opacity-70">
                      {leadingTeam?.teamId === myTeam?.teamId ? "Highest Bidder" : "Place Bid"}
                    </p>
                    <p className="text-2xl font-black uppercase sm:text-4xl">
                      {leadingTeam?.teamId === myTeam?.teamId ? "WINNING" : `BID ₹${nextBidAmount} L`}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>

                {isAdmin && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-700">
                    <p className="text-sm uppercase tracking-wide text-slate-400 mb-2">Admin Controls</p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <button onClick={handleAdminPause} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-lg text-sm font-bold">Pause</button>
                      <button onClick={handleAdminResume} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-bold">Resume</button>
                      <button onClick={handleAdminNextPlayer} className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-bold">Next Player</button>
                      <button onClick={handleAdminStop} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-lg text-sm font-bold">Stop Auction</button>
                    </div>
                    <div className="max-h-40 overflow-y-auto pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Available Players</p>
                        <select 
                          className="bg-slate-800 text-xs text-white border border-slate-600 rounded px-2 py-1"
                          value={selectedLot}
                          onChange={(e) => setSelectedLot(e.target.value)}
                        >
                          <option value="All">All Lots</option>
                          {lots.map(lot => <option key={lot} value={lot}>{lot}</option>)}
                        </select>
                      </div>
                      {Array.isArray(state?.availablePlayers) && state?.availablePlayers.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {state.availablePlayers.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => handleAdminSelectPlayer(p.id)}
                              className="text-left p-2 border border-slate-700 rounded bg-slate-800 hover:bg-slate-700 text-xs"
                            >
                              {p.name} • ₹{p.basePrice}L
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No players remaining in queue.</p>
                      )}
                    </div>
                  </div>
                )}

                {phase === "PAUSED" && (
                  isAdmin ? (
                    <button 
                      onClick={handleAdminNextPlayer}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-2xl font-bold text-slate-300 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Auctioneer: Draw Next Player
                    </button>
                  ) : (
                    <div className="w-full py-4 text-center rounded-2xl font-bold text-slate-500 transition-all uppercase tracking-widest italic border border-dashed border-slate-800">
                      Waiting for Auctioneer...
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
