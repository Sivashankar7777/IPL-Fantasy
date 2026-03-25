"use client";

import clsx from "clsx";
import type { AuctionPlayer } from "@/lib/types";

interface RetentionSelectionProps {
  players: AuctionPlayer[];
  selectedIds: string[];
  onToggle: (player: AuctionPlayer) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function RetentionSelection({
  players,
  selectedIds,
  onToggle,
  onSubmit,
  isSubmitting,
}: RetentionSelectionProps) {
  const selectedPlayers = players.filter((player) => selectedIds.includes(player.id));
  const indianCount = selectedPlayers.filter((player) => player.countryType === "INDIAN").length;
  const foreignCount = selectedPlayers.filter((player) => player.countryType === "FOREIGN").length;
  const isValid = selectedPlayers.length === 2 && indianCount === 1 && foreignCount === 1;

  return (
    <div className="glass-panel rounded-[32px] p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-stone-500">Retention Phase</p>
          <h2 className="font-display text-3xl">Select 1 Indian and 1 Foreign player</h2>
        </div>
        <div className="text-right text-sm text-stone-600">
          <p>Retention Cost: 100 points</p>
          <p>Budget after lock: 900 points</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {players.map((player) => {
          const active = selectedIds.includes(player.id);
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onToggle(player)}
              className={clsx(
                "rounded-[24px] border p-5 text-left transition",
                active
                  ? "border-amber-500 bg-stone-950 text-stone-50 shadow-xl"
                  : "border-stone-200 bg-white/80 hover:border-stone-400"
              )}
            >
              <p className="text-xs uppercase tracking-[0.3em] opacity-70">{player.countryType}</p>
              <h3 className="mt-3 text-xl font-semibold">{player.name}</h3>
              <p className="mt-2 text-sm opacity-80">{player.role}</p>
              <p className="mt-4 text-sm opacity-70">Base Price: {player.basePrice}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-stone-600">
          <p>Indian selected: {indianCount}/1</p>
          <p>Foreign selected: {foreignCount}/1</p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ivory disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Locking..." : "Lock Retentions"}
        </button>
      </div>
    </div>
  );
}
