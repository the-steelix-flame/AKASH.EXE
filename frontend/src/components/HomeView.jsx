import { motion } from "framer-motion";
import { sfx } from "@/utils/sfx";

export default function HomeView({ completedCount, onNavigate }) {
  const done = completedCount === 4;
  return (
    <div>
      <div className="relative overflow-hidden border-y border-slate-800 px-4 pb-10 pt-12 text-center sm:px-8" data-testid="home-view">
        <div className="grid-floor absolute inset-0" aria-hidden="true" />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display relative text-3xl font-black sm:text-5xl"
          data-testid="home-title"
        >
          <span className="text-neon text-glow-lime">AKASH.EXE</span> <span className="text-white">// THE GROWTH QUEST</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative mt-4 text-xs tracking-[0.25em] text-slate-400 sm:text-sm">
          {done ? "ALL FOUR SPACES CLEARED" : `${completedCount}/4 SPACES CLEARED`}
        </motion.p>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="relative mt-6 flex flex-wrap justify-center gap-2">
            {[
              ["knowme", "KNOW ME", "neon"],
              ["builds", "MY BUILDS", "volt"],
              ["mind", "HOW I THINK", "aura"],
              ["growth", "WISPR FLOW PITCH", "ember"],
              ["ending", "FINAL TRANSMISSION", "neon"],
            ].map(([key, label, color]) => (
              <button
                key={key}
                data-testid={`home-portal-${key}`}
                onClick={() => { sfx.click(); onNavigate(key); }}
                className={`rounded border px-4 py-2 text-[10px] font-bold tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-neon ${
                  color === "neon" ? "border-neon/50 text-neon hover:bg-neon/10"
                  : color === "volt" ? "border-volt/50 text-volt hover:bg-volt/10"
                  : color === "aura" ? "border-aura/50 text-aura hover:bg-aura/10"
                  : "border-ember/50 text-ember hover:bg-ember/10"
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
