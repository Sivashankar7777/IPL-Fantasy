"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export default function ReplacementsAdminPage() {
  const [injuredPlayerId, setInjuredPlayerId] = useState("");
  const [replacementPlayerId, setReplacementPlayerId] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult("");

    try {
      const response = await fetch(`${API_URL}/api/admin/replacements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ injuredPlayerId, replacementPlayerId }),
      });

      const data = await response.json();
      setResult(data.ok ? "Replacement rule validated successfully." : data.error);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="glass-panel rounded-[32px] p-8">
          <p className="text-sm uppercase tracking-[0.4em] text-stone-500">Admin Dashboard</p>
          <h1 className="mt-2 font-display text-4xl">Injury Replacement Validation</h1>
          <p className="mt-3 text-stone-600">
            A replacement is allowed only when the injured player has `matchesPlayed = 0`.
          </p>

          <div className="mt-8 grid gap-4">
            <input
              value={injuredPlayerId}
              onChange={(event) => setInjuredPlayerId(event.target.value)}
              placeholder="Injured player ID"
              className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 outline-none"
            />
            <input
              value={replacementPlayerId}
              onChange={(event) => setReplacementPlayerId(event.target.value)}
              placeholder="Replacement player ID"
              className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-fit rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ivory disabled:opacity-50"
            >
              {loading ? "Validating..." : "Validate Replacement"}
            </button>
          </div>

          {result ? <p className="mt-6 text-sm text-stone-700">{result}</p> : null}
        </div>
      </div>
    </main>
  );
}
