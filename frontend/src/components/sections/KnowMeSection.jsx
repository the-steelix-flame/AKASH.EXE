import { motion } from "framer-motion";
import { KNOW_ME_FACTS, TIMELINE } from "@/data/personalData";

const TAG_COLORS = {
  EDUCATION: "text-volt border-volt/40 bg-volt/10",
  EXPERIENCE: "text-neon border-neon/40 bg-neon/10",
  HACKATHONS: "text-aura border-aura/40 bg-aura/10",
  TOOLS: "text-ember border-ember/40 bg-ember/10",
  FIT: "text-neon border-neon/40 bg-neon/10",
};

export default function KnowMeSection() {
  return (
    <section className="relative px-4 py-16 sm:px-8" data-testid="portfolio-section-know-me">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
            KNOW <span className="text-neon text-glow-lime">ME</span>
          </h2>
          <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
            {KNOW_ME_FACTS.map((f) => (
              <li key={f} className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-300">{f}</li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-neon via-volt to-aura sm:left-1/2" aria-hidden="true" />
          {TIMELINE.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35 }}
              className={`relative mb-8 pl-12 sm:w-1/2 sm:pl-0 ${i % 2 === 0 ? "sm:pr-12" : "sm:ml-auto sm:pl-12"}`}
              data-testid={`timeline-${item.id}`}
            >
              <div
                className={`absolute top-1 h-3 w-3 rounded-full border-2 border-neon bg-void ${i % 2 === 0 ? "left-[9px] sm:left-auto sm:-right-[7px]" : "left-[9px] sm:-left-[7px]"}`}
              />
              <div className="hud-panel rounded-lg p-5">
                <span className={`inline-block border px-2 py-0.5 text-[9px] font-bold tracking-[0.25em] ${TAG_COLORS[item.tag]}`}>{item.tag}</span>
                <h3 className="font-display mt-2 text-base font-bold text-white sm:text-lg">{item.title}</h3>
                {item.sub && <div className="mt-1 text-[11px] text-slate-500">{item.sub}</div>}
                {item.body && <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.body}</p>}
                {item.items && (
                  <ul className="mt-2 space-y-1.5">
                    {item.items.map((t) => (
                      <li key={t} className="flex gap-2 text-xs leading-relaxed text-slate-300"><span className="text-neon">▸</span><span>{t}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
