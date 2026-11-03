import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildMonument, COLORS } from "@/components/journey/monuments";
import { makeRng } from "@/utils/rng";

// A scroll-driven 3D journey ("scrollytelling"). A tall section holds one sticky full-screen stage. As the visitor scrolls,
// a camera flies along a path of neon wireframe monuments, one per waypoint, orbiting each while its story card fades in.
// Everything is drawn from code (see monuments.js): no images, no model files. The loop only runs while the stage is on
// screen, and visitors who prefer reduced motion (or whose browser has no WebGL) get the same stories as a plain stack.

const NAV = 56; // fixed top bar
const ACCENT = { neon: COLORS.neon, volt: COLORS.volt, aura: COLORS.aura, ember: COLORS.ember, blood: COLORS.blood };
const TEXT = { neon: "text-neon border-neon/40", volt: "text-volt border-volt/40", aura: "text-aura border-aura/40", ember: "text-ember border-ember/40", blood: "text-blood border-blood/40" };
const PER = 105; // vh of scrolling per chapter

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch { return false; }
}

function Card({ chapter, index, total, accent }) {
  return (
    <div className={`hud-panel rounded-xl p-5 sm:p-6 ${chapter.panel || ""}`} data-journey-card data-agent-avoid>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-block border px-2 py-0.5 text-[9px] font-bold tracking-[0.25em] ${TEXT[accent]}`}>{chapter.tag}</span>
        <span className="text-[10px] tracking-[0.2em] text-slate-500">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <h3 className="font-display mt-3 text-lg font-black text-white sm:text-xl">{chapter.title}</h3>
      {chapter.sub && <div className="mt-1 text-[11px] text-slate-500">{chapter.sub}</div>}
      <div className="mt-3 text-xs leading-relaxed text-slate-300">{chapter.children}</div>
    </div>
  );
}

function JourneyStage({ chapters, title, kicker, testId = "journey", hint = "SCROLL TO TRAVEL" }) {
  const N = chapters.length;
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRefs = useRef([]);
  const [mode, setMode] = useState("pending"); // pending | 3d | plain
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => { setMode(!reducedMotion() && hasWebGL() ? "3d" : "plain"); }, []);

  const jump = useCallback((i) => {
    const sec = sectionRef.current; if (!sec) return;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const range = sec.offsetHeight - window.innerHeight + NAV;
    window.scrollTo({ top: top - NAV + ((i + 0.5) / N) * range, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [N]);

  useEffect(() => {
    if (mode !== "3d") return undefined;
    const canvas = canvasRef.current; const stage = stageRef.current; const section = sectionRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); } catch { setMode("plain"); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.0095);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 1200);

    // monuments along a gently winding path. They are built the first time the camera needs them (the current stop right
    // away, its neighbours when the browser is idle), so opening a journey never stalls on building every monument.
    const lineMats = [];
    let W = 1; let H = 1; let mobile = false;
    const mons = new Array(N).fill(null);
    const get = (i) => {
      if (mons[i]) return mons[i];
      const c = chapters[i];
      const m = buildMonument(c.monument, ACCENT[c.accent] || COLORS.neon);
      const pos = new THREE.Vector3(Math.sin(i * 1.15) * 46, 0, -i * 84);
      m.group.position.copy(pos);
      m.group.rotation.y = Math.sin(i * 1.3) * 0.35;
      scene.add(m.group);
      m.group.traverse((o) => { if (o.material?.isLineMaterial) { o.material.resolution.set(W, H); lineMats.push(o.material); } });
      mons[i] = { ...m, pos, center: pos.clone().add(new THREE.Vector3(0, m.h * 0.45, 0)), dist: Math.max(m.r * 1.75, m.h * 1.2) + 14 };
      return mons[i];
    };
    const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 800 }) : setTimeout(fn, 60));
    let idleTimers = 0;
    const prebuild = (i) => { [i + 1, i - 1].forEach((k) => { if (k >= 0 && k < N && !mons[k]) { idleTimers += 1; idle(() => { idleTimers -= 1; if (alive && !mons[k]) get(k); }); } }); };
    let alive = true;

    // ground grid + stars that follow the camera, so the world feels endless
    const grid = new THREE.GridHelper(900, 150, 0x39ff14, 0x39ff14);
    grid.material.transparent = true; grid.material.opacity = 0.16; grid.material.depthWrite = false; grid.position.y = -0.2;
    scene.add(grid);
    const rng = makeRng(42);
    const starPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i += 1) { starPos[i * 3] = (rng() - 0.5) * 700; starPos[i * 3 + 1] = 10 + rng() * 220; starPos[i * 3 + 2] = (rng() - 0.5) * 700; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfffd2, size: 1.3, transparent: true, opacity: 0.7, sizeAttenuation: true, fog: false, depthWrite: false }));
    scene.add(stars);

    const resize = () => {
      W = stage.clientWidth || 1; H = stage.clientHeight || 1; mobile = W < 768;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      lineMats.forEach((m) => m.resolution.set(W, H));
    };
    const ro = new ResizeObserver(resize); ro.observe(stage); resize();

    // camera pose for chapter i at local progress u (0..1)
    const pose = (i, u) => {
      const m = get(i);
      const yaw = (i % 2 === 0 ? 0.55 : -0.55) + (u - 0.5) * 1.1 * (i % 2 === 0 ? -1 : 1);
      const d = m.dist * (mobile ? 1.6 : 1);
      const pos = new THREE.Vector3(m.pos.x + Math.sin(yaw) * d, m.center.y + d * 0.16 + 3 - (u - 0.5) * 3, m.pos.z + Math.cos(yaw) * d);
      return { pos, target: m.center.clone(), side: i % 2 === 0 ? 1 : -1 };
    };

    let visible = true; let raf = 0; let last = performance.now(); let t = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: "120px" });
    io.observe(section);
    let curSide = 1;

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, rect.height - H);
      const p = clamp01((NAV - rect.top) / range);
      const f = Math.min(N - 1e-4, p * N);
      const i = Math.floor(f); const u = f - i;
      const a = pose(i, u);
      let pos = a.pos; let target = a.target; let side = a.side;
      if (i < N - 1) {
        const s = smooth(0.62, 1, u);
        if (s > 0) { const b = pose(i + 1, 0); pos = a.pos.clone().lerp(b.pos, s); target = a.target.clone().lerp(b.target, s); side = a.side + (b.side - a.side) * s; }
      }
      camera.position.copy(pos); camera.lookAt(target);
      curSide += (side - curSide) * 0.25;
      if (mobile) camera.setViewOffset(W, H, 0, H * 0.2, W, H); else camera.setViewOffset(W, H, -curSide * W * 0.15, 0, W, H);
      grid.position.x = Math.round(pos.x / 6) * 6; grid.position.z = Math.round(pos.z / 6) * 6;
      stars.position.set(pos.x, 0, pos.z);
      for (let k = Math.max(0, i - 1); k <= Math.min(N - 1, i + 1); k += 1) mons[k]?.update?.(t);
      renderer.render(scene, camera);

      // cards fade in/out with the camera, without re-rendering React
      for (let k = 0; k < N; k += 1) {
        const el = cardRefs.current[k]; if (!el) continue;
        let o = 0;
        if (k === i) o = (k === 0 ? 1 : smooth(0, 0.14, u)) * (k === N - 1 ? 1 : 1 - smooth(0.82, 0.97, u));
        else if (k === i + 1 && u > 0.97) o = 0;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`;
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
        el.dataset.on = o > 0.5 ? "1" : "0";
      }
      if (i !== activeRef.current) { activeRef.current = i; setActive(i); prebuild(i); }
      raf = requestAnimationFrame(frame);
    }
    prebuild(0);
    raf = requestAnimationFrame(frame);
    const onVis = () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false; cancelAnimationFrame(raf); raf = 0; visible = false;
      io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.()); });
      renderer.dispose(); renderer.forceContextLoss?.();
    };
  }, [mode, chapters, N]);

  const accentFor = (c) => c.accent || "neon";
  const plain = useMemo(() => mode === "plain", [mode]);

  if (plain) {
    return (
      <section className="px-4 py-14 sm:px-8" data-testid={testId} data-mode="plain">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center"><div className="text-[10px] tracking-[0.4em] text-slate-500">{kicker}</div><h2 className="font-display mt-2 text-3xl font-black text-white sm:text-4xl">{title}</h2></div>
          <div className="space-y-5">
            {chapters.map((c, i) => (
              <div key={c.id} data-testid={c.testId || `journey-chapter-${c.id}`}><Card chapter={c} index={i} total={N} accent={accentFor(c)} /></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${N * PER + 100}vh` }} data-testid={testId} data-mode={mode} data-active={active}>
      <div ref={stageRef} className="sticky overflow-hidden bg-[#02040a]" style={{ top: NAV, height: `calc(100svh - ${NAV}px)` }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-testid={`${testId}-canvas`} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" aria-hidden="true" />

        <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-5">
          <div className="text-[9px] tracking-[0.4em] text-slate-500">{kicker}</div>
          <h2 className="font-display text-xl font-black text-white sm:text-2xl">{title}</h2>
        </div>

        <ol className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-label="Waypoints">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button type="button" onClick={() => jump(i)} aria-label={`Go to ${c.title}`} aria-current={i === active ? "step" : undefined} className={`block h-2.5 w-2.5 rounded-full border transition-all ${i === active ? "scale-125 border-neon bg-neon shadow-[0_0_8px_rgba(57,255,20,0.9)]" : "border-slate-500 bg-transparent hover:border-white"}`} />
            </li>
          ))}
        </ol>

        {chapters.map((c, i) => {
          const left = i % 2 === 0;
          return (
            <div key={c.id} className={`pointer-events-none absolute inset-x-3 bottom-3 max-h-[52svh] md:inset-x-auto md:bottom-auto md:top-1/2 md:max-h-[78%] md:w-[27rem] md:-translate-y-1/2 ${left ? "md:left-8" : "md:right-14"}`}>
              <div ref={(el) => { cardRefs.current[i] = el; }} className="max-h-[52svh] overflow-y-auto rounded-xl md:max-h-[74svh]" style={{ opacity: i === 0 ? 1 : 0, pointerEvents: i === 0 ? "auto" : "none" }} data-testid={c.testId || `journey-chapter-${c.id}`}>
                <Card chapter={c} index={i} total={N} accent={accentFor(c)} />
              </div>
            </div>
          );
        })}

        <div className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-center md:block" aria-hidden="true">
          <div className="text-[9px] tracking-[0.4em] text-slate-500">{hint}</div>
          <div className="mx-auto mt-1 h-4 w-px animate-pulse bg-gradient-to-b from-neon to-transparent" />
        </div>
      </div>
    </section>
  );
}

export default memo(JourneyStage);
