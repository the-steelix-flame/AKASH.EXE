import { memo, useEffect, useRef } from "react";

// Falling star canvas. Only animates while it is actually on screen and the tab is visible;
// with prefers-reduced-motion it paints one still frame.
function Starfield({ density = 70 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stars = [];
    let visible = true;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      stars = Array.from({ length: density }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 0.8 + 0.2,
        s: Math.random() * 1.6 + 0.3,
        c: Math.random() > 0.85 ? (Math.random() > 0.5 ? "#39FF14" : "#00F0FF") : "#94a3b8",
      }));
      paint();
    };

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        ctx.globalAlpha = st.z;
        ctx.fillStyle = st.c;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      for (const st of stars) {
        st.y += st.z * 0.35;
        if (st.y > canvas.height) { st.y = -2; st.x = Math.random() * canvas.width; }
      }
      paint();
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); })
      : null;
    if (io) io.observe(canvas);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      if (io) io.disconnect();
    };
  }, [density]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-60" aria-hidden="true" />;
}

export default memo(Starfield);
