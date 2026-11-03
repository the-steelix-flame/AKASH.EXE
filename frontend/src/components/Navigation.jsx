import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Map, Menu, Music, ShieldCheck, Volume2, VolumeX, X } from "lucide-react";
import ResetQuest from "@/components/ResetQuest";
import { useAudioActions, useAudioState } from "@/hooks/useAudio";
import { useMusic } from "@/hooks/useMusic";

// Sections appear in the nav the moment their level is cleared, so a finished level's
// portfolio content can always be revisited without replaying the game.
const SECTION_ITEMS = [
  { key: "knowme", label: "KNOW ME", level: 1 },
  { key: "builds", label: "MY BUILDS", level: 2 },
  { key: "mind", label: "HOW I THINK", level: 3 },
  { key: "growth", label: "WISPR PITCH", level: 4 },
];

function MuteButton() {
  const { muted } = useAudioState();
  const { toggleMute } = useAudioActions();
  return (
    <button data-testid="nav-mute-btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute narration" : "Mute narration"} className="rounded border border-slate-700 p-1.5 text-slate-300 hover:border-neon hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon sm:p-2">
      {muted ? <VolumeX className="h-4 w-4 text-blood" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

function MusicButton() {
  const { on, running, toggle } = useMusic();
  return (
    <button data-testid="nav-music-btn" data-playing={running ? "true" : "false"} onClick={toggle} aria-pressed={on} aria-label={on ? "Turn background music off" : "Turn background music on"} title={on ? "Music on" : "Music off"} className={`relative rounded border border-slate-700 p-1.5 sm:p-2 hover:border-neon hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon ${on ? "text-neon" : "text-slate-500"}`}>
      <Music className="h-4 w-4" />
      {!on && <span aria-hidden="true" className="absolute left-1.5 right-1.5 top-1/2 h-0.5 -rotate-45 rounded bg-blood" />}
    </button>
  );
}

export default function Navigation({ allCompleted, completedCount, isCompleted, activeSection, onNavigate, onPrivacy, onReset }) {
  const [open, setOpen] = useState(false);
  const go = (key) => { onNavigate(key); setOpen(false); };

  const items = [
    { key: "home", label: "HOME", icon: Home },
    { key: "worldmap", label: "SPACE MAP", icon: Map },
    ...SECTION_ITEMS.filter((s) => isCompleted(s.level)),
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-800 bg-void" data-testid="main-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <button
          data-testid="nav-home-btn"
          onClick={() => go("home")}
          className="flex items-center gap-2 font-display text-sm font-black tracking-wider text-neon focus:outline-none focus:ring-2 focus:ring-neon"
        >
          <Home className="hidden h-4 w-4 min-[400px]:block" />
          AKASH.EXE
        </button>

        <nav className="hidden items-center gap-1 md:flex" data-testid="nav-links">
          {items.map((item) => (
            <button
              key={item.key}
              data-testid={`nav-${item.key}-btn`}
              onClick={() => go(item.key)}
              className={`rounded px-3 py-1.5 text-[11px] tracking-[0.18em] transition-colors focus:outline-none focus:ring-2 focus:ring-neon ${
                activeSection === item.key ? "bg-neon/15 text-neon" : "text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <span
            className={`hidden border px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] sm:inline-block ${
              allCompleted ? "border-neon/50 bg-neon/10 text-neon" : "border-slate-700 text-slate-400"
            }`}
            data-testid="nav-progress-indicator"
          >
            {completedCount}/4 CLEARED
          </span>
          <MuteButton />
          <MusicButton />
          <button data-testid="nav-privacy-btn" onClick={onPrivacy} aria-label="Privacy and analytics" className="rounded border border-slate-700 p-1.5 text-slate-300 sm:p-2 hover:border-volt hover:text-volt focus:outline-none focus:ring-2 focus:ring-volt"><ShieldCheck className="h-4 w-4" /></button>
          <ResetQuest onReset={onReset} />
          <button
            data-testid="nav-menu-btn"
            onClick={() => setOpen((o) => !o)}
            className="rounded border border-slate-700 p-1.5 text-slate-300 sm:p-2 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800 md:hidden"
            data-testid="nav-mobile-menu"
          >
            {items.map((item) => (
              <button
                key={item.key}
                data-testid={`nav-mobile-${item.key}-btn`}
                onClick={() => go(item.key)}
                className={`block w-full px-6 py-3 text-left text-xs tracking-[0.2em] ${
                  activeSection === item.key ? "bg-neon/10 text-neon" : "text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
