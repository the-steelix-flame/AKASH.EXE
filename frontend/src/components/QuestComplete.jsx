import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LockOpen, Map } from "lucide-react";
import Starfield from "@/components/Starfield";
import { useAudioActions } from "@/hooks/useAudio";
import { sfx } from "@/utils/sfx";

const PORTALS = [
  { key: "knowme", label: "KNOW ME", sub: "LEVEL 1", color: "text-neon border-neon/50 hover:bg-neon/10" },
  { key: "builds", label: "MY BUILDS", sub: "LEVEL 2", color: "text-volt border-volt/50 hover:bg-volt/10" },
  { key: "mind", label: "HOW I THINK", sub: "LEVEL 3", color: "text-aura border-aura/50 hover:bg-aura/10" },
  { key: "growth", label: "WISPR FLOW PITCH", sub: "LEVEL 4", color: "text-ember border-ember/50 hover:bg-ember/10" },
];

export default function QuestComplete({ onEnter, onReturn }) {
  const { play } = useAudioActions();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    play("quest_complete");
    sfx.win();
    const t = setTimeout(() => setRevealed(true), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20" data-testid="quest-complete-screen">
      <Starfield density={90} />
      <div className="relative z-10 w-full max-w-3xl text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 14 }}
          className="font-display text-4xl font-black text-neon text-glow-lime sm:text-6xl"
          data-testid="quest-complete-title"
        >
          QUEST COMPLETED.
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-sm tracking-[0.3em] text-slate-300 sm:text-base"
          data-testid="quest-complete-subtitle"
        >
          ALL FOUR SPACES CLEARED.
        </motion.p>

        {revealed && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2" data-testid="unlocked-portals">
            {PORTALS.map((p, i) => (
              <motion.button
                key={p.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                data-testid={`portal-${p.key}`}
                onClick={() => { sfx.unlock(); onEnter(p.key); }}
                className={`group flex items-center justify-between gap-4 rounded-xl border-2 bg-slate-950/80 px-6 py-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-neon ${p.color}`}
              >
                <div>
                  <div className="text-[9px] tracking-[0.3em] opacity-70">{p.sub}</div>
                  <div className="font-display mt-1 text-sm font-bold sm:text-base">{p.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <LockOpen className="h-4 w-4 opacity-70" />
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.button>
            ))}
          </div>
        )}


        <button
          data-testid="finale-return-map-btn"
          onClick={onReturn}
          className="mx-auto mt-10 flex items-center gap-2 rounded-md border-2 border-volt px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-volt transition-colors hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt"
        >
          <Map className="h-4 w-4" /> RETURN TO SPACE MAP
        </button>
      </div>
    </div>
  );
}
