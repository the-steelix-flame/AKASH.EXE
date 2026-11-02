import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Gem, ScrollText, ShieldAlert } from "lucide-react";
import ChoiceDeck from "@/components/ChoiceDeck";
import CharacterReaction from "@/components/CharacterReaction";
import Countdown from "@/components/Countdown";
import LevelShell from "@/components/LevelShell";
import VictoryScreen from "@/components/VictoryScreen";
import VoiceInput from "@/components/VoiceInput";
import { L1_RIDDLE } from "@/data/choices";
import { NARRATION } from "@/data/audioData";
import { LEVELS } from "@/data/levelsData";
import { useAgentActions } from "@/hooks/useAgent";
import { useAudioActions } from "@/hooks/useAudio";
import { useLevelAudio } from "@/hooks/useLevelAudio";
import { track } from "@/utils/analytics";
import { sfx } from "@/utils/sfx";
import { isSwiperPhrase, relevanceScore } from "@/utils/text";

const LEVEL = LEVELS[0];
const WINDOW_MS = 20000; // the strict response window, per round (20 seconds)

const ROUNDS = [
  { id: "round1", name: "ROUND 1", object: "The First Experiment", icon: FlaskConical },
  { id: "round2", name: "ROUND 2", object: "The Biggest Achievement", icon: Gem },
  { id: "round3", name: "ROUND 3", object: "The Biggest Lesson", icon: ScrollText },
];

const LESSON_GROUPS = [
  { label: "building/shipping", words: ["build", "building", "ship", "shipping", "launch", "deploy", "product", "create"] },
  { label: "learning/failure", words: ["learn", "learning", "fail", "failure", "mistake", "lesson", "iterate", "feedback", "improve"] },
  { label: "reality/users", words: ["real", "user", "users", "people", "problem", "test", "works", "break", "reality", "experience"] },
];

export default function Level1Swiper({ onComplete, onBack, onHome }) {
  const { play, playSequence } = useAudioActions();
  const { say } = useAgentActions();
  const { keepAudio } = useLevelAudio(["level1_intro", "level1_instructions"]);
  const [phase, setPhase] = useState("intro"); // intro | ready | playing | stolen | question | won | lost
  const [round, setRound] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [practice, setPractice] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lostReason, setLostReason] = useState("time");
  const [pick, setPick] = useState(null);
  const [typeIt, setTypeIt] = useState(false);
  const timers = useRef([]);
  const roundStart = useRef(0);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The intro is taller than a screen, so the visitor may have scrolled down to press START. When a round
  // begins, bring the arena (and its countdown) back into view, clear of the sticky bars.
  useEffect(() => {
    if (phase !== "ready") return;
    document.querySelector("[data-testid=l1-arena]")?.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [phase, round]);

  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const beginRound = (r, isPractice = practice) => {
    clearTimers();
    setRound(r);
    setFeedback(null);
    setFrozen(false);
    setPhase("ready");
    say("Here he comes…", { ms: 1600 });
    play("swiper_approach");
    later(() => {
      setRoundKey((k) => k + 1);
      roundStart.current = Date.now();
      setPhase("playing");
      sfx.wrong();
      say(isPractice ? "Practice: say it!" : "NOW! Swiper, no swiping!", { ms: 3000 });
    }, 1600);
  };

  const startRun = (isPractice) => {
    sfx.transition();
    setPractice(isPractice);
    setStrikes(0);
    beginRound(0, isPractice);
  };

  const lose = (reason) => {
    clearTimers();
    setLostReason(reason);
    setFrozen(true);
    setPhase("stolen");
    sfx.buzzer();
    say("Too slow!", { ms: 2000, mood: "worried" });
    track("swiper_result", { round: round + 1, ok: false, reason, practice: false });
    later(() => { setPhase("lost"); playSequence(["swiper_celebration", "level1_fail"]); }, 1100);
  };

  const onExpire = () => { if (phase === "playing" && !practice) lose("time"); };

  // Freeze the clock the moment the visitor submits, so evaluation time never counts against them.
  const onSubmitStart = () => setFrozen(true);

  const handlePhrase = (text, meta) => {
    if (phase !== "playing") return;
    if (isSwiperPhrase(text)) {
      sfx.correct();
      clearTimers();
      const via = meta?.source === "browser-mic" ? "browser speech recognition" : "typed / dictated text";
      track("swiper_result", { round: round + 1, ok: true, ms: Date.now() - roundStart.current, source: meta?.source || "text", practice });
      setFeedback({ ok: true, msg: practice ? `That's it. (Read from ${via}.) Start the real run when you're ready.` : `SWIPER REPELLED! (Read from ${via}.)` });
      if (practice) { setPhase("intro"); setPractice(false); return; }
      const next = round + 1;
      const advance = () => {
        if (round < 2) beginRound(next);
        else { setFeedback(null); setPhase("question"); say("Last one. Swiper has a riddle.", { ms: 3200 }); }
      };
      setFrozen(true);
      play("swiper_repelled", { onEnded: () => later(advance, 250) });
    } else {
      sfx.wrong();
      play("magic_words_hint");
      const s = strikes + 1;
      setStrikes(s);
      setFeedback({ ok: false, msg: 'Not it. Say exactly: "Swiper, no swiping!"' });
      track("swiper_result", { round: round + 1, ok: false, reason: "wrong-words", practice });
      if (s >= 3 && !practice) lose("strikes");
      else setFrozen(false); // the clock keeps running
    }
  };

  const finishRiddle = (opt) => {
    track("mc_answer", { question: "l1-riddle", option: opt.id, verdict: opt.verdict, points: opt.points });
    if (opt.points >= 1) {
      sfx.win();
      setFeedback({ ok: true, msg: opt.why });
      setPhase("won");
      play("level1_win");
      onComplete(1);
    } else {
      sfx.wrong();
      setFeedback({ ok: false, msg: opt.why });
      setPick(null);
    }
  };

  const handleLessonText = (text) => {
    const r = relevanceScore(text, LESSON_GROUPS, 6);
    track("mc_answer", { question: "l1-riddle", option: "typed", points: r.score >= 55 ? 2 : 0 });
    if (r.score >= 55) { sfx.win(); setPhase("won"); play("level1_win"); onComplete(1); }
    else { sfx.wrong(); setFeedback({ ok: false, msg: `Not quite a lesson yet (${r.score}/100). Say what building, failing or real users teach you.` }); }
  };

  const R = ROUNDS[round];
  const RoundIcon = R.icon;
  const stolen = phase === "stolen" || phase === "lost";
  const swiperMood =
    phase === "question" ? "thinking"
    : stolen ? "celebrating"
    : feedback && !feedback.ok ? "celebrating"
    : feedback && feedback.ok ? "frustrated"
    : "mischievous";
  const timerOn = phase === "playing" && !practice && !frozen;

  return (
    <LevelShell level={LEVEL} onBack={onBack} onHome={onHome} onReplayInstructions={() => play("level1_instructions")}>
      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hud-panel mx-auto max-w-xl rounded-xl p-8 text-center" data-testid="l1-intro-panel">
          <div className="flex justify-center"><CharacterReaction kind="swiper" mood="mischievous" size={170} testId="swiper-fox" /></div>
          <p className="mt-2 font-display text-2xl font-black text-neon text-glow-lime">"SWIPER, NO SWIPING!"</p>
          <p className="mt-3 text-sm text-slate-300">
            Three rounds. Swiper lunges, and you have <b className="text-white">{WINDOW_MS / 1000} seconds</b> to say it.
          </p>
          <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-slate-500" data-testid="l1-input-honesty">
            The game reads the text in the box, typed or dictated with Wispr Flow. It never listens to your microphone. The optional browser mic button is separate.
          </p>
          {feedback?.ok && <div className="mx-auto mt-3 max-w-md rounded border border-neon/40 bg-neon/10 p-2 text-xs text-neon" data-testid="l1-feedback">{feedback.msg}</div>}
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <button data-testid="l1-start-btn" onClick={() => startRun(false)} className="rounded-md bg-neon px-8 py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(57,255,20,0.6)] focus:outline-none focus:ring-2 focus:ring-neon">
              START ROUND 1
            </button>
            <button data-testid="l1-practice-btn" onClick={() => startRun(true)} className="rounded-md border border-slate-600 px-6 py-3 font-display text-xs font-bold tracking-[0.2em] text-slate-300 hover:border-neon hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon">
              PRACTICE, NO TIMER
            </button>
          </div>
        </motion.div>
      )}

      {(phase === "ready" || phase === "playing" || phase === "stolen" || phase === "question") && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between text-[10px] tracking-[0.25em] text-slate-500">
            <span data-testid="l1-round-indicator">{practice ? "PRACTICE" : `ROUND ${Math.min(round + 1, 3)}/3`}</span>
            {!practice && <span data-testid="l1-strikes">WRONG TRIES: <span className={strikes > 0 ? "text-blood" : "text-neon"}>{strikes}/3</span></span>}
          </div>

          <div className={`hud-panel rounded-xl p-5 sm:p-6 ${phase === "playing" ? "border-blood/50" : ""}`} data-testid="l1-arena">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[10px] font-bold tracking-[0.3em] text-volt">{practice ? "PRACTICE" : R.name} // {R.object.toUpperCase()}</div>
              {phase !== "question" && (
                practice ? (
                  <div className="rounded border border-slate-600 px-2 py-1 text-[10px] tracking-widest text-slate-400" data-testid="l1-practice-badge">NO TIMER</div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Countdown key={roundKey} ms={WINDOW_MS} running={timerOn} onExpire={onExpire} testId="l1-countdown" size={88} />
                    <span className={`text-[9px] font-bold tracking-[0.25em] ${phase === "playing" ? "text-blood" : "text-slate-500"}`} data-testid="l1-timer-label">
                      {phase === "playing" ? "SAY IT!" : phase === "ready" ? "GET READY" : "TIME'S UP"}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="relative mx-auto mt-2 flex items-end justify-center gap-4 sm:gap-8">
              <div className="text-center">
                <motion.div
                  animate={phase === "stolen" ? { x: 120, scale: 0.2, opacity: 0, rotate: 180 } : phase === "playing" ? { x: [0, -8, 0] } : { x: 0, scale: 1, opacity: 1, rotate: 0 }}
                  transition={phase === "stolen" ? { duration: 0.7, ease: "easeIn" } : phase === "playing" ? { repeat: Infinity, duration: 0.5 } : { duration: 0.2 }}
                  className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-neon/60 bg-neon/10 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                  data-testid="l1-memory-object"
                >
                  <RoundIcon className="h-9 w-9 text-neon" />
                </motion.div>
                <div className="mt-2 max-w-[120px] text-[10px] font-bold tracking-wider text-slate-300">{R.object}</div>
              </div>
              <motion.div
                key={`${round}-${phase === "ready" ? "in" : "x"}`}
                initial={phase === "ready" ? { x: 160, opacity: 0 } : false}
                animate={phase === "playing" ? { x: [0, -30, 0] } : phase === "stolen" ? { x: -70 } : { x: 0, opacity: 1 }}
                transition={phase === "playing" ? { repeat: Infinity, duration: 0.8 } : { type: "spring", stiffness: 80 }}
              >
                <CharacterReaction kind="swiper" mood={swiperMood} size={150} trigger={strikes} testId="swiper-fox" />
              </motion.div>
            </div>
            {phase === "playing" && !practice && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-blood" data-testid="l1-steal-alert">
                <ShieldAlert className="h-4 w-4 animate-pulse" /> HE'S GRABBING IT
              </div>
            )}
          </div>

          {feedback && (
            <div className={`mt-4 rounded-lg border p-3 text-center text-xs ${feedback.ok ? "border-neon/50 bg-neon/10 text-neon" : "border-blood/50 bg-blood/10 text-blood"}`} data-testid="l1-feedback">
              {feedback.msg}
            </div>
          )}

          {phase !== "question" && (
            <div className="mt-5">
              <VoiceInput
                testId="l1-command"
                accent="neon"
                autoFocus
                evalDelay={250}
                disabled={phase !== "playing"}
                heading="USE WISPR FLOW TO SPEAK THE MAGIC WORDS"
                subheading='Or type them: "Swiper, no swiping!"'
                placeholder={phase === "ready" ? "Wait for it…" : 'Say or type: "Swiper, no swiping!"'}
                submitLabel="SHOUT"
                onSubmitStart={onSubmitStart}
                onSubmit={handlePhrase}
              />
            </div>
          )}

          {phase === "question" && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4" data-testid="l1-final-question">
              <div className="hud-panel-cyan rounded-lg p-4">
                <div className="text-[10px] font-bold tracking-[0.3em] text-volt">SWIPER'S RIDDLE</div>
                <p className="mt-2 text-sm text-slate-100">{L1_RIDDLE.question}</p>
              </div>
              <ChoiceDeck testId="l1-deck" accent="volt" options={L1_RIDDLE.options} value={pick} onChange={(o) => { setFeedback(null); setPick(o ? o.id : null); }} label="Riddle answers" />
              <button
                data-testid="l1-riddle-confirm"
                disabled={!pick}
                onClick={() => finishRiddle(L1_RIDDLE.options.find((o) => o.id === pick))}
                className="w-full rounded-md bg-volt py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(0,240,255,0.6)] focus:outline-none focus:ring-2 focus:ring-volt disabled:cursor-not-allowed disabled:opacity-30"
              >
                CONFIRM ANSWER
              </button>
              <div>
                <button onClick={() => setTypeIt((t) => !t)} data-testid="l1-type-toggle" className="text-[11px] tracking-wider text-slate-400 underline-offset-4 hover:text-white hover:underline">
                  {typeIt ? "Hide" : "Or answer in your own words"}
                </button>
                {typeIt && (
                  <div className="mt-3">
                    <VoiceInput testId="l1-lesson" accent="volt" placeholder="One honest sentence is enough." submitLabel="ANSWER" onSubmit={handleLessonText} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {phase === "won" && (
        <VictoryScreen
          type="victory"
          title="LEVEL COMPLETED"
          unlockText="UNLOCKED: THE BUILDER'S ARENA"
          message={feedback?.msg || "Swiper runs off empty-handed."}
          story={NARRATION.level1_story.text}
          onPlayStory={() => play("level1_story")}
          character={<CharacterReaction kind="swiper" mood="disappointed" size={120} />}
          continueLabel="OPEN: KNOW ME"
          onContinue={() => { sfx.unlock(); keepAudio(); play("level1_story"); onBack("knowme"); }}
          onReturn={() => onBack()}
        />
      )}

      {phase === "lost" && (
        <VictoryScreen
          type="defeat"
          title={lostReason === "time" ? "TOO SLOW" : "SWIPER ESCAPED"}
          message={lostReason === "time" ? `You had ${WINDOW_MS / 1000} seconds. Swiper took it.` : "Three wrong tries. Swiper took it."}
          character={<CharacterReaction kind="swiper" mood="celebrating" size={130} />}
          retryLabel={`TRY ROUND ${round + 1} AGAIN`}
          onRetry={() => { setStrikes(0); beginRound(round); }}
          onReturn={() => onBack()}
        />
      )}
    </LevelShell>
  );
}
