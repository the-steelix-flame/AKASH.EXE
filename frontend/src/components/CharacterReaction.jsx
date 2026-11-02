import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Reusable reaction system for every game.
//   <CharacterReaction kind="swiper" mood="mischievous" size={150} />
// kinds : akash | swiper | shinobi | saiyan | professor | creature
// moods : idle speaking happy excited worried surprised confused disappointed celebrating
//         defeated thinking  (+ mischievous frustrated confident hurt determined relieved)
// Moods are always driven by real game events (never random): see the level files.

export const MOODS = [
  "idle", "speaking", "happy", "excited", "worried", "surprised", "confused", "disappointed",
  "celebrating", "defeated", "thinking", "mischievous", "frustrated", "confident", "hurt", "determined", "relieved",
];

const INK = "#0f172a";

// eye: shape | brow: [inner, outer] vertical offset (negative = up) | mouth | extras
const FACE = {
  idle:         { eye: "open",    brow: [0, 0],    mouth: "smile-s" },
  speaking:     { eye: "open",    brow: [-1, -1],  mouth: "talk" },
  happy:        { eye: "arc",     brow: [-3, -3],  mouth: "smile-l" },
  excited:      { eye: "wide",    brow: [-6, -6],  mouth: "open-smile", spark: true },
  worried:      { eye: "open",    brow: [-8, 2],   mouth: "frown-wavy", sweat: true },
  surprised:    { eye: "wide",    brow: [-7, -7],  mouth: "o", mark: "!" },
  confused:     { eye: "open",    brow: [0, 0],    mouth: "skew", mark: "?", oneBrow: true },
  disappointed: { eye: "half",    brow: [-5, 3],   mouth: "frown" },
  celebrating:  { eye: "arc",     brow: [-5, -5],  mouth: "open-smile", spark: true },
  defeated:     { eye: "x",       brow: [-5, 3],   mouth: "flat" },
  thinking:     { eye: "up",      brow: [0, 0],    mouth: "smile-s", bubble: true, oneBrow: true },
  mischievous:  { eye: "narrow",  brow: [5, -5],   mouth: "smirk" },
  frustrated:   { eye: "narrow",  brow: [7, -4],   mouth: "grit" },
  confident:    { eye: "open",    brow: [2, -3],   mouth: "smirk-s" },
  hurt:         { eye: "squint",  brow: [-5, 3],   mouth: "grit" },
  determined:   { eye: "open",    brow: [4, -2],   mouth: "firm" },
  relieved:     { eye: "arc-down", brow: [-3, 2],  mouth: "smile-s", sweat: true },
};

// Whole-body animation per mood. Every property is listed so switching moods fully resets.
const BASE = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
const rep = (duration, extra = {}) => ({ repeat: Infinity, duration, ease: "easeInOut", ...extra });
const MOTION = {
  idle:         { a: { y: [0, -4, 0] }, t: rep(2.6) },
  speaking:     { a: { y: [0, -3, 0, -2, 0] }, t: rep(0.8) },
  happy:        { a: { y: [0, -10, 0] }, t: rep(0.9, { repeatDelay: 0.5 }) },
  excited:      { a: { y: [0, -18, 0] }, t: rep(0.5) },
  celebrating:  { a: { y: [0, -26, 0], rotate: [-5, 5, -5] }, t: rep(0.55) },
  worried:      { a: { x: [0, -3, 3, -3, 3, 0] }, t: rep(0.4, { ease: "linear" }) },
  surprised:    { a: { scale: [1, 1.18, 1.04], y: [0, -12, 0] }, t: { duration: 0.4 } },
  confused:     { a: { rotate: [0, -7, 7, 0] }, t: rep(2.2) },
  disappointed: { a: { y: 8, rotate: -3, scale: 0.97 }, t: { duration: 0.5 } },
  defeated:     { a: { y: 36, rotate: 84, opacity: 0.7 }, t: { duration: 0.7, ease: "easeIn" } },
  thinking:     { a: { rotate: [0, 4, 0, -2, 0] }, t: rep(3) },
  mischievous:  { a: { x: [0, 6, 0, -6, 0] }, t: rep(1.6) },
  frustrated:   { a: { x: [0, -6, 6, -6, 6, 0] }, t: rep(0.5, { repeatDelay: 0.6, ease: "linear" }) },
  confident:    { a: { scale: [1.04, 1.08, 1.04], y: -2 }, t: rep(1.8) },
  hurt:         { a: { x: [0, -12, 10, -8, 0], opacity: [1, 0.5, 1, 0.6, 1] }, t: { duration: 0.45 } },
  determined:   { a: { scale: [1, 1.04, 1] }, t: rep(1.4) },
  relieved:     { a: { y: [0, 3, 0] }, t: rep(3) },
};
const STILL = { defeated: true, disappointed: true, surprised: true, hurt: true };

// arm angle (degrees) by mood: 0 hanging, 150 raised, 140 hands to face, 25 fists out
const ARMS = {
  celebrating: 155, excited: 150, happy: 40, surprised: 120, worried: 140,
  determined: 28, confident: 28, frustrated: 30, mischievous: 12, defeated: 10,
};

function Eye({ type, x, y, side }) {
  const s = side; // -1 left, +1 right
  const g = (children) => <g transform={`translate(${x} ${y})`}>{children}</g>;
  switch (type) {
    case "wide":
      return g(<><circle r="10" fill="#fff" /><circle r="3.2" fill={INK} /></>);
    case "arc":
      return g(<path d="M-9 3 Q0 -9 9 3" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />);
    case "arc-down":
      return g(<path d="M-9 -2 Q0 8 9 -2" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />);
    case "half":
      return g(<><path d="M-9 0 A9 6 0 0 0 9 0 Z" fill="#fff" /><circle cy="2" r="3" fill={INK} /><path d="M-10 0 H10" stroke={INK} strokeWidth="2.5" /></>);
    case "x":
      return g(<path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />);
    case "narrow":
      return g(<><ellipse rx="9" ry="4.5" fill="#fff" /><circle cx={s * 2} r="3" fill={INK} /></>);
    case "squint":
      return g(<path d={s < 0 ? "M-8 -6 L6 0 L-8 6" : "M8 -6 L-6 0 L8 6"} stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />);
    case "up":
      return g(<><circle r="8" fill="#fff" /><circle cx="3" cy="-3" r="3.6" fill={INK} /></>);
    default:
      return g(<><circle r="8" fill="#fff" /><circle cx={s * 1} cy="1" r="4" fill={INK} /></>);
  }
}

function Mouth({ type, cx, y }) {
  const stroke = { stroke: INK, strokeWidth: 3.2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const g = (children) => <g transform={`translate(${cx} ${y})`}>{children}</g>;
  switch (type) {
    case "smile-l": return g(<path d="M-16 -2 Q0 16 16 -2" {...stroke} />);
    case "open-smile": return g(<><path d="M-14 -2 Q0 20 14 -2 Z" fill="#7f1d1d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" /><path d="M-7 8 Q0 4 7 8 Q0 15 -7 8Z" fill="#fb7185" /></>);
    case "talk": return g(<motion.ellipse rx="8" ry="2" fill="#7f1d1d" stroke={INK} strokeWidth="2.5" initial={{ ry: 2 }} animate={{ ry: [2, 8, 3, 7, 2] }} transition={{ repeat: Infinity, duration: 0.7 }} />);
    case "frown-wavy": return g(<path d="M-12 4 Q-6 -3 0 3 Q6 9 12 2" {...stroke} />);
    case "frown": return g(<path d="M-10 6 Q0 -4 10 6" {...stroke} />);
    case "o": return g(<ellipse rx="6" ry="8" fill="#7f1d1d" stroke={INK} strokeWidth="2.5" />);
    case "skew": return g(<path d="M-10 4 L-2 0 L10 6" {...stroke} />);
    case "flat": return g(<path d="M-9 2 H9" {...stroke} />);
    case "smirk": return g(<path d="M-10 4 Q2 9 13 -3" {...stroke} />);
    case "smirk-s": return g(<path d="M-8 3 Q2 7 10 0" {...stroke} />);
    case "firm": return g(<path d="M-9 3 H9" {...stroke} strokeWidth="4" />);
    case "grit": return g(<><rect x="-12" y="-3" width="24" height="10" rx="2.5" fill="#fff" stroke={INK} strokeWidth="2.5" /><path d="M-4 -3 V7 M4 -3 V7" stroke={INK} strokeWidth="1.5" /></>);
    default: return g(<path d="M-10 0 Q0 8 10 0" {...stroke} />); // smile-s
  }
}

function Face({ mood, cx = 100, cy = 86, browColor = INK, spread = 22 }) {
  const f = FACE[mood] || FACE.idle;
  const ex = spread;
  const ey = cy - 4;
  const [inner, outer] = f.brow;
  const brow = (side, raiseExtra = 0) => {
    const innerX = cx + side * (ex - 11);
    const outerX = cx + side * (ex + 11);
    return (
      <path
        d={`M${innerX} ${ey - 17 + inner + raiseExtra} L${outerX} ${ey - 17 + outer + raiseExtra}`}
        stroke={browColor} strokeWidth="4" strokeLinecap="round"
      />
    );
  };
  return (
    <g>
      <Eye type={f.eye} x={cx - ex} y={ey} side={-1} />
      <Eye type={f.eye} x={cx + ex} y={ey} side={1} />
      {brow(-1)}
      {brow(1, f.oneBrow ? -8 : 0)}
      <Mouth type={f.mouth} cx={cx} y={cy + 24} />
      {f.sweat && <path d={`M${cx + 46} ${cy - 30} q6 10 0 16 q-6 -6 0 -16z`} fill="#7dd3fc" stroke="#0ea5e9" strokeWidth="1.5" />}
      {f.mark && <text x={cx + 50} y={cy - 40} fontSize="34" fontWeight="900" fill="#facc15" stroke={INK} strokeWidth="1.5" fontFamily="Unbounded, sans-serif">{f.mark}</text>}
      {f.spark && (
        <g fill="#facc15">
          {[[-62, -50, 0], [64, -44, 0.2], [70, 24, 0.4]].map(([dx, dy, d], i) => (
            <motion.path key={i} d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5Z"
              style={{ x: cx + dx, y: cy + dy }}
              animate={{ scale: [0.4, 1.2, 0.4], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: d }} />
          ))}
        </g>
      )}
      {f.bubble && (
        <g>
          <circle cx={cx + 52} cy={cy - 52} r="3" fill="#fff" opacity="0.9" />
          <circle cx={cx + 62} cy={cy - 66} r="5" fill="#fff" opacity="0.9" />
          <ellipse cx={cx + 80} cy={cy - 88} rx="22" ry="13" fill="#fff" opacity="0.95" />
          <text x={cx + 68} y={cy - 83} fontSize="16" fontWeight="900" fill={INK}>...</text>
        </g>
      )}
    </g>
  );
}

function Arms({ mood, color, hand }) {
  const angle = ARMS[mood] ?? 0;
  const arm = (side) => (
    <motion.g
      key={side}
      style={{ originX: 0.5, originY: 0 }}
      animate={{ rotate: side * angle }}
      transition={{ type: "spring", stiffness: 160, damping: 14 }}
    >
      <rect x={side < 0 ? 40 : 148} y="136" width="14" height="42" rx="7" fill={color} />
      <circle cx={side < 0 ? 47 : 155} cy="180" r="8" fill={hand} />
    </motion.g>
  );
  return <g>{arm(-1)}{arm(1)}</g>;
}

// ---------------------------------------------------------------- bodies
function Swiper({ mood }) {
  return (
    <g>
      <path d="M52 168 Q6 160 10 108 Q36 140 62 144 Z" fill="#f97316" />
      <path d="M12 116 Q4 110 8 100 Q20 108 24 122 Z" fill="#ffedd5" />
      <ellipse cx="100" cy="168" rx="44" ry="38" fill="#f97316" />
      <ellipse cx="100" cy="176" rx="26" ry="24" fill="#ffedd5" />
      <rect x="68" y="196" width="16" height="18" rx="7" fill="#ea580c" />
      <rect x="116" y="196" width="16" height="18" rx="7" fill="#ea580c" />
      <Arms mood={mood} color="#f97316" hand="#ea580c" />
      <path d="M62 62 L56 18 L92 48 Z" fill="#f97316" /><path d="M66 54 L63 31 L82 48 Z" fill="#1e293b" />
      <path d="M138 62 L144 18 L108 48 Z" fill="#f97316" /><path d="M134 54 L137 31 L118 48 Z" fill="#1e293b" />
      <circle cx="100" cy="88" r="46" fill="#f97316" />
      <path d="M56 100 Q100 140 144 100 Q132 126 100 130 Q68 126 56 100Z" fill="#ffedd5" />
      <path d="M54 76 Q100 58 146 76 L146 96 Q100 80 54 96 Z" fill="#1e293b" />
      <ellipse cx="100" cy="106" rx="14" ry="10" fill="#ffedd5" />
      <ellipse cx="100" cy="101" rx="6" ry="4.5" fill={INK} />
      <Face mood={mood} cy={88} browColor="#fed7aa" />
    </g>
  );
}

function Shinobi({ mood }) {
  return (
    <g>
      <ellipse cx="100" cy="168" rx="42" ry="40" fill="#6d28d9" />
      <path d="M82 134 L100 160 L118 134 Z" fill="#c4b5fd" />
      <rect x="62" y="172" width="76" height="9" rx="3" fill="#1e1b4b" />
      <rect x="70" y="196" width="18" height="18" rx="6" fill="#1e1b4b" />
      <rect x="112" y="196" width="18" height="18" rx="6" fill="#1e1b4b" />
      <Arms mood={mood} color="#6d28d9" hand="#fcd9b6" />
      <path d="M52 78 L40 36 L68 56 L72 18 L92 50 L108 14 L120 50 L142 24 L148 60 L162 48 L146 92 Z" fill="#1e1b4b" />
      <circle cx="100" cy="88" r="44" fill="#fcd9b6" />
      <path d="M54 84 Q100 40 146 84 Q146 66 130 52 Q100 36 70 52 Q54 66 54 84Z" fill="#1e1b4b" />
      <rect x="52" y="60" width="96" height="16" rx="4" fill="#4338ca" />
      <rect x="82" y="58" width="36" height="20" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
      <path d="M100 62 L103 69 L110 70 L104 74 L106 80 L100 76 L94 80 L96 74 L90 70 L97 69 Z" fill="#475569" />
      <Face mood={mood} cy={92} />
    </g>
  );
}

function Saiyan({ mood }) {
  const aura = mood === "celebrating" || mood === "excited" || mood === "determined";
  return (
    <g>
      {aura && (
        <motion.ellipse cx="100" cy="120" rx="82" ry="96" fill="#facc15" opacity="0.18"
          animate={{ scale: [0.96, 1.06, 0.96], opacity: [0.14, 0.3, 0.14] }} transition={{ repeat: Infinity, duration: 0.8 }} />
      )}
      <ellipse cx="100" cy="168" rx="42" ry="40" fill="#f97316" />
      <path d="M80 134 L100 168 L120 134 Z" fill="#1d4ed8" />
      <rect x="60" y="172" width="80" height="10" rx="3" fill="#1d4ed8" />
      <rect x="70" y="196" width="18" height="18" rx="6" fill="#1e3a8a" />
      <rect x="112" y="196" width="18" height="18" rx="6" fill="#1e3a8a" />
      <Arms mood={mood} color="#f97316" hand="#fcd9b6" />
      <path d="M52 86 L28 44 L60 56 L52 12 L84 46 L100 2 L116 46 L148 12 L140 56 L172 44 L148 86 Z" fill="#facc15" stroke="#eab308" strokeWidth="2" />
      <circle cx="100" cy="92" r="42" fill="#fcd9b6" />
      <path d="M58 82 Q100 54 142 82 Q124 70 100 70 Q76 70 58 82Z" fill="#facc15" />
      <Face mood={mood} cy={94} browColor="#a16207" />
    </g>
  );
}

function Professor({ mood }) {
  return (
    <g>
      <ellipse cx="100" cy="168" rx="44" ry="40" fill="#f8fafc" />
      <path d="M78 134 L100 176 L122 134 Z" fill="#7c3aed" />
      <rect x="99" y="150" width="2" height="48" fill="#cbd5e1" />
      <rect x="70" y="196" width="18" height="18" rx="6" fill="#475569" />
      <rect x="112" y="196" width="18" height="18" rx="6" fill="#475569" />
      <Arms mood={mood} color="#f8fafc" hand="#fcd9b6" />
      <circle cx="100" cy="88" r="44" fill="#fcd9b6" />
      <path d="M56 80 Q56 44 100 42 Q144 44 144 80 Q130 56 100 56 Q70 56 56 80Z" fill="#e5e7eb" />
      <circle cx="78" cy="90" r="14" fill="none" stroke="#475569" strokeWidth="2.5" />
      <circle cx="122" cy="90" r="14" fill="none" stroke="#475569" strokeWidth="2.5" />
      <path d="M92 90 H108" stroke="#475569" strokeWidth="2.5" />
      <Face mood={mood} cy={92} browColor="#6b7280" />
    </g>
  );
}


// The flying companion: hoodie, headset with a lime accent, jetpack flame. No legs: it hovers.
function Akash({ mood }) {
  return (
    <g>
      <motion.path d="M82 196 Q100 238 118 196 Q100 206 82 196Z" fill="#f97316" animate={{ scaleY: [1, 1.35, 1] }} transition={{ repeat: Infinity, duration: 0.28 }} style={{ originY: 0 }} />
      <motion.path d="M90 196 Q100 222 110 196 Q100 202 90 196Z" fill="#fde68a" animate={{ scaleY: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 0.2 }} style={{ originY: 0 }} />
      <rect x="64" y="150" width="14" height="36" rx="6" fill="#334155" />
      <rect x="122" y="150" width="14" height="36" rx="6" fill="#334155" />
      <ellipse cx="100" cy="166" rx="42" ry="38" fill="#0f172a" stroke="#39FF14" strokeWidth="2.5" />
      <path d="M86 140 L100 172 L114 140" fill="none" stroke="#39FF14" strokeWidth="3" strokeLinejoin="round" />
      <path d="M92 176 L100 156 L108 176 M95 169 H105" fill="none" stroke="#39FF14" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <Arms mood={mood} color="#0f172a" hand="#f1c79a" />
      <path d="M56 84 Q52 36 100 34 Q148 36 144 84 Q132 56 100 54 Q68 56 56 84Z" fill="#111827" />
      <path d="M62 60 L56 30 L82 48Z M138 60 L144 30 L118 48Z M98 46 L100 20 L108 46Z" fill="#111827" />
      <circle cx="100" cy="90" r="43" fill="#f1c79a" />
      <path d="M56 84 Q52 36 100 34 Q148 36 144 84 Q132 62 100 60 Q68 62 56 84Z" fill="#111827" />
      <path d="M57 92 Q56 40 100 38 Q144 40 143 92" fill="none" stroke="#39FF14" strokeWidth="4" strokeLinecap="round" />
      <rect x="48" y="84" width="12" height="22" rx="6" fill="#39FF14" />
      <rect x="140" y="84" width="12" height="22" rx="6" fill="#39FF14" />
      <path d="M52 104 Q54 124 78 124" fill="none" stroke="#39FF14" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="124" r="4" fill="#00F0FF" />
      <Face mood={mood} cy={92} browColor="#111827" />
    </g>
  );
}

const SHAPES = {
  electric: "ears", normal: "ears", fire: "flame", water: "shell", grass: "leaf", ghost: "ghost", psychic: "ghost",
  flying: "wing", rock: "rock", ground: "rock", fighting: "horn", dragon: "horn", ice: "horn", poison: "leaf",
  bug: "horn", steel: "rock", fairy: "ears", dark: "ears",
};

function Creature({ mood, color = "#fbbf24", accent = "#fde68a", type = "normal" }) {
  const shape = SHAPES[type] || "ears";
  return (
    <g>
      {shape === "flame" && <motion.path d="M150 176 Q186 150 168 116 Q160 140 146 140 Z" fill="#f97316" animate={{ scaleY: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ originY: 1 }} />}
      {shape === "wing" && <><path d="M54 140 Q8 130 4 90 Q40 104 62 124Z" fill={accent} /><path d="M146 140 Q192 130 196 90 Q160 104 138 124Z" fill={accent} /></>}
      {shape === "shell" && <ellipse cx="100" cy="162" rx="56" ry="44" fill="#92400e" />}
      <ellipse cx="100" cy="168" rx="46" ry="38" fill={color} />
      <ellipse cx="100" cy="176" rx="28" ry="24" fill={accent} />
      {shape !== "ghost" && <><ellipse cx="72" cy="206" rx="18" ry="9" fill={color} /><ellipse cx="128" cy="206" rx="18" ry="9" fill={color} /></>}
      {shape === "ghost" && <path d="M56 196 Q68 214 80 198 Q92 214 104 198 Q116 214 128 198 Q138 210 146 196 L146 176 L56 176Z" fill={color} />}
      <Arms mood={mood} color={color} hand={accent} />
      {shape === "ears" && <><path d="M62 64 L52 14 L92 50Z" fill={color} /><path d="M138 64 L148 14 L108 50Z" fill={color} /><path d="M56 26 L52 14 L66 22Z M144 26 L148 14 L134 22Z" fill={INK} /></>}
      {shape === "horn" && <path d="M88 48 L100 8 L112 48Z" fill={accent} stroke={INK} strokeWidth="2" />}
      {shape === "rock" && <path d="M56 70 L60 30 L82 54 L100 22 L118 54 L140 30 L144 70Z" fill="#78716c" />}
      {shape === "leaf" && <><ellipse cx="100" cy="42" rx="28" ry="20" fill="#16a34a" /><path d="M100 44 Q70 10 52 30 Q76 38 100 44Z M100 44 Q130 10 148 30 Q124 38 100 44Z" fill="#22c55e" /></>}
      {shape === "flame" && <motion.path d="M100 52 Q76 28 100 2 Q124 28 100 52Z" fill="#f97316" animate={{ scaleY: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.45 }} style={{ originY: 1 }} />}
      <circle cx="100" cy="92" r="46" fill={color} />
      <ellipse cx="100" cy="112" rx="22" ry="16" fill={accent} opacity="0.55" />
      <circle cx="62" cy="108" r="7" fill="#fb7185" opacity="0.55" />
      <circle cx="138" cy="108" r="7" fill="#fb7185" opacity="0.55" />
      <Face mood={mood} cy={92} />
    </g>
  );
}

const BODIES = { akash: Akash, swiper: Swiper, shinobi: Shinobi, saiyan: Saiyan, professor: Professor, creature: Creature };

function CharacterReaction({ kind = "creature", mood = "idle", size = 150, flip = false, trigger = 0, className = "", testId, ...rest }) {
  const reduce = useReducedMotion();
  const Body = BODIES[kind] || Creature;
  const m = MOTION[mood] || MOTION.idle;
  const animate = { ...BASE, ...m.a };
  const still = reduce && !STILL[mood];
  return (
    <motion.div
      key={`${mood}-${trigger}`}
      animate={still ? BASE : animate}
      transition={still ? { duration: 0 } : m.t}
      style={{ width: size, height: size * 1.1, transformOrigin: "50% 92%", willChange: "transform" }}
      className={className}
      data-testid={testId}
      data-mood={mood}
      data-kind={kind}
    >
      <svg viewBox="0 0 200 220" width="100%" height="100%" role="img" aria-label={`${kind} looking ${mood}`} style={{ transform: flip ? "scaleX(-1)" : undefined, overflow: "visible" }}>
        <Body mood={mood} {...rest} />
      </svg>
    </motion.div>
  );
}

export default memo(CharacterReaction);
