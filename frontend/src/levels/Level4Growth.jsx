import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertTriangle, BarChart3, Flame, Megaphone, Target, Users } from "lucide-react";
import CharacterReaction from "@/components/CharacterReaction";
import ChoiceDeck from "@/components/ChoiceDeck";
import LevelShell from "@/components/LevelShell";
import StageHeader from "@/components/StageHeader";
import VictoryScreen from "@/components/VictoryScreen";
import VoiceInput from "@/components/VoiceInput";
import { NARRATION } from "@/data/audioData";
import { LEVELS } from "@/data/levelsData";
import {
  AUDIENCES, BUDGET_MIN_SPEND, BUDGET_TOTAL, CAMPAIGNS,
  PITCH_DECKS, PITCH_PASS_SCORE, PITCH_PROMPT, TWIST_EVENTS, buildPitch, scorePitchPicks,
} from "@/data/campaignData";
import { useAgentActions } from "@/hooks/useAgent";
import { useAudioActions } from "@/hooks/useAudio";
import { useLevelAudio } from "@/hooks/useLevelAudio";
import { track } from "@/utils/analytics";
import { sfx } from "@/utils/sfx";
import { hasAny, wordCount } from "@/utils/text";

const LEVEL = LEVELS[3];

const HOOK_WORDS = ["stop", "imagine", "what if", "tired", "wasting", "never", "why", "forget", "quit", "enough", "still typing", "bored"];
const AUDIENCE_WORDS = ["student", "students", "college", "campus", "assignment", "assignments", "exam", "class", "hostel", "notes", "study", "presentation", "project"];
const VALUE_WORDS = ["faster", "speed", "save", "time", "voice", "speak", "speaking", "dictate", "hands free", "type less", "ideas", "write", "writing", "productivity", "seconds", "minutes", "naturally"];
const CTA_WORDS = ["join", "try", "download", "sign up", "start", "challenge", "today", "now", "install", "get", "register", "speak"];
const CREATIVE_WORDS = ["billion", "india", "languages", "voice", "speak", "shout", "whisper", "louder", "silence", "keyboard", "superpower", "magic", "challenge", "fingers", "thoughts"];

function scorePitch(text) {
  const checks = [
    { label: "Opening hook (interrupts the scroll)", pass: hasAny(text, HOOK_WORDS) || text.trim().startsWith("?"), pts: 20 },
    { label: "Audience relevance (speaks to Indian students)", pass: hasAny(text, AUDIENCE_WORDS), pts: 20 },
    { label: "Product value proposition (voice = faster work)", pass: hasAny(text, VALUE_WORDS), pts: 25 },
    { label: "Creativity (imagery / wordplay / specific scene)", pass: hasAny(text, CREATIVE_WORDS) && wordCount(text) >= 12, pts: 15 },
    { label: "Clear call to action", pass: hasAny(text, CTA_WORDS), pts: 20 },
  ];
  return {
    score: checks.reduce((s, c) => s + (c.pass ? c.pts : 0), 0),
    checks: checks.map((c) => ({ ...c, max: c.pts, pts: c.pass ? c.pts : 0, why: "" })),
  };
}

const AUDIENCE_CAMPAIGN_FIT = {
  students: ["campus", "reels", "productivity", "hackathon", "referral"],
  developers: ["dev", "hackathon", "referral"],
  creators: ["regional", "reels", "productivity"],
  professionals: ["productivity", "referral"],
  founders: ["dev", "referral"],
};

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

// Charges 0 -> target with a motion value, so only this tiny component re-renders (not the whole level).
function ChargeMeter({ target, onDone }) {
  const mv = useMotionValue(0);
  const scaleX = useTransform(mv, (v) => v / 100);
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const c = animate(mv, target, {
      duration: Math.max(0.9, target / 55),
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => setTimeout(() => done.current(), 600),
    });
    return () => c.stop();
  }, [mv, target]);
  return (
    <div className="relative mx-auto mt-6 h-6 overflow-hidden rounded-full border border-ember/60 bg-slate-950">
      <motion.div style={{ scaleX }} className="h-full origin-left bg-gradient-to-r from-ember via-neon to-volt" />
      <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-black text-white" data-testid="kamehameha-power-value">{shown}/100</span>
    </div>
  );
}

export default function Level4Growth({ onComplete, onBack, onHome }) {
  const { play, playSequence } = useAudioActions();
  const { say } = useAgentActions();
  useLevelAudio(["level4_intro", "level4_instructions"]);
  const [phase, setPhase] = useState("intro"); // intro | audience | budget | twist | pitch | charging | results | won | lost
  const [audience, setAudience] = useState(null);
  const [budget, setBudget] = useState({});
  const [twist, setTwist] = useState(null);
  const [twistText, setTwistText] = useState("");
  const [twistPick, setTwistPick] = useState(null);
  const [twistPoints, setTwistPoints] = useState(75);
  const [twistWhy, setTwistWhy] = useState("");
  const [typeTwist, setTypeTwist] = useState(false);
  const [typePitch, setTypePitch] = useState(false);
  const [picks, setPicks] = useState({});
  const [pitchStep, setPitchStep] = useState(0);
  const [pitch, setPitch] = useState(null);
  const [campaignScore, setCampaignScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [alerted, setAlerted] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalAllocated = Object.values(budget).reduce((s, v) => s + (v || 0), 0);

  const setAlloc = (id, val) => {
    const n = Math.max(0, Math.min(BUDGET_TOTAL, Number(val) || 0));
    const others = Object.entries(budget).filter(([k]) => k !== id).reduce((s, [, v]) => s + (v || 0), 0);
    if (others + n > BUDGET_TOTAL) { sfx.wrong(); setFeedback("Budget cap is ₹1,00,000. Reduce another campaign first."); return; }
    setFeedback(null);
    setBudget((b) => ({ ...b, [id]: n }));
    sfx.click();
  };

  const submitBudget = () => {
    const chosen = Object.entries(budget).filter(([, v]) => v > 0);
    if (totalAllocated < BUDGET_MIN_SPEND) { setFeedback(`Commit at least ₹${BUDGET_MIN_SPEND / 1000}K. A campaign nobody funds is a campaign nobody sees.`); sfx.wrong(); return; }
    if (chosen.length < 2) { setFeedback("Diversify: fund at least 2 campaigns. One channel is a single point of failure."); sfx.wrong(); return; }
    setFeedback(null);
    const fit = AUDIENCE_CAMPAIGN_FIT[audience.id] || [];
    const fitSpend = chosen.filter(([id]) => fit.includes(id)).reduce((s, [, v]) => s + v, 0);
    setCampaignScore({ fitRatio: fitSpend / totalAllocated, budgetUsed: totalAllocated });
    track("budget_alloc", { alloc: Object.fromEntries(chosen), total: totalAllocated });
    setTwist(TWIST_EVENTS[Math.floor(Math.random() * TWIST_EVENTS.length)]);
    setAlerted(false);
    setPhase("twist");
    sfx.wrong();
    timers.current.push(setTimeout(() => setAlerted(true), 900));
  };

  const submitTwistCard = () => {
    const opt = twist.options.find((o) => o.id === twistPick);
    if (!opt) return;
    setTwistText(`${opt.title}. ${opt.body}`);
    setTwistPoints(opt.points);
    setTwistWhy(opt.why);
    track("twist_response", { event: twist.id, option: opt.id, points: opt.points, source: "card" });
    setPhase("pitch");
    sfx.correct();
  };

  const submitTwist = (text) => {
    if (relevanceLite(text) < 50) {
      setFeedback("That's not a plan yet. Name the problem, say what you change (budget/message/channel), and what you protect. Try again.");
      sfx.wrong();
      return;
    }
    setFeedback(null);
    setTwistText(text);
    setTwistPoints(Math.min(100, relevanceLite(text)));
    setTwistWhy("");
    track("twist_response", { event: twist.id, option: "typed", points: Math.min(100, relevanceLite(text)), source: "text" });
    setPhase("pitch");
    sfx.correct();
  };

  const submitPitch = (text) => {
    track("pitch_submit", { score: scorePitch(text).score, source: "text" });
    finishPitch(text, scorePitch(text));
  };
  const submitPitchCards = () => {
    const r = scorePitchPicks(picks);
    track("pitch_submit", { score: r.score, source: "cards", picks });
    finishPitch(buildPitch(picks), r);
  };
  const finishPitch = (text, r) => {
    setPitch({ text, ...r });
    const finalScore = Math.round(
      0.25 * 80 + // audience selected coherently
      0.25 * Math.round((campaignScore?.fitRatio ?? 0.5) * 100) +
      0.2 * twistPoints + // how well the unexpected event was handled
      0.3 * r.score,
    );
    setCampaignScore((prev) => ({ ...prev, pitch: r, finalScore }));
    setPhase("charging");
    sfx.powerup();
    play("energy_charge");
  };

  const chargeDone = () => {
    const finalScore = campaignScore?.finalScore ?? 0;
    if (finalScore >= PITCH_PASS_SCORE) {
      sfx.kamehameha();
      onComplete(4); // saved as soon as the campaign passes, before the visitor presses release
      setPhase("results");
    } else {
      sfx.fail();
      setPhase("lost");
      play("level4_fail");
    }
  };

  const launchFinal = () => {
    sfx.win();
    setPhase("won");
    playSequence(["kamehameha", "level4_win"]);
  };

  const retry = () => {
    timers.current.forEach(clearTimeout);
    setPhase("intro"); setAudience(null); setBudget({}); setTwist(null); setTwistText(""); setTwistPick(null); setPicks({}); setPitchStep(0); setPitch(null); setCampaignScore(null); setFeedback(null);
    playSequence(["level4_instructions"]);
  };

  // The saiyan reacts to the real state of the campaign.
  const strong = (campaignScore?.finalScore ?? 0) >= PITCH_PASS_SCORE;
  const mood =
    phase === "intro" || phase === "audience" || phase === "pitch" ? "determined"
    : phase === "budget" ? "thinking"
    : phase === "twist" ? (alerted ? "worried" : "surprised")
    : phase === "charging" ? "excited"
    : phase === "results" ? (strong ? "excited" : "worried")
    : phase === "won" ? "celebrating"
    : "worried";
  const bubble =
    phase === "audience" ? "Who do we talk to first?"
    : phase === "budget" ? "₹1,00,000 won't stretch forever…"
    : phase === "twist" ? (alerted ? "This changes everything!" : "Wait, what?!")
    : phase === "pitch" ? "Make it a pitch they'll remember."
    : phase === "charging" ? "Ka-me-ha-me…!"
    : phase === "results" ? "The numbers look strong!"
    : phase === "lost" ? "We didn't reach full power…"
    : "";

  const side = phase !== "intro" && phase !== "won" && (
    <div className="flex flex-col items-center md:sticky md:top-32 md:self-start" data-testid="l4-character">
      <CharacterReaction kind="saiyan" mood={mood} size={150} testId="l4-saiyan" />
      {bubble && (
        <motion.div key={bubble} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 max-w-[190px] rounded-lg border border-ember/40 bg-slate-950 px-3 py-2 text-center text-[11px] text-slate-200">
          {bubble}
        </motion.div>
      )}
    </div>
  );

  const plan = Object.entries(budget).filter(([, v]) => v > 0);

  return (
    <LevelShell level={LEVEL} onBack={onBack} onHome={onHome} onReplayInstructions={() => play("level4_instructions")}>
      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hud-panel mx-auto max-w-2xl rounded-xl p-8 text-center" data-testid="l4-intro-panel">
          <div className="flex justify-center"><CharacterReaction kind="saiyan" mood="determined" size={150} /></div>
          <Flame className="mx-auto mt-1 h-8 w-8 text-ember" />
          <h2 className="font-display mt-3 text-xl font-bold text-white">THE 100K KAMEHAMEHA</h2>
          <p className="mt-3 text-sm text-slate-300">You're the Growth Saiyan for Wispr Flow India. Bring voice-first writing to 100,000 people.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] tracking-widest">
            <span className="border border-ember/50 bg-ember/10 px-3 py-1 text-ember">{fmt(BUDGET_TOTAL)} BUDGET</span>
            <span className="border border-volt/50 bg-volt/10 px-3 py-1 text-volt">30 DAYS</span>
            <span className="border border-neon/50 bg-neon/10 px-3 py-1 text-neon">100,000 PEOPLE</span>
          </div>
          <button
            data-testid="l4-start-btn"
            onClick={() => { sfx.transition(); setPhase("audience"); }}
            className="mt-6 rounded-md bg-ember px-8 py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(245,158,11,0.6)] focus:outline-none focus:ring-2 focus:ring-ember"
          >
            GO SUPER SAIYAN
          </button>
        </motion.div>
      )}

      {phase !== "intro" && phase !== "won" && (
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[200px_1fr]">
          {side}
          <div className="min-w-0">
            {phase === "audience" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="l4-stage-audience">
                <StageHeader n={1} title="CHOOSE YOUR AUDIENCE" icon={Users} />
                <p className="mb-4 text-xs text-slate-400">Pick who you're talking to first. Every choice after this depends on it.</p>
                <ChoiceDeck
                  testId="l4-audience-deck"
                  accent="ember"
                  label="Audience options"
                  options={AUDIENCES.map((x) => ({ id: x.id, title: x.name, body: x.why }))}
                  value={audience?.id || null}
                  onChange={(o) => setAudience(o ? AUDIENCES.find((x) => x.id === o.id) : null)}
                />
                <NavButton testId="l4-audience-next" disabled={!audience} onClick={() => { track("audience_pick", { audience: audience.id }); setPhase("budget"); sfx.transition(); say("Now the budget.", { ms: 2200 }); }} label="LOCK AUDIENCE →" />
              </motion.div>
            )}

            {phase === "budget" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="growth-budget-simulator">
                <StageHeader n={2} title="SPLIT THE ₹1,00,000" icon={BarChart3} />
                <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-4 py-3">
                  <span className="text-[10px] tracking-[0.25em] text-slate-400">ALLOCATED</span>
                  <span className={`font-display text-sm font-black ${totalAllocated > BUDGET_TOTAL ? "text-blood" : "text-neon"}`} data-testid="l4-budget-remaining">
                    {fmt(totalAllocated)} / {fmt(BUDGET_TOTAL)}
                  </span>
                </div>
                <div className="mb-4 h-3 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                  <motion.div animate={{ width: `${(totalAllocated / BUDGET_TOTAL) * 100}%` }} className={`h-full ${totalAllocated > BUDGET_TOTAL ? "bg-blood" : "bg-ember"}`} />
                </div>
                <div className="space-y-2">
                  {CAMPAIGNS.map((c) => {
                    const fit = (AUDIENCE_CAMPAIGN_FIT[audience.id] || []).includes(c.id);
                    return (
                      <div key={c.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${fit ? "border-ember/40 bg-ember/5" : "border-slate-800 bg-slate-950"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white">
                            {c.name}
                            {fit && <span className="rounded border border-ember/50 px-1.5 py-0.5 text-[8px] tracking-widest text-ember">FITS {audience.name.toUpperCase()}</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">{c.hint}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[10000, 20000, 40000].map((step) => (
                            <button
                              key={step}
                              data-testid={`budget-${c.id}-plus-${step / 1000}k`}
                              onClick={() => setAlloc(c.id, (budget[c.id] || 0) + step)}
                              className="rounded border border-slate-700 px-2 py-1.5 text-[10px] text-slate-300 transition-colors hover:border-neon hover:text-neon"
                            >
                              +{step / 1000}K
                            </button>
                          ))}
                          <button
                            data-testid={`budget-${c.id}-clear`}
                            onClick={() => setAlloc(c.id, 0)}
                            aria-label={`Clear ${c.name}`}
                            className="rounded border border-slate-700 px-2 py-1.5 text-[10px] text-slate-500 hover:border-blood hover:text-blood"
                          >
                            ✕
                          </button>
                          <span className="w-16 text-right font-display text-xs font-bold text-neon" data-testid={`budget-${c.id}-value`}>
                            {fmt(budget[c.id] || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {feedback && <div className="mt-3 rounded border border-blood/50 bg-blood/10 p-2 text-xs text-blood" data-testid="l4-budget-feedback">{feedback}</div>}
                <NavButton testId="l4-budget-next" onClick={submitBudget} label="LAUNCH ALLOCATION →" />
              </motion.div>
            )}

            {phase === "twist" && twist && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5" data-testid="l4-stage-twist">
                <StageHeader n={3} title="THE UNEXPECTED EVENT" icon={AlertTriangle} tone="blood" />
                <div className="hud-panel rounded-xl p-5" data-testid="l4-original-plan">
                  <div className="text-[10px] font-bold tracking-[0.3em] text-ember">YOUR ORIGINAL PLAN</div>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-200">
                    <li>▸ Audience: {audience?.name}.</li>
                    {plan.map(([id, v]) => <li key={id}>▸ {CAMPAIGNS.find((c) => c.id === id)?.name}: {fmt(v)}.</li>)}
                    <li>▸ Unspent: {fmt(BUDGET_TOTAL - totalAllocated)}.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-blood/50 bg-blood/5 p-6 shadow-[0_0_24px_rgba(239,68,68,0.15)]">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-blood">
                    <AlertTriangle className="h-4 w-4 animate-pulse" /> {twist.title}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200">{twist.body}</p>
                </div>
                <ChoiceDeck testId="l4-twist-deck" accent="ember" label="Response options" options={twist.options} value={twistPick} onChange={(o) => setTwistPick(o ? o.id : null)} />
                <button data-testid="l4-twist-confirm" disabled={!twistPick} onClick={submitTwistCard}
                  className="w-full rounded-md bg-ember py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(245,158,11,0.6)] focus:outline-none focus:ring-2 focus:ring-ember disabled:cursor-not-allowed disabled:opacity-30">
                  ADAPT CAMPAIGN
                </button>
                <div>
                  <button onClick={() => setTypeTwist((t) => !t)} data-testid="l4-twist-type-toggle" className="text-[11px] tracking-wider text-slate-400 underline-offset-4 hover:text-white hover:underline">
                    {typeTwist ? "Hide" : "Or say it in your own words"}
                  </button>
                  {typeTwist && (
                    <div className="mt-3">
                      <VoiceInput testId="l4-twist" accent="ember" size="lg"
                        heading="USE WISPR FLOW TO SPEAK YOUR RESPONSE, OR TYPE IT DIRECTLY."
                        subheading=""
                        placeholder="What you change, what you protect."
                        submitLabel="ADAPT CAMPAIGN" onSubmit={submitTwist} />
                    </div>
                  )}
                </div>
                {feedback && <div className="rounded border border-blood/50 bg-blood/10 p-2 text-xs text-blood" data-testid="l4-twist-feedback">{feedback}</div>}
              </motion.div>
            )}

            {phase === "pitch" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="l4-stage-pitch">
                <StageHeader n={4} title="THE PITCH" icon={Megaphone} />
                <div className="mb-4 border-l-2 border-ember/50 pl-3 text-[11px] leading-relaxed text-slate-400" data-testid="l4-twist-received">
                  <span className="text-[9px] tracking-[0.25em] text-slate-500">YOUR RESPONSE TO THE EVENT</span><br />{twistText}
                  {twistWhy && <div className="mt-1 text-slate-500" data-testid="l4-twist-why">{twistWhy}</div>}
                </div>
                <div className="hud-panel rounded-xl p-5">
                  <p className="font-display text-base font-bold text-white sm:text-lg" data-testid="l4-pitch-prompt">{PITCH_PROMPT}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Build it in four cards.</p>
                </div>
                <div className="mt-5 space-y-4" data-testid="l4-pitch-builder">
                  {pitchStep < PITCH_DECKS.length ? (
                    <>
                      <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-slate-500">
                        <span data-testid="l4-pitch-step">CARD {pitchStep + 1} OF {PITCH_DECKS.length}: <b className="text-ember">{PITCH_DECKS[pitchStep].label}</b></span>
                        {pitchStep > 0 && <button onClick={() => setPitchStep((n) => n - 1)} data-testid="l4-pitch-back" className="text-slate-400 hover:text-white">← BACK</button>}
                      </div>
                      <ChoiceDeck
                        key={PITCH_DECKS[pitchStep].id}
                        testId="l4-pitch-deck"
                        accent="ember"
                        label={PITCH_DECKS[pitchStep].label}
                        options={PITCH_DECKS[pitchStep].options}
                        value={picks[PITCH_DECKS[pitchStep].id] || null}
                        onChange={(o) => setPicks((pk) => ({ ...pk, [PITCH_DECKS[pitchStep].id]: o ? o.id : undefined }))}
                      />
                      <button data-testid="l4-pitch-next" disabled={!picks[PITCH_DECKS[pitchStep].id]} onClick={() => setPitchStep((n) => n + 1)}
                        className="w-full rounded-md bg-ember py-3 font-display text-xs font-bold tracking-[0.25em] text-void focus:outline-none focus:ring-2 focus:ring-ember disabled:cursor-not-allowed disabled:opacity-30">
                        {pitchStep === PITCH_DECKS.length - 1 ? "BUILD MY PITCH" : "NEXT CARD →"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-ember/50 bg-ember/5 p-5" data-testid="l4-pitch-preview">
                        <div className="text-[10px] font-bold tracking-[0.3em] text-ember">YOUR PITCH</div>
                        <p className="mt-2 text-sm leading-relaxed text-white">{buildPitch(picks)}</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button onClick={() => setPitchStep(PITCH_DECKS.length - 1)} data-testid="l4-pitch-review" className="rounded-md border border-slate-600 px-5 py-3 text-xs font-bold tracking-widest text-slate-300 hover:border-white">← REVIEW CARDS</button>
                        <button data-testid="l4-pitch-deliver" onClick={submitPitchCards} className="flex-1 rounded-md bg-ember py-3 font-display text-xs font-bold tracking-[0.25em] text-void focus:outline-none focus:ring-2 focus:ring-ember">DELIVER PITCH</button>
                      </div>
                    </>
                  )}
                  <div>
                    <button onClick={() => setTypePitch((t) => !t)} data-testid="l4-pitch-type-toggle" className="text-[11px] tracking-wider text-slate-400 underline-offset-4 hover:text-white hover:underline">
                      {typePitch ? "Hide" : "Or write your own pitch"}
                    </button>
                    {typePitch && (
                      <div className="mt-3">
                        <VoiceInput testId="l4-pitch" accent="ember" size="lg" placeholder="Your 30-second pitch." submitLabel="DELIVER PITCH" onSubmit={submitPitch} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === "charging" && (
              <div className="text-center" data-testid="l4-charging">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="font-display text-2xl font-black text-ember">
                  KA-ME-HA-ME…
                </motion.div>
                <ChargeMeter target={pitch?.score ?? 0} onDone={chargeDone} />
                <p className="mt-4 text-xs text-slate-400">Scoring your campaign energy…</p>
              </div>
            )}

            {phase === "results" && campaignScore && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="l4-results">
                <StageHeader n={5} title="CAMPAIGN RESULTS" icon={Target} />
                <SimDashboard score={campaignScore} budgetUsed={campaignScore.budgetUsed} />
                {pitch && (
                  <div className="hud-panel mt-6 rounded-lg p-4" data-testid="l4-pitch-breakdown">
                    <div className="text-[10px] font-bold tracking-[0.3em] text-ember">PITCH SCORECARD — {pitch.score}/100</div>
                    <ul className="mt-2 space-y-1">
                      {pitch.checks.map((c) => (
                        <li key={c.label} className={`flex gap-2 text-[11px] ${c.pass ? "text-neon" : "text-slate-500"}`}>
                          <span>{c.pass ? "✓" : "✗"}</span> <span>{c.label}{c.why ? <span className="text-slate-500"> · {c.why}</span> : null}</span> <span className="ml-auto shrink-0">{c.pts}/{c.max}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  data-testid="kamehameha-power-btn"
                  onClick={launchFinal}
                  className="pulse-ring mx-auto mt-8 block rounded-md bg-neon px-10 py-4 font-display text-sm font-black tracking-[0.3em] text-void transition-shadow hover:shadow-[0_0_40px_rgba(57,255,20,0.7)] focus:outline-none focus:ring-2 focus:ring-neon"
                >
                  RELEASE THE KAMEHAMEHA
                </button>
              </motion.div>
            )}

            {phase === "lost" && (
              <VictoryScreen
                type="defeat"
                title="CAMPAIGN FIZZLED"
                message="Not enough power. Put more budget behind channels that fit your audience, handle the twist, and sharpen the pitch."
                character={<CharacterReaction kind="saiyan" mood="worried" size={120} />}
                onRetry={retry}
                onReturn={() => onBack()}
              />
            )}
          </div>
        </div>
      )}

      {phase === "won" && (
        <VictoryScreen
          type="victory"
          title="LEVEL COMPLETED"
          unlockText="ALL FOUR WORLDS CLEARED"
          message="The Kamehameha lands. 100,000 people reached, in simulation. Next: my real proposal."
          story={NARRATION.level4_story.text}
          onPlayStory={() => play("level4_story")}
          character={<CharacterReaction kind="saiyan" mood="celebrating" size={140} />}
          continueLabel="SEE THE REAL PROPOSAL"
          onContinue={() => { sfx.unlock(); onBack("finale"); }}
          onReturn={() => onBack()}
        />
      )}
    </LevelShell>
  );
}

function NavButton({ testId, disabled, onClick, label }) {
  return (
    <button
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="mt-6 w-full rounded-md bg-ember py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(245,158,11,0.6)] focus:outline-none focus:ring-2 focus:ring-ember disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-10"
    >
      {label}
    </button>
  );
}

// deterministic pseudo-simulation derived from score inputs, clearly labelled as simulated
function SimDashboard({ score, budgetUsed }) {
  const q = Math.max(0.3, Math.min(1, score.finalScore / 100));
  const sim = {
    reach: Math.round(95000 * q + budgetUsed * 0.35),
    engagement: Math.round(9500 * q),
    signups: Math.round(4200 * q),
    activation: Math.round(2400 * q),
    retention: Math.round(34 * q + 8),
    budget: Math.round((budgetUsed / 100000) * 100),
  };
  const items = [
    { k: "CAMPAIGN REACH", v: sim.reach.toLocaleString("en-IN") },
    { k: "ENGAGEMENT", v: sim.engagement.toLocaleString("en-IN") },
    { k: "SIGN-UPS", v: sim.signups.toLocaleString("en-IN") },
    { k: "ACTIVATED (FIRST DICTATION)", v: sim.activation.toLocaleString("en-IN") },
    { k: "D7 RETENTION", v: `${sim.retention}%` },
    { k: "BUDGET UTILISED", v: `${sim.budget}%` },
  ];
  return (
    <div>
      <div className="mb-3 rounded border border-ember/50 bg-ember/10 p-2 text-center text-[10px] tracking-[0.2em] text-ember" data-testid="sim-disclaimer">
        SIMULATED FIGURES, GENERATED FROM YOUR GAME DECISIONS. NOT REAL WISPR FLOW DATA.
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it, i) => (
          <motion.div
            key={it.k}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="hud-panel rounded-lg p-4 text-center"
            data-testid={`sim-${it.k.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          >
            <div className="font-display text-lg font-black text-neon sm:text-xl">{it.v}</div>
            <div className="mt-1 text-[9px] tracking-[0.2em] text-slate-500">{it.k}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function relevanceLite(text) {
  let s = 0;
  if (wordCount(text) >= 10) s += 30;
  if (hasAny(text, ["shift", "move", "reallocate", "change", "pivot", "double down", "increase", "decrease", "cut", "boost", "redirect", "adapt"])) s += 30;
  if (hasAny(text, ["audience", "creator", "campus", "students", "community", "referral", "content", "message", "channel", "onboarding", "retention", "feedback", "budget", "campaign"])) s += 25;
  if (hasAny(text, ["because", "so that", "to keep", "while", "without", "protect", "focus", "measure", "test"])) s += 15;
  return s;
}
