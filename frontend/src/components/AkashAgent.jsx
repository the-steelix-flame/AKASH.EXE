import { memo, useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import CharacterReaction from "@/components/CharacterReaction";
import { useAgentMessage } from "@/hooks/useAgent";
import { useAudioState } from "@/hooks/useAudio";
import { makeRng } from "@/utils/rng";
import { sfx } from "@/utils/sfx";

// The flying Akash companion. It parks at the left edge for 10 s, glides across to the right edge, parks for 10 s,
// glides back, and so on. It speaks the narration one short sentence at a time, plus short contextual lines
// from the levels. It is purely visual (pointer-events: none), so it can never block a click, and each
// new lane is chosen where it overlaps the fewest buttons, inputs and headings.

// the companion has its own random generator, so it never disturbs the page's Math.random stream (and game logic stays testable)
const agentRng = makeRng((Date.now() ^ 0x51ed270b) >>> 0);

const AVOID = 'button, a[href], input, textarea, select, summary, [role="button"], [data-agent-avoid], h1, h2';
const NAV_H = 64;
const EDGE = 12; // gap between the agent and the screen edge where it parks

function laneScore(rects, y, agentH, bubbleH) {
  const top = y - bubbleH;
  const bottom = y + agentH;
  let s = 0;
  for (const r of rects) if (r.bottom > top + 4 && r.top < bottom - 4) s += r.w;
  return s;
}

function collectRects() {
  const vh = window.innerHeight;
  const rects = [];
  document.querySelectorAll(AVOID).forEach((el) => {
    if (el.closest("[data-agent-ignore]")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > vh) return;
    const tag = el.tagName;
    const w = tag === "TEXTAREA" || tag === "INPUT" ? 8 : tag === "BUTTON" || tag === "A" ? 2 : 1;
    rects.push({ top: r.top - 12, bottom: r.bottom + 12, w }); // 12px safety margin
  });
  return rects;
}

function scoreAt(y, agentH, bubbleH) {
  return laneScore(collectRects(), y, agentH, bubbleH);
}

// Returns the y (px from the top of the viewport) of the quietest horizontal lane.
function pickLane(prev, agentH, bubbleH) {
  const vh = window.innerHeight;
  const rects = collectRects();
  const min = NAV_H + bubbleH;
  const max = Math.max(min, vh - agentH - 10);
  const cands = [];
  for (let y = min; y <= max; y += 20) cands.push({ y, s: laneScore(rects, y, agentH, bubbleH) });
  const best = Math.min(...cands.map((c) => c.s));
  let pool = cands.filter((c) => c.s <= best);
  const far = pool.filter((c) => prev == null || Math.abs(c.y - prev) > 70); // really move, if a quiet lane elsewhere exists
  if (far.length) pool = far;
  return pool[Math.floor(agentRng() * pool.length)].y;
}

// ---- secret reactions (no hints anywhere on the site): hover, click, and dragging it round and round
const HOVER_LINES = ["Oh, hi! 👋", "Psst… hello.", "Nice cursor.", "You can see me?"];
const CLICK_LINES = ["Hey! That tickles.", "You found a secret. Shh.", "Boop!", "Don't tell anyone I can do that.", "Okay, show-off.", "I'm working, you know 😄"];
const DIZZY_LINES = ["Chakkar aa gaye… 😵‍💫", "Everything is spinning!", "Whoa… who tilted the page?", "Okay okay, I'm dizzy!"];
const RECOVER_LINES = ["Okay… I'm good.", "Let's never do that again.", "Back to work!"];
const CONFETTI = ["#39ff14", "#00f0ff", "#facc15", "#f472b6", "#a855f7", "#fb923c"];
const pick = (list) => list[Math.floor(agentRng() * list.length)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const makeBurst = (kind, n) => ({
  id: agentRng(),
  kind,
  items: Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + agentRng() * 0.5;
    const r = kind === "confetti" ? 38 + agentRng() * 40 : 26 + agentRng() * 18;
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r - (kind === "spark" ? 22 : 8), rot: (agentRng() - 0.5) * 540, color: CONFETTI[i % CONFETTI.length], ch: kind === "spark" ? "✦" : null, size: kind === "spark" ? 11 : 6 + agentRng() * 4 };
  }),
});

const artCache = { src: undefined };

function AgentArt({ mood, size }) {
  const [src, setSrc] = useState(artCache.src === undefined ? "svg" : artCache.src);
  if (src) {
    return (
      <img
        src={`/images/characters/akash-agent.${src}`}
        alt=""
        draggable={false}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
        onLoad={() => { artCache.src = src; }}
        onError={() => { const next = src === "svg" ? "png" : src === "png" ? "webp" : null; if (!next) artCache.src = null; setSrc(next); }}
      />
    );
  }
  return <CharacterReaction kind="akash" mood={mood} size={size} testId="akash-agent-sprite" />;
}

function AkashAgent() {
  const reduce = useReducedMotion();
  const { track, playing, duration } = useAudioState();
  const msg = useAgentMessage();
  const x = useMotionValue(-120);
  const y = useMotionValue(120);
  const [flip, setFlip] = useState(false);
  const [sentence, setSentence] = useState("");
  const [small, setSmall] = useState(() => window.innerWidth < 640);
  const size = small ? 54 : 72;
  const bubbleH = small ? 62 : 74;
  const dims = useRef({ size, bubbleH });
  dims.current = { size, bubbleH };

  // easter-egg state
  const [fx, setFx] = useState(null); // hover | click | drag | dizzy | null
  const [egg, setEgg] = useState(null); // a short secret line
  const [burst, setBurst] = useState(null);
  const rot = useMotionValue(0);
  const lift = useMotionValue(0);
  const sc = useMotionValue(1);
  const busy = useRef(false); // true while it is being held or is dizzy: the patrol flight pauses
  const ctl = useRef({ pause() {}, resume() {} });
  const drag = useRef(null);
  const eggTimer = useRef(null);
  const fxTimers = useRef([]);
  const wobble = useRef(null);
  const lastHover = useRef(0);
  const clicks = useRef([]);
  const talking = useRef(false);

  // narration -> one sentence at a time, timed over the clip's real length
  useEffect(() => {
    if (!track || !playing) { setSentence(""); return undefined; }
    const parts = (track.text.match(/[^.!?]+[.!?]+["”']?/g) || [track.text]).map((p) => p.trim());
    const words = parts.map((p) => p.split(/\s+/).length);
    const total = words.reduce((a, b) => a + b, 0);
    const totalMs = duration > 0 ? duration * 1000 : total * 380;
    const timers = [];
    let t = 0;
    parts.forEach((p, i) => { timers.push(setTimeout(() => setSentence(p), t)); t += (words[i] / total) * totalMs; });
    timers.push(setTimeout(() => setSentence(""), t + 300));
    return () => timers.forEach(clearTimeout);
  }, [track, playing, duration]);

  // flight
  useEffect(() => {
    let alive = true;
    let flightX = null;
    let glide = null;
    const timers = [];
    const moveY = (to) => {
      glide?.stop();
      const dur = Math.min(4.2, Math.max(1.3, Math.abs(to - y.get()) / 135)); // gentle: ~135 px/s on average
      glide = animate(y, to, { duration: dur, ease: "easeInOut" });
    };
    const lane = () => pickLane(y.get(), dims.current.size, dims.current.bubbleH);

    y.set(lane());
    const onSettle = () => { if (alive && !busy.current) moveY(lane()); };
    let scrollTimer = null;
    const onScroll = () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(onSettle, 600); };
    let side = "left";
    let moving = false;
    const edgeX = (sd) => (sd === "left" ? EDGE : Math.max(EDGE, window.innerWidth - dims.current.size - EDGE));
    const onResize = () => {
      setSmall(window.innerWidth < 640);
      if (!moving) x.set(edgeX(side)); // parked: keep it tucked against its edge
      onScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // The page changes under it (a level opens, a panel expands). Every couple of seconds, if its current
    // lane has become busier than a free one, glide to the quietest lane. It never moves needlessly.
    const watch = setInterval(() => {
      if (!alive || document.hidden || busy.current) return;
      const { size: sz, bubbleH: bh } = dims.current;
      const here = y.get();
      const best = pickLane(here, sz, bh);
      const now = scoreAt(here, sz, bh);
      if (best != null && Math.abs(best - here) > 40 && now > 0 && scoreAt(best, sz, bh) < now) moveY(best);
    }, 1000);
    timers.push(watch);
    const onFocus = (e) => { if (e.target?.matches?.("input, textarea")) onSettle(); };
    document.addEventListener("focusin", onFocus);

    if (reduce) {
      // no travel: sit at the right edge and hop to a quieter lane now and then
      x.set(Math.max(0, window.innerWidth - dims.current.size - 14));
      const id = setInterval(onSettle, 12000);
      timers.push(id);
    } else {
      // Park, glide, park, glide: it waits 10 s at the left edge, glides to the right edge, waits 10 s, glides back.
      const wait = (ms) => new Promise((res) => { timers.push(setTimeout(res, ms)); });
      x.set(edgeX("left"));
      (async () => {
        while (alive) {
          await wait(10000);
          if (!alive) return;
          if (busy.current) continue; // someone is holding it: skip this crossing
          side = side === "left" ? "right" : "left";
          moveY(lane()); // set off toward a quieter lane
          moving = true;
          flightX = animate(x, edgeX(side), { duration: 4.5, ease: "easeInOut" });
          await flightX.then(() => null, () => null);
          moving = false;
        }
      })();
    }

    // used by the easter eggs: stop the patrol while it is held, then fly it back to the nearest edge
    ctl.current = {
      pause: () => { flightX?.stop(); glide?.stop(); moving = false; },
      resume: () => {
        if (!alive) return;
        side = x.get() + dims.current.size / 2 < window.innerWidth / 2 ? "left" : "right";
        flightX?.stop();
        moving = true;
        flightX = animate(x, edgeX(side), { duration: 1.5, ease: "easeInOut" });
        flightX.then(() => { moving = false; }, () => { moving = false; });
        moveY(lane());
      },
    };

    const unsub = x.on("change", (v) => setFlip(v > window.innerWidth * 0.52));
    return () => {
      alive = false;
      flightX?.stop();
      glide?.stop();
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      clearTimeout(scrollTimer);
      unsub();
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reduce, x, y]);

  const text = msg?.text || sentence || egg?.text || "";
  talking.current = !!(msg?.text || sentence);
  const mood = msg?.mood || (text ? "speaking" : "idle");

  useEffect(() => () => { clearTimeout(eggTimer.current); fxTimers.current.forEach(clearTimeout); wobble.current?.stop(); }, []);

  const later = (fn, ms) => { fxTimers.current.push(setTimeout(fn, ms)); };
  const sayEgg = useCallback((line) => {
    if (talking.current) return; // never talk over a narration or a game hint
    clearTimeout(eggTimer.current);
    setEgg({ text: line, id: agentRng() });
    eggTimer.current = setTimeout(() => setEgg(null), 2400);
  }, []);

  const hoverFx = () => {
    const now = Date.now();
    if (busy.current || now - lastHover.current < 3500) return;
    lastHover.current = now;
    setFx((f) => f || "hover");
    setBurst(makeBurst("spark", 6));
    if (!reduce) animate(sc, [1, 1.22, 1.1], { duration: 0.5, ease: "easeOut" });
    if (agentRng() < 0.6) sayEgg(pick(HOVER_LINES));
    later(() => { setBurst((b) => (b && b.kind === "spark" ? null : b)); setFx((f) => (f === "hover" ? null : f)); }, 1300);
  };
  const hoverEnd = () => { if (!busy.current && !reduce) animate(sc, 1, { duration: 0.25 }); };

  const clickFx = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 3000), now];
    const combo = clicks.current.length >= 5;
    setFx("click");
    setBurst(makeBurst("confetti", combo ? 30 : 16));
    sfx.unlock();
    if (!reduce) {
      animate(lift, [0, -48, 0], { duration: combo ? 1 : 0.7, ease: "easeOut" });
      animate(rot, combo ? 720 : 360, { duration: combo ? 1 : 0.7, ease: "easeInOut" }).then(() => rot.set(0));
    }
    sayEgg(combo ? "Okay okay, I'm famous now! 🎉" : pick(CLICK_LINES));
    later(() => { setFx((f) => (f === "click" ? null : f)); setBurst((b) => (b && b.kind === "confetti" ? null : b)); }, combo ? 1500 : 1100);
  };

  const goDizzy = () => {
    setFx("dizzy");
    setBurst(null);
    clearTimeout(eggTimer.current); setEgg(null);
    sayEgg(pick(DIZZY_LINES));
    wobble.current?.stop();
    if (reduce) return;
    animate(rot, rot.get() + 720, { duration: 0.9, ease: "easeOut" }).then(() => {
      rot.set(0);
      wobble.current = animate(rot, [-18, 18], { duration: 0.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" });
    });
  };
  const recover = () => {
    wobble.current?.stop();
    animate(rot, 0, { type: "spring", stiffness: 140, damping: 12 });
    animate(sc, 1, { duration: 0.3 });
    setFx(null);
    sayEgg(pick(RECOVER_LINES));
    busy.current = false;
    ctl.current.resume();
  };

  const onDown = (e) => {
    if (e.button != null && e.button > 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const now = performance.now();
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: now, moved: false, ox: e.clientX - x.get(), oy: e.clientY - y.get(), pts: [], lastAng: null, spin: 0, lastX: e.clientX, lastT: now, dizzy: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 7) return;
      d.moved = true;
      busy.current = true;
      ctl.current.pause();
      setFx((f) => (f === "dizzy" ? f : "drag"));
      if (!reduce) animate(sc, 1.12, { duration: 0.2 });
    }
    const { size: sz } = dims.current;
    x.set(clamp(e.clientX - d.ox, 0, Math.max(0, window.innerWidth - sz)));
    y.set(clamp(e.clientY - d.oy, 0, Math.max(0, window.innerHeight - sz)));
    const now = performance.now();
    const vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    d.lastX = e.clientX; d.lastT = now;
    if (!d.dizzy && !reduce) rot.set(clamp(vx * 22, -28, 28)); // leans into the swing
    // "round and round" detector: signed angle travelled around the centre of the last 1.4 s of pointer positions
    d.pts.push({ x: e.clientX, y: e.clientY, t: now });
    while (d.pts.length && now - d.pts[0].t > 1400) d.pts.shift();
    if (d.pts.length > 6) {
      const cx = d.pts.reduce((a, p) => a + p.x, 0) / d.pts.length;
      const cy = d.pts.reduce((a, p) => a + p.y, 0) / d.pts.length;
      const r = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (r > 14) {
        const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
        if (d.lastAng !== null) {
          let da = ang - d.lastAng;
          if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) < 1.2) d.spin = d.spin === 0 || Math.sign(da) === Math.sign(d.spin) ? d.spin + da : da;
        }
        d.lastAng = ang;
      }
    }
    d.spin *= 0.995;
    if (!d.dizzy && Math.abs(d.spin) > Math.PI * 2 * 1.4) { d.dizzy = true; goDizzy(); }
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!d.moved) { if (performance.now() - d.t0 < 700) clickFx(); return; }
    if (d.dizzy) { later(recover, 3000); return; } // stays dizzy for a few seconds after being let go
    animate(sc, 1, { duration: 0.25 });
    animate(rot, 0, { type: "spring", stiffness: 160, damping: 12 });
    setFx(null);
    later(() => { busy.current = false; ctl.current.resume(); }, 900);
  };

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[45]"
        style={{ x, y, width: size, height: size * 1.1, willChange: "transform" }}
        aria-hidden="true"
        data-testid="akash-agent"
        data-fx={fx || ""}
        data-agent-ignore
      >
        <motion.div animate={reduce || fx === "drag" ? undefined : { y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
          <motion.div style={{ rotate: rot, y: lift, scale: sc }}>
            <AgentArt mood={mood} size={size} />
          </motion.div>
          {fx === "dizzy" && (
            <div className="pointer-events-none absolute left-1/2 top-0" data-testid="agent-stars" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="ag-orbit-x absolute left-0 top-0" style={{ animationDelay: `${-i * 0.467}s` }}>
                  <span className="ag-orbit-y block text-sm leading-none text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.9)]" style={{ animationDelay: `${-i * 0.467 - 0.35}s` }}>★</span>
                </span>
              ))}
            </div>
          )}
          {burst && (
            <div className="pointer-events-none absolute left-1/2 top-1/2" data-testid="agent-burst" data-kind={burst.kind} key={burst.id} aria-hidden="true">
              {burst.items.map((it, i) => (
                <motion.span
                  key={i}
                  className="absolute block"
                  style={it.ch ? { fontSize: it.size, color: it.color, lineHeight: 1 } : { width: it.size, height: it.size * 0.6, background: it.color, borderRadius: 1 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                  animate={{ x: it.dx, y: it.dy + 18, opacity: 0, scale: 1, rotate: it.rot }}
                  transition={{ duration: it.ch ? 1 : 1.1, ease: "easeOut" }}
                >{it.ch}</motion.span>
              ))}
            </div>
          )}
          {text && (
            <div
              key={text}
              className={`agent-bubble absolute bottom-full mb-1 w-max rounded-xl border border-neon/50 bg-slate-950/95 px-3 py-2 text-[11px] leading-snug text-slate-100 shadow-lg ${small ? "max-w-[170px]" : "max-w-[230px] text-xs"} ${flip ? "right-1/2" : "left-1/2"}`}
              data-testid="agent-bubble"
            >
              {text}
            </div>
          )}
        </motion.div>
        {/* the invisible hit area: only the character itself reacts, never the page around it */}
        <div
          className="pointer-events-auto absolute left-0 top-0 touch-none select-none rounded-full"
          style={{ width: size, height: size }}
          data-testid="agent-hit"
          onPointerEnter={(e) => { if (e.pointerType !== "touch") hoverFx(); }}
          onPointerLeave={hoverEnd}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </motion.div>
      <div className="sr-only" aria-live="polite" data-testid="agent-live">{msg?.text || sentence}</div>
    </>
  );
}

export default memo(AkashAgent);
