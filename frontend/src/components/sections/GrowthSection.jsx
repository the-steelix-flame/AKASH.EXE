import { Repeat } from "lucide-react";
import Journey from "@/components/journey/Journey";
import { REAL_CAMPAIGN as c } from "@/data/campaignData";

const PILLAR_MONUMENTS = ["crowd", "wave", "megaphone"];

const CHAPTERS = [
  {
    id: "pitch", testId: "growth-campaign-name", monument: "mic", accent: "ember", tag: "MY PITCH FOR WISPR FLOW INDIA", title: "SPEAK INDIA. PLAY DIFFERENT.",
    children: (<><p className="text-sm font-bold text-slate-100" data-testid="growth-core-message">"{c.message}"</p><p className="mt-2 text-slate-400">{c.positioning}</p></>),
  },
  ...c.pillars.map((p, i) => ({
    id: `pillar-${p.id}`, testId: `growth-pillar-${p.id}`, monument: PILLAR_MONUMENTS[i % 3], accent: ["neon", "volt", "ember"][i % 3], tag: `PILLAR ${i + 1}`, title: p.name,
    children: (<><p className="text-slate-400">{p.body}</p><ul className="mt-3 space-y-2">{p.details.map((d) => <li key={d.slice(0, 24)} className="flex gap-2 text-[11px]"><span className="text-neon">▸</span><span>{d}</span></li>)}</ul></>),
  })),
  {
    id: "loop", testId: "growth-viral-loop", monument: "knot", accent: "volt", tag: "THE VIRAL LOOP", title: c.viralLoop.title,
    children: (<><p>{c.viralLoop.body}</p><div className="mt-3 inline-block rotate-[-1.5deg] rounded-lg border-2 border-volt/60 bg-slate-950 px-4 py-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]"><div className="font-display text-[11px] font-bold text-volt"><Repeat className="mr-1 inline h-3 w-3" />I COMPLETED THE SPEAK INDIA CHALLENGE</div><div className="mt-1 text-[10px] text-slate-400">7 days. More ideas spoken. Less time typing. ▸ I challenge 3 friends.</div></div></>),
  },
  {
    id: "kpis", testId: "growth-kpis", monument: "kpibars", accent: "ember", tag: "WHAT I'D MEASURE", title: "Numbers that tell me it's working",
    children: (<><p className="text-[11px] italic text-slate-500">{c.kpis.note}</p><div className="mt-3 grid grid-cols-2 gap-2">{c.kpis.items.map((k) => <div key={k.k} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5"><div className="text-[10px] font-bold tracking-wider text-ember">{k.k}</div><div className="mt-1 text-[10px] leading-snug text-slate-400">{k.v}</div></div>)}</div></>),
  },
  {
    id: "rollout", testId: "growth-rollout", monument: "calendar", accent: "neon", tag: "30 DAYS", title: "The rollout, week by week",
    children: (<div className="space-y-2.5">{c.rollout.map((wk) => <div key={wk.week}><div className="font-display text-[11px] font-bold text-neon">{wk.week} <span className="text-white">{wk.title}</span></div><p className="text-[11px] text-slate-400">{wk.body}</p></div>)}</div>),
  },
  {
    id: "sticks", testId: "growth-differentiation", monument: "infinity", accent: "aura", tag: "WHY IT STICKS", title: "A loop, not a campaign",
    children: <p className="text-slate-200">{c.differentiation}</p>,
  },
];

export default function GrowthSection() {
  return (
    <section className="relative" data-testid="portfolio-section-growth">
      <div className="px-4 pb-8 pt-16 text-center sm:px-8">
        <div className="text-[10px] tracking-[0.4em] text-ember">MY PITCH FOR WISPR FLOW INDIA</div>
        <h2 className="font-display mt-3 text-2xl font-black text-white sm:text-4xl"><span className="text-ember">SPEAK INDIA.</span> <span className="text-neon text-glow-lime">PLAY DIFFERENT.</span></h2>
      </div>
      <Journey chapters={CHAPTERS} title="THE PITCH" kicker="A CAMPAIGN IN EIGHT STOPS" testId="journey-growth" />
    </section>
  );
}
