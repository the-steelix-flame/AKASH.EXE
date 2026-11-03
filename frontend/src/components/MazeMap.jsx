import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AudioWaveform, CandlestickChart, Footprints, Handshake, Palette, RefreshCw } from "lucide-react";
import { TrailMap } from "@/components/ExplorerCast";
import { PROJECTS } from "@/data/projects";
import { makeRng, shuffled } from "@/utils/rng";

// ROUND 3, THE MAP. Five trails start at the bottom and wind (and cross) up to five treasures.
// Pick the numbered trail you think reaches the one named at the top. An explorer then walks that trail,
// so a wrong guess is shown rather than just refused. Every attempt draws a new map from `seed`.

const W = 400;
const H = 500;
const LANES = 5;
const LANE_X = (l) => 60 + l * 70;
const Y0 = 418; // trail start
const Y1 = 106; // trail end (just under the treasure)
const STEPS = 5; // lane changes happen between 6 levels

// The five stops are real projects from this portfolio. Chronos is the destination: the biggest lesson came from it.
const tagline = (id) => PROJECTS.find((p) => p.id === id)?.tagline || "";
export const TREASURES = [
  { id: "chronos", label: "CHRONOS", Icon: CandlestickChart, color: "#2563eb", target: true, tagline: tagline("chronos") },
  { id: "kalakriti", label: "KALAKRITI", Icon: Palette, color: "#db2777", tagline: tagline("kalakriti") },
  { id: "dealflow360", label: "DEALFLOW360", Icon: Handshake, color: "#16a34a", tagline: tagline("dealflow") },
  { id: "reflow", label: "REFLOW", Icon: RefreshCw, color: "#ea580c", tagline: tagline("reflow") },
  { id: "echo", label: "ECHO", Icon: AudioWaveform, color: "#7c3aed", tagline: tagline("echo") },
];

// Smooth curve through the waypoints (Catmull-Rom converted to cubic Béziers).
function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// Builds a map. Paths start in lane order 1..5; between levels some neighbouring trails swap lanes, which makes
// them cross. The trail that reaches the target treasure is guaranteed to cross at least twice.
export function buildMap(seed) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rng = makeRng(seed * 7919 + attempt * 104729 + 13);
    const lanes = [[0, 1, 2, 3, 4]]; // lanes[level][path] = lane
    const moves = Array(LANES).fill(0);
    let lastPair = -1;
    for (let s = 0; s < STEPS; s += 1) {
      const cur = [...lanes[s]];
      const used = new Set();
      const swaps = 1 + (rng() < 0.7 ? 1 : 0);
      for (let k = 0; k < swaps; k += 1) {
        const a = Math.floor(rng() * (LANES - 1));
        if (a === lastPair || used.has(a) || used.has(a + 1) || used.has(a - 1) || used.has(a + 2)) continue;
        used.add(a); used.add(a + 1);
        const pa = cur.indexOf(a); const pb = cur.indexOf(a + 1);
        cur[pa] = a + 1; cur[pb] = a;
        moves[pa] += 1; moves[pb] += 1;
        lastPair = a;
      }
      lanes.push(cur);
    }
    const candidates = moves.map((m, p) => [m, p]).filter(([m, p]) => m >= 2 && lanes[STEPS][p] !== p).map(([, p]) => p);
    if (!candidates.length) continue;
    const correct = candidates[Math.floor(rng() * candidates.length)];
    const endLane = lanes[STEPS][correct];
    // treasures: the target goes at the correct trail's end, the rest are shuffled
    const others = shuffled(TREASURES.filter((t) => !t.target), rng);
    const treasureAt = [];
    for (let l = 0; l < LANES; l += 1) treasureAt[l] = l === endLane ? TREASURES.find((t) => t.target) : others.shift();
    const paths = lanes[0].map((_, p) => {
      const pts = [];
      for (let lv = 0; lv <= STEPS; lv += 1) {
        const y = Y0 + ((Y1 - Y0) * lv) / STEPS;
        const jitter = lv === 0 || lv === STEPS ? 0 : (rng() - 0.5) * 16;
        pts.push([LANE_X(lanes[lv][p]) + jitter, y]);
      }
      return { start: p, end: lanes[STEPS][p], d: smooth(pts), crossings: moves[p] };
    });
    return { paths, treasureAt, correct, endLane };
  }
  throw new Error("could not build a map");
}

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function MazeMap({ seed, disabled, onResult, testId = "maze" }) {
  const map = useMemo(() => buildMap(seed), [seed]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState(null); // {ok}
  const timer = useRef(null);
  const walkMs = reduced() ? 400 : 2400;
  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = (p) => {
    if (disabled || sel !== null) return;
    setSel(p);
    const treasure = map.treasureAt[map.paths[p].end];
    timer.current = setTimeout(() => {
      setDone({ ok: treasure.target });
      onResult?.({ ok: !!treasure.target, treasure, trail: p + 1 });
    }, walkMs);
  };

  const chosen = sel !== null ? map.paths[sel] : null;

  return (
    <div data-testid={testId}>
      <div className="mb-3 flex items-center gap-3 rounded-2xl border-4 border-amber-300 bg-amber-50 p-2.5 text-slate-900 shadow-[0_5px_0_#b45309]" data-testid={`${testId}-target`}>
        <TrailMap size={64} className="shrink-0" testId={`${testId}-mascot`} />
        <div className="min-w-0 text-left">
          <div className="text-[10px] font-black tracking-[0.25em] text-sky-700">ROUND 3 // THE MAP SAYS</div>
          <div className="text-sm font-black text-slate-900">Go to CHRONOS!</div>
          <div className="text-[11px] leading-snug text-slate-600">The project my biggest lesson came from. Five trails wind up the map and cross. Follow yours with your eyes, then pick the number where it starts.</div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-lg select-none overflow-hidden rounded-2xl border-4 border-slate-800 shadow-[0_6px_0_#1e293b]" style={{ aspectRatio: `${W} / ${H}` }} data-testid={`${testId}-board`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Treasure map with five winding trails">
          <defs>
            <linearGradient id="mz-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#bae6fd" /></linearGradient>
            <linearGradient id="mz-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#4ade80" /></linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#mz-land)" />
          <rect width={W} height="150" fill="url(#mz-sky)" />
          {/* rainbow, sun, clouds */}
          <g strokeLinecap="round" fill="none">
            {[0, 1, 2, 3].map((i) => <path key={i} d={`M${70 + i * 7} 148 A${130 - i * 7} 70 0 0 1 ${330 - i * 7} 148`} stroke={["#ef4444", "#fb923c", "#facc15", "#4ade80"][i]} strokeWidth="6" opacity="0.55" />)}
          </g>
          <circle cx="352" cy="38" r="22" fill="#fde047" stroke="#ca8a04" strokeWidth="3.5" />
          <g fill="#fff" stroke="#bae6fd" strokeWidth="2"><ellipse cx="60" cy="34" rx="30" ry="12" /><ellipse cx="86" cy="26" rx="20" ry="10" /><ellipse cx="210" cy="22" rx="26" ry="10" /></g>
          {/* hills behind the treasures */}
          <path d="M0 150 Q50 108 110 140 T230 130 T400 134 V164 H0Z" fill="#22c55e" stroke="#15803d" strokeWidth="3.5" />
          {/* river */}
          <path d="M0 292 C70 262 120 318 200 290 S330 262 400 296 V338 C330 306 260 340 190 330 S60 300 0 336Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="3.5" />
          <g stroke="#e0f2fe" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9"><path d="M40 312 q10 -6 20 0" /><path d="M150 316 q10 -6 20 0" /><path d="M280 306 q10 -6 20 0" /><path d="M350 320 q10 -6 20 0" /></g>
          {/* trees and flowers */}
          {[[24, 214], [376, 244], [30, 380], [372, 392]].map(([x, y], i) => (
            <g key={i}><rect x={x - 4} y={y} width="8" height="20" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="2.5" /><circle cx={x} cy={y - 6} r="17" fill="#16a34a" stroke="#14532d" strokeWidth="3" /><circle cx={x - 8} cy={y - 2} r="9" fill="#22c55e" /></g>
          ))}
          {[[100, 232], [310, 210], [90, 440], [330, 452], [210, 462]].map(([x, y], i) => (
            <g key={i}><circle cx={x} cy={y} r="4.5" fill={["#f472b6", "#fde047", "#fb7185", "#c084fc", "#f472b6"][i]} stroke="#7c2d12" strokeWidth="1.8" /><circle cx={x} cy={y} r="1.6" fill="#fff" /></g>
          ))}

          {/* trails: all identical dirt roads, so the only way to tell them apart is to follow them */}
          {map.paths.map((p, i) => (
            <g key={i}>
              <path d={p.d} fill="none" stroke="#7c2d12" strokeWidth="15" strokeLinecap="round" />
              <path d={p.d} fill="none" stroke="#fdba74" strokeWidth="9" strokeLinecap="round" />
              <path d={p.d} fill="none" stroke="#fff7ed" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="1 10" />
            </g>
          ))}

          {/* the walk */}
          {chosen && (
            <g>
              <motion.path
                d={chosen.d} fill="none" strokeWidth="6" strokeLinecap="round"
                stroke={done ? (done.ok ? "#16a34a" : "#dc2626") : "#2563eb"}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: walkMs / 1000, ease: "linear" }}
              />
              <g key={sel}>
                <circle r="12" fill="#22c55e" stroke="#14532d" strokeWidth="3.5" />
                <text y="4.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">A</text>
                <animateMotion dur={`${walkMs}ms`} fill="freeze" path={chosen.d} />
              </g>
            </g>
          )}

          {/* treasures: round badges */}
          {map.treasureAt.map((t, l) => {
            const x = LANE_X(l);
            const reached = done && chosen && chosen.end === l;
            return (
              <g key={l} transform={`translate(${x} 82)`}>
                <ellipse cy="27" rx="30" ry="8" fill="#15803d" opacity="0.55" />
                <circle r="29" fill="#fff" stroke={reached ? (done.ok ? "#16a34a" : "#dc2626") : "#1e293b"} strokeWidth={reached ? 6 : 4} />
                <circle r="23" fill={t.color} opacity="0.12" />
                <g transform="translate(-15 -15)"><t.Icon width="30" height="30" color={t.color} strokeWidth={2.4} /></g>
              </g>
            );
          })}
        </svg>

        {/* treasure names */}
        {map.treasureAt.map((t, l) => (
          <div key={t.id} className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-slate-800 bg-amber-100 px-1.5 py-px text-center text-[7px] font-black tracking-wide text-slate-900 shadow-[0_2px_0_#1e293b] sm:px-2 sm:text-[9px]" style={{ left: `${(LANE_X(l) / W) * 100}%`, top: "3%" }} data-testid={`${testId}-treasure-${l}`}>
            {t.label}
          </div>
        ))}

        {/* trailheads */}
        {map.paths.map((p, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || sel !== null}
            onClick={() => choose(i)}
            aria-label={`Trail ${i + 1}`}
            data-testid={`${testId}-trail-${i + 1}`}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] font-display text-base font-black transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-500 sm:text-lg ${
              sel === i ? "scale-110 border-sky-700 bg-sky-500 text-white" : "border-slate-800 bg-amber-300 text-slate-900 shadow-[0_3px_0_#1e293b] enabled:hover:scale-110 enabled:hover:bg-yellow-200"
            } disabled:cursor-default`}
            style={{ left: `${(LANE_X(i) / W) * 100}%`, top: "91.5%", width: "13%", aspectRatio: "1", minWidth: 44 }}
          >
            {i + 1}
          </button>
        ))}
        <div className="pointer-events-none absolute bottom-[1%] left-0 right-0 flex items-center justify-center gap-1 text-[8px] font-black tracking-[0.25em] text-slate-900 sm:text-[9px]">
          <Footprints className="h-3 w-3" /> START HERE · PICK A TRAIL
        </div>
      </div>
    </div>
  );
}

export default memo(MazeMap);
