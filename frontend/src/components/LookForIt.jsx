import { memo, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Award, Binary, Bot, Brain, Camera, CandlestickChart, Cloud, Code2, Cpu, Database, Gamepad2, GitBranch, Globe, GraduationCap,
  Handshake, Headphones, Laptop, Medal, Mic, Network, Palette, RefreshCw, Rocket, Route, Server, ShieldCheck, Smartphone, Terminal,
  Trophy, Wrench, CreditCard,
} from "lucide-react";
import { ExplorerAkash } from "@/components/ExplorerCast";
import { makeRng, shuffled } from "@/utils/rng";

// ROUND 2, "LOOK FOR IT". A bright cartoon jungle packed with the things Akash builds with (code, databases, robots,
// a headset, a candlestick chart for Chronos, a palette for Kalakriti...). One golden trophy is the target; the
// decoys include trophies in other colours and gold medals, so "exact" really matters. The layout is a jittered
// grid, so nothing overlaps, and it is re-shuffled from `seed` on every attempt.

const COLORS = { gold: "#eab308", red: "#ef4444", blue: "#2563eb", green: "#16a34a", purple: "#9333ea", pink: "#ec4899", teal: "#0d9488", orange: "#ea580c" };

export const LOOK_TARGET = { icon: Trophy, color: "gold", name: "trophy", title: "The Biggest Achievement" };

const TOOLS = [
  [Code2, "code"], [Terminal, "terminal"], [Database, "database"], [Cloud, "cloud"], [Cpu, "chip"], [Bot, "robot"], [Brain, "brain"], [Mic, "microphone"],
  [Gamepad2, "game controller"], [GraduationCap, "graduation cap"], [Laptop, "laptop"], [CandlestickChart, "candlestick chart"], [Palette, "palette"],
  [Handshake, "handshake"], [CreditCard, "payment card"], [Camera, "camera"], [Route, "route"], [Wrench, "wrench"], [Globe, "globe"], [ShieldCheck, "shield"],
  [Smartphone, "phone"], [Headphones, "headphones"], [Rocket, "rocket"], [Binary, "binary"], [Network, "network"], [Server, "server"], [GitBranch, "git branch"],
];

const COLS = 6;
const ROWS = 5;
const COUNT = COLS * ROWS;

export function buildScene(seed) {
  const rng = makeRng(seed);
  const items = [{ Icon: Trophy, name: "trophy", color: "gold", target: true }];
  ["red", "blue", "green", "purple"].forEach((c) => items.push({ Icon: Trophy, name: "trophy", color: c })); // same shape, wrong colour
  items.push({ Icon: Medal, name: "medal", color: "gold" }, { Icon: Award, name: "award badge", color: "gold" }); // same colour, similar idea
  const palette = Object.keys(COLORS);
  const pool = shuffled(TOOLS, rng);
  let i = 0;
  while (items.length < COUNT) {
    const [Icon, name] = pool[i % pool.length];
    i += 1;
    items.push({ Icon, name, color: palette[Math.floor(rng() * palette.length)] });
  }
  const cells = shuffled([...Array(COUNT).keys()], rng);
  return items.map((it, k) => {
    const cell = cells[k];
    const col = cell % COLS;
    const row = Math.floor(cell / COLS);
    return {
      ...it,
      id: `i${k}`,
      x: ((col + 0.5) / COLS) * 100 + (rng() - 0.5) * 3.2,
      y: ((row + 0.5) / ROWS) * 100 + (rng() - 0.5) * 5,
      rot: Math.round((rng() - 0.5) * 36),
      label: `${it.color} ${it.name}`,
    };
  }).sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)); // reading order = tab order
}

function Backdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="lfi-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="0.55" stopColor="#bae6fd" /><stop offset="1" stopColor="#d9f99d" /></linearGradient>
      </defs>
      <rect width="120" height="100" fill="url(#lfi-sky)" />
      <g stroke="#fde047" strokeWidth="1.1" strokeLinecap="round" opacity="0.9">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={104 + Math.cos((a * Math.PI) / 180) * 10} y1={12 + Math.sin((a * Math.PI) / 180) * 10} x2={104 + Math.cos((a * Math.PI) / 180) * 14} y2={12 + Math.sin((a * Math.PI) / 180) * 14} />)}
      </g>
      <circle cx="104" cy="12" r="8" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
      <g fill="#fff" stroke="#bae6fd" strokeWidth="0.6"><ellipse cx="18" cy="12" rx="9" ry="4" /><ellipse cx="26" cy="10" rx="6" ry="3.5" /><ellipse cx="66" cy="8" rx="8" ry="3.5" /></g>
      <path d="M0 62 C14 46 30 56 44 50 S74 40 90 52 S110 54 120 48 V100 H0Z" fill="#4ade80" stroke="#15803d" strokeWidth="1.2" />
      <path d="M0 80 C20 70 40 84 62 76 S100 68 120 78 V100 H0Z" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
      <path d="M0 92 C26 86 48 96 76 90 S108 88 120 92 V100 H0Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" opacity="0.9" />
      {/* jungle leaves in the corners */}
      <g fill="#15803d" stroke="#14532d" strokeWidth="0.8">
        <path d="M0 0 L16 0 Q10 10 0 14Z" /><path d="M0 14 Q12 12 18 24 Q6 26 0 22Z" fill="#16a34a" /><path d="M120 100 L102 100 Q108 88 120 84Z" /><path d="M120 84 Q108 86 102 74 Q114 72 120 78Z" fill="#16a34a" />
      </g>
    </svg>
  );
}

function LookForIt({ seed, disabled, onFound, onMiss, aside, testId = "lfi" }) {
  const scene = useMemo(() => buildScene(seed), [seed]);
  const [missed, setMissed] = useState(() => new Set());
  const [found, setFound] = useState(null);
  const locked = useRef(false);
  const T = LOOK_TARGET;

  const tap = (it) => {
    if (disabled || locked.current || missed.has(it.id)) return;
    if (it.target) {
      locked.current = true;
      setFound(it.id);
      onFound?.(it);
    } else {
      setMissed((m) => new Set(m).add(it.id));
      onMiss?.(it);
    }
  };

  return (
    <div data-testid={testId}>
      <div className="mb-3 flex items-center gap-3 rounded-2xl border-4 border-amber-300 bg-amber-50 p-2.5 text-slate-900 shadow-[0_5px_0_#b45309]" data-testid={`${testId}-target`}>
        <ExplorerAkash size={54} className="hidden shrink-0 sm:block" testId={`${testId}-explorer`} />
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-slate-800 bg-white shadow-[0_3px_0_#1e293b]">
          <T.icon className="h-8 w-8" style={{ color: COLORS[T.color] }} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[10px] font-black tracking-[0.25em] text-sky-700">ROUND 2 // LOOK FOR IT</div>
          <div className="text-sm font-black text-slate-900">Find the {T.color} {T.name}!</div>
          <div className="text-[11px] leading-snug text-slate-600">{T.title}. It's hiding among the things I build with. Others look close: check the colour and the shape.</div>
        </div>
        {aside}
      </div>

      <div
        className="relative mx-auto w-full max-w-[600px] overflow-hidden rounded-2xl border-4 border-slate-800 shadow-[0_6px_0_#1e293b]"
        style={{ aspectRatio: `${COLS} / ${ROWS}` }}
        data-testid={`${testId}-scene`}
      >
        <Backdrop />
        {scene.map((it) => {
          const bad = missed.has(it.id);
          const good = found === it.id;
          const color = COLORS[it.color];
          return (
            <button
              key={it.id}
              type="button"
              disabled={disabled && !good}
              onClick={() => tap(it)}
              aria-label={it.label}
              data-testid={it.target ? `${testId}-target-item` : `${testId}-item`}
              data-target={it.target ? "true" : "false"}
              className="group absolute flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-600"
              style={{ left: `${it.x}%`, top: `${it.y}%`, width: "13%", aspectRatio: "1", transform: "translate(-50%, -50%)" }}
            >
              <motion.span
                animate={good ? { scale: [1, 1.5, 1.28] } : bad ? { x: [0, -4, 4, -3, 3, 0] } : { scale: 1 }}
                transition={{ duration: good ? 0.5 : 0.35 }}
                className={`relative flex h-[78%] w-[78%] items-center justify-center rounded-full border-[3px] shadow-[0_2px_0_rgba(15,23,42,0.55)] transition-transform group-hover:scale-110 ${bad ? "border-slate-500 bg-slate-300" : good ? "border-green-700 bg-lime-200" : "border-slate-800 bg-white/95"}`}
                style={{ rotate: `${it.rot}deg` }}
              >
                <it.Icon className="h-[66%] w-[66%]" style={{ color: bad ? "#64748b" : color }} strokeWidth={2.5} />
                {bad && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xl font-black text-red-600">×</span>}
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(LookForIt);
