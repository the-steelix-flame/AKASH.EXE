import Journey from "@/components/journey/Journey";
import { KNOW_ME_FACTS, TIMELINE } from "@/data/personalData";

// Each waypoint of the journey is one part of the story, with its own 3D neon monument.
const STYLE = {
  school: { monument: "campus", accent: "ember" },
  jee: { monument: "gate", accent: "aura" },
  education: { monument: "campus", accent: "volt" },
  experience: { monument: "tower", accent: "neon" },
  hackathons: { monument: "podium", accent: "ember" },
  stack: { monument: "gears", accent: "volt" },
  next: { monument: "compass", accent: "neon" },
};

const CHAPTERS = TIMELINE.map((item) => ({
  id: item.id,
  testId: `timeline-${item.id}`,
  tag: item.tag,
  title: item.title,
  sub: item.sub,
  ...(STYLE[item.id.startsWith("school") ? "school" : item.id] || STYLE.next),
  children: (
    <>
      {item.body && <p>{item.body}</p>}
      {item.items && (
        <ul className="space-y-1.5">
          {item.items.map((t) => (
            <li key={t} className="flex gap-2"><span className="text-neon">▸</span><span>{t}</span></li>
          ))}
        </ul>
      )}
    </>
  ),
}));

export default function KnowMeSection() {
  return (
    <section className="relative" data-testid="portfolio-section-know-me">
      <div className="px-4 pb-8 pt-16 text-center sm:px-8">
        <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
          KNOW <span className="text-neon text-glow-lime">ME</span>
        </h2>
        <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {KNOW_ME_FACTS.map((f) => (
            <li key={f} className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-300">{f}</li>
          ))}
        </ul>
      </div>
      <Journey chapters={CHAPTERS} title="MY STORY" kicker="A JOURNEY IN SIX STOPS" testId="journey-knowme" />
    </section>
  );
}
