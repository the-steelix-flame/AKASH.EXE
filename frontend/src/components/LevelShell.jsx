import { motion } from "framer-motion";
import { Home, Map, Volume2 } from "lucide-react";

const ACCENT_TEXT = { volt: "text-volt", aura: "text-aura", ember: "text-ember", neon: "text-neon" };

// Shared frame for all four games.
//  - sticky bar under the nav: HOME + WORLD MAP are always one tap away, at any scroll position
//  - narration is spoken by the flying Akash agent (AkashAgent), which never intercepts clicks
//  - bottom of the page always has a RETURN TO WORLD MAP button
export default function LevelShell({ level, onBack, onHome, onReplayInstructions, children }) {
  return (
    <div className="relative min-h-screen pb-16 pt-14" data-testid={`level-${level.n}-screen`}>
      <div className="sticky top-[52px] z-30 border-b border-slate-800 bg-void" data-testid="level-topbar">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8">
          <div className="flex items-center gap-2">
            <button
              data-testid="level-home-btn"
              onClick={onHome}
              className="flex items-center gap-2 rounded border border-neon/50 bg-neon/10 px-3 py-2 text-[11px] font-bold tracking-widest text-neon transition-colors hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon"
            >
              <Home className="h-3.5 w-3.5" /> HOME
            </button>
            <button
              data-testid="back-to-map-btn"
              onClick={() => onBack()}
              className="flex items-center gap-2 rounded border border-slate-700 px-3 py-2 text-[11px] tracking-widest text-slate-300 transition-colors hover:border-volt hover:text-volt focus:outline-none focus:ring-2 focus:ring-volt"
            >
              <Map className="h-3.5 w-3.5" /> <span><span className="hidden min-[400px]:inline">WORLD </span>MAP</span>
            </button>
          </div>
          <button
            data-testid="replay-instructions-btn"
            onClick={onReplayInstructions}
            aria-label="Replay briefing"
            className="flex items-center gap-2 rounded border border-slate-700 px-3 py-2 text-[11px] tracking-widest text-slate-400 transition-colors hover:border-volt hover:text-volt focus:outline-none focus:ring-2 focus:ring-volt"
          >
            <Volume2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">REPLAY BRIEFING</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-8">
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="text-[10px] tracking-[0.4em] text-slate-500">LEVEL {level.n} // {level.theme.toUpperCase()}</div>
          <h1 className="font-display mt-2 text-2xl font-black text-white sm:text-3xl" data-testid={`level-${level.n}-title`}>
            {level.world} <span className="text-neon">//</span>{" "}
            <span className={ACCENT_TEXT[level.accent] || "text-neon"}>{level.game}</span>
          </h1>
        </motion.div>

        {children}

        <div className="mt-12 flex justify-center border-t border-slate-800 pt-8">
          <button
            data-testid="footer-return-to-map-btn"
            onClick={() => onBack()}
            className="flex items-center gap-2 rounded-md border-2 border-volt px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-volt transition-colors hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt"
          >
            <Map className="h-4 w-4" /> RETURN TO WORLD MAP
          </button>
        </div>
      </div>
    </div>
  );
}
