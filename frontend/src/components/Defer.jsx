import { Suspense, useEffect, useRef, useState } from "react";

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

  // Each deferred block has its OWN Suspense boundary. Without it, a lazy section loading for the first time would
  // suspend the app-level boundary and swap the whole page for "LOADING…": the page collapses and the browser
  // throws the visitor back to the top mid-scroll. Now only this block's reserved space waits.
  return show ? <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>{children}</Suspense> : <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}
