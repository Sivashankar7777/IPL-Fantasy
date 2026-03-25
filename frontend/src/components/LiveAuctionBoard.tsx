"use client";

import { Clock3, Gavel, Wallet } from "lucide-react";
import type { AuctionState, TeamState } from "@/lib/types";

interface LiveAuctionBoardProps {
  state: AuctionState;
  currentUserId: string;
  onBid: () => void;
}

function TeamMiniCard({ team, isActive }: { team: TeamState; isActive: boolean }) {
  return (
    <div className={`rounded-[22px] border p-4 ${isActive ? "border-amber-500 bg-white" : "border-stone-200 bg-white/60"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{team.code}</h3>
        <span className="text-xs text-stone-500">{team.playerCount}/15</span>
      </div>
      <p className="mt-3 text-sm text-stone-600">{team.displayName}</p>
      <div className="mt-4 text-sm text-stone-700">
        <p>Budget: {team.budgetRemaining}</p>
        <p>Overseas: {team.overseasCount}/6</p>
      </div>
    </div>
  );
}

export function LiveAuctionBoard({ state, currentUserId, onBid }: LiveAuctionBoardProps) {
  const activePlayer = state.activeBid?.player;
  const currentBid = state.activeBid?.amount ?? 0;
  const increment = state.activeBid?.bidIncrement ?? 5;
  const activeBidder = state.activeBid?.highestBidderUserId;
  const timerProgress = `${Math.max((state.timeRemaining / 15) * 100, 0)}%`;

  const leftTeams = state.teams.slice(0, 4);
  const rightTeams = state.teams.slice(4, 8);

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
      <div className="grid gap-4">
        {leftTeams.map((team) => (
          <TeamMiniCard key={team.teamId} team={team} isActive={activeBidder === team.ownerUserId} />
        ))}
      </div>

      <div className="glass-panel rounded-[36px] p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-stone-500">Live Auction</p>
            <h2 className="mt-2 font-display text-4xl">{activePlayer?.name ?? "Waiting for next lot"}</h2>
            <p className="mt-2 text-stone-600">
              {activePlayer ? `${activePlayer.role} • ${activePlayer.country}` : "The next player will appear here."}
            </p>
          </div>
          <div className="rounded-[26px] bg-stone-950 px-5 py-4 text-stone-50">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Base Price</p>
            <p className="mt-2 text-3xl font-semibold">{activePlayer?.basePrice ?? 50}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[32px] bg-stone-950 p-6 text-stone-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Current Bid</p>
              <div className="mt-3 flex items-center gap-3 text-5xl font-semibold">
                <Gavel className="h-10 w-10 text-amber-400" />
                {currentBid}
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <Clock3 className="h-8 w-8 text-amber-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Timer</p>
                <p className="text-4xl font-semibold">{state.timeRemaining}s</p>
              </div>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all" style={{ width: timerProgress }} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="rounded-[26px] border border-stone-200 bg-white/70 px-5 py-4">
            <p className="flex items-center gap-2 text-sm text-stone-600">
              <Wallet className="h-4 w-4" />
              Next Increment
            </p>
            <p className="mt-2 text-2xl font-semibold">+{increment}</p>
          </div>
          <button
            type="button"
            onClick={onBid}
            className="rounded-full bg-ember px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          >
            BID NOW (+{increment})
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {rightTeams.map((team) => (
          <TeamMiniCard key={team.teamId} team={team} isActive={activeBidder === team.ownerUserId} />
        ))}
      </div>
    </div>
  );
}
