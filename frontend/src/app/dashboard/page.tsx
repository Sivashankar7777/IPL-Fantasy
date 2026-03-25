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
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    fetchLeaderboard();
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

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* Top App Bar Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 z-20 relative">
          <button onClick={() => router.back()} className="group flex items-center gap-3 text-slate-400 hover:text-emerald-400 font-bold tracking-wide transition-colors">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-2.5 rounded-full group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all shadow-lg">
              <ArrowLeft size={20} />
            </div>
            Back to Draft Room
          </button>

          <div className="relative w-full sm:w-96 shadow-xl">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-500" />
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
              className="w-full bg-slate-900/90 backdrop-blur border-2 border-slate-700/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-white placeholder-slate-500 font-medium rounded-full py-4 pl-14 pr-6 transition-all outline-none"
            />
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-4 mb-6 md:mb-0">
            <Trophy size={48} className="text-yellow-400" />
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                IPL 2026 Fantasy Leaderboard
              </h1>
              <p className="text-slate-400 font-medium uppercase tracking-widest text-sm mt-1">Post-Auction Dream11 Tracker</p>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap justify-end items-center gap-4">
            <button 
              onClick={() => fetchLeaderboard()}
              className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-3 px-6 rounded-xl text-sm border border-emerald-400/50 transition-all shadow-[0_0_20px_rgba(5,150,105,0.6)] flex items-center gap-2"
            >
              <RefreshCw size={18} />
              SYNC LIVE POINTS
            </button>
            
            {isAdmin && (
              <>
                <button 
                  onClick={handleResetSquads}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-500 hover:text-rose-400 font-bold py-3 px-6 rounded-xl text-sm border border-slate-600 hover:border-rose-500/50 transition-all shadow-lg flex items-center gap-2"
                >
                  Reset Squads
                </button>
                <label className={`cursor-pointer ${isUploading ? 'bg-slate-600 opacity-50' : 'bg-slate-800 hover:bg-slate-700'} text-white font-bold py-3 px-6 rounded-xl text-sm border border-slate-600 transition-all shadow-lg flex items-center gap-2`}>
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

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
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
                <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg hover:border-slate-700">
                  {/* Team Banner / Rank Row */}
                  <div 
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-full text-xl font-black text-slate-300 shadow-inner">
                        #{index + 1}
                      </div>
                      {LOGO_MAP[team.code] && (
                        <div className="w-16 h-16 flex items-center justify-center p-2 bg-white rounded-full overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.15)] shrink-0">
                          <img src={LOGO_MAP[team.code]} alt={team.code} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-black tracking-wide flex items-center gap-3">
                          {team.displayName === team.name ? team.shortName : team.displayName} 
                          <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md font-mono">{team.code}</span>
                        </h2>
                        <p className="text-slate-500 text-sm font-semibold tracking-widest mt-1 flex items-center gap-2">
                          <Users size={14} className="text-blue-400" /> {team.currentSquadPlayers?.length || 0} Players
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Points</p>
                        <p className="text-3xl font-black text-emerald-400 tabular-nums drop-shadow-[0_0_10px_rgba(5,150,105,0.3)]">
                          {team.totalDream11Points?.toLocaleString() || 0} <span className="text-sm text-emerald-600 font-bold">PTS</span>
                        </p>
                      </div>
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Squad View */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-6 shadow-inner tracking-wide">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
