import { memo, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import CharacterReaction from "@/components/CharacterReaction";
import { useAgentMessage } from "@/hooks/useAgent";
import { useAudioState } from "@/hooks/useAudio";

// The flying Akash companion. It parks at the left edge for 10 s, glides across to the right edge, parks for 10 s,
// glides back, and so on. It speaks the narration one short sentence at a time, plus short contextual lines
// from the levels. It is purely visual (pointer-events: none), so it can never block a click, and each
// new lane is chosen where it overlaps the fewest buttons, inputs and headings.

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
  return pool[Math.floor(Math.random() * pool.length)].y;
}

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
    const onSettle = () => { if (alive) moveY(lane()); };
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
      if (!alive || document.hidden) return;
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
          side = side === "left" ? "right" : "left";
          moveY(lane()); // set off toward a quieter lane
          moving = true;
          flightX = animate(x, edgeX(side), { duration: 4.5, ease: "easeInOut" });
          await flightX.then(() => null, () => null);
          moving = false;
        }
      })();
    }

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

  const text = msg?.text || sentence;
  const mood = msg?.mood || (text ? "speaking" : "idle");

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[45]"
        style={{ x, y, width: size, height: size * 1.1, willChange: "transform" }}
        aria-hidden="true"
        data-testid="akash-agent"
        data-agent-ignore
      >
        <motion.div animate={reduce ? undefined : { y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
          <AgentArt mood={mood} size={size} />
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
      </motion.div>
      <div className="sr-only" aria-live="polite" data-testid="agent-live">{text}</div>
    </>
  );
}

export default memo(AkashAgent);
