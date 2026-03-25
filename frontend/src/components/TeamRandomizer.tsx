"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { TeamState } from "@/lib/types";

interface TeamRandomizerProps {
  spinning: boolean;
  assignments: { username: string; team: TeamState }[];
}

export function TeamRandomizer({ spinning, assignments }: TeamRandomizerProps) {
  return (
    <div className="glass-panel rounded-[32px] p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-stone-500">Team Randomizer</p>
          <h2 className="font-display text-3xl text-ink">Franchise Allocation</h2>
        </div>
        <div className="rounded-full bg-ink px-4 py-2 text-sm text-ivory">
          {spinning ? "Spinning..." : "Locked In"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {assignments.map((assignment, index) => (
            <motion.div
              key={`${assignment.username}-${assignment.team.code}`}
              initial={{ opacity: 0, y: 30, rotateX: -35 }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                transition: {
                  delay: spinning ? 0 : index * 0.08,
                  duration: 0.55,
                },
              }}
              className="relative overflow-hidden rounded-[28px] p-[1px]"
              style={{
                background: `linear-gradient(135deg, ${assignment.team.code === "CSK" ? "#F6C334" : "#171717"}, rgba(255,255,255,0.8))`,
              }}
            >
              <motion.div
                animate={
                  spinning
                    ? { y: ["0%", "-200%", "0%"] }
                    : { y: "0%" }
                }
                transition={{
                  duration: spinning ? 0.5 : 0.2,
                  repeat: spinning ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className="rounded-[27px] bg-stone-950 px-5 py-6 text-stone-50"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-stone-400">{assignment.username}</p>
                <h3 className="mt-3 font-display text-2xl">{assignment.team.code}</h3>
                <p className="mt-2 text-sm text-stone-300">{assignment.team.displayName}</p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
