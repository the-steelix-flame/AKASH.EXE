import { memo, useState } from "react";
import { ExternalLink, Github, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { OTHER_PROJECTS, PROJECTS, PROJECT_GROUPS } from "@/data/projects";
import { track } from "@/utils/analytics";

const TEXT = { neon: "text-neon", volt: "text-volt", aura: "text-aura", ember: "text-ember", blood: "text-blood" };
const BORDER = { neon: "hover:border-neon/70", volt: "hover:border-volt/70", aura: "hover:border-aura/70", ember: "hover:border-ember/70", blood: "hover:border-blood/70" };

const Card = memo(function Card({ project, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      data-testid={`project-card-${project.id}`}
      className={`group overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-left transition-colors ${BORDER[project.accent]} focus:outline-none focus:ring-2 focus:ring-neon`}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        <img src={`/images/projects/${project.id}.webp`} alt="" loading="lazy" decoding="async" width="640" height="360" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-void/90 px-2 py-1 text-[9px] font-bold tracking-widest text-white">
          <Play className="h-3 w-3" /> DEMO
        </span>
      </div>
      <div className="p-4">
        <div className={`font-display text-base font-black ${TEXT[project.accent]}`}>{project.name}</div>
        <div className="mt-0.5 text-xs text-slate-300">{project.tagline}</div>
        {project.recognition && <div className="mt-2 text-[10px] leading-snug text-slate-500">{project.recognition}</div>}
      </div>
    </button>
  );
});

function ProjectDialog({ project, onClose }) {
  if (!project) return null;
  const { links } = project;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-slate-700 bg-slate-950 p-0 sm:rounded-xl" data-testid="project-dialog">
        <video
          key={project.id}
          className="aspect-video w-full bg-black"
          controls
          muted
          playsInline
          preload="none"
          poster={`/images/projects/${project.id}.webp`}
          onPlay={() => track("video_play", { project: project.id })}
          data-testid="project-video"
        >
          <source src={`/videos/${project.id}.mp4`} type="video/mp4" />
        </video>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <DialogTitle className={`font-display text-2xl font-black ${TEXT[project.accent]}`}>{project.name}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-300">{project.tagline}</DialogDescription>
            <div className="mt-2 text-[11px] text-slate-500">{project.when}{project.role ? ` · ${project.role}` : ""}</div>
            {project.recognition && <div className="mt-2 inline-block rounded border border-neon/40 bg-neon/10 px-2 py-1 text-[10px] text-neon">{project.recognition}</div>}
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{project.summary}</p>
          {project.bullets.length > 0 && (
            <ul className="space-y-2">
              {project.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-xs leading-relaxed text-slate-300"><span className={TEXT[project.accent]}>▸</span><span>{b}</span></li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((t) => <span key={t} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">{t}</span>)}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer" data-testid="project-github" className="flex items-center gap-1.5 rounded border border-volt/50 px-3 py-2 text-[11px] tracking-wider text-volt hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt">
                <Github className="h-3.5 w-3.5" /> CODE
              </a>
            )}
            {links.live && (
              <a href={links.live} target="_blank" rel="noopener noreferrer" data-testid="project-live" className="flex items-center gap-1.5 rounded border border-neon/50 px-3 py-2 text-[11px] tracking-wider text-neon hover:bg-neon/10 focus:outline-none focus:ring-2 focus:ring-neon">
                <ExternalLink className="h-3.5 w-3.5" /> LIVE
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BuildsSection() {
  const [open, setOpen] = useState(null);
  const openProject = (p) => { setOpen(p); track("project_open", { project: p.id }); };

  return (
    <section className="relative px-4 py-16 sm:px-8" data-testid="portfolio-section-builds">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display mb-2 text-center text-3xl font-black text-white sm:text-4xl">
          MY <span className="text-volt text-glow-cyan">BUILDS</span>
        </h2>
        <p className="mb-10 text-center text-xs text-slate-400">{PROJECTS.length} projects. Tap one to watch the demo.</p>

        {PROJECT_GROUPS.map((g) => (
          <div key={g.id} className="mb-10" data-testid={`group-${g.id}`}>
            <div className="mb-3 flex items-baseline gap-3">
              <h3 className="font-display text-xs font-bold tracking-[0.3em] text-slate-200">{g.label}</h3>
              <span className="text-[10px] text-slate-500">{g.note}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PROJECTS.filter((p) => p.group === g.id).map((p) => <Card key={p.id} project={p} onOpen={openProject} />)}
            </div>
          </div>
        ))}

        <div data-testid="group-other">
          <h3 className="font-display mb-3 text-xs font-bold tracking-[0.3em] text-slate-200">ALSO BUILT</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {OTHER_PROJECTS.map((o) => (
              <li key={o.name} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-400">
                <span className="font-bold text-slate-200">{o.name}.</span> {o.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ProjectDialog project={open} onClose={() => setOpen(null)} />
    </section>
  );
}
