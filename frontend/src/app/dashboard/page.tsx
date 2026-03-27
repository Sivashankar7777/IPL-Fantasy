"use client";

import { useEffect, useState } from "react";
import { Trophy, Upload, ChevronDown, ChevronUp, Users, Star, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/config";

const LOGO_MAP: Record<string, string> = {
  CSK: "https://scores.iplt20.com/ipl/teamlogos/CSK.png",
  MI: "https://scores.iplt20.com/ipl/teamlogos/MI.png",
  RCB: "https://scores.iplt20.com/ipl/teamlogos/RCB.png",
  KKR: "https://scores.iplt20.com/ipl/teamlogos/KKR.png",
  SRH: "https://scores.iplt20.com/ipl/teamlogos/SRH.png",
  RR: "https://scores.iplt20.com/ipl/teamlogos/RR.png",
  DC: "https://scores.iplt20.com/ipl/teamlogos/DC.png",
  PBKS: "https://scores.iplt20.com/ipl/teamlogos/PBKS.png",
  LSG: "https://scores.iplt20.com/ipl/teamlogos/LSG.png",
  GT: "https://scores.iplt20.com/ipl/teamlogos/GT.png",
};

const roleOrder: Record<string, number> = {
  "Batsman": 1,
  "BAT": 1,
  "WK": 2,
  "Wicketkeeper": 2,
  "Wicket Keeper": 2,
  "All-rounder": 3,
  "Allrounder": 3,
  "AR": 3,
  "Bowler": 4,
  "BOWL": 4
};

export default function FantasyDashboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingScorecard, setIsSyncingScorecard] = useState(false);
  const [scorecardUrl, setScorecardUrl] = useState("https://www.cricbuzz.com/live-cricket-scorecard/114960/kkr-vs-rcb-1st-match-indian-premier-league-2025");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    setIsAdmin(new URLSearchParams(window.location.search).get("admin") === "true");
  }, []);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  const filteredLeaderboard = safeLeaderboard.filter((team) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const teamMatch =
      team.name?.toLowerCase().includes(q) ||
      team.code?.toLowerCase().includes(q) ||
      team.displayName?.toLowerCase().includes(q);
    const playerMatch = team.currentSquadPlayers?.some((p: any) => p.name?.toLowerCase().includes(q));
    return teamMatch || playerMatch;
  });

  const totalPlayersTracked = safeLeaderboard.reduce((sum, team) => sum + (team.currentSquadPlayers?.length || 0), 0);
  const leader = safeLeaderboard[0];

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/leaderboard`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
      setBackendError("");
    } catch (err: any) {
      setLeaderboard([]);
      setBackendError(err?.message || `Could not reach backend at ${BACKEND_URL}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchLeaderboard();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const handleUploadSquads = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/upload-squads`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (data.mappedPlayers === 0) {
          console.log("Upload Debug JSON:", data.debug);
          alert(`0 players mapped. Check the console for full JSON! \n\nTop Failures:\n${data.failed?.join('\n')}`);
        } else {
          const createdSuffix = data.createdPlayers ? ` (${data.createdPlayers} new players created in the database)` : "";
          alert(`Successfully imported ${data.mappedPlayers} drafted players to their respective franchises!${createdSuffix}`);
        }
        fetchLeaderboard();
      } else {
        alert(`Upload Failed: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Network Error during upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetSquads = async () => {
    if (!confirm("Are you sure you want to completely DETACH all players from their franchises and reset points to 0?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/reset-squads`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Success! All players have been detached and points cleared.");
        fetchLeaderboard();
      } else {
        alert("Failed to reset squads.");
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  const handleScorecardSync = async () => {
    if (!scorecardUrl.trim()) {
      alert("Paste a Cricbuzz scorecard link first.");
      return;
    }

    setIsSyncingScorecard(true);
    setSyncMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/scorecard-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scorecardUrl: scorecardUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync scorecard.");
      }
      setSyncMessage(`Synced match ${data.matchId}. Updated ${data.updatedPlayers} player records using ${data.source === "rapidapi" ? "RapidAPI" : "the Cricbuzz scorecard page"}.`);
      await fetchLeaderboard();
    } catch (error: any) {
      setSyncMessage("");
      alert(error.message || "Failed to sync scorecard.");
    } finally {
      setIsSyncingScorecard(false);
    }
  };

  return (
    <div className="min-h-screen bg-ipl-navy p-8 font-sans text-white selection:bg-ipl-gold/30 relative overflow-hidden">
      {/* Ambient Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[45%] h-[45%] bg-ipl-blue rounded-full blur-[200px] opacity-20" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] bg-ipl-gold rounded-full blur-[200px] opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Top App Bar Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 z-20 relative">
          <button onClick={() => router.push("/")} className="group flex items-center gap-4 text-ipl-silver hover:text-ipl-gold font-bold tracking-widest transition-colors uppercase text-sm">
            <div className="glass-panel p-3 rounded-full group-hover:bg-ipl-gold/10 group-hover:border-ipl-gold/40 transition-all shadow-lg">
              <ArrowLeft size={20} />
            </div>
            Back to Draft Room
          </button>

          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search size={20} className="text-ipl-silver/50" />
            </div>
            <input 
              type="text" 
              placeholder="Search players, teams, or owners..." 
              value={searchQuery}
              onChange={(e) => { 
                setSearchQuery(e.target.value); 
              }}
              className="w-full glass-panel !bg-ipl-dark/80 border-2 !border-white/10 focus:!border-ipl-gold/50 focus:ring-4 focus:ring-ipl-gold/10 text-white placeholder-ipl-silver/40 font-medium rounded-full py-4 pl-14 pr-6 transition-all outline-none font-body"
            />
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,19,32,0.96),rgba(17,52,35,0.58))] p-10 shadow-2xl">
            <div className="absolute inset-0 pitch-grid opacity-20" />
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-ipl-blue opacity-20 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 opacity-30 blur-[120px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="h-20 w-20 bg-gold-gradient rounded-3xl flex items-center justify-center shadow-glow-gold cricket-orb">
                <Trophy size={44} className="text-ipl-navy relative z-10" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.42em] text-ipl-gold">Fantasy Control Room</p>
                <h1 className="mt-3 text-5xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gold-gradient">
                  IPL 2026 Fantasy
                </h1>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.3em] text-ipl-silver/70">Post-Auction Dream11 Tracker</p>
              </div>
            </div>

            {isAdmin && (
              <div className="relative z-10 mt-8 flex flex-col gap-3 xl:flex-row">
                <input
                  type="url"
                  value={scorecardUrl}
                  onChange={(e) => setScorecardUrl(e.target.value)}
                  placeholder="Paste Cricbuzz scorecard link, for example KKR vs RCB"
                  className="flex-1 rounded-2xl border border-white/10 bg-ipl-dark/80 px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-ipl-silver/40 focus:border-ipl-gold/50"
                />
                <button
                  onClick={handleScorecardSync}
                  disabled={isSyncingScorecard}
                  className="rounded-2xl bg-gold-gradient px-6 py-4 text-sm font-black uppercase tracking-widest text-ipl-navy transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSyncingScorecard ? "Syncing..." : "Sync From Scorecard"}
                </button>
              </div>
            )}

            {isAdmin && syncMessage && (
              <p className="relative z-10 mt-3 text-sm font-medium text-emerald-300">
                {syncMessage}
              </p>
            )}

            {backendError && (
              <p className="relative z-10 mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                Backend unavailable. Tried <span className="font-mono">{BACKEND_URL}</span>. {backendError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="glass-panel rounded-[1.75rem] p-6 border-emerald-400/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Leader</p>
              <p className="mt-3 text-2xl font-display font-black text-white">{leader?.displayName || leader?.name || "TBD"}</p>
              <p className="mt-2 text-sm text-ipl-gold">{leader?.totalDream11Points?.toLocaleString?.() || 0} pts</p>
            </div>
            <div className="glass-panel rounded-[1.75rem] p-6 border-emerald-400/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Teams</p>
              <p className="mt-3 text-2xl font-display font-black text-white">{safeLeaderboard.length}</p>
              <p className="mt-2 text-sm text-ipl-silver/75">Ranked live on the board</p>
            </div>
            <div className="glass-panel rounded-[1.75rem] p-6 border-emerald-400/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ipl-silver/60">Players</p>
              <p className="mt-3 text-2xl font-display font-black text-white">{totalPlayersTracked}</p>
              <p className="mt-2 text-sm text-ipl-silver/75">Tracked across all squads</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-14 glass-panel p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-ipl-blue rounded-full blur-[120px] opacity-20 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-ipl-gold rounded-full blur-[120px] opacity-15 pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.36em] text-ipl-gold">Board Tools</p>
            <p className="mt-2 text-sm text-ipl-silver/75">Search squads, sync scorecards, upload final teams, or reset the board.</p>
          </div>

          <div className="relative z-10 flex flex-wrap justify-end items-center gap-4">
            {isAdmin && (
              <>
                <button 
                  onClick={handleResetSquads}
                  className="glass-panel hover:bg-white/5 text-ipl-red font-black py-4 px-8 rounded-2xl text-sm border border-ipl-red/30 hover:border-ipl-red/50 transition-all shadow-lg flex items-center gap-3 uppercase tracking-widest"
                >
                  Reset Squads
                </button>
                <label className={`cursor-pointer ${isUploading ? 'opacity-50' : 'hover:bg-white/5'} glass-panel text-ipl-gold font-black py-4 px-8 rounded-2xl text-sm border border-ipl-gold/30 transition-all shadow-lg flex items-center gap-3 uppercase tracking-widest`}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-ipl-gold/20 border-t-ipl-gold rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload Squads
                    </>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleUploadSquads} disabled={isUploading} />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-ipl-gold/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-ipl-gold rounded-full border-t-transparent animate-spin" />
              <Trophy size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-ipl-gold/50" />
            </div>
            <p className="text-ipl-silver font-medium italic tracking-widest">Loading Leaderboard...</p>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {filteredLeaderboard.map((team, index) => {
              // If searching for a specific player, auto-expand the team
              const isExpanded = (expandedTeamId === team.id) || (searchQuery.length > 2 && team.currentSquadPlayers?.some((p: any) => p.name?.toLowerCase().includes(searchQuery.toLowerCase())));
              
              return (
                <div key={team.id} className={`glass-panel rounded-[2rem] overflow-hidden transition-all duration-300 shadow-xl ${
                  index === 0 ? 'border-ipl-gold/40 shadow-[0_0_30px_rgba(226,180,90,0.15)]' : 'border-white/10 hover:border-ipl-lightBlue/30'
                }`}>
                  {/* Team Banner / Rank Row */}
                  <div 
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                    className="flex items-center justify-between p-8 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 flex items-center justify-center rounded-2xl text-2xl font-black shadow-inner ${
                        index === 0 ? 'bg-gold-gradient text-ipl-navy shadow-glow-gold' : 'bg-ipl-dark border border-white/10 text-ipl-silver'
                      }`}>
                        #{index + 1}
                      </div>
                      {LOGO_MAP[team.code] && (
                        <div className="w-16 h-16 flex items-center justify-center p-2 bg-white rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] shrink-0">
                          <img src={LOGO_MAP[team.code]} alt={team.code} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h2 className={`text-3xl font-display font-black tracking-tight flex items-center gap-4 ${
                          index === 0 ? 'text-ipl-gold' : 'text-white'
                        }`}>
                          {team.displayName === team.name ? team.shortName : team.displayName} 
                          <span className="text-[10px] px-3 py-1.5 bg-ipl-dark text-ipl-silver rounded-lg font-mono tracking-widest border border-white/5">{team.code}</span>
                        </h2>
                        <p className="text-ipl-silver/70 text-xs font-bold tracking-[0.3em] mt-2 flex items-center gap-2 uppercase">
                          <Users size={14} className="text-ipl-lightBlue" /> {team.currentSquadPlayers?.length || 0} Players Drafted
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right bg-ipl-dark/50 px-8 py-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-ipl-silver/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Total Points</p>
                        <p className={`text-4xl font-mono font-black tabular-nums ${
                          index === 0 ? 'text-ipl-gold drop-shadow-[0_0_15px_rgba(226,180,90,0.5)]' : 'text-ipl-lightBlue'
                        }`}>
                          {team.totalDream11Points?.toLocaleString() || 0} <span className="text-xs opacity-60">PTS</span>
                        </p>
                      </div>
                      <div className="text-ipl-silver/50 bg-white/5 p-2 rounded-xl">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Squad View */}
                  {isExpanded && (
                    <div className="border-t border-white/10 bg-ipl-dark/30 p-8 shadow-inner">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                        {team.currentSquadPlayers?.filter((p: any) => {
                           const q = searchQuery.toLowerCase();
                           if (!q) return true;
                           const teamMatch = team.name?.toLowerCase().includes(q) || team.code?.toLowerCase().includes(q) || team.displayName?.toLowerCase().includes(q);
                           return teamMatch || p.name?.toLowerCase().includes(q);
                        }).sort((a: any, b: any) => {
                           const roleA = roleOrder[a.role] || 99;
                           const roleB = roleOrder[b.role] || 99;
                           if (roleA !== roleB) return roleA - roleB;
                           if ((b.currentPrice || 0) !== (a.currentPrice || 0)) return (b.currentPrice || 0) - (a.currentPrice || 0);
                           return a.name.localeCompare(b.name);
                        }).map((player: any) => (
                          <div key={player.id} className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center shadow-lg relative overflow-hidden group hover:border-ipl-gold/40 transition-all hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-30 group-hover:opacity-100 transition-opacity" />
                            
                            <img 
                              src={`${BACKEND_URL}/api/player-image?name=${encodeURIComponent(player.name)}`}
                              alt={player.name}
                              className="w-16 h-16 rounded-full border-2 border-white/20 shadow-md mb-4 object-cover group-hover:border-ipl-gold/50 transition-colors"
                            />

                            <h4 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-ipl-gold transition-colors text-sm">{player.name}</h4>
                            <p className="text-[10px] uppercase font-black text-ipl-silver/60 tracking-[0.2em] mb-4 flex items-center justify-center flex-wrap gap-1">
                              {player.role} <span className="opacity-30">•</span> {player.countryType === "FOREIGN" ? "✈️" : "🇮🇳"}
                              {player.currentPrice > 0 && (
                                <>
                                  <span className="opacity-30">•</span> <span className="text-ipl-gold">₹{player.currentPrice}L</span>
                                </>
                              )}
                            </p>
                            
                            <div className="mt-auto w-full rounded-xl py-3 flex flex-col items-center border-t border-white/5 bg-ipl-dark/50 shadow-inner">
                              <Star size={12} className={player.dream11Points > 0 ? "text-ipl-gold mb-1" : "text-ipl-silver/30 mb-1"} />
                              <p className={`text-xl font-mono font-black tabular-nums ${player.dream11Points > 0 ? "text-ipl-gold" : "text-ipl-silver/30"}`}>
                                {player.dream11Points} <span className="text-[10px] text-ipl-silver/40">PTS</span>
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!team.currentSquadPlayers || team.currentSquadPlayers.length === 0) && (
                          <div className="col-span-full py-12 text-center text-ipl-silver/40 italic font-medium tracking-widest">
                            No squad data uploaded for this franchise.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
