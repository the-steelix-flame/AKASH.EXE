import { memo, useEffect, useRef, useState } from "react";
import { sfx } from "@/utils/sfx";

// A strict, visible countdown. It owns its own clock, so ticking never re-renders the level.
//   running=false pauses it (used while an answer is being evaluated); it resumes from where it stopped.
//   It only starts counting when `running` first becomes true, i.e. when the round really begins.
function Countdown({ ms, running, onExpire, testId = "countdown", size = 96 }) {
  const [left, setLeft] = useState(ms);
  const leftRef = useRef(ms);
  const lastTick = useRef(null);
  const lastDigit = useRef(Math.ceil(ms / 1000));
  const expired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    leftRef.current = ms; setLeft(ms); expired.current = false; lastDigit.current = Math.ceil(ms / 1000);
  }, [ms]);

  useEffect(() => {
    if (!running) { lastTick.current = null; return undefined; }
    let raf = 0;
    const frame = (now) => {
      if (lastTick.current == null) lastTick.current = now;
      leftRef.current = Math.max(0, leftRef.current - (now - lastTick.current));
      lastTick.current = now;
      setLeft(leftRef.current);
      const digit = Math.ceil(leftRef.current / 1000);
      if (digit !== lastDigit.current && digit > 0) { lastDigit.current = digit; sfx.tick(digit); }
      if (leftRef.current <= 0) {
        if (!expired.current) { expired.current = true; cb.current && cb.current(); }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const digit = Math.max(0, Math.ceil(left / 1000));
  const frac = left / ms;
  const tone = left <= 1000 ? "#EF4444" : left <= 2000 ? "#F59E0B" : "#39FF14";
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="timer" aria-live="off" aria-label={`${digit} seconds left`} data-testid={testId} data-left={Math.round(left)} data-digit={digit}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="font-display absolute text-4xl font-black" style={{ color: tone }} data-testid={`${testId}-digit`}>{digit}</span>
    </div>
  );
}

export default memo(Countdown);
