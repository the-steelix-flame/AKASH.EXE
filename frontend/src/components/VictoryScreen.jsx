import { motion } from "framer-motion";
import { BookOpen, Map, PartyPopper, Play, RotateCcw, Save, Skull } from "lucide-react";

// In-page result panel (no longer a fixed full-screen overlay, so it can never trap or hide the
// navigation). Always offers a way back to the space map; nothing auto-advances.
export default function VictoryScreen({
  type = "victory", // victory | defeat
  title,
  message,
  unlockText,
  story,            // personal story text unlocked by winning
  onPlayStory,
  character,        // optional <CharacterReaction/> node
  onContinue,       // reveal the unlocked portfolio section
  continueLabel = "CONTINUE",
  onRetry,
  retryLabel = "RETRY MISSION",
  onReturn,         // back to the space map
  returnLabel = "RETURN TO SPACE MAP",
}) {
  const isWin = type === "victory";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl"
      data-testid={isWin ? "victory-screen" : "defeat-screen"}
    >
      <div className={`hud-panel rounded-xl p-6 text-center sm:p-8 ${isWin ? "" : "border-blood/40"}`}>
        {character ? (
          <div className="mx-auto flex justify-center">{character}</div>
        ) : isWin ? (
          <PartyPopper className="mx-auto h-12 w-12 text-neon" />
        ) : (
          <Skull className="mx-auto h-12 w-12 text-blood" />
        )}
        <h2
          className={`font-display mt-3 text-3xl font-black sm:text-4xl ${isWin ? "text-neon text-glow-lime" : "text-blood"}`}
          data-testid={isWin ? "victory-title" : "defeat-title"}
        >
          {title}
        </h2>

        {unlockText && (
          <div
            className="mx-auto mt-4 inline-block rounded border border-volt/50 bg-volt/10 px-4 py-2 font-display text-xs font-bold tracking-[0.2em] text-volt sm:text-sm"
            data-testid="new-world-unlocked"
          >
            {unlockText}
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-slate-300" data-testid="victory-message">{message}</p>

        {isWin && story && (
          <div className="mt-5 rounded-lg border border-neon/30 bg-neon/5 p-4 text-left" data-testid="story-unlocked">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-neon">
                <BookOpen className="h-3.5 w-3.5" /> PERSONAL STORY UNLOCKED
              </span>
              {onPlayStory && (
                <button onClick={onPlayStory} data-testid="story-play-btn" className="flex items-center gap-1 rounded border border-neon/40 px-2 py-1 text-[10px] tracking-widest text-neon hover:bg-neon/10 focus:outline-none focus:ring-2 focus:ring-neon">
                  <Play className="h-3 w-3" /> HEAR IT
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{story}</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.2em] text-slate-500" data-testid="progress-saved-note">
          <Save className="h-3 w-3" /> PROGRESS SAVED
        </div>

        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {onContinue && (
            <button
              data-testid="victory-continue-btn"
              onClick={onContinue}
              className="rounded-md bg-neon px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(57,255,20,0.6)] focus:outline-none focus:ring-2 focus:ring-neon"
            >
              {continueLabel}
            </button>
          )}
          {onRetry && (
            <button
              data-testid="defeat-retry-btn"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-md bg-slate-100 px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-void transition-shadow hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-white"
            >
              <RotateCcw className="h-4 w-4" />
              {retryLabel}
            </button>
          )}
          {onReturn && (
            <button
              data-testid="return-to-map-btn"
              onClick={onReturn}
              className="flex items-center justify-center gap-2 rounded-md border-2 border-volt px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-volt transition-colors hover:bg-volt/10 focus:outline-none focus:ring-2 focus:ring-volt"
            >
              <Map className="h-4 w-4" />
              {returnLabel}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
