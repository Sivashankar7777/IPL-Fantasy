"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { Users, Dices, Trophy, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { BACKEND_URL } from "@/lib/config";

const LOBBY_SESSION_KEY = "ipl-auction-lobby-session";

const TEAM_NAMES = [
  "Chennai Super Kings", "Delhi Capitals", "Gujarat Titans", 
  "Kolkata Knight Riders", "Lucknow Super Giants", "Mumbai Indians", 
  "Punjab Kings", "Rajasthan Royals", "Royal Challengers Bengaluru", 
  "Sunrisers Hyderabad"
];

export default function AuctionLobby() {
  const { isConnected, state, emitWithAck } = useSocket();
  const router = useRouter();
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
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Excel Upload & Lots State
  const [lots, setLots] = useState<string[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("All");

  useEffect(() => {
    const savedSession = window.localStorage.getItem(LOBBY_SESSION_KEY);

    if (!savedSession) {
      setIsRestoringSession(false);
      return;
    }

    try {
      const session = JSON.parse(savedSession);
      setUsername(session.username ?? "");
      setRoomCode(session.roomCode ?? "");
      setIsAdmin(Boolean(session.isAdmin));
    } catch (error) {
      console.error("Failed to restore lobby session:", error);
      window.localStorage.removeItem(LOBBY_SESSION_KEY);
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  const openDashboard = (adminView = false) => {
    router.push(adminView ? "/dashboard?admin=true" : "/dashboard");
  };

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
    if (userRole === "ADMIN") setIsAdmin(true);

    try {
      const resp: any = await emitWithAck("join_room", { username, roomCode, role: userRole });
      setMyUserId(resp.userId);
      setJoined(true);
      setShowRules(true);
      window.localStorage.setItem(
        LOBBY_SESSION_KEY,
        JSON.stringify({
          username,
          roomCode,
          isAdmin: userRole === "ADMIN",
        })
      );
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

  if (!isConnected || isRestoringSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-ipl-navy text-white text-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-ipl-gold rounded-full blur-[30px] opacity-20 animate-pulse" />
            <Trophy className="text-ipl-gold relative z-10 animate-bounce" size={64} />
          </div>
          <p className="font-display font-medium tracking-widest uppercase text-ipl-silver">
            Establishing secure connection to Auction Engine...
          </p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ipl-navy relative overflow-hidden px-6 py-10">
        <div className="absolute inset-0 pitch-grid opacity-30 pointer-events-none" />
        <div className="stadium-ring h-[34rem] w-[34rem] top-[-10rem] left-[-8rem] opacity-40" />
        <div className="stadium-ring h-[28rem] w-[28rem] bottom-[-8rem] right-[-4rem] opacity-30" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-ipl-blue rounded-full blur-[150px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-ipl-gold rounded-full blur-[150px] opacity-10 pointer-events-none" />

        <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr] z-10 items-center">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,19,34,0.92),rgba(17,52,35,0.62))] px-8 py-10 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(226,180,90,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.18),transparent_30%)]" />
            <div className="absolute inset-x-[18%] top-0 h-full rounded-[999px] border-x border-white/5 opacity-50" />
            <div className="absolute left-1/2 top-[12%] h-[76%] w-[24%] -translate-x-1/2 rounded-[999px] border border-white/10 bg-white/[0.02]" />
            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-ipl-gold/30 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-ipl-gold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                Live Auction Room
              </div>
              <h1 className="max-w-3xl text-5xl font-display font-black leading-[0.95] text-white md:text-7xl">
                Built For
                <span className="block bg-gold-gradient bg-clip-text text-transparent">Auction Night Drama</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ipl-silver/85">
                A sharper cricket-first control room for owners, auctioneers, and fantasy watchers. Join fast, manage the room cleanly, and keep the board readable under pressure.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Room Entry</p>
                  <p className="mt-3 text-2xl font-display font-black text-white">Quick Join</p>
                  <p className="mt-2 text-sm text-ipl-silver/75">Owner name plus room passcode. No accidental auto-entry anymore.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Fantasy Board</p>
                  <p className="mt-3 text-2xl font-display font-black text-white">Live Sync</p>
                  <p className="mt-2 text-sm text-ipl-silver/75">Scorecard-driven updates and a cleaner board for public viewing.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Cricket Theme</p>
                  <p className="mt-3 text-2xl font-display font-black text-white">Pitch Feel</p>
                  <p className="mt-2 text-sm text-ipl-silver/75">Stadium rings, pitch lines, and more deliberate match-night visuals.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-10 rounded-[2.4rem] w-full max-w-lg z-10 relative mx-auto border-emerald-400/10">
            <div className="absolute inset-x-8 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)]" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-ipl-dark border border-ipl-gold/30 p-4 rounded-full shadow-glow-gold cricket-orb">
              <Trophy size={48} className="text-ipl-gold relative z-10" />
            </div>
            
            <div className="mt-8 mb-10 text-center">
              <p className="text-emerald-300 text-xs font-bold tracking-[0.3em] uppercase mb-2">Secure Join</p>
              <h2 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gold-gradient tracking-tight">
                ENTER MATCHDAY
              </h2>
              <p className="mt-4 text-sm text-ipl-silver/75">Type your owner name and room passcode, then enter manually. Saved values can prefill, but they will not auto-submit.</p>
              <div className="h-1 w-24 bg-gold-gradient mx-auto mt-4 rounded-full opacity-50" />
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-ipl-silver font-semibold ml-1">Franchise Owner</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., Mukesh Ambani"
                  className="px-5 py-4 rounded-xl bg-ipl-dark/80 border border-white/10 focus:outline-none focus:border-ipl-gold focus:ring-1 focus:ring-ipl-gold/50 text-lg text-white font-body placeholder:text-slate-600 transition-all"
                  required
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-widest text-ipl-silver font-semibold ml-1">Room Passcode</label>
                  <button
                    type="button"
                    onClick={() => setRoomCode("IPL2026")}
                    className="text-[11px] font-bold uppercase tracking-[0.24em] text-ipl-gold/80 hover:text-ipl-gold"
                  >
                    Use IPL2026
                  </button>
                </div>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g., IPL2026"
                  className="px-5 py-4 rounded-xl bg-ipl-dark/80 border border-white/10 focus:outline-none focus:border-ipl-gold focus:ring-1 focus:ring-ipl-gold/50 text-lg text-center text-white font-mono uppercase tracking-[0.2em] placeholder:text-slate-600 transition-all"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={!username.trim() || !roomCode.trim()}
                className="mt-4 w-full py-4 text-ipl-navy font-black text-lg bg-gold-gradient hover:opacity-90 rounded-xl transition-all shadow-glow-gold active:scale-95 uppercase tracking-widest flex justify-center items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Join Auction Lobby
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-ipl-silver/80">
              Admin joins with the owner name <span className="font-black text-ipl-gold">SivaAdmin</span>. Everyone else enters as a franchise owner.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const phase = state?.phase || "LOBBY";

  if (phase === "LOBBY") {
    return (
      <div className="flex h-screen flex-col items-center py-20 bg-ipl-navy text-white relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-ipl-blue rounded-full blur-[150px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-ipl-gold rounded-full blur-[150px] opacity-10 pointer-events-none" />

        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="glass-panel p-10 rounded-3xl max-w-lg w-full text-white relative border-t-4 border-t-ipl-gold shadow-glow-gold"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-ipl-dark border border-ipl-gold/30 p-4 rounded-full shadow-glow-gold">
                  <Trophy size={40} className="text-ipl-gold" />
                </div>
                <h2 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gold-gradient mb-8 text-center mt-4 tracking-tight">
                  AUCTION RULES
                </h2>
                <ul className="space-y-6 mb-10 text-ipl-silver font-body">
                  <li className="flex items-start gap-4">
                    <div className="mt-1 h-3 w-3 shrink-0 bg-ipl-lightBlue rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" /> 
                    <div><strong className="text-white">₹1000L Starting Budget</strong> for every franchise.</div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1 h-3 w-3 shrink-0 bg-ipl-gold rounded-full shadow-[0_0_10px_rgba(226,180,90,0.8)]" /> 
                    <div><strong className="text-white">Mandatory Retentions:</strong> 1 Indian & 1 Overseas player. Costs flat 100L.</div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1 h-3 w-3 shrink-0 bg-ipl-red rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> 
                    <div><strong className="text-white">15-Second Clock:</strong> Timer resets cleanly after any valid new bid.</div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1 h-3 w-3 shrink-0 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> 
                    <div><strong className="text-white">Fixed Increments:</strong> All bids are placed in intervals of exactly ₹10L.</div>
                  </li>
                </ul>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full py-4 bg-gold-gradient text-ipl-navy rounded-xl font-black text-lg transition-all shadow-glow-gold active:scale-95 uppercase tracking-widest"
                >
                  I Understand
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAdmin && (
          <div className="absolute top-6 right-6 bg-ipl-dark text-ipl-gold px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-ipl-gold/50 shadow-glow-gold z-20 uppercase tracking-widest">
            👑 Admin Mode
          </div>
        )}

        <div className="z-10 mb-10 flex w-full max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-ipl-gold">Auction Lobby</p>
            <h2 className="mt-3 text-4xl font-display font-black tracking-tight text-white md:text-5xl">
              Waiting For Franchises To Take Their Seats
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-ipl-silver/75">
              Owners join the room, upload the player pool, then kick off team randomization and retention selection.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-3">
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ipl-silver/60">Owners</p>
              <p className="mt-1 text-2xl font-display font-black text-white">{state?.users?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ipl-silver/60">Room</p>
              <p className="mt-1 text-lg font-black tracking-[0.18em] text-ipl-gold">{roomCode}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ipl-silver/60">Stage</p>
              <p className="mt-1 text-lg font-black text-white">Lobby</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl px-6 z-10">
          {state?.users?.map((user: any) => (
            <div key={user.userId} className="glass-panel p-6 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-center">
                <p className="text-lg font-bold text-white tracking-wide">
                  {user.username} {user.userId === myUserId && <span className="text-ipl-gold">(You)</span>}
                </p>
                {user.role === "ADMIN" && <p className="text-xs text-ipl-silver uppercase tracking-widest mt-1">👑 Auctioneer</p>}
              </div>
            </div>
          ))}
        </div>
        
        {isAdmin ? (
          <div className="flex flex-col items-center gap-6 mt-16 z-10">
            <label className="cursor-pointer glass-panel hover:bg-white/5 text-ipl-gold font-bold py-4 px-8 rounded-xl text-sm transition-all shadow-lg flex items-center gap-3 border border-ipl-gold/30 uppercase tracking-widest">
              <span>Upload Player Spreadsheet</span>
              <span className="text-xs text-ipl-silver">(Excel/CSV)</span>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </label>
            <div className="flex gap-6 mt-4">
              <button 
                onClick={handleTriggerRandomizer}
                className="px-10 py-5 font-black text-lg rounded-full bg-ipl-lightBlue hover:bg-blue-500 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 uppercase tracking-widest text-white border border-blue-400"
              >
                <Dices size={24} />
                Assign Teams
              </button>
              <button 
                onClick={() => openDashboard(true)}
                className="px-10 py-5 font-black text-lg rounded-full bg-ipl-dark text-ipl-gold hover:bg-black transition-all flex items-center gap-3 shadow-glow-gold hover:scale-105 uppercase tracking-widest border border-ipl-gold/50"
              >
                <Trophy size={24} />
                Dashboard Settings
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 mt-16 z-10">
            <div className="flex items-center gap-4 text-ipl-silver font-medium italic animate-pulse">
              <div className="w-2 h-2 rounded-full bg-ipl-lightBlue animate-ping" />
              Waiting for Auctioneer to start...
            </div>
            <button 
              onClick={() => openDashboard(false)}
              className="px-10 py-5 font-black text-lg rounded-full glass-panel text-ipl-gold hover:bg-white/5 transition-all flex items-center gap-3 shadow-glow-gold hover:scale-105 uppercase tracking-widest border-ipl-gold/30"
            >
              <Trophy size={24} />
              Fantasy Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "RANDOMIZING") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-ipl-navy text-white overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-ipl-gold rounded-full blur-[200px] opacity-10 pointer-events-none" />
        <h2 className="text-4xl font-display font-black mb-12 text-transparent bg-clip-text bg-gold-gradient animate-pulse tracking-widest uppercase">
          Allocating Franchises...
        </h2>
        <div className="h-32 w-full max-w-3xl glass-panel overflow-hidden relative flex justify-center items-center shadow-glow-gold border-y border-ipl-gold/50">
          <motion.div
            animate={{ y: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="flex flex-col items-center gap-8 absolute top-4"
          >
            {[...TEAM_NAMES, ...TEAM_NAMES, ...TEAM_NAMES].map((team, idx) => (
              <div key={idx} className="text-5xl font-display font-black text-white/50">{team}</div>
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
        <div className="flex h-screen flex-col items-center justify-center bg-ipl-navy text-white p-6 relative">
          <div className="absolute inset-0 bg-ipl-blue rounded-full blur-[200px] opacity-10 pointer-events-none" />
          <CheckCircle2 size={80} className="text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          <h2 className="text-4xl font-display font-black mb-4 tracking-tight">Retentions Locked!</h2>
          <p className="text-ipl-silver text-lg font-body mb-12 text-center">Your franchise core is secured. Prepare for the live auction.</p>
          
          {/* 🔥 ADMIN OVERRIDE BUTTON: This will force the state to ACTIVE */}
          {isAdmin ? (
            <button 
              onClick={() => emitWithAck("admin_next_player", { roomCode, selectedLot: "All" })}
              className="px-10 py-5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 rounded-xl font-black text-xl shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all active:scale-95 border border-red-400/50 uppercase tracking-widest text-white"
            >
              ADMIN: START LIVE AUCTION ➔
            </button>
          ) : (
            <p className="glass-panel text-ipl-silver px-10 py-5 rounded-full flex items-center gap-4 italic animate-pulse font-medium">
              <div className="w-2 h-2 rounded-full bg-ipl-lightBlue animate-ping" />
              Waiting for Auctioneer to begin...
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-ipl-navy text-white p-8 relative">
        {/* Ambient Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ipl-gold rounded-full blur-[200px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-ipl-blue rounded-full blur-[200px] opacity-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <Trophy size={56} className="text-ipl-gold mx-auto mb-6 drop-shadow-[0_0_20px_rgba(226,180,90,0.5)]" />
            <h1 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gold-gradient tracking-tight uppercase">
              {myTeam?.name || myTeam?.displayName || "YOUR FRANCHISE"}
            </h1>
            <p className="text-ipl-silver mt-4 font-body tracking-wider uppercase text-sm font-semibold">
              Select 1 Indian and 1 Overseas player to retain <span className="text-ipl-gold pb-1 border-b border-ipl-gold/30">(Deducts ₹100L)</span>
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Indian Players Column */}
            <div className="glass-panel p-8 rounded-[2rem]">
              <h3 className="text-3xl font-display font-black mb-6 text-ipl-lightBlue flex items-center gap-3">
                Indian Players <span className="text-sm px-3 py-1 bg-white/10 rounded-full text-white">{indianPlayers.length}</span>
              </h3>
              <div className="flex flex-col gap-4 h-[500px] overflow-y-auto pr-2">
                {indianPlayers.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedIndian(p.id)}
                    className={`p-5 rounded-2xl cursor-pointer border transition-all flex justify-between items-center group ${
                      selectedIndian === p.id 
                        ? 'border-ipl-lightBlue bg-ipl-lightBlue/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                        : 'border-white/10 bg-ipl-dark/50 hover:border-ipl-lightBlue/50 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-lg text-white group-hover:text-ipl-lightBlue transition-colors">{p.name}</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-ipl-silver mt-1">{p.role} • IN</div>
                    </div>
                    <div className="font-mono font-black text-ipl-gold text-xl bg-ipl-navy px-4 py-2 rounded-xl border border-white/5">
                      ₹{p.basePrice}L
                    </div>
                  </div>
                ))}
                {indianPlayers.length === 0 && (
                  <div className="text-ipl-silver text-center mt-20 italic">No Indian players found...</div>
                )}
              </div>
            </div>

            {/* Overseas Players Column */}
            <div className="glass-panel p-8 rounded-[2rem]">
              <h3 className="text-3xl font-display font-black mb-6 text-emerald-400 flex items-center gap-3">
                Overseas Players <span className="text-sm px-3 py-1 bg-white/10 rounded-full text-white">{overseasPlayers.length}</span>
              </h3>
              <div className="flex flex-col gap-4 h-[500px] overflow-y-auto pr-2">
                {overseasPlayers.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedOverseas(p.id)}
                    className={`p-5 rounded-2xl cursor-pointer border transition-all flex justify-between items-center group ${
                      selectedOverseas === p.id 
                        ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.3)]' 
                        : 'border-white/10 bg-ipl-dark/50 hover:border-emerald-400/50 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">{p.name}</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-ipl-silver mt-1">{p.role} • {p.country}</div>
                    </div>
                    <div className="font-mono font-black text-ipl-gold text-xl bg-ipl-navy px-4 py-2 rounded-xl border border-white/5">
                      ₹{p.basePrice}L
                    </div>
                  </div>
                ))}
                {overseasPlayers.length === 0 && (
                  <div className="text-ipl-silver text-center mt-20 italic">No Overseas players found...</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-12 flex justify-center">
            <button 
              onClick={submitRetention}
              disabled={!selectedIndian || !selectedOverseas}
              className={`px-16 py-6 font-display font-black text-2xl rounded-full transition-all tracking-widest uppercase border ${
                selectedIndian && selectedOverseas 
                  ? "bg-gold-gradient text-ipl-navy shadow-glow-gold hover:scale-105 border-ipl-gold border-opacity-50" 
                  : "bg-ipl-dark/80 text-ipl-silver/50 cursor-not-allowed border-white/5"
              }`}
            >
              Lock In Core Squad
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
      <div className="min-h-screen bg-ipl-navy text-white p-10 flex flex-col items-center overflow-y-auto relative">
        <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-ipl-gold rounded-full blur-[200px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-ipl-blue rounded-full blur-[200px] opacity-10 pointer-events-none" />

        <h1 className="text-6xl font-display font-black text-transparent bg-clip-text bg-gold-gradient mb-12 text-center uppercase tracking-widest drop-shadow-[0_0_20px_rgba(226,180,90,0.5)] z-10">
          Auction Concluded
        </h1>

        {/* Action Button */}
        <div className="flex gap-6 mb-16 z-10">
          {myTeam && (
            <button onClick={downloadSquad} className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 rounded-2xl font-black shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all active:scale-95 text-xl tracking-widest uppercase border border-emerald-400">
              📥 Download Squad (.txt)
            </button>
          )}
          {isAdmin && (
            <button onClick={downloadAllSquads} className="px-10 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 rounded-2xl font-black shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all active:scale-95 text-xl tracking-widest uppercase border border-purple-400">
              📊 Export All (CSV)
            </button>
          )}
          <button onClick={() => openDashboard(isAdmin)} className="px-10 py-5 glass-panel text-ipl-gold hover:bg-white/5 rounded-2xl font-black shadow-glow-gold transition-all active:scale-95 text-xl flex items-center gap-3 tracking-widest uppercase">
            <Trophy size={24} /> Fantasy Dashboard
          </button>
        </div>

        {/* Marquee Player */}
        {marqueePlayer && (
          <div className="w-full max-w-5xl glass-panel !border-[3px] !border-ipl-gold/40 rounded-[2.5rem] p-10 mb-16 shadow-glow-gold flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gold-gradient opacity-5 transition-opacity group-hover:opacity-10" />
            
            <div className="bg-ipl-navy px-8 py-2 rounded-full border border-ipl-gold/50 mb-8 shadow-glow-gold relative z-10">
              <p className="text-ipl-gold font-bold tracking-[0.4em] uppercase flex items-center gap-3 text-sm">
                <Trophy size={16} /> Marquee Purchase of the Auction <Trophy size={16} />
              </p>
            </div>
            
            <h2 className="text-6xl font-display font-black text-white mb-4 relative z-10 tracking-tight">{marqueePlayer.name}</h2>
            <p className="text-2xl text-ipl-silver font-bold uppercase tracking-widest relative z-10 mb-8">
              {marqueePlayer.role} • {marqueePlayer.country}
            </p>
            
            <div className="mt-4 px-12 py-6 bg-gradient-to-br from-ipl-dark to-ipl-navy border border-ipl-gold/50 rounded-3xl shadow-inner relative z-10">
              <p className="text-sm text-ipl-gold font-bold uppercase tracking-widest mb-2">Historic Bid</p>
              <p className="text-7xl font-mono font-black text-ipl-gold drop-shadow-[0_0_15px_rgba(226,180,90,0.8)]">
                ₹{marqueePlayer.soldPrice}L
              </p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="w-full max-w-5xl pb-20 z-10">
          <h3 className="text-3xl font-display font-black mb-8 text-ipl-silver uppercase tracking-[0.3em] text-center">
            Franchise Leaderboard
          </h3>
          <div className="flex flex-col gap-6">
            {sortedTeams.map((team: any, index: number) => (
              <div key={team.teamId} className={`p-8 rounded-[2rem] border transition-all duration-300 flex justify-between items-center ${
                index === 0 
                  ? 'bg-ipl-gold/10 border-ipl-gold/40 shadow-[0_0_30px_rgba(226,180,90,0.2)] scale-[1.02]' 
                  : 'glass-panel border-white/5 hover:border-ipl-gold/20'
              }`}>
                <div className="flex items-center gap-6">
                  <div className={`h-14 w-14 flex items-center justify-center rounded-2xl font-black text-2xl shadow-inner ${
                    index === 0 ? 'bg-gold-gradient text-ipl-navy shadow-glow-gold' : 'bg-ipl-dark text-ipl-silver border border-white/10'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className={`text-3xl font-display font-black ${index === 0 ? 'text-ipl-gold tracking-tight' : 'text-white'}`}>
                      {team.name}
                    </p>
                    <p className="text-sm text-ipl-silver font-mono font-semibold mt-1">
                      Purse Remaining: <span className={index === 0 ? 'text-ipl-gold' : 'text-emerald-400'}>₹{team.budget}L</span>
                    </p>
                  </div>
                </div>
                <div className="text-right bg-ipl-dark/50 px-8 py-4 rounded-3xl border border-white/5 shadow-inner">
                  <p className={`text-5xl font-mono font-black ${index === 0 ? 'text-ipl-gold' : 'text-ipl-lightBlue'}`}>
                    {team.totalPlayers}
                  </p>
                  <p className="text-[10px] text-ipl-silver uppercase font-bold tracking-widest mt-1">Squad Size</p>
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
    const leadingTeam = state?.teams?.find(
      (t: any) => t.teamId === highestBidderId || t.ownerUserId === highestBidderId
    );
    
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
      <div className="min-h-screen bg-ipl-navy text-white p-6 flex flex-col font-sans selection:bg-ipl-gold/30 relative">
        
        {/* ALL SQUADS MODAL */}
        <AnimatePresence>
          {showAllSquads && (
            <motion.div 
               initial={{ opacity: 0, y: 50 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 50 }} 
               className="fixed inset-0 z-[100] bg-ipl-navy/95 backdrop-blur-xl text-white overflow-y-auto p-10"
            >
               <div className="flex justify-between items-center mb-12 max-w-7xl mx-auto border-b border-white/10 pb-6">
                 <h1 className="text-5xl font-display font-black flex items-center gap-4 text-ipl-lightBlue"><Users size={48}/> All Franchises</h1>
                 <button onClick={() => setShowAllSquads(false)} className="px-10 py-4 glass-panel hover:bg-white/10 rounded-2xl font-black tracking-widest uppercase transition-all shadow-lg text-ipl-silver">
                   Close ✖
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto pb-20">
                 {state?.teams?.map((team: any) => (
                    <div key={team.teamId} className="glass-panel border-white/10 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group hover:border-ipl-lightBlue/30 transition-colors">
                       <div className="absolute -top-10 -right-10 w-40 h-40 bg-ipl-lightBlue rounded-full blur-[60px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />
                       <h2 className="text-3xl font-display font-black text-white mb-6 relative z-10 tracking-tight">{team.name}</h2>
                       <div className="flex justify-between items-center mb-6 bg-ipl-dark p-5 rounded-2xl border border-white/5 relative z-10 shadow-inner">
                         <p className="text-ipl-gold font-mono text-2xl font-black">₹{team.budget}L</p>
                         <p className="text-ipl-silver text-xs font-bold uppercase tracking-[0.2em]">{team.totalPlayers}/15 Squad</p>
                       </div>
                       <div className="space-y-3 max-h-[350px] overflow-y-auto pr-3 relative z-10">
                          {team.players?.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-ipl-dark/50 hover:bg-ipl-dark p-4 rounded-xl border border-white/5 transition-colors">
                               <div>
                                  <p className="font-bold text-white tracking-wide">{p.name}</p>
                                  <p className="text-[10px] uppercase text-ipl-silver font-bold tracking-widest mt-1">{p.role}</p>
                               </div>
                               <p className="text-ipl-gold font-mono text-lg font-black bg-ipl-navy px-3 py-1 rounded-lg border border-white/5">₹{p.price}L</p>
                            </div>
                          ))}
                          {(!team.players || team.players.length === 0) && <p className="text-ipl-silver/50 italic text-sm text-center py-10 font-medium">No players signed yet</p>}
                       </div>
                    </div>
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Background Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-ipl-blue rounded-full blur-[200px] opacity-20" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-ipl-gold rounded-full blur-[200px] opacity-10" />
        </div>

        {/* Top Navbar: Status Bar */}
        <div className="relative z-10 flex justify-between items-center glass-panel p-6 rounded-[2rem] mb-10 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-glow-gold relative overflow-hidden group">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              <Trophy className="text-ipl-navy" size={36} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ipl-silver font-bold mb-1">Current Franchise</p>
              <h2 className="text-3xl font-display font-black text-white flex items-center gap-4 tracking-tight">
                {myTeam?.name || myTeam?.displayName || myTeam?.code || "Lobby"} 
                {isAdmin && <span className="text-[10px] bg-ipl-dark text-ipl-gold border border-ipl-gold/30 px-3 py-1.5 rounded-full whitespace-nowrap tracking-widest shadow-glow-gold uppercase">👑 Admin</span>}
              </h2>
            </div>
          </div>
          
          <div className="h-16 w-[1px] bg-white/10 hidden md:block" />

          <div className="flex items-center gap-8">
            <button onClick={() => setShowAllSquads(true)} className="hidden md:flex px-8 py-4 glass-panel hover:bg-white/5 border border-white/10 rounded-2xl font-bold text-sm transition-all shadow-lg text-ipl-silver tracking-widest uppercase">
              <Users size={20} className="mr-3 text-ipl-lightBlue"/> View Teams
            </button>
            <div className="text-right bg-ipl-dark px-8 py-3 rounded-2xl border border-white/5 shadow-inner">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ipl-silver font-bold mb-1">Available Purse</p>
              <h2 className="text-4xl font-mono font-black text-ipl-gold inline-block drop-shadow-[0_0_10px_rgba(226,180,90,0.4)]">
                <span className="text-ipl-gold/50 mr-1">₹</span>{myTeam?.budget ?? 0}<span className="text-lg ml-1 text-ipl-gold/70">L</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Main Arena */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full">
          {!activePlayer ? (
            <div className="text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-ipl-gold/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-ipl-gold rounded-full border-t-transparent animate-spin" />
                <Trophy size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-ipl-gold/50" />
              </div>
              <h2 className="text-3xl font-display font-medium text-ipl-silver italic tracking-widest">Awaiting Player Draw...</h2>
              {isAdmin && (
                <button onClick={handleAdminNextPlayer} className="px-10 py-4 bg-gold-gradient text-ipl-navy mt-6 rounded-2xl text-lg font-black shadow-glow-gold transition-all uppercase tracking-widest active:scale-95 hover:scale-105">
                  Draw Next Player
                </button>
              )}
            </div>
          ) : (
            <div className="w-full grid lg:grid-cols-12 gap-12 items-stretch relative z-10">
              
              {/* Left: Player Poster */}
              <motion.div 
                key={activePlayer.id}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="lg:col-span-5 glass-panel !p-1.5 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden group relative"
              >
                {/* 🔨 SOLD OVERLAY */}
                <AnimatePresence>
                  {phase === "PAUSED" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="absolute inset-0 z-50 bg-ipl-navy/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-[2.8rem] overflow-hidden"
                    >
                      {leadingTeam ? (
                        <>
                          <div className="absolute inset-0 bg-gold-gradient opacity-10 blur-[100px]" />
                          <div className="text-8xl mb-6 animate-bounce drop-shadow-[0_0_20px_rgba(226,180,90,0.8)]">🔨</div>
                          <h2 className="text-7xl font-display font-black text-ipl-gold uppercase tracking-widest mb-6 drop-shadow-[0_0_30px_rgba(226,180,90,0.6)]">SOLD!</h2>
                          <p className="text-4xl font-display font-black text-white mb-2">{activePlayer.name}</p>
                          <p className="text-2xl text-ipl-silver uppercase tracking-widest font-bold mb-8">
                            to <span className="text-white bg-white/10 px-4 py-1 rounded-xl">{leadingTeam.name || leadingTeam.displayName || leadingTeam.code}</span>
                          </p>
                          <div className="px-10 py-5 bg-ipl-dark border-2 border-ipl-gold rounded-3xl shadow-glow-gold relative z-10">
                             <p className="text-6xl font-mono text-ipl-gold font-black">₹{currentBid}L</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-8xl mb-6 opacity-80 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">🚫</div>
                          <h2 className="text-7xl font-display font-black text-ipl-red uppercase tracking-widest mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">UNSOLD</h2>
                          <p className="text-4xl font-display font-bold text-white mb-4">{activePlayer.name}</p>
                          <p className="text-ipl-silver mt-4 font-bold tracking-[0.3em] uppercase bg-white/5 px-6 py-2 rounded-full border border-white/10">No bids placed</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-gradient-to-br from-ipl-dark to-[#040914] rounded-[2.8rem] h-full p-12 flex flex-col justify-between relative border border-white/5">
                  <div className="absolute top-0 right-0 p-10">
                     <span className="px-6 py-3 bg-ipl-lightBlue text-white rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400">
                       {activePlayer.role}
                     </span>
                  </div>

                  <div className="pt-8">
                    <div className="text-ipl-lightBlue font-black tracking-[0.4em] uppercase mb-4 opacity-80 flex items-center gap-2">
                      <div className="w-6 h-[2px] bg-ipl-lightBlue" />
                      <span>{activePlayer.country}</span>
                    </div>
                    <h1 className="text-7xl font-display font-black leading-[1.1] mb-8 tracking-tight uppercase drop-shadow-xl">
                      <span className="text-white block">{activePlayer.name.split(' ')[0]}</span>
                      <span className="text-ipl-silver block">{activePlayer.name.split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <div className="glass-panel px-6 py-4 rounded-2xl border border-white/10 inline-block">
                      <p className="text-[10px] text-ipl-silver uppercase font-bold tracking-widest mb-1">Base Price</p>
                      <p className="text-3xl font-mono font-black text-ipl-gold">₹{activePlayer.basePrice}L</p>
                    </div>
                  </div>

                  <div className="mt-16 bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                    <p className="text-xs text-ipl-silver uppercase font-bold tracking-[0.2em] mb-2">Previous Franchise</p>
                    <p className="text-3xl font-display font-bold text-white tracking-tight">{activePlayer.baseTeam || "None"}</p>
                  </div>
                </div>
              </motion.div>

              {/* Right: Bidding Controls */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-10">
                
                {/* Timer & Leading Bid */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className={`absolute inset-0 transition-opacity duration-1000 ${timeLeft <= 5 ? 'bg-ipl-red opacity-20' : 'bg-ipl-lightBlue opacity-10'}`} />
                    <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] transition-colors duration-1000 ${timeLeft <= 5 ? 'bg-ipl-red' : 'bg-ipl-lightBlue'}`} />
                    
                    <p className="text-xs font-black text-ipl-silver uppercase tracking-[0.3em] mb-3 relative z-10 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse blur-[1px] ${timeLeft <= 5 ? 'bg-red-400' : 'bg-blue-400'}`} />
                      Shot Clock
                    </p>
                    <p className={`text-[6rem] leading-none font-mono font-black relative z-10 tabular-nums tracking-tighter transition-colors ${timeLeft <= 5 ? "text-ipl-red animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "text-white"}`}>
                      {timeLeft}<span className="text-3xl font-body text-ipl-silver ml-2">s</span>
                    </p>
                  </div>

                  <div className="bg-gradient-to-tr from-ipl-dark to-[#081224] p-10 rounded-[2.5rem] border-[3px] border-ipl-gold/30 shadow-glow-gold flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gold-gradient opacity-5" />
                    <p className="text-xs font-black text-ipl-gold uppercase tracking-[0.3em] mb-4 relative z-10">Current Bid</p>
                    <p className="text-[5.5rem] leading-none font-mono font-black text-ipl-gold drop-shadow-[0_0_15px_rgba(226,180,90,0.6)] relative z-10 tabular-nums tracking-tighter">
                      {currentBid === 0 ? '—' : <><span className="text-4xl">₹</span>{currentBid}</>}
                    </p>
                  </div>
                </div>

                {/* Leading Team Banner */}
                <div className={`p-8 rounded-[2rem] border transition-all duration-500 flex items-center justify-center gap-6 shadow-lg ${
                  leadingTeam ? 'bg-[#0f2c25] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'glass-panel border-white/10'
                }`}>
                  {leadingTeam ? (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-50" />
                        <div className="h-4 w-4 bg-emerald-500 border-2 border-white rounded-full relative z-10" />
                      </div>
                      <p className="text-2xl font-display font-medium text-ipl-silver tracking-wide">
                        Leading: <span className="text-emerald-400 font-black uppercase tracking-widest">{leadingTeam.name || leadingTeam.displayName || leadingTeam.code}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-ipl-silver/50 font-bold uppercase tracking-[0.4em] text-lg">Awaiting First Bid</p>
                  )}
                </div>

                {/* Big Bid Button */}
                <button 
                  onClick={handleBid}
                  disabled={phase === "PAUSED" || leadingTeam?.teamId === myTeam?.teamId}
                  className={`group relative h-40 rounded-[3rem] overflow-hidden transition-all duration-300 transform active:scale-[0.98] border-2 ${
                    leadingTeam?.teamId === myTeam?.teamId 
                    ? 'bg-ipl-dark border-white/5 cursor-not-allowed opacity-80' 
                    : 'bg-gold-gradient border-ipl-gold/50 shadow-[0_20px_50px_rgba(226,180,90,0.4)] hover:shadow-[0_30px_60px_rgba(226,180,90,0.6)] hover:-translate-y-1'
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <p className={`text-sm font-black uppercase tracking-[0.5em] mb-2 ${leadingTeam?.teamId === myTeam?.teamId ? 'text-ipl-silver/50' : 'text-ipl-navy/70'}`}>
                      {leadingTeam?.teamId === myTeam?.teamId ? "Highest Bid" : "Action"}
                    </p>
                    <p className={`text-[3.5rem] leading-none font-display font-black uppercase tracking-tight ${leadingTeam?.teamId === myTeam?.teamId ? 'text-white' : 'text-ipl-navy drop-shadow-md'}`}>
                      {leadingTeam?.teamId === myTeam?.teamId ? "WINNING BID" : `BID ₹${nextBidAmount}L`}
                    </p>
                  </div>
                  {leadingTeam?.teamId !== myTeam?.teamId && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                  )}
                </button>

                {/* Admin Console */}
                {isAdmin && (
                  <div className="mt-4 p-6 glass-panel rounded-3xl border border-ipl-gold/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 border-b border-l border-ipl-gold/30 bg-ipl-gold/10 rounded-bl-2xl">
                       <span className="text-[10px] text-ipl-gold uppercase tracking-[0.3em] font-bold">Admin Console</span>
                    </div>
                    
                    <div className="flex gap-4 mb-6">
                      <button onClick={handleAdminPause} className="px-6 py-3 bg-ipl-dark hover:bg-white/10 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex-1">Pause</button>
                      <button onClick={handleAdminResume} className="px-6 py-3 bg-ipl-dark hover:bg-white/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex-1">Resume</button>
                    </div>
                    
                    <div className="flex gap-4 mb-6 pt-6 border-t border-white/10">
                      <button onClick={handleAdminNextPlayer} className="px-6 py-3 bg-ipl-lightBlue hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-colors flex-1">Fast Draw Next</button>
                      <button onClick={handleAdminStop} className="px-6 py-3 bg-ipl-red hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-colors">Conclude Auction</button>
                    </div>
                    
                    <div className="bg-ipl-dark/80 rounded-2xl p-5 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-ipl-silver font-bold">Next Player Queue</p>
                        <select 
                          className="bg-ipl-navy text-xs text-white border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-ipl-gold transition-colors font-mono"
                          value={selectedLot}
                          onChange={(e) => setSelectedLot(e.target.value)}
                        >
                          <option value="All">All Categories</option>
                          {lots.map(lot => <option key={lot} value={lot}>{lot}</option>)}
                        </select>
                      </div>
                      
                      {Array.isArray(state?.availablePlayers) && state?.availablePlayers.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                          {state.availablePlayers.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => handleAdminSelectPlayer(p.id)}
                              className="text-left px-4 py-3 border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-ipl-gold/40 transition-all group flex justify-between items-center"
                            >
                              <span className="text-sm font-bold text-white group-hover:text-ipl-gold truncate">{p.name}</span>
                              <span className="text-xs font-mono text-ipl-silver shrink-0 ml-2">₹{p.basePrice}L</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center">
                          <Trophy className="text-ipl-silver/30 mb-2" size={24} />
                          <p className="text-sm text-ipl-silver italic font-medium">No players remaining in selected category.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {phase === "PAUSED" && (
                  isAdmin ? (
                    <button 
                      onClick={handleAdminNextPlayer}
                      className="w-full py-5 bg-gradient-to-r from-ipl-dark to-ipl-navy hover:from-white/10 hover:to-white/5 border border-dashed border-ipl-gold/50 rounded-3xl font-bold text-ipl-gold transition-all uppercase tracking-[0.2em] shadow-glow-gold"
                    >
                      Auctioneer: Draw Next Player
                    </button>
                  ) : (
                    <div className="w-full py-5 text-center rounded-3xl font-bold text-ipl-silver/50 transition-all uppercase tracking-[0.2em] italic border border-dashed border-white/10 bg-white/5">
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
