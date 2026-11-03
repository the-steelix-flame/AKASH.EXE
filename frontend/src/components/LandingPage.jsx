import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ChevronDown, ChevronRight, Volume2 } from "lucide-react";
import Starfield from "@/components/Starfield";
import { HERO, WISPR_NOTE } from "@/data/personalData";
import { PROJECTS } from "@/data/projects";
import { sfx } from "@/utils/sfx";

function KineticTitle() {
  const chars = HERO.title.split("");
  return (
    <h1 className="font-display flex justify-center overflow-hidden text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl" data-testid="hero-title">
      {chars.map((c, i) => (
        <motion.span
          key={i}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 + i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
          className={c === "." ? "text-volt text-glow-cyan" : "text-neon text-glow-lime"}
        >
          {c}
        </motion.span>
      ))}
    </h1>
  );
}

export default function LandingPage({ onEnter, playIntro, returning = false }) {
  const [booted, setBooted] = useState(false);
  const [started, setStarted] = useState(false);
  const parallaxRef = useRef(null);
  const reduce = useReducedMotion();
  // Motion values update the transform directly: no React re-render per mouse move.
  const tiltX = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 900);
    return () => clearTimeout(t);
  }, []);

  const onMove = (e) => {
    if (reduce || e.pointerType === "touch") return;
    const r = parallaxRef.current?.getBoundingClientRect();
    if (!r) return;
    tiltX.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    tiltY.set(((e.clientY - r.top) / r.height - 0.5) * -10);
  };

  const handleStart = () => {
    sfx.powerup();
    setStarted(true);
    playIntro();
    // Scroll (not a page swap): the hero and the space map are one continuous page.
    setTimeout(() => { onEnter(); setTimeout(() => setStarted(false), 1200); }, 700);
  };

  return (
    <div
      ref={parallaxRef}
      onPointerMove={onMove}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-20"
      data-testid="landing-page"
    >
      <Starfield />
      <div className="grid-floor absolute inset-0" aria-hidden="true" />

      {!booted && (
        <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-void" exit={{ opacity: 0 }} data-testid="boot-loader">
          <div className="text-center">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="font-display text-xs tracking-[0.5em] text-neon"
            >
              BOOTING AKASH.EXE…
            </motion.div>
            <div className="mx-auto mt-4 h-0.5 w-48 overflow-hidden rounded bg-slate-800">
              <motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 0.85 }} className="h-full w-full bg-neon" />
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        style={{ rotateX: tiltY, rotateY: tiltX, transformStyle: "preserve-3d", perspective: 900 }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5 flex items-center gap-3 text-[10px] tracking-[0.4em] text-slate-400 sm:text-xs" data-agent-avoid
        >
          <span className="h-px w-8 bg-neon/60" />
          <span className="flicker">{HERO.campaign}</span>
          <span className="h-px w-8 bg-neon/60" />
        </motion.div>

        <KineticTitle />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 text-sm tracking-[0.2em] text-volt sm:text-base"
          data-testid="hero-tagline" data-agent-avoid
        >
          {HERO.tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35 }}
          className="mt-8 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base"
          data-testid="hero-opening" data-agent-avoid
        >
          {HERO.opening}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9 }} className="mt-10">
          <button
            data-testid="enter-quest-btn"
            onClick={handleStart}
            disabled={started}
            className="pulse-ring group relative flex items-center gap-3 rounded-md border-2 border-neon bg-neon/10 px-8 py-4 font-display text-sm font-bold tracking-[0.3em] text-neon transition-all hover:bg-neon hover:text-void hover:shadow-[0_0_40px_rgba(57,255,20,0.5)] focus:outline-none focus:ring-2 focus:ring-neon disabled:opacity-60 sm:px-12 sm:text-base"
          >
            {started ? "TRAVELLING TO THE SPACE MAP…" : returning ? "CONTINUE QUEST" : "START QUEST"}
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] tracking-wider text-slate-500" data-testid="voice-narration-note" data-agent-avoid>
            <Volume2 className="h-3 w-3 text-neon" />
            <span>4 LEVELS · {PROJECTS.length} PROJECTS · SOUND ON</span>
          </div>
        </motion.div>
      </motion.div>

      <button
        type="button"
        onClick={onEnter}
        aria-label="Scroll down to the space map"
        data-testid="scroll-cue"
        className="absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5 text-[10px] tracking-[0.35em] text-slate-500 transition-colors hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon"
      >
        SCROLL TO THE SPACE MAP
        <ChevronDown className="wm-anim scroll-bob h-4 w-4 text-neon" />
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden border-t border-slate-800/80 bg-slate-950/90 py-2"
        data-testid="hero-marquee"
      >
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap text-[10px] tracking-[0.3em] text-slate-500">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex gap-8">
              <span className="text-volt">{WISPR_NOTE}</span><span>//</span>
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
