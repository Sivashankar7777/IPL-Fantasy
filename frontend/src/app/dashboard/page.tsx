"use client";

import { useEffect, useState } from "react";
import { Trophy, Upload, RefreshCw, ChevronDown, ChevronUp, Users, Star, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

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
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingScorecard, setIsSyncingScorecard] = useState(false);
  const [isUndoingLastMatch, setIsUndoingLastMatch] = useState(false);
  const [scorecardUrl, setScorecardUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [scorecardStatus, setScorecardStatus] = useState<{
    totalSyncedMatches: number;
    lastSyncedMatch: { matchId: string; appliedAt: string | null } | null;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsAdmin(new URLSearchParams(window.location.search).get("admin") === "true");
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/leaderboard`, { cache: 'no-store' });
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecardStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/scorecard-sync-status`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setScorecardStatus({
          totalSyncedMatches: Number(data.totalSyncedMatches || 0),
          lastSyncedMatch: data.lastSyncedMatch || null,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchScorecardStatus();
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
          alert(`Successfully imported ${data.mappedPlayers} drafted players to their respective franchises!`);
        }
        fetchLeaderboard();
        fetchScorecardStatus();
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
        fetchScorecardStatus();
      } else {
        alert("Failed to reset squads.");
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  const handleUndoLastMatch = async () => {
    if (!confirm("Undo only the most recently uploaded match link? This will remove just that match's points.")) return;

    setIsUndoingLastMatch(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/undo-last-scorecard-sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        alert(`Removed the latest uploaded match link (${data.matchId}).`);
        fetchLeaderboard();
        fetchScorecardStatus();
      } else {
        alert(data.error || "Failed to undo the previous match link.");
      }
    } catch (error: any) {
      alert(`Network Error during undo: ${error.message}`);
    } finally {
      setIsUndoingLastMatch(false);
    }
  };

  const handleScorecardSync = async () => {
    const trimmedUrl = scorecardUrl.trim();
    if (!trimmedUrl) {
      alert("Please paste a Cricbuzz scorecard link first.");
      return;
    }

    setIsSyncingScorecard(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fantasy/scorecard-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scorecardUrl: trimmedUrl }),
      });
      const data = await res.json();

      if (data.success) {
        alert(`Synced match ${data.matchId}. Updated ${data.updatedPlayers} players.`);
        setScorecardUrl("");
        fetchLeaderboard();
        fetchScorecardStatus();
      } else {
        alert(data.error || "Failed to sync the scorecard link.");
      }
    } catch (error: any) {
      alert(`Network Error during scorecard sync: ${error.message}`);
    } finally {
      setIsSyncingScorecard(false);
    }
  };

  const lastSyncedLabel = scorecardStatus?.lastSyncedMatch?.appliedAt
    ? new Date(scorecardStatus.lastSyncedMatch.appliedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#020617] px-3 py-4 text-white font-sans selection:bg-emerald-500/30 sm:px-5 sm:py-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Top App Bar Navigation */}
        <div className="relative z-20 mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <button onClick={() => router.back()} className="group flex w-full items-center justify-center gap-3 text-sm font-bold tracking-wide text-slate-400 transition-colors hover:text-emerald-400 sm:w-auto sm:justify-start sm:text-base">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-2.5 rounded-full group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all shadow-lg">
              <ArrowLeft size={20} />
            </div>
            Back to Draft Room
          </button>

          <div className="relative w-full shadow-xl sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center sm:left-5">
              <Search size={18} className="text-slate-500 sm:h-5 sm:w-5" />
            </div>
            <input 
              type="text" 
              placeholder="Search players, teams, or owners..." 
              value={searchQuery}
              onChange={(e) => { 
                setSearchQuery(e.target.value); 
                if (e.target.value.length > 0 && !expandedTeamId) {
                  // Auto-expand all matching during search? That might be too complex.
                }
              }}
              className="w-full rounded-full border-2 border-slate-700/50 bg-slate-900/90 py-3 pl-12 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 sm:py-4 sm:pl-14 sm:pr-6 sm:text-base"
            />
          </div>
        </div>

        {/* Header Section */}
        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] sm:mb-12 sm:p-6 md:flex md:items-center md:justify-between lg:p-8">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 mb-6 flex items-start gap-3 sm:items-center sm:gap-4 md:mb-0">
            <Trophy size={40} className="mt-1 shrink-0 text-yellow-400 sm:mt-0 sm:h-12 sm:w-12" />
            <div>
              <h1 className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl lg:text-4xl">
                IPL 2026 Fantasy Leaderboard
              </h1>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-slate-400 sm:text-sm sm:tracking-widest">Post-Auction Dream11 Tracker</p>
            </div>
          </div>

          <div className="relative z-10 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-4 md:w-auto">
            <button 
              onClick={() => fetchLeaderboard()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-xs font-black text-white shadow-[0_0_20px_rgba(5,150,105,0.6)] transition-all hover:from-emerald-500 hover:to-teal-400 sm:w-auto sm:px-6 sm:text-sm"
            >
              <RefreshCw size={18} />
              SYNC LIVE POINTS
            </button>
            
            {isAdmin && (
              <>
                <button 
                  onClick={handleResetSquads}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-xs font-bold text-rose-500 shadow-lg transition-all hover:border-rose-500/50 hover:bg-slate-700 hover:text-rose-400 sm:w-auto sm:px-6 sm:text-sm"
                >
                  Reset Squads
                </button>
                <button
                  onClick={handleUndoLastMatch}
                  disabled={isUndoingLastMatch}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300 shadow-lg transition-all hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6 sm:text-sm"
                >
                  {isUndoingLastMatch ? "Undoing Previous Match..." : "Undo Previous Match"}
                </button>
                <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-3 text-xs font-bold text-white shadow-lg transition-all sm:w-auto sm:px-6 sm:text-sm ${isUploading ? 'bg-slate-600 opacity-50' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload Final Squads
                    </>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleUploadSquads} disabled={isUploading} />
                </label>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300 shadow-lg sm:px-5">
            {scorecardStatus?.lastSyncedMatch ? (
              <p>
                Last synced match: <span className="font-bold text-emerald-300">{scorecardStatus.lastSyncedMatch.matchId}</span>
                {" • "}
                Active scorecard links: <span className="font-bold text-white">{scorecardStatus.totalSyncedMatches}</span>
                {lastSyncedLabel ? ` • Synced on ${lastSyncedLabel}` : ""}
              </p>
            ) : (
              <p>No scorecard links have been synced yet.</p>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Scorecard Sync</p>
                <h2 className="mt-2 text-xl font-black text-white">Paste a Cricbuzz match link</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Each new match adds to the existing fantasy scores. Re-uploading the same match updates it without double counting.
                </p>
                <input
                  type="text"
                  value={scorecardUrl}
                  onChange={(event) => setScorecardUrl(event.target.value)}
                  placeholder="https://www.cricbuzz.com/live-cricket-scorecard/..."
                  className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <button
                onClick={handleScorecardSync}
                disabled={isSyncingScorecard}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_20px_rgba(5,150,105,0.35)] transition-all hover:from-emerald-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                {isSyncingScorecard ? "Syncing Match Link..." : "Sync Match Link"}
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="relative z-10 space-y-4">
            {leaderboard.filter(team => {
              const q = searchQuery.toLowerCase();
              if (!q) return true;
              const teamMatch = team.name?.toLowerCase().includes(q) || team.code?.toLowerCase().includes(q) || team.displayName?.toLowerCase().includes(q);
              const playerMatch = team.currentSquadPlayers?.some((p: any) => p.name?.toLowerCase().includes(q));
              return teamMatch || playerMatch;
            }).map((team, index) => {
              // If searching for a specific player, auto-expand the team
              const isExpanded = (expandedTeamId === team.id) || (searchQuery.length > 2 && team.currentSquadPlayers?.some((p: any) => p.name?.toLowerCase().includes(searchQuery.toLowerCase())));
              
              return (
                <div key={team.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg transition-all duration-300 hover:border-slate-700">
                  {/* Team Banner / Rank Row */}
                  <div 
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                    className="cursor-pointer p-4 transition-colors hover:bg-slate-800/50 sm:p-5 lg:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3 sm:gap-4 lg:gap-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-base font-black text-slate-300 shadow-inner sm:h-12 sm:w-12 sm:text-xl">
                        #{index + 1}
                      </div>
                      {LOGO_MAP[team.code] && (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-[0_0_15px_rgba(255,255,255,0.15)] sm:h-16 sm:w-16 sm:p-2">
                          <img src={LOGO_MAP[team.code]} alt={team.code} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="flex flex-wrap items-center gap-2 text-lg font-black tracking-wide sm:gap-3 sm:text-2xl">
                          {team.displayName === team.name ? team.shortName : team.displayName} 
                          <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-400 sm:text-xs">{team.code}</span>
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] text-slate-500 sm:text-sm sm:tracking-widest">
                          <Users size={14} className="shrink-0 text-blue-400" /> {team.currentSquadPlayers?.length || 0} Players
                        </p>
                      </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 lg:min-w-[220px] lg:justify-end lg:gap-8 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                      <div className="text-left lg:text-right">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 sm:text-xs sm:tracking-widest">Total Points</p>
                        <p className="tabular-nums text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(5,150,105,0.3)] sm:text-3xl">
                          {team.totalDream11Points?.toLocaleString() || 0} <span className="text-sm text-emerald-600 font-bold">PTS</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-slate-500">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Expanded Squad View */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-4 shadow-inner tracking-wide sm:p-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                        {team.currentSquadPlayers?.filter((p: any) => {
                           const q = searchQuery.toLowerCase();
                           if (!q) return true;
                           // If they searched the TEAM name, show ALL players in the team. Otherwise filter specifically for that player name.
                           const teamMatch = team.name?.toLowerCase().includes(q) || team.code?.toLowerCase().includes(q) || team.displayName?.toLowerCase().includes(q);
                           return teamMatch || p.name?.toLowerCase().includes(q);
                        }).sort((a: any, b: any) => {
                           const roleA = roleOrder[a.role] || 99;
                           const roleB = roleOrder[b.role] || 99;
                           if (roleA !== roleB) return roleA - roleB;
                           if ((b.currentPrice || 0) !== (a.currentPrice || 0)) return (b.currentPrice || 0) - (a.currentPrice || 0);
                           return a.name.localeCompare(b.name);
                        }).map((player: any) => (
                          <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col items-center text-center shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            
                            <img 
                              src={`${BACKEND_URL}/api/player-image?name=${encodeURIComponent(player.name)}`}
                              alt={player.name}
                              className="w-16 h-16 rounded-full border-2 border-slate-700 shadow-md mb-3 object-cover shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                            />

                            <h4 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-emerald-400 transition-colors">{player.name}</h4>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-4 flex items-center justify-center flex-wrap gap-1">
                              {player.role} <span className="opacity-50">•</span> {player.countryType === "FOREIGN" ? "✈️" : "IN"}
                              {player.currentPrice > 0 && (
                                <>
                                  <span className="opacity-50">•</span> <span className="text-blue-400">₹{player.currentPrice}L</span>
                                </>
                              )}
                            </p>
                            
                            <div className="mt-auto w-full rounded-lg py-2 flex flex-col items-center border-t border-slate-700/50 bg-slate-900/50 shadow-inner">
                              <Star size={12} className={player.dream11Points > 0 ? "text-emerald-400 mb-1" : "text-yellow-600 mb-1"} />
                              <p className={`text-xl font-black tabular-nums ${player.dream11Points > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                                {player.dream11Points} <span className="text-[10px]">PTS</span>
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!team.currentSquadPlayers || team.currentSquadPlayers.length === 0) && (
                          <div className="col-span-full py-8 text-center text-slate-500 italic font-medium">
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
