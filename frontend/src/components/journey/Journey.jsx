import { Suspense, lazy } from "react";

// The 3D scrollytelling stage is code-split: three.js is only downloaded when a journey is about to be shown.
const Stage = lazy(() => import("@/components/journey/JourneyStage"));

export default function Journey(props) {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center text-[10px] tracking-[0.4em] text-neon" role="status">LOADING THE JOURNEY…</div>}>
      <Stage {...props} />
    </Suspense>
  );
}
