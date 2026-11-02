import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Home, Map } from "lucide-react";
import { AgentProvider, useAgentActions } from "@/hooks/useAgent";
import { AudioProvider, useAudioActions } from "@/hooks/useAudio";
import { useProgress } from "@/hooks/useProgress";
import { onConsentChange, setPage, track } from "@/utils/analytics";
import { sfx } from "@/utils/sfx";

import AkashAgent from "@/components/AkashAgent";
import Defer from "@/components/Defer";
import HomeView from "@/components/HomeView";
import LandingPage from "@/components/LandingPage";
import Navigation from "@/components/Navigation";
import { ConsentBanner, PrivacyDialog } from "@/components/Privacy";
import WorldMap from "@/components/WorldMap";

// Everything heavy is code-split: a level's code (and its animations) only loads when entered.
const Level1Swiper = lazy(() => import("@/levels/Level1Swiper"));
const Level2Pokemon = lazy(() => import("@/levels/Level2Pokemon"));
const Level3Shinobi = lazy(() => import("@/levels/Level3Shinobi"));
const Level4Growth = lazy(() => import("@/levels/Level4Growth"));
const KnowMeSection = lazy(() => import("@/components/sections/KnowMeSection"));
const BuildsSection = lazy(() => import("@/components/sections/BuildsSection"));
const MindSection = lazy(() => import("@/components/sections/MindSection"));
const GrowthSection = lazy(() => import("@/components/sections/GrowthSection"));
const EndingScreen = lazy(() => import("@/components/EndingScreen"));
const QuestComplete = lazy(() => import("@/components/QuestComplete"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

const LEVEL_COMPONENTS = { 1: Level1Swiper, 2: Level2Pokemon, 3: Level3Shinobi, 4: Level4Growth };
const SECTIONS = { knowme: [KnowMeSection, 1], builds: [BuildsSection, 2], mind: [MindSection, 3], growth: [GrowthSection, 4] };

const NAV_H = 56;
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Loading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-[10px] tracking-[0.4em] text-neon" role="status">LOADING…</div>;
}

// Frame for pages that are not a game: a way back at the bottom.
function PageFrame({ children, onMap, onHome }) {
  return (
    <div className="pt-16">
      {children}
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 px-4 py-10">
        <button onClick={onMap} data-testid="page-return-map-btn" className="flex items-center gap-2 rounded-md border-2 border-volt px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-volt transition-colors hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt">
          <Map className="h-4 w-4" /> RETURN TO WORLD MAP
        </button>
        <button onClick={onHome} data-testid="page-home-btn" className="flex items-center gap-2 rounded-md border border-slate-600 px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-slate-300 transition-colors hover:border-neon hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon">
          <Home className="h-4 w-4" /> HOME
        </button>
      </div>
    </div>
  );
}

const pageName = (view, level) => (view === "level" ? `level:${level}` : view === "world" ? "home" : view);

function Game() {
  const { progress, completeLevel, resetProgress, isUnlocked, isCompleted, completedCount } = useProgress();
  const { play, stop } = useAudioActions();
  const { say } = useAgentActions();
  const [view, setView] = useState("world");
  const [activeLevel, setActiveLevel] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const scrollTarget = useRef("top"); // where the world page should land when it opens
  const levelVisit = useRef(null);
  const doneRef = useRef(isCompleted);
  doneRef.current = isCompleted;

  // Hero and world map are ONE page. Landing on it from elsewhere scrolls to the right spot;
  // every other view starts at the top.
  useLayoutEffect(() => {
    if (view === "world" && scrollTarget.current === "map") {
      const el = document.getElementById("world-map");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_H, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    scrollTarget.current = "top";
  }, [view, activeLevel]);

  // analytics: which page is on screen (and for how long), and a level's start / abandon
  const current = useRef("home");
  useEffect(() => { current.current = pageName(view, activeLevel); setPage(current.current); }, [view, activeLevel]);
  useEffect(() => onConsentChange((c) => { if (c !== "none") track("page_view", { page: current.current }); }), []);
  useEffect(() => {
    if (!activeLevel) return undefined;
    const visit = { n: activeLevel, start: Date.now(), done: false };
    levelVisit.current = visit;
    track("level_start", { level: activeLevel, revisit: !!doneRef.current(activeLevel) });
    return () => { if (!visit.done) track("level_abandon", { level: visit.n, ms: Date.now() - visit.start }); levelVisit.current = null; };
  }, [activeLevel]);

  const onLevelComplete = useCallback((n) => {
    const v = levelVisit.current;
    if (v && !v.done) { v.done = true; track("level_complete", { level: n, ms: Date.now() - v.start }); say(`Level ${n} cleared!`, { ms: 3000, mood: "celebrating" }); }
    completeLevel(n);
  }, [completeLevel, say]);

  const scrollToMap = useCallback(() => {
    document.getElementById("world-map")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, []);

  const goWorld = useCallback((target = "top") => {
    if (view === "world" && !activeLevel) {
      if (target === "map") scrollToMap();
      else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      return;
    }
    stop(); // clear narration in the same render as the page switch so the layout (and scroll target) stays put
    scrollTarget.current = target;
    setActiveLevel(null);
    setView("world");
  }, [view, activeLevel, scrollToMap, stop]);

  const enterLevel = (n) => {
    if (!isUnlocked(n)) { sfx.wrong(); say(`Clear level ${n - 1} first.`, { ms: 2600 }); return; }
    sfx.transition();
    setActiveLevel(n);
    setView("level");
  };

  const openSection = useCallback((key) => {
    const entry = SECTIONS[key];
    if (!entry || !isCompleted(entry[1])) { goWorld("map"); return; }
    sfx.click();
    setActiveLevel(null);
    setView("section:" + key);
  }, [isCompleted, goWorld]);

  // A game finished: undefined -> back to the map; "knowme"... -> that level's unlocked section; "finale".
  const leaveLevel = (reward) => {
    sfx.transition();
    if (reward === "finale") { setActiveLevel(null); setView("finale"); return; }
    if (reward && SECTIONS[reward] && isCompleted(SECTIONS[reward][1])) { setActiveLevel(null); setView("section:" + reward); return; }
    stop();
    scrollTarget.current = "map";
    setActiveLevel(null);
    setView("world");
  };

  const navigate = (key) => {
    sfx.click();
    if (key === "home") goWorld("top");
    else if (key === "worldmap") goWorld("map");
    else if (key === "ending") { setActiveLevel(null); setView("ending"); }
    else openSection(key);
  };

  const activeSection = view.startsWith("section:") ? view.split(":")[1] : view === "world" ? "home" : view;
  const ActiveLevelComp = activeLevel ? LEVEL_COMPONENTS[activeLevel] : null;
  const toMap = () => goWorld("map");
  const toHome = () => goWorld("top");

  return (
    <div className="scanlines min-h-screen bg-void text-foreground" data-testid="akash-exe-app">
      <Navigation
        allCompleted={progress.allLevelsCompleted}
        completedCount={completedCount}
        isCompleted={isCompleted}
        activeSection={activeSection}
        onNavigate={navigate}
        onPrivacy={() => setPrivacyOpen(true)}
        onReset={() => { resetProgress(); scrollTarget.current = "top"; setActiveLevel(null); setView("world"); }}
      />

      <motion.main key={view + String(activeLevel)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <Suspense fallback={<Loading />}>
          {view === "world" && (
            <>
              <LandingPage onEnter={scrollToMap} playIntro={() => play("intro")} returning={completedCount > 0} />
              {progress.allLevelsCompleted && <HomeView completedCount={completedCount} onNavigate={navigate} />}
              <WorldMap
                isUnlocked={isUnlocked}
                isCompleted={isCompleted}
                completedCount={completedCount}
                onEnterLevel={enterLevel}
                onOpenSection={openSection}
              />
              {progress.allLevelsCompleted && (
                <div className="border-t border-slate-800">
                  <Defer minHeight={600}><KnowMeSection /></Defer>
                  <Defer minHeight={600}><BuildsSection /></Defer>
                  <Defer minHeight={600}><MindSection /></Defer>
                  <Defer minHeight={600}><GrowthSection /></Defer>
                  <Defer minHeight={600}><EndingScreen onReplay={toMap} /></Defer>
                </div>
              )}
            </>
          )}

          {view === "level" && ActiveLevelComp && (
            <ActiveLevelComp onComplete={onLevelComplete} onBack={leaveLevel} onHome={toHome} />
          )}

          {view === "finale" && <QuestComplete onEnter={openSection} onReturn={toMap} />}

          {view.startsWith("section:") && (() => {
            const entry = SECTIONS[view.split(":")[1]];
            if (!entry) return null;
            const Section = entry[0];
            return <PageFrame onMap={toMap} onHome={toHome}><Section /></PageFrame>;
          })()}

          {view === "ending" && <PageFrame onMap={toMap} onHome={toHome}><EndingScreen onReplay={toMap} /></PageFrame>}
        </Suspense>
      </motion.main>

      <AkashAgent />
      <ConsentBanner onDetails={() => setPrivacyOpen(true)} />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}

// The private dashboard lives at /admin. It is not linked from anywhere and is gated by the server.
const isAdminPath = () => window.location.pathname.replace(/\/+$/, "") === "/admin";

export default function App() {
  if (isAdminPath()) {
    return <Suspense fallback={<Loading />}><AdminDashboard /></Suspense>;
  }
  return (
    <AudioProvider>
      <AgentProvider>
        <Game />
      </AgentProvider>
    </AudioProvider>
  );
}
