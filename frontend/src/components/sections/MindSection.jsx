import { motion } from "framer-motion";
import { DECISIONS, HARDEST_PROBLEM as H } from "@/data/personalData";

// Illustrative only: six model inputs, four stuck at the clip limit (+10 or -10), as in the write-up.
const INPUTS = ["up", "down", null, "up", null, "down"];

function InputGauge() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4" data-testid="input-gauge" role="img" aria-label="Six model inputs; four are pinned at the plus or minus ten clip limit">
      <div className="mb-3 flex justify-between text-[9px] tracking-[0.2em] text-slate-500"><span>+10 CLIP</span><span>WHAT THE MODEL SAW ON A LIVE TICK</span></div>
      <div className="relative flex h-28 items-stretch justify-between gap-2">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-700" />
        {INPUTS.map((pin, i) => (
          <div key={i} className="relative flex-1">
            {pin === "up" && <div className="absolute inset-x-[20%] bottom-1/2 top-0 rounded-t-sm bg-blood" />}
            {pin === "down" && <div className="absolute inset-x-[20%] bottom-0 top-1/2 rounded-b-sm bg-blood" />}
            {pin === null && <div className="absolute inset-x-[20%] top-[44%] h-[12%] rounded-sm bg-neon/70" />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] tracking-[0.2em] text-slate-500"><span>-10 CLIP</span><span className="text-blood">4 OF 6 PINNED</span></div>
    </div>
  );
}

export default function MindSection() {
  return (
    <section className="relative px-4 py-16 sm:px-8" data-testid="portfolio-section-mind">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display mb-10 text-center text-3xl font-black text-white sm:text-4xl">
          HOW I <span className="text-aura text-glow-purple">THINK</span>
        </h2>

        <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="hud-panel-purple rounded-xl p-5 sm:p-8" data-testid="hardest-problem">
          <div className="text-[10px] font-bold tracking-[0.3em] text-aura">THE HARDEST THING I'VE SOLVED // {H.project}</div>
          <h3 className="font-display mt-2 text-xl font-black text-white sm:text-2xl">{H.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{H.intro}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {H.trained.map((t) => <div key={t} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">{t}</div>)}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{H.trainedNote}</p>

          <h4 className="mt-6 text-[10px] font-bold tracking-[0.3em] text-blood">THE SYMPTOM</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{H.symptom}</p>

          <h4 className="mt-6 text-[10px] font-bold tracking-[0.3em] text-volt">THE CHECK</h4>
          <p className="mt-1 mb-3 text-sm leading-relaxed text-slate-200">{H.method}</p>
          <InputGauge />

          <h4 className="mt-6 text-[10px] font-bold tracking-[0.3em] text-ember">FOUR CAUSES</h4>
          <ol className="mt-2 space-y-2">
            {H.causes.map((c, i) => (
              <li key={c} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                <span className="font-display text-ember">{i + 1}</span><span>{c}</span>
              </li>
            ))}
          </ol>

          <h4 className="mt-6 text-[10px] font-bold tracking-[0.3em] text-neon">THE FIX</h4>
          <ul className="mt-2 space-y-2">
            {H.fixes.map((c) => <li key={c} className="flex gap-2 text-sm leading-relaxed text-slate-300"><span className="text-neon">▸</span><span>{c}</span></li>)}
          </ul>
          <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-400">{H.next}</p>
        </motion.article>

        <h3 className="font-display mb-4 mt-12 text-xs font-bold tracking-[0.3em] text-slate-200">DECISIONS I'D DEFEND</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {DECISIONS.map((d, i) => (
            <motion.div key={d.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 2) * 0.08 }} className="hud-panel rounded-lg p-5" data-testid={`decision-${i}`}>
              <div className="text-[10px] font-bold tracking-[0.3em] text-volt">{d.project}</div>
              <h4 className="font-display mt-1 text-sm font-bold text-white">{d.title}</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{d.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
