import { memo } from "react";

// The illustrated space behind the level markers. Static SVG: gradients, patterns and layered shapes only
// (no filters), so it stays cheap. The only motion is CSS transform / opacity / dash-offset animation,
// which index.css pauses whenever the map is scrolled out of view.
//
// Territories: 1 jungle (top-left), 2 builder's arena (right), 3 mind dungeon (bottom-left), 4 growth island.
// `unlocked[i]` lifts the fog over territory i+1.

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function scatter(n, cx, cy, rx, ry, seed, avoid = [], gap = 28) {
  const r = rng(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < n * 60) {
    tries += 1;
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    if (avoid.some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar)) continue;
    if (pts.some(([px, py]) => Math.hypot(x - px, y - py) < gap)) continue;
    pts.push([Math.round(x), Math.round(y), 0.8 + r() * 0.55]);
  }
  return pts.sort((a, b) => a[1] - b[1]);
}

const MARKERS = [[240, 250, 85], [740, 520, 90], [260, 840, 85], [730, 1080, 85]];
const TRAILS = [
  "M240 250 C 400 150 560 330 640 400 S 720 480 740 520",
  "M740 520 C 860 640 560 640 460 720 S 300 800 260 840",
  "M260 840 C 330 960 480 900 560 960 S 690 1040 730 1080",
];
const MAINLAND = "M60 120 C120 40 380 20 520 70 C640 110 700 60 840 120 C960 170 950 330 900 420 C860 500 930 560 900 660 C870 750 700 740 620 780 C540 820 520 930 400 960 C280 990 110 960 80 860 C50 760 110 700 70 600 C30 500 90 420 50 320 C20 240 40 170 60 120Z";
const ISLAND = "M560 1010 C580 950 700 940 800 970 C900 1000 930 1090 880 1150 C820 1200 640 1190 580 1140 C540 1100 540 1050 560 1010Z";

// ---- shape builders (each returns an SVG path string so a whole layer is ONE element)
const circle = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const pine = ([x, y, s]) => `M${x} ${y - 24 * s}L${x - 12 * s} ${y - 2 * s}H${x + 12 * s}ZM${x} ${y - 11 * s}L${x - 15 * s} ${y + 10 * s}H${x + 15 * s}Z`;
const trunk = ([x, y, s]) => `M${x - 2.5 * s} ${y + 8 * s}h${5 * s}v${9 * s}h${-5 * s}Z`;
const crown = ([x, y, s]) => circle(x, y - 6 * s, 15 * s) + circle(x - 11 * s, y + 1 * s, 10 * s) + circle(x + 11 * s, y + 1 * s, 10 * s);
const crownHi = ([x, y, s]) => circle(x - 4 * s, y - 11 * s, 7 * s);
const peak = ([x, y, s], h) => `M${x - 46 * s} ${y}L${x - 4 * s} ${y - h * s}L${x + 46 * s} ${y}Z`;
const peakShade = ([x, y, s], h) => `M${x - 4 * s} ${y - h * s}L${x + 46 * s} ${y}L${x + 8 * s} ${y}Z`;
const snow = ([x, y, s], h) => `M${x - 14 * s} ${y - (h - 30) * s}L${x - 4 * s} ${y - h * s}L${x + 11 * s} ${y - (h - 34) * s}L${x + 4 * s} ${y - (h - 26) * s}L${x - 2 * s} ${y - (h - 34) * s}L${x - 7 * s} ${y - (h - 24) * s}Z`;
const palm = ([x, y, s]) => `M${x} ${y}q${2 * s} ${-14 * s} 0 ${-26 * s}M${x} ${y - 26 * s}q${-17 * s} ${-3 * s} ${-25 * s} ${10 * s}M${x} ${y - 26 * s}q${17 * s} ${-3 * s} ${25 * s} ${10 * s}M${x} ${y - 26 * s}q${-7 * s} ${-16 * s} ${-22 * s} ${-13 * s}M${x} ${y - 26 * s}q${7 * s} ${-16 * s} ${22 * s} ${-13 * s}`;

const AVOID_ALL = [...MARKERS, [520, 250, 70], [850, 380, 110]];
const JUNGLE_BACK = scatter(30, 240, 240, 225, 185, 7, AVOID_ALL, 24);
const JUNGLE_FRONT = scatter(26, 235, 255, 215, 170, 19, AVOID_ALL, 34);
const PLAINS_TREES = scatter(12, 700, 560, 235, 150, 3, [...AVOID_ALL, [640, 620, 45]], 42);
const BACK_RANGE = scatter(5, 250, 826, 215, 40, 11, [[394, 920, 70]], 80).map(([x, y, s]) => [x, 836 + (x % 11), 1 + s * 0.35]);
const FRONT_RANGE = scatter(6, 250, 880, 215, 50, 5, [...MARKERS, [394, 920, 70]], 74).map(([x, y, s]) => [x, 896 + (x % 9), 0.9 + s * 0.3]);
const CRYSTALS = scatter(9, 250, 880, 200, 90, 23, [...MARKERS, [394, 920, 60]], 36);
const PALMS = scatter(8, 752, 1100, 140, 74, 5, [[730, 1080, 70], [840, 1030, 70]], 34);
const FIREFLIES = scatter(9, 235, 245, 210, 160, 31, [], 30);

const WAVES = Array.from({ length: 9 }, (_, i) => {
  const y = 70 + i * 140;
  const x0 = (i % 2) * -60 - 160;
  return `M${x0} ${y}` + " q 40 -12 80 0 t 80 0".repeat(10);
}).join(" ");

const ROOFS = ["#ef4444", "#38bdf8", "#f8fafc", "#facc15", "#a78bfa"];
const HOUSES = [[612, 470], [650, 610], [805, 655], [860, 565], [690, 690], [584, 560]];

function Terrain() {
  return (
    <>
      {/* Territory 1: jungle. Back canopy, ruins, lake, then front canopy */}
      <path d={JUNGLE_BACK.map(crown).join("")} fill="#14532d" />
      <path d={JUNGLE_BACK.map(crownHi).join("")} fill="#1f7a3f" opacity="0.8" />
      <ellipse cx="118" cy="338" rx="48" ry="26" fill="#0c4a6e" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="2" />
      <ellipse cx="108" cy="332" rx="26" ry="9" fill="#38bdf8" opacity="0.28" />
      {/* ancient temple */}
      <path d="M326 292h96v14h-96zM338 276h72v16h-72zM350 262h48v14h-48z" fill="#52525b" stroke="#a1a1aa" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M368 262h12v-18h-12z" fill="#71717a" />
      <circle cx="374" cy="236" r="6" fill="#39FF14" className="wm-anim wm-twinkle" />
      <path d="M356 299h36" stroke="#39FF14" strokeWidth="2" opacity="0.7" />
      <path d={JUNGLE_FRONT.map(trunk).join("")} fill="#5b3a1e" />
      <path d={JUNGLE_FRONT.map(crown).join("")} fill="#16813f" />
      <path d={JUNGLE_FRONT.map(crownHi).join("")} fill="#4ade80" opacity="0.7" />
      {FIREFLIES.map(([x, y], i) => (
        <circle key={i} className="wm-anim wm-twinkle" cx={x} cy={y} r="3.2" fill="#d9f99d" style={{ animationDelay: `${(i % 5) * 0.55}s` }} />
      ))}

      {/* Territory 2: builder's arena. Plains, lab, houses, stadium */}
      <path d="M598 650h210M598 670h210" stroke="#cbd5e1" strokeOpacity="0.16" strokeWidth="2" />
      <path d={PLAINS_TREES.map(pine).join("")} fill="#0f766e" />
      {[[650, 540], [720, 610], [800, 600], [760, 450]].map(([x, y], i) => (
        <g key={i}>{[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={x + ((k * 7) % 22)} cy={y + ((k * 5) % 14)} r="2.4" fill={["#f472b6", "#fde047", "#f8fafc", "#fb923c", "#a78bfa"][(k + i) % 5]} opacity="0.85" />)}</g>
      ))}
      {HOUSES.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 17} y={y - 12} width="34" height="24" rx="2" fill="#e2e8f0" opacity="0.92" />
          <path d={`M${x - 22} ${y - 12}L${x} ${y - 32}L${x + 22} ${y - 12}Z`} fill={ROOFS[i % ROOFS.length]} />
          <rect x={x - 4} y={y - 2} width="8" height="14" fill="#1e293b" />
        </g>
      ))}
      {/* Oak's lab */}
      <rect x="566" y="486" width="64" height="30" rx="2" fill="#f1f5f9" />
      <path d="M566 486a32 22 0 0 1 64 0Z" fill="#ef4444" />
      <circle cx="598" cy="478" r="6" fill="#fff" stroke="#0f172a" strokeWidth="2" />
      {/* stadium */}
      <ellipse cx="850" cy="388" rx="92" ry="44" fill="#0f2742" />
      <ellipse cx="850" cy="384" rx="86" ry="40" fill="#1e3a5f" stroke="#22d3ee" strokeWidth="3" />
      <ellipse cx="850" cy="384" rx="70" ry="31" fill="none" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 5" />
      <ellipse cx="850" cy="382" rx="52" ry="22" fill="#15803d" />
      <ellipse cx="850" cy="382" rx="52" ry="22" fill="none" stroke="#bbf7d0" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M798 382h104" stroke="#bbf7d0" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="850" cy="382" r="9" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
      <path d="M841 382a9 9 0 0 1 18 0Z" fill="#ef4444" />
      <circle cx="850" cy="382" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
      {[[772, 360], [928, 360], [776, 412], [924, 412]].map(([x, y], i) => (
        <g key={i}><rect x={x - 1.5} y={y - 22} width="3" height="22" fill="#94a3b8" /><circle className="wm-anim wm-twinkle" cx={x} cy={y - 24} r="7" fill="#fde047" opacity="0.8" style={{ animationDelay: `${i * 0.4}s` }} /></g>
      ))}

      {/* Territory 3: mind dungeon. Two mountain ranges, crystals, gate with torches */}
      <path d={BACK_RANGE.map((p) => peak(p, 130)).join("")} fill="#312e81" />
      <path d={BACK_RANGE.map((p) => peakShade(p, 130)).join("")} fill="#1e1b4b" />
      <path d={BACK_RANGE.map((p) => snow(p, 130)).join("")} fill="#c7d2fe" opacity="0.85" />
      <path d={FRONT_RANGE.map((p) => peak(p, 100)).join("")} fill="#5b4fb5" />
      <path d={FRONT_RANGE.map((p) => peakShade(p, 100)).join("")} fill="#3b3486" />
      <path d={FRONT_RANGE.map((p) => snow(p, 100)).join("")} fill="#eef2ff" />
      {CRYSTALS.map(([x, y, s], i) => (
        <path key={i} d={`M${x} ${y}l${-5 * s} ${-14 * s}l${5 * s} ${-12 * s}l${5 * s} ${12 * s}Z`} fill="#c084fc" opacity="0.9" className="wm-anim wm-twinkle" style={{ animationDelay: `${(i % 4) * 0.6}s` }} />
      ))}
      {/* dungeon gate */}
      <g transform="translate(64 -8)">
      <path d="M296 936v-44a34 34 0 0 1 68 0v44Z" fill="#1c1636" stroke="#a78bfa" strokeWidth="3" />
      <path d="M306 936v-40a24 24 0 0 1 48 0v40Z" fill="#7c3aed" opacity="0.65" className="wm-anim wm-twinkle" />
      <rect x="288" y="934" width="84" height="8" rx="2" fill="#4c4a63" />
      {[[286, 904], [374, 904]].map(([x, y], i) => (
        <g key={i}><rect x={x - 2} y={y} width="4" height="20" fill="#78716c" /><path d={`M${x} ${y - 14}q8 8 0 14q-8 -6 0 -14Z`} fill="#fb923c" className="wm-anim wm-twinkle" style={{ animationDelay: `${i * 0.3}s` }} /></g>
      ))}
      </g>
    </>
  );
}

function Island() {
  return (
    <>
      <path d={PALMS.map(trunk).join("")} fill="#5b3a1e" opacity="0" />
      <path d={PALMS.map(palm).join("")} fill="none" stroke="#65a30d" strokeWidth="3.4" strokeLinecap="round" />
      {/* lava rivers + volcano */}
      <path d="M778 1140 L828 1004 H858 L912 1140Z" fill="#9a3412" />
      <path d="M843 1004 H858 L912 1140 H866Z" fill="#7c2d12" />
      <path d="M778 1140 L800 1080 L828 1004 H836 L812 1090 L800 1140Z" fill="#c2410c" opacity="0.55" />
      <ellipse cx="843" cy="1004" rx="24" ry="8" fill="#451a03" />
      <ellipse cx="843" cy="1003" rx="18" ry="5.5" fill="#fbbf24" />
      <circle className="wm-anim wm-twinkle" cx="843" cy="990" r="40" fill="url(#wm-lava)" />
      <path d="M843 1008 C834 1044 858 1068 848 1112 C846 1124 850 1132 850 1140" fill="none" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
      <path d="M843 1008 C834 1044 858 1068 848 1112 C846 1124 850 1132 850 1140" fill="none" stroke="#fde68a" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
      <path d="M850 1030 C870 1050 880 1080 872 1120" fill="none" stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      {[[836, 968, 12], [852, 946, 9], [838, 926, 7]].map(([x, y, r], i) => (
        <circle key={i} className="wm-anim wm-twinkle" cx={x} cy={y} r={r} fill="#94a3b8" opacity="0.28" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
      {/* floating energy orbs */}
      {[[660, 1030], [905, 1090], [690, 1160]].map(([x, y], i) => (
        <g key={i} className="wm-anim wm-twinkle" style={{ animationDelay: `${i * 0.7}s` }}>
          <circle cx={x} cy={y} r="11" fill="url(#wm-orb)" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx={x - 3} cy={y - 2} r="1.6" fill="#b91c1c" /><circle cx={x + 3} cy={y - 2} r="1.6" fill="#b91c1c" /><circle cx={x} cy={y + 3} r="1.6" fill="#b91c1c" />
        </g>
      ))}
    </>
  );
}

function Fog({ cx, cy, rx, ry, id }) {
  return (
    <g data-testid={`fog-${id}`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#wm-fog)" />
      <g className="wm-anim wm-mist" fill="#cbd5e1" opacity="0.1">
        <ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.25} rx={rx * 0.42} ry={ry * 0.13} />
        <ellipse cx={cx + rx * 0.25} cy={cy + ry * 0.15} rx={rx * 0.5} ry={ry * 0.14} />
        <ellipse cx={cx - rx * 0.1} cy={cy + ry * 0.5} rx={rx * 0.38} ry={ry * 0.11} />
      </g>
    </g>
  );
}

function WorldMapArt({ unlocked = [true, false, false, false] }) {
  const open = [unlocked[1], unlocked[2], unlocked[3]]; // trail i is open once territory i+2 is unlocked
  return (
    <svg viewBox="0 0 1000 1200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wm-ocean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2250" /><stop offset="0.55" stopColor="#0a1a3c" /><stop offset="1" stopColor="#050f24" /></linearGradient>
        <radialGradient id="wm-vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="#020617" stopOpacity="0" /><stop offset="1" stopColor="#020617" stopOpacity="0.7" /></radialGradient>
        <linearGradient id="wm-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2a6b48" /><stop offset="0.5" stopColor="#1d5a40" /><stop offset="1" stopColor="#164a38" /></linearGradient>
        <linearGradient id="wm-isle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a3a2c" /><stop offset="1" stopColor="#35211b" /></linearGradient>
        <radialGradient id="wm-jungle" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#15803d" stopOpacity="0.85" /><stop offset="1" stopColor="#15803d" stopOpacity="0" /></radialGradient>
        <radialGradient id="wm-arena" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#0891b2" stopOpacity="0.6" /><stop offset="1" stopColor="#0891b2" stopOpacity="0" /></radialGradient>
        <radialGradient id="wm-rock" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#6d28d9" stopOpacity="0.7" /><stop offset="1" stopColor="#6d28d9" stopOpacity="0" /></radialGradient>
        <radialGradient id="wm-lava" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fbbf24" stopOpacity="0.9" /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
        <radialGradient id="wm-orb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#f97316" /></radialGradient>
        <radialGradient id="wm-fog" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#050b1c" stopOpacity="0.72" /><stop offset="0.7" stopColor="#050b1c" stopOpacity="0.55" /><stop offset="1" stopColor="#050b1c" stopOpacity="0" /></radialGradient>
        <pattern id="wm-grass" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M4 20l2-7 2 7M15 9l2-6 2 6M20 22l1.5-5 1.5 5" stroke="#3f9a63" strokeOpacity="0.55" strokeWidth="1.3" fill="none" strokeLinecap="round" /></pattern>
        <path id="wm-main" d={MAINLAND} />
        <path id="wm-isle-path" d={ISLAND} />
        <clipPath id="wm-clip"><use href="#wm-main" /></clipPath>
      </defs>

      {/* sea */}
      <rect width="1000" height="1200" fill="url(#wm-ocean)" />
      <path className="wm-anim wm-waves" d={WAVES} fill="none" stroke="#38bdf8" strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" />

      {/* mainland: shadow, beach, grass, texture, foam */}
      <use href="#wm-main" transform="translate(0 14)" fill="#020617" opacity="0.5" />
      <use href="#wm-main" fill="none" stroke="#e8d9a0" strokeOpacity="0.32" strokeWidth="18" strokeLinejoin="round" />
      <use href="#wm-main" fill="url(#wm-land)" />
      <use href="#wm-main" fill="url(#wm-grass)" opacity="0.6" />
      <g clipPath="url(#wm-clip)">
        <ellipse cx="240" cy="240" rx="240" ry="200" fill="url(#wm-jungle)" />
        <ellipse cx="735" cy="500" rx="230" ry="200" fill="url(#wm-arena)" />
        <ellipse cx="260" cy="860" rx="240" ry="160" fill="url(#wm-rock)" />
      </g>
      <use href="#wm-main" fill="none" stroke="#bbf7d0" strokeOpacity="0.28" strokeWidth="2.5" strokeDasharray="3 9" />

      {/* island */}
      <use href="#wm-isle-path" transform="translate(0 12)" fill="#020617" opacity="0.5" />
      <use href="#wm-isle-path" fill="none" stroke="#f1dca0" strokeOpacity="0.4" strokeWidth="16" strokeLinejoin="round" />
      <use href="#wm-isle-path" fill="url(#wm-isle)" />
      <ellipse cx="735" cy="1075" rx="150" ry="95" fill="#ea580c" opacity="0.16" />
      <ellipse className="wm-anim wm-orbit" cx="735" cy="1075" rx="210" ry="138" fill="none" stroke="#F59E0B" strokeOpacity="0.32" strokeWidth="2" strokeDasharray="4 14" />

      {/* river with banks and a bridge */}
      <path d="M520 62 C470 200 560 280 500 380 C450 470 560 560 520 640 C500 690 560 740 590 790" fill="none" stroke="#14532d" strokeWidth="26" strokeLinecap="round" opacity="0.55" />
      <path d="M520 62 C470 200 560 280 500 380 C450 470 560 560 520 640 C500 690 560 740 590 790" fill="none" stroke="#0369a1" strokeWidth="17" strokeLinecap="round" />
      <path d="M520 62 C470 200 560 280 500 380 C450 470 560 560 520 640 C500 690 560 740 590 790" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <g transform="translate(502 322) rotate(-20)"><rect x="-26" y="-9" width="52" height="18" rx="3" fill="#92400e" /><path d="M-26 -4h52M-26 3h52" stroke="#451a03" strokeWidth="1.4" /></g>

      <Terrain />
      <Island />

      {/* trails: worn dirt roads; neon once the next space is open */}
      {TRAILS.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#1c1208" strokeWidth="17" strokeLinecap="round" opacity="0.55" />
          <path d={d} fill="none" stroke={open[i] ? "#d6b56a" : "#6b5b3e"} strokeWidth="11" strokeLinecap="round" opacity={open[i] ? 0.9 : 0.7} />
          <path d={d} fill="none" stroke={open[i] ? "#39FF14" : "#3d3322"} strokeOpacity={open[i] ? 0.45 : 0.6} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
          {open[i] && <path className="wm-anim wm-flow" d={d} fill="none" stroke="#bbf7d0" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="3 20" />}
        </g>
      ))}
      {[[570, 420], [570, 650], [430, 910]].map(([x, y], i) => (
        <g key={i}><rect x={x - 1.5} y={y - 22} width="3" height="22" fill="#78350f" /><rect x={x - 12} y={y - 28} width="24" height="10" rx="2" fill="#a16207" /><path d={`M${x - 8} ${y - 23}h16`} stroke="#fde68a" strokeWidth="1.5" /></g>
      ))}

      {/* fog over spaces you haven't reached yet */}
      {!unlocked[1] && <Fog id="2" cx={745} cy={490} rx={270} ry={230} />}
      {!unlocked[2] && <Fog id="3" cx={265} cy={850} rx={270} ry={190} />}
      {!unlocked[3] && <Fog id="4" cx={735} cy={1075} rx={250} ry={190} />}

      {/* sea life, sky and a compass */}
      {[[130, 1110, 0.9], [905, 250, 0.8], [60, 640, 0.7]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity="0.85">
          <path d="M-16 0h32l-6 10h-20Z" fill="#7c4a24" /><path d="M0 0V-24l14 18H0Z" fill="#f1f5f9" /><path d="M0 -24l-10 16h10Z" fill="#cbd5e1" />
        </g>
      ))}
      {[[80, 190, 0], [0, 650, 22], [200, 1040, 11]].map(([x, y, d], i) => (
        <g key={i} transform={`translate(${x} ${y})`} opacity="0.12" fill="#e2e8f0">
          <g className="wm-anim wm-cloud" style={{ animationDelay: `-${d}s` }}>
            <ellipse cx="0" cy="0" rx="74" ry="16" /><ellipse cx="36" cy="-12" rx="42" ry="14" /><ellipse cx="-32" cy="-8" rx="36" ry="12" />
          </g>
        </g>
      ))}
      <g transform="translate(92 1108)" opacity="0.8">
        <circle r="38" fill="#06101f" fillOpacity="0.55" stroke="#e8d9a0" strokeOpacity="0.5" strokeWidth="2" />
        <path d="M0 -32L7 0L0 32L-7 0Z" fill="#e8d9a0" opacity="0.9" /><path d="M-32 0L0 -6L32 0L0 6Z" fill="#94a3b8" opacity="0.7" />
        <text y="-40" textAnchor="middle" fontFamily="Unbounded, sans-serif" fontSize="14" fontWeight="800" fill="#e8d9a0">N</text>
      </g>

      {/* vignette + corner brackets */}
      <rect width="1000" height="1200" fill="url(#wm-vignette)" />
      {["M10 54V10H54", "M946 10H990V54", "M10 1146V1190H54", "M946 1190H990V1146"].map((d) => <path key={d} d={d} fill="none" stroke="#39FF14" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />)}
    </svg>
  );
}

export default memo(WorldMapArt);
