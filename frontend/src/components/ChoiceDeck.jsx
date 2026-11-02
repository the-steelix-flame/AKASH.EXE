import { forwardRef, memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

// Swipeable answer cards.
//   swipe RIGHT (or press → / Enter / "Choose") = pick this card
//   swipe LEFT  (or press ← / "Next")           = show the next card
// The card itself is not a button: dragging is the interaction. Visible buttons and arrow keys
// are the accessible alternative, so nobody has to guess how it works.
const TONE = {
  neon: { ring: "border-neon", text: "text-neon", bg: "bg-neon", glow: "rgba(57,255,20,0.35)" },
  volt: { ring: "border-volt", text: "text-volt", bg: "bg-volt", glow: "rgba(0,240,255,0.35)" },
  aura: { ring: "border-aura", text: "text-aura", bg: "bg-aura", glow: "rgba(168,85,247,0.4)" },
  ember: { ring: "border-ember", text: "text-ember", bg: "bg-ember", glow: "rgba(245,158,11,0.4)" },
};

// The draggable top card. It owns its own x, so a card leaving and the next one arriving never fight.
const DeckCard = forwardRef(function DeckCard({ cur, idx, total, dir, t, reduce, touched, testId, onChoose, onNext, onTouch }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-9, 0, 9]);
  const chooseOpacity = useTransform(x, [25, 130], [0, 1]);
  const nextOpacity = useTransform(x, [-130, -25], [1, 0]);
  const onDragEnd = (_, info) => {
    if (info.offset.x > 100 || info.velocity.x > 650) onChoose();
    else if (info.offset.x < -100 || info.velocity.x < -650) onNext();
  };
  return (
    <motion.div
      ref={ref}
      custom={dir}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      onDragEnd={onDragEnd}
      onDragStart={onTouch}
      initial={{ opacity: 0, scale: 0.96, x: dir * 70 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{ x, rotate: reduce ? 0 : rotate, touchAction: "pan-y" }}
      className="relative min-h-[150px] cursor-grab select-none rounded-xl border border-slate-600 bg-slate-950 p-5 active:cursor-grabbing"
      data-testid={`${testId}-card`}
      data-option={cur.id}
    >
      <motion.div style={{ opacity: chooseOpacity }} className={`pointer-events-none absolute right-3 top-3 -rotate-6 rounded border-2 ${t.ring} px-2 py-0.5 text-xs font-black tracking-widest ${t.text}`}>
        CHOOSE
      </motion.div>
      <motion.div style={{ opacity: nextOpacity }} className="pointer-events-none absolute left-3 top-3 rotate-6 rounded border-2 border-slate-400 px-2 py-0.5 text-xs font-black tracking-widest text-slate-300">
        NEXT
      </motion.div>
      <div className="text-[9px] tracking-[0.3em] text-slate-500">OPTION {idx + 1} OF {total}</div>
      <div className="font-display mt-2 text-base font-black text-white sm:text-lg">{cur.title}</div>
      {cur.body && <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{cur.body}</p>}
      {!touched && (
        <motion.div className={`pointer-events-none absolute bottom-3 right-4 flex items-center gap-1 text-[10px] font-bold tracking-widest ${t.text}`} animate={reduce ? {} : { x: [0, 14, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          DRAG <ArrowRight className="h-3.5 w-3.5" />
        </motion.div>
      )}
    </motion.div>
  );
});

function ChoiceDeck({ options, value, onChange, accent = "neon", testId = "deck", label = "Answer options" }) {
  const t = TONE[accent] || TONE.neon;
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [touched, setTouched] = useState(false);
  const live = useRef(null);

  const chosen = value ? options.find((o) => o.id === value) : null;
  const cur = options[idx];

  useEffect(() => { if (live.current) live.current.textContent = chosen ? `Chosen: ${chosen.title}` : `Option ${idx + 1} of ${options.length}: ${cur.title}`; }, [idx, chosen, cur, options.length]);

  const go = (d) => { setTouched(true); setDir(d); setIdx((i) => (i + d + options.length) % options.length); };
  const choose = () => { setTouched(true); setDir(1); onChange(cur); };
  const change = () => { setIdx(Math.max(0, options.findIndex((o) => o.id === value))); onChange(null); };

  const onKeyDown = (e) => {
    if (chosen) { if (e.key === "Backspace" || e.key === "Escape") { e.preventDefault(); change(); } return; }
    if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); choose(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); go(-1); }
  };

  return (
    <div className="w-full" data-testid={testId} data-chosen={chosen ? chosen.id : ""}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] ${t.text}`} data-testid={`${testId}-instruction`}>
          {chosen ? <><Check className="h-3.5 w-3.5" /> LOCKED IN</> : <>SWIPE TO CHOOSE <span className="font-normal normal-case tracking-normal text-slate-500">← next card · pick →</span></>}
        </div>
        {!chosen && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {options.map((o, i) => <span key={o.id} className={`h-1.5 rounded-full transition-all ${i === idx ? `w-5 ${t.bg}` : "w-1.5 bg-slate-700"}`} />)}
          </div>
        )}
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-roledescription="swipeable answer cards"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        data-testid={`${testId}-stage`}
      >
        {/* cards waiting behind the top one */}
        {!chosen && options.length > 1 && (
          <>
            <div className="absolute inset-x-3 top-3 h-full rounded-xl border border-slate-800 bg-slate-900" aria-hidden="true" />
            <div className="absolute inset-x-6 top-6 h-full rounded-xl border border-slate-800/70 bg-slate-900/70" aria-hidden="true" />
          </>
        )}

        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          {chosen ? (
            <motion.div
              key={`chosen-${chosen.id}`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`relative min-h-[150px] rounded-xl border-2 ${t.ring} bg-slate-950 p-5`}
              style={{ boxShadow: `0 0 26px ${t.glow}` }}
              data-testid={`${testId}-chosen`}
            >
              <div className={`absolute right-3 top-3 flex items-center gap-1 rounded border-2 ${t.ring} px-2 py-0.5 text-[10px] font-black tracking-widest ${t.text} rotate-6`}>
                <Check className="h-3 w-3" strokeWidth={4} /> YOUR PICK
              </div>
              <div className="font-display pr-24 text-base font-black text-white sm:text-lg">{chosen.title}</div>
              {chosen.body && <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{chosen.body}</p>}
            </motion.div>
          ) : (
            <DeckCard key={cur.id} cur={cur} idx={idx} total={options.length} dir={dir} t={t} reduce={reduce} touched={touched} testId={testId} onChoose={choose} onNext={() => go(1)} onTouch={() => setTouched(true)} />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {chosen ? (
          <button type="button" onClick={change} data-testid={`${testId}-change`} className="flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-2 text-[11px] font-bold tracking-widest text-slate-300 hover:border-white hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60">
            <RotateCcw className="h-3.5 w-3.5" /> CHANGE ANSWER
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => go(-1)} aria-label="Previous option" data-testid={`${testId}-prev`} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:border-white focus:outline-none focus:ring-2 focus:ring-white/60"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => go(1)} data-testid={`${testId}-next`} className="flex items-center gap-1 rounded-md border border-slate-700 px-3 py-2 text-[11px] font-bold tracking-widest text-slate-300 hover:border-white focus:outline-none focus:ring-2 focus:ring-white/60">
                NEXT CARD <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={choose} data-testid={`${testId}-choose`} className={`flex items-center gap-1.5 rounded-md ${t.bg} px-4 py-2 text-[11px] font-black tracking-widest text-void focus:outline-none focus:ring-2 focus:ring-white/70`}>
              CHOOSE THIS <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">{chosen ? "Backspace changes your answer." : "Keyboard: → choose, ← next card."}</p>
      <div ref={live} className="sr-only" aria-live="polite" />
    </div>
  );
}

export default memo(ChoiceDeck);
