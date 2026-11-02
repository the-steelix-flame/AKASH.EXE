import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CharacterReaction from "@/components/CharacterReaction";
import { TYPE_META, typesLabel } from "@/data/pokemonData";

// Purely presentational battle stage. Level2Pokemon owns the rules/timing and feeds this
// component events (acts, projectile, impact, floaters, banner). Everything here animates
// transform/opacity only, so it stays smooth on phones.

const mix = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(v + (255 - v) * amt);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

// Optional hand-made art: drop /public/images/characters/pokemon/<id>.png (or .webp).
// If it is missing we silently use the built-in animated creature.
const artState = {}; // id -> "png" | "webp" | "none"
function MonArt({ mon, mood, trigger, size }) {
  const [src, setSrc] = useState(artState[mon.id] === "none" ? null : artState[mon.id] || "png");
  const [ready, setReady] = useState(artState[mon.id] === "png" || artState[mon.id] === "webp");
  const primary = TYPE_META[mon.types[0]].color;
  return (
    <>
      {src && (
        <img
          src={`/images/characters/pokemon/${mon.id}.${src}`}
          alt=""
          draggable={false}
          onLoad={() => { artState[mon.id] = src; setReady(true); }}
          onError={() => {
            if (src === "png") setSrc("webp");
            else { artState[mon.id] = "none"; setSrc(null); }
          }}
          style={{ width: size, height: size, objectFit: "contain", display: ready ? "block" : "none" }}
        />
      )}
      {!ready && (
        <CharacterReaction kind="creature" type={mon.types[0]} color={primary} accent={mix(primary, 0.55)} mood={mood} trigger={trigger} size={size} />
      )}
    </>
  );
}

const STATUS_STYLE = { READY: "text-slate-400", ATTACKING: "text-volt", HURT: "text-ember", "LOW HP": "text-blood", FAINTED: "text-slate-500" };
function HpCard({ mon, hp, side, act }) {
  const pct = Math.max(0, Math.min(100, (hp / mon.hp) * 100));
  const status = hp <= 0 ? "FAINTED" : act === "lunge" ? "ATTACKING" : act === "hit" ? "HURT" : pct <= 25 ? "LOW HP" : "READY";
  const tone = pct > 50 ? "bg-neon" : pct > 20 ? "bg-ember" : "bg-blood";
  return (
    <div
      className={`absolute w-[46%] max-w-[230px] rounded-lg border bg-slate-950/90 px-2.5 py-1.5 sm:px-3 sm:py-2 ${side === "player" ? "bottom-3 right-3 border-volt/50" : "left-3 top-3 border-blood/50"}`}
      data-testid={`hp-card-${side}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[10px] font-black text-white sm:text-xs">{mon.name.toUpperCase()}</span>
        <span className="text-[10px]" aria-label={typesLabel(mon.types)}>{mon.types.map((t) => TYPE_META[t].emoji).join("")}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-900" role="progressbar" aria-valuemin={0} aria-valuemax={mon.hp} aria-valuenow={Math.max(0, hp)}>
        <motion.div className={`h-full w-full origin-left ${tone}`} animate={{ scaleX: pct / 100 }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[9px] sm:text-[10px]">
        <span className={`font-bold tracking-widest ${STATUS_STYLE[status]}`} data-testid={`status-${side}`}>{status}</span>
        <span className="text-slate-400" data-testid={`battle-${side === "player" ? "left" : "right"}-hp`}>{Math.max(0, hp)} / {mon.hp} HP</span>
      </div>
    </div>
  );
}

const BANNER = {
  super: "border-neon text-neon",
  weak: "border-ember text-ember",
  none: "border-slate-500 text-slate-300",
  crit: "border-volt text-volt",
};

function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      id: i,
      x: (i * 37) % 100,
      delay: (i % 9) * 0.07,
      dur: 1.6 + (i % 5) * 0.25,
      rot: (i * 53) % 360,
      color: ["#39FF14", "#00F0FF", "#F59E0B", "#A855F7", "#EF4444"][i % 5],
    })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="confetti">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-0 block h-2 w-2 rounded-sm"
          style={{ left: `${b.x}%`, background: b.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 330, opacity: [1, 1, 0], rotate: b.rot + 360 }}
          transition={{ delay: b.delay, duration: b.dur, ease: "easeIn", repeat: 1 }}
        />
      ))}
    </div>
  );
}

const POS = { player: { left: "26%", top: "62%" }, opponent: { left: "73%", top: "40%" } };

function BattleArena({
  player, opponent, pHp, oHp, pMood, oMood, pAct, oAct, pTrig, oTrig,
  projectile, impact, floaters, banner, shake, stage, celebrate, active = true,
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const [unit, setUnit] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setUnit(Math.max(0.55, Math.min(1.15, e.contentRect.width / 640))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pSize = Math.round(150 * unit);
  const oSize = Math.round(128 * unit);

  const acts = (dir) => ({
    idle: { x: 0, y: 0, opacity: 1 },
    lunge: { x: [0, dir * 84 * unit, 0], opacity: 1, transition: { duration: 0.4, times: [0, 0.45, 1] } },
    hit: { x: [0, -dir * 14, dir * 8, 0], opacity: [1, 0.25, 1, 0.35, 1], transition: { duration: 0.5 } },
    faint: { y: 34, opacity: 0, transition: { duration: 0.8, delay: 0.3 } },
  });

  const target = impact ? POS[impact.target] : null;
  const s = shake?.level ? (shake.level === "big" ? 9 : 4) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[16/10] min-h-[250px] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 sm:aspect-[16/9]"
      data-testid="l2-arena-stage"
      data-stage={stage}
    >
      <motion.div
        key={shake?.key ?? 0}
        className="absolute inset-0"
        initial={stage === "intro" && !reduce ? { scale: 1.16 } : false}
        animate={{ scale: 1, x: s ? [0, -s, s, -s * 0.6, 0] : 0, y: s ? [0, s * 0.5, -s * 0.5, 0] : 0 }}
        transition={{ duration: stage === "intro" ? 1.5 : 0.4, ease: "easeOut" }}
      >
        {/* animated background: sky, drifting clouds, scrolling floor lines */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0b1d3a 0%,#1e3a8a 38%,#1f6f5c 38.5%,#14532d 100%)" }} />
        <div className={`arena-clouds absolute inset-x-0 top-[6%] h-[26%] ${active ? "" : "arena-paused"}`} aria-hidden="true" />
        <div className={`arena-floor absolute inset-x-0 bottom-0 top-[38%] ${active ? "" : "arena-paused"}`} aria-hidden="true" />
        <div className="absolute left-[58%] top-[44%] h-[10%] w-[30%] rounded-[50%] bg-black/30" aria-hidden="true" />
        <div className="absolute left-[8%] top-[72%] h-[12%] w-[36%] rounded-[50%] bg-black/35" aria-hidden="true" />

        {/* opponent */}
        <div className="absolute" style={{ ...POS.opponent, transform: "translate(-50%,-50%)" }}>
          <motion.div
            key={`${opponent.id}-in`}
            initial={stage === "pre" || stage === "intro" ? { x: 220, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 70, damping: 16 }}
          >
            <motion.div key={`o-${oAct}-${oTrig}`} variants={acts(-1)} initial="idle" animate={oAct} data-testid="battle-right">
              <MonArt mon={opponent} mood={oMood} trigger={oTrig} size={oSize} />
            </motion.div>
          </motion.div>
        </div>

        {/* player */}
        {player ? (
          <div className="absolute" style={{ ...POS.player, transform: "translate(-50%,-50%)" }}>
            <motion.div
              key={player.id}
              initial={stage === "intro" ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 13, delay: stage === "intro" ? 0.55 : 0 }}
            >
              <motion.div key={`p-${pAct}-${pTrig}`} variants={acts(1)} initial="idle" animate={pAct} data-testid="battle-left">
                <MonArt mon={player} mood={pMood} trigger={pTrig} size={pSize} />
              </motion.div>
            </motion.div>
            {stage === "intro" && !reduce && (
              <motion.div
                className="absolute left-1/2 top-1/2 h-24 w-24 rounded-full bg-white"
                style={{ x: "-50%", y: "-50%" }}
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <div className="absolute flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-center text-[10px] text-slate-400" style={{ ...POS.player, transform: "translate(-50%,-50%)" }} data-testid="battle-left">
            AWAITING<br />SELECTION
          </div>
        )}

        {/* projectile */}
        <AnimatePresence>
          {projectile && (
            <motion.div
              key={projectile.key}
              className="pointer-events-none absolute z-10 select-none"
              style={{ fontSize: 34 * unit, x: "-50%", y: "-50%" }}
              initial={{ left: POS[projectile.from].left, top: POS[projectile.from].top, scale: 0.6, opacity: 1 }}
              animate={{
                left: POS[projectile.from === "player" ? "opponent" : "player"].left,
                top: POS[projectile.from === "player" ? "opponent" : "player"].top,
                scale: [0.6, 1.4, 1.1],
                rotate: [0, 180, 360],
              }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.36, ease: "easeIn" }}
              data-testid="projectile"
            >
              <span style={{ filter: `drop-shadow(0 0 8px ${projectile.color})` }}>{projectile.emoji}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* impact burst */}
        <AnimatePresence>
          {impact && target && (
            <motion.div
              key={impact.key}
              className="pointer-events-none absolute z-10"
              style={{ left: target.left, top: target.top, x: "-50%", y: "-50%" }}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: impact.strength === "super" ? 2.6 : impact.strength === "weak" ? 0.9 : 1.6, opacity: 0 }}
              transition={{ duration: impact.strength === "super" ? 0.6 : 0.4, ease: "easeOut" }}
              data-testid={`impact-${impact.strength}`}
            >
              <div
                className="h-28 w-28 rounded-full"
                style={{ background: `radial-gradient(circle, #fff 0%, ${impact.color} 38%, transparent 70%)` }}
              />
              {impact.strength === "super" && <span className="absolute inset-0 flex items-center justify-center text-5xl">💥</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* floating damage numbers */}
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              className={`pointer-events-none absolute z-20 font-display font-black ${f.tone}`}
              style={{ left: POS[f.side].left, top: POS[f.side].top, x: "-50%", fontSize: f.big ? 30 * unit : 22 * unit, textShadow: "0 2px 0 #000" }}
              initial={{ y: -10, opacity: 0, scale: 0.6 }}
              animate={{ y: -70, opacity: [0, 1, 1, 0], scale: 1 }}
              transition={{ duration: 1.05, ease: "easeOut" }}
              data-testid="damage-number"
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {impact?.strength === "super" && !reduce && (
          <motion.div key={`flash-${impact.key}`} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} aria-hidden="true" />
        )}
        {celebrate && !reduce && <Confetti />}
      </motion.div>

      {/* HP cards stay still while the scene shakes */}
      {stage !== "pre" && player && <HpCard mon={player} hp={pHp} side="player" act={pAct} />}
      <HpCard mon={opponent} hp={oHp} side="opponent" act={oAct} />

      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.key}
            className="pointer-events-none absolute left-1/2 top-[25%] z-30 w-max max-w-[92%]"
            style={{ x: "-50%" }}
            initial={{ scale: 0.4, opacity: 0, y: 10 }}
            animate={{ scale: banner.kind === "super" ? [0.4, 1.25, 1] : 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
            data-testid="effectiveness-banner"
            data-kind={banner.kind}
          >
            <div className={`rounded-md border-2 bg-black/80 px-3 py-1.5 text-center font-display text-[11px] font-black tracking-wider sm:text-sm ${BANNER[banner.kind] || BANNER.none}`}>
              {banner.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(BattleArena);
