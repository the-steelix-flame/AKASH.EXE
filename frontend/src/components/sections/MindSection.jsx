import Journey from "@/components/journey/Journey";
import { DECISIONS, HARDEST_PROBLEM as H } from "@/data/personalData";

// Illustrative only: six model inputs, four stuck at the clip limit (+10 or -10), as in the write-up.
const INPUTS = ["up", "down", null, "up", null, "down"];

function InputGauge() {
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3" data-testid="input-gauge" role="img" aria-label="Six model inputs; four are pinned at the plus or minus ten clip limit">
      <div className="mb-2 flex justify-between text-[9px] tracking-[0.2em] text-slate-500"><span>+10 CLIP</span><span>WHAT THE MODEL SAW ON A LIVE TICK</span></div>
      <div className="relative flex h-20 items-stretch justify-between gap-2">
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

const Bullets = ({ items, mark = "▸", color = "text-neon" }) => (
  <ul className="space-y-1.5">{items.map((c) => <li key={c} className="flex gap-2"><span className={color}>{mark}</span><span>{c}</span></li>)}</ul>
);

const CHAPTERS = [
  {
    id: "problem", testId: "hardest-problem", monument: "brain", accent: "aura", tag: `THE HARDEST PROBLEM // ${H.project}`, title: H.title,
    children: (<><p>{H.intro}</p><div className="mt-3"><Bullets items={H.trained} /></div><p className="mt-2 text-[11px] text-slate-500">{H.trainedNote}</p></>),
  },
  {
    id: "symptom", testId: "journey-symptom", monument: "clipbars", accent: "blood", tag: "THE SYMPTOM AND THE CHECK", title: "No errors. Just the wrong behaviour.",
    children: (<><p className="text-slate-200">{H.symptom}</p><p className="mt-2">{H.method}</p><InputGauge /></>),
  },
  {
    id: "causes", testId: "journey-causes", monument: "pillars4", accent: "ember", tag: "FOUR CAUSES", title: "Four things were broken at once",
    children: (<ol className="space-y-2">{H.causes.map((c, i) => <li key={c} className="flex gap-3"><span className="font-display text-ember">{i + 1}</span><span>{c}</span></li>)}</ol>),
  },
  {
    id: "fix", testId: "journey-fix", monument: "bridge", accent: "neon", tag: "THE FIX", title: "Making training and live see the same thing",
    children: (<><Bullets items={H.fixes} /><p className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-400">{H.next}</p></>),
  },
  ...[[DECISIONS.slice(0, 3), "lattice", "volt", "HOW I MAKE CALLS (1/2)"], [DECISIONS.slice(3), "gears", "neon", "HOW I MAKE CALLS (2/2)"]].filter(([list]) => list.length).map(([list, monument, accent, title], k) => ({
    id: `decisions-${k + 1}`, testId: `journey-decisions-${k + 1}`, monument, accent, tag: "DECISIONS I'D DEFEND", title,
    children: (<div className="space-y-3">{list.map((d) => <div key={d.title}><div className="text-[9px] font-bold tracking-[0.25em] text-volt">{d.project}</div><div className="mt-0.5 font-bold text-white">{d.title}</div><p className="mt-0.5 text-slate-400">{d.body}</p></div>)}</div>),
  })),
];

export default function MindSection() {
  return (
    <section className="relative" data-testid="portfolio-section-mind">
      <div className="px-4 pb-8 pt-16 text-center sm:px-8">
        <h2 className="font-display text-3xl font-black text-white sm:text-4xl">HOW I <span className="text-aura text-glow-purple">THINK</span></h2>
        <p className="mt-3 text-xs text-slate-400">One bug, followed all the way down.</p>
      </div>
      <Journey chapters={CHAPTERS} title="THE BUG HUNT" kicker="SIX STOPS INSIDE ONE PROBLEM" testId="journey-mind" />
    </section>
  );
}
