import { useEffect, useRef, useState } from "react";

// Mounts its children only when the placeholder is about to scroll into view,
// so long portfolio sections below the map cost nothing until the visitor gets near them.
export default function Defer({ children, minHeight = 400, rootMargin = "700px" }) {
  const ref = useRef(null);
  const [show, setShow] = useState(typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (show) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return show ? children : <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}
