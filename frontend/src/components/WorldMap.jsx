import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Eye, Flame, Lock, Map as MapIcon, Play, RotateCcw, Swords, Trophy, TreePine, X } from "lucide-react";
import WorldMapArt from "@/components/WorldMapArt";
import { DIFFICULTY_LABELS, LEVELS, MAP_POSITIONS } from "@/data/levelsData";
import { sfx } from "@/utils/sfx";

const ICONS = { 1: TreePine, 2: Swords, 3: Eye, 4: Flame };
const COLORS = { neon: "#39FF14", volt: "#00F0FF", aura: "#A855F7", ember: "#F59E0B" };
const TEXT = { neon: "text-neon", volt: "text-volt", aura: "text-aura", ember: "text-ember" };

function Marker({ level, state, open, onToggle }) {
  const { x, y, territory } = MAP_POSITIONS[level.n];
  const color = COLORS[level.accent];
  const Icon = ICONS[level.n];
  const locked = state === "locked";
  const done = state === "completed";
  return (
    <button
      type="button"
      onClick={() => onToggle(level.n)}
      aria-expanded={open}
      aria-label={`Level ${level.n}: ${level.world}, ${state}`}
      data-testid={`level-marker-${level.n}`}
      data-state={state}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {state === "unlocked" && (
        <span aria-hidden="true" className="wm-anim wm-beam pointer-events-none absolute bottom-1/2 left-1/2 h-16 w-5 -translate-x-1/2 sm:h-32 sm:w-6" style={{ background: `linear-gradient(to top, ${color}88, transparent)`, clipPath: "polygon(30% 100%, 70% 100%, 100% 0, 0 0)" }} />
      )}
      <span
        className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-full border-[3px] transition-transform duration-200 group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-white/70 sm:h-[72px] sm:w-[72px] ${locked ? "opacity-80 grayscale" : ""}`}
        style={{
          borderColor: locked ? "#64748b" : color,
          background: locked ? "radial-gradient(circle at 35% 30%, #334155, #0f172a)" : `radial-gradient(circle at 35% 30%, ${color}55, #060b18 72%)`,
          boxShadow: locked ? "0 4px 14px rgba(0,0,0,0.6)" : `0 0 0 4px #060b18, 0 0 22px ${color}aa, 0 6px 16px rgba(0,0,0,0.6)`,
        }}
      >
        {state === "unlocked" && <span className="wm-anim wm-pulse absolute inset-0 rounded-full border-2" style={{ borderColor: color }} />}
        {locked ? <Lock className="h-5 w-5 text-slate-300 sm:h-6 sm:w-6" /> : <Icon className="h-6 w-6 sm:h-8 sm:w-8" style={{ color }} />}
        {done && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-void bg-neon text-void shadow-[0_0_10px_rgba(57,255,20,0.8)] sm:h-7 sm:w-7" data-testid={`level-${level.n}-status`}>
            <Check className="h-4 w-4" strokeWidth={4} />
          </span>
        )}
      </span>
      <span
        className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-slate-950/95 px-1.5 py-0.5 text-center leading-tight shadow-lg sm:mt-2 sm:px-2.5 sm:py-1"
        style={{ borderColor: locked ? "#475569" : `${color}99` }}
      >
        <span className="hidden text-[9px] tracking-[0.25em] text-slate-400 sm:block">LEVEL {level.n}</span>
        <span className="font-display block text-[8px] font-black tracking-wide sm:text-[11px]" style={{ color: locked ? "#94a3b8" : color }}>{territory}</span>
        <span className={`hidden text-[9px] font-bold tracking-[0.2em] sm:block ${locked ? "text-slate-500" : done ? "text-neon" : "text-white"}`}>
          {locked ? "LOCKED" : done ? "★ CLEARED" : "▶ READY"}
        </span>
      </span>
    </button>
  );
}

// True on phones. There the info card sits in the page flow under the map instead of floating
// over it (a floating card would cover the other markers and make them untappable).
function useIsSmall() {
  const [small, setSmall] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setSmall(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return small;
}

function InfoPanel({ level, state, onPlay, onRevisit, onClose, inline = false }) {
  const { x, y } = MAP_POSITIONS[level.n];
  const wrapRef = useRef(null);
  useEffect(() => {
    if (inline) wrapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [inline, level.n]);
  const above = y > 62;
  const locked = state === "locked";
  const done = state === "completed";
  // The wrapper owns the position (left + translateX); the motion child owns only the entrance
  // animation, so framer-motion can never overwrite the positioning transform.
  const wrapStyle = {
    left: `${x}%`,
    transform: `translateX(-${x}%)`,
    width: "min(310px, calc(100% - 16px))",
    ...(above ? { bottom: `calc(${100 - y}% + 46px)` } : { top: `calc(${y}% + 54px)` }),
  };
  return (
    <div ref={wrapRef} className={inline ? "mx-auto mt-3 max-w-md" : "absolute z-30"} style={inline ? undefined : wrapStyle}>
    <motion.div
      initial={{ opacity: 0, y: above ? 8 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-label={`${level.world} details`}
      className="relative rounded-xl border bg-slate-950 p-4 shadow-2xl"
      style={{ borderColor: locked ? "#475569" : COLORS[level.accent] }}
      data-testid="level-panel"
      data-level={level.n}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button onClick={onClose} aria-label="Close" className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${locked ? "border-slate-600 text-slate-400" : done ? "border-neon/50 bg-neon/10 text-neon" : "border-volt/50 bg-volt/10 text-volt"}`} data-testid="level-panel-state">
          {locked ? "LOCKED" : done ? "COMPLETED" : "UNLOCKED"}
        </span>
        <span className="text-[9px] tracking-[0.2em] text-slate-500">{DIFFICULTY_LABELS[level.difficulty - 1]}</span>
      </div>
      <div className={`font-display mt-2 text-sm font-black tracking-wide ${locked ? "text-slate-400" : TEXT[level.accent]}`}>
        LEVEL {level.n} // {level.world}
      </div>
      <div className="mt-0.5 text-[11px] font-bold tracking-[0.15em] text-slate-200">{level.game}</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{level.description}</p>
      <div className="mt-2 text-[10px] tracking-[0.15em] text-slate-500">UNLOCKS ▸ <span className="text-slate-300">{level.section}</span></div>

      <div className="mt-3 flex flex-col gap-2">
        {locked ? (
          <div className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-[10px] tracking-widest text-slate-400" data-testid={`level-${level.n}-locked-note`}>
            <Lock className="mr-1.5 inline h-3 w-3" /> CLEAR LEVEL {level.n - 1} TO UNLOCK
          </div>
        ) : (
          <>
            {done && (
              <button
                data-testid={`level-${level.n}-revisit-btn`}
                onClick={onRevisit}
                className="flex items-center justify-center gap-2 rounded-md border-2 border-neon px-4 py-2.5 text-[11px] font-bold tracking-[0.18em] text-neon transition-colors hover:bg-neon/10 focus:outline-none focus:ring-2 focus:ring-neon"
              >
                <BookOpen className="h-3.5 w-3.5" /> REVISIT: {level.section}
              </button>
            )}
            <button
              data-testid={`level-${level.n}-enter-btn`}
              onClick={onPlay}
              className="flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[11px] font-black tracking-[0.2em] text-void transition-shadow focus:outline-none focus:ring-2 focus:ring-white"
              style={{ background: COLORS[level.accent], boxShadow: `0 0 16px ${COLORS[level.accent]}66` }}
            >
              {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {done ? "REPLAY" : "PLAY"}
            </button>
          </>
        )}
      </div>
    </motion.div>
    </div>
  );
}

// One continuous illustrated world. The four level markers ARE the level selector.
function WorldMap({ isUnlocked, isCompleted, completedCount, onEnterLevel, onOpenSection }) {
  const [openN, setOpenN] = useState(null);
  const [live, setLive] = useState(false);
  const small = useIsSmall();
  const rootRef = useRef(null);
  const mapRef = useRef(null);

  // Pause every map animation while the map is off-screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setLive(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Close the panel on Escape or when pressing anywhere outside it.
  useEffect(() => {
    if (openN == null) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpenN(null); };
    const onDown = (e) => { if (!e.target.closest?.("[data-testid='level-panel']") && !e.target.closest?.("[data-testid^='level-marker-']")) setOpenN(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [openN]);

  const stateOf = (n) => (isCompleted(n) ? "completed" : isUnlocked(n) ? "unlocked" : "locked");
  const toggle = (n) => { sfx.click(); setOpenN((cur) => (cur === n ? null : n)); };
  const current = openN ? LEVELS.find((l) => l.n === openN) : null;
  // a stable array, so the (large) artwork only re-renders when a world actually unlocks
  const unlockedKey = [1, 2, 3, 4].map((n) => isUnlocked(n)).join(",");
  const unlocked = useMemo(() => unlockedKey.split(",").map((v) => v === "true"), [unlockedKey]);

  return (
    <section ref={rootRef} id="world-map" className={`wm-root relative px-4 py-14 sm:px-8 ${live ? "wm-live" : ""}`} data-testid="rpg-world-map" aria-label="World map">
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] tracking-[0.4em] text-neon">
            <MapIcon className="h-4 w-4" /> WORLD MAP
          </div>
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl" data-testid="world-map-title">
            CHOOSE YOUR <span className="text-neon text-glow-lime">WORLD</span>
          </h2>
          <p className="mt-3 text-xs text-slate-400 sm:text-sm">
            Tap a glowing marker. Win a world to unlock the next.
          </p>
          <div className="mx-auto mt-5 max-w-md" data-testid="quest-progress">
            <div className="mb-1 flex justify-between text-[10px] tracking-widest text-slate-500">
              <span>QUEST PROGRESS</span>
              <span className="text-neon">{completedCount}/4 WORLDS</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
              <div className="h-full origin-left bg-neon transition-transform duration-1000" style={{ transform: `scaleX(${completedCount / 4})`, width: "100%" }} />
            </div>
          </div>
        </div>

        <div ref={mapRef} className="relative aspect-[5/6] w-full rounded-2xl border-2 border-slate-600/80 shadow-[0_0_40px_rgba(0,0,0,0.6)]" data-testid="world-map-canvas">
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <WorldMapArt unlocked={unlocked} />
          </div>
          {LEVELS.map((level) => (
            <Marker key={level.n} level={level} state={stateOf(level.n)} open={openN === level.n} onToggle={toggle} />
          ))}
          {!small && (
            <AnimatePresence>
              {current && (
                <InfoPanel
                  key={current.n}
                  level={current}
                  state={stateOf(current.n)}
                  onClose={() => setOpenN(null)}
                  onPlay={() => { setOpenN(null); onEnterLevel(current.n); }}
                  onRevisit={() => { setOpenN(null); onOpenSection(current.sectionKey); }}
                />
              )}
            </AnimatePresence>
          )}
        </div>
        {small && current && (
          <InfoPanel
            key={current.n}
            inline
            level={current}
            state={stateOf(current.n)}
            onClose={() => setOpenN(null)}
            onPlay={() => { setOpenN(null); onEnterLevel(current.n); }}
            onRevisit={() => { setOpenN(null); onOpenSection(current.sectionKey); }}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] tracking-[0.2em] text-slate-500" data-testid="map-legend">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-500 bg-slate-700" /> LOCKED</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-volt bg-volt/40" /> READY</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-neon" /> COMPLETED</span>
        </div>
      </div>
    </section>
  );
}

export default memo(WorldMap);
