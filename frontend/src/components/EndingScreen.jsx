import { motion } from "framer-motion";
import { Code2, Github, Linkedin, RotateCcw } from "lucide-react";
import Starfield from "@/components/Starfield";
import { ENDING, PROFILE } from "@/data/personalData";
import { sfx } from "@/utils/sfx";

export default function EndingScreen({ onReplay }) {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-8" data-testid="ending-screen">
      <Starfield density={60} />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl font-black text-neon text-glow-lime sm:text-5xl"
          data-testid="ending-title"
        >
          {ENDING.title}
        </motion.h2>

        <div className="mt-8 space-y-3">
          {ENDING.lines.map((l, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-sm leading-relaxed text-slate-300 sm:text-base"
            >
              {l}
            </motion.p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-10 inline-block rounded-xl border-2 border-neon bg-neon/5 px-8 py-6 shadow-[0_0_40px_rgba(57,255,20,0.2)]"
        >
          <div className="font-display text-lg font-black tracking-wide text-white sm:text-2xl" data-testid="ending-cta">
            {ENDING.cta}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            data-testid="linkedin-link"
            href={PROFILE.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-volt/50 px-4 py-2.5 text-xs font-bold tracking-widest text-volt transition-colors hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt"
          >
            <Linkedin className="h-4 w-4" /> LINKEDIN
          </a>
          <a
            data-testid="github-link"
            href={PROFILE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-slate-500 px-4 py-2.5 text-xs font-bold tracking-widest text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-neon"
          >
            <Github className="h-4 w-4" /> GITHUB
          </a>
          <a
            data-testid="leetcode-link"
            href={PROFILE.leetcode}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-ember/50 px-4 py-2.5 text-xs font-bold tracking-widest text-ember transition-colors hover:bg-ember/10 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <Code2 className="h-4 w-4" /> LEETCODE
          </a>
          <button
            data-testid="replay-quest-btn"
            onClick={() => { sfx.transition(); onReplay(); }}
            className="flex items-center gap-2 rounded-md border border-ember/50 px-4 py-2.5 text-xs font-bold tracking-widest text-ember transition-colors hover:bg-ember/10 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <RotateCcw className="h-4 w-4" /> REPLAY QUEST
          </button>
        </motion.div>


      </div>
    </section>
  );
}
