import { motion } from "framer-motion";
import { CalendarDays, Gauge, Infinity as InfinityIcon, Languages, Megaphone, Repeat, Users } from "lucide-react";
import { REAL_CAMPAIGN } from "@/data/campaignData";

const PILLAR_ICONS = [Users, Languages, Megaphone];

export default function GrowthSection() {
  const c = REAL_CAMPAIGN;
  return (
    <section className="relative px-4 py-16 sm:px-8" data-testid="portfolio-section-growth">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
          <div className="text-[10px] tracking-[0.4em] text-ember">MY PITCH FOR WISPR FLOW INDIA</div>
          <h2 className="font-display mt-3 text-2xl font-black text-white sm:text-4xl" data-testid="growth-campaign-name">
            <span className="text-ember">SPEAK INDIA.</span> <span className="text-neon text-glow-lime">PLAY DIFFERENT.</span>
          </h2>
          <p className="font-display mx-auto mt-4 max-w-2xl text-sm font-bold text-slate-200 sm:text-lg" data-testid="growth-core-message">
            "{c.message}"
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">{c.positioning}</p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-3">
          {c.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="hud-panel rounded-xl p-5"
                data-testid={`growth-pillar-${p.id}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neon/40 bg-neon/10">
                  <Icon className="h-5 w-5 text-neon" />
                </div>
                <h3 className="font-display mt-4 text-sm font-bold tracking-wide text-white">{i + 1}. {p.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.body}</p>
                <ul className="mt-3 space-y-2">
                  {p.details.map((d) => (
                    <li key={d.slice(0, 24)} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                      <span className="text-neon">▸</span> <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="hud-panel-cyan mt-8 rounded-xl p-6"
          data-testid="growth-viral-loop"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-volt">
            <Repeat className="h-4 w-4" /> {c.viralLoop.title}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">{c.viralLoop.body}</p>
          <div className="mt-4 inline-block rotate-[-1.5deg] rounded-lg border-2 border-volt/60 bg-slate-950 px-5 py-3 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <div className="font-display text-xs font-bold text-volt">I COMPLETED THE SPEAK INDIA CHALLENGE</div>
            <div className="mt-1 text-[10px] text-slate-400">7 days. More ideas spoken. Less time typing. ▸ I challenge 3 friends.</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8"
          data-testid="growth-kpis"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-ember">
            <Gauge className="h-4 w-4" /> WHAT I'D MEASURE
          </div>
          <p className="mt-1 text-[10px] italic text-slate-500">{c.kpis.note}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.kpis.items.map((kpi) => (
              <div key={kpi.k} className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
                <div className="text-[11px] font-bold tracking-wider text-ember">{kpi.k}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-slate-400">{kpi.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8" data-testid="growth-rollout">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-neon">
            <CalendarDays className="h-4 w-4" /> 30 DAYS
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {c.rollout.map((w) => (
              <div key={w.week} className="hud-panel rounded-lg p-4">
                <div className="font-display text-xs font-bold text-neon">{w.week}</div>
                <div className="mt-1 text-xs font-bold text-white">{w.title}</div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{w.body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-xl border border-aura/40 bg-aura/5 p-6"
          data-testid="growth-differentiation"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-aura">
            <InfinityIcon className="h-4 w-4" /> WHY IT STICKS
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-200 sm:text-sm">{c.differentiation}</p>
        </motion.div>
      </div>
    </section>
  );
}
