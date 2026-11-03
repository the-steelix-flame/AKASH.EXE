import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ClipboardCheck, Eye, Shield, Sparkles, Swords, Target, Timer, Trophy } from "lucide-react";
import CharacterReaction from "@/components/CharacterReaction";
import ChoiceDeck from "@/components/ChoiceDeck";
import LevelShell from "@/components/LevelShell";
import StageHeader from "@/components/StageHeader";
import VictoryScreen from "@/components/VictoryScreen";
import VoiceInput from "@/components/VoiceInput";
import { NARRATION } from "@/data/audioData";
import { L3_ADAPT, L3_PLANS, scoreAdaptChoice, scorePlanChoice } from "@/data/choices";
import { LEVELS } from "@/data/levelsData";
import { useAgentActions } from "@/hooks/useAgent";
import { useAudioActions } from "@/hooks/useAudio";
import { useLevelAudio } from "@/hooks/useLevelAudio";
import { track } from "@/utils/analytics";
import { sfx } from "@/utils/sfx";
import { findAny, wordCount } from "@/utils/text";

const LEVEL = LEVELS[2];
const PASS_SCORE = 60;
const TOTAL_STAGES = 5;

const CHAKRA_ACTIONS = [
  { id: "shield", name: "Defensive Shield", cost: 30, icon: Shield, desc: "Blocks one counterattack", words: ["shield", "defend", "block", "barrier"] },
  { id: "clones", name: "Shadow Clones", cost: 40, icon: Sparkles, desc: "Distracts & scouts", words: ["clone", "clones", "shadow", "decoy"] },
  { id: "attack", name: "Special Attack", cost: 60, icon: Swords, desc: "Ends one fight decisively", words: ["attack", "strike", "jutsu", "special"] },
  { id: "reserve", name: "Emergency Reserve", cost: 20, icon: Timer, desc: "Held back for the twist", words: ["reserve", "backup", "emergency", "held back"] },
];

// A check explains itself: what it looks for, whether the answer passed, and why.
function check(label, pass, match, hint) {
  return { label, pass, why: pass ? (match ? `You said “${match}”.` : "Looks good.") : hint };
}

function scoreStage1(text) {
  const objective = findAny(text, ["guard", "guards", "gate", "entrance", "enter", "inside", "sneak", "pass", "infiltrate"]);
  const resources = findAny(text, ["clone", "clones", "shadow", "two", "distraction", "smoke", "decoy", "team", "use"]);
  const sequence = findAny(text, ["then", "while", "after", "first", "next", "meanwhile", "once", "and"]);
  const distract = findAny(text, ["distract", "lure", "draw", "away", "left", "right", "split", "divert", "noise", "decoy", "clone"]);
  const checks = [
    check("Objective identified (get past guards / enter)", !!objective, objective, "Say what you're trying to do: get past the guards, enter the stronghold."),
    check("Resource allocation mentioned (clones / tools / team)", !!resources, resources, "Name what you're using: clones, smoke, a decoy, a team."),
    check("Clear action sequence (then / while / after)", !!sequence && wordCount(text) >= 8, sequence, "Order your steps (first… then… while…) and use at least 8 words."),
    check("Distraction logic (draw guards away, not fight all three)", !!distract, distract, "Explain how you draw the guards away instead of fighting all three."),
  ];
  return { score: Math.round((checks.filter((c) => c.pass).length / checks.length) * 100), checks };
}

function scoreStage2(selected) {
  const total = selected.reduce((s, a) => s + a.cost, 0);
  const ids = selected.map((a) => a.id);
  const checks = [
    check(`Spend within 100 chakra (spent ${total})`, total <= 100 && total > 0, null, "Spend something, but never more than 100."),
    check("A distraction tool chosen (shadow clones)", ids.includes("clones"), "Shadow Clones", "Three guards need a distraction. Shadow Clones are the distraction tool."),
    check("Offense or defense covered (shield / special attack)", ids.includes("shield") || ids.includes("attack"), null, "Pick a Defensive Shield or a Special Attack to survive contact."),
    check(`Emergency buffer kept (≥20 unspent, you kept ${100 - total})`, 100 - total >= 20, null, "Always keep at least 20 chakra unspent for surprises."),
  ];
  return { score: Math.round((checks.filter((c) => c.pass).length / checks.length) * 100), checks, total };
}

function scoreStage3(text, chakraSel, spent) {
  const changed = findAny(text, ["detected", "caught", "blocked", "route", "closed", "time", "changed", "alarm", "spotted", "twist", "found", "discovered"]);
  const adapts = findAny(text, ["instead", "switch", "adapt", "change", "new", "reroute", "reserve", "backup", "remaining", "another", "redirect", "use the", "plan b"]);
  const finishes = findAny(text, ["enter", "inside", "objective", "mission", "finish", "complete", "gate", "reach", "succeed", "goal"]);
  const ownWords = chakraSel.flatMap((a) => a.words);
  const generic = ["chakra", "reserve", "left", "clone", "clones", "shield", "quietly", "calm", "carefully", "stealth", "shadow"];
  const resource = findAny(text, [...ownWords, ...generic]);
  const checks = [
    check("Acknowledges what changed (detected / blocked / timer)", !!changed, changed, "Start by naming what went wrong: the clone was spotted, the route is closed."),
    check("Adapts the original plan (new route / role swap / reserve)", !!adapts, adapts, "Change something about your plan: a new route, a role swap, use the reserve."),
    check("Still completes the objective (get in / finish mission)", !!finishes, finishes, "End by saying how you still get in and finish the mission."),
    check(
      `Uses what you actually kept (you have ${100 - spent} chakra unspent)`,
      wordCount(text) >= 8 && !!resource,
      resource,
      "Use at least 8 words and mention a resource you still have: your reserve, a shield, remaining clones, your calm.",
    ),
  ];
  return { score: Math.round((checks.filter((c) => c.pass).length / checks.length) * 100), checks };
}

// Pulls only the facts the visitor actually wrote. Nothing is invented.
function extractPlanFacts(text) {
  const facts = [];
  const clones = text.match(/\b(one|two|three|four|five|\d+)\s+(?:shadow\s+)?clones?\b/i);
  if (clones) facts.push(`You planned to use ${clones[1].toLowerCase()} shadow clone${/^(one|1)$/i.test(clones[1]) ? "" : "s"}.`);
  else if (/\bclones?\b/i.test(text)) facts.push("You planned to use shadow clones.");
  const left = /\bleft\b/i.test(text);
  const right = /\bright\b/i.test(text);
  if (left && right) facts.push("You mentioned distracting the left and right guards.");
  else if (left || right) facts.push(`You mentioned the ${left ? "left" : "right"} guard.`);
  const way = text.match(/\b(main gate|front gate|back gate|side gate|front door|back door|main entrance|entrance|gate|window|rooftop|roof|tunnel)\b/i);
  if (way) facts.push(`You planned to enter through the ${way[1].toLowerCase()}.`);
  return facts;
}

function OriginalPlan({ plan, facts, chakraSel, spent }) {
  const kept = 100 - spent;
  return (
    <div className="hud-panel-purple rounded-xl p-5" data-testid="l3-original-plan">
      <div className="text-[10px] font-bold tracking-[0.3em] text-aura">YOUR ORIGINAL PLAN</div>
      <ul className="mt-3 space-y-1.5 text-xs text-slate-200" data-testid="l3-original-plan-list">
        {chakraSel.length > 0 ? (
          <li>▸ You selected {chakraSel.map((a) => `${a.name} (${a.cost})`).join(", ")}.</li>
        ) : (
          <li>▸ You committed no jutsu.</li>
        )}
        {facts.map((f) => <li key={f}>▸ {f}</li>)}
        <li>▸ You kept {kept} chakra unspent{chakraSel.some((a) => a.id === "reserve") ? ", including the Emergency Reserve" : ""}.</li>
      </ul>
      <div className="mt-3 border-l-2 border-aura/50 pl-3 text-[11px] italic leading-relaxed text-slate-400" data-testid="l3-original-plan-quote">
        <span className="not-italic text-[9px] tracking-[0.25em] text-slate-500">YOUR WORDS</span><br />“{plan}”
      </div>
    </div>
  );
}

export default function Level3Shinobi({ onComplete, onBack, onHome }) {
  const { play, playSequence } = useAudioActions();
  const { say } = useAgentActions();
  const { keepAudio } = useLevelAudio(["level3_intro", "level3_instructions"]);
  const [phase, setPhase] = useState("intro"); // intro | stage1..stage5
  const [plan, setPlan] = useState("");
  const [planFacts, setPlanFacts] = useState([]);
  const [planPick, setPlanPick] = useState(null);
  const [adaptPick, setAdaptPick] = useState(null);
  const [typePlan, setTypePlan] = useState(false);
  const [typeAdapt, setTypeAdapt] = useState(false);
  const [chakraSel, setChakraSel] = useState([]);
  const [adaptText, setAdaptText] = useState("");
  const [stageResults, setStageResults] = useState([]);
  const [passed, setPassed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [alerted, setAlerted] = useState(false); // stage 3: first "surprised", then "worried"
  const timers = useRef([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const spent = chakraSel.reduce((s, a) => s + a.cost, 0);
  const hasClones = chakraSel.some((a) => a.id === "clones");

  const toggleAction = (a) => {
    sfx.click();
    setChakraSel((sel) => {
      if (sel.find((x) => x.id === a.id)) return sel.filter((x) => x.id !== a.id);
      if (spent + a.cost > 100) { sfx.wrong(); return sel; }
      return [...sel, a];
    });
  };

  const submitStage1 = (text) => {
    const r = scoreStage1(text);
    setPlan(text);
    setPlanFacts(extractPlanFacts(text));
    setStageResults([{ name: "STAGE 1 // THE DISTRACTION", ...r }]);
    track("strategy_choice", { stage: 1, option: "typed", score: r.score, source: "text" });
    setPhase("stage2");
    sfx.correct();
  };

  const submitPlanCard = () => {
    const opt = L3_PLANS.find((o) => o.id === planPick);
    if (!opt) return;
    const r = scorePlanChoice(opt);
    setPlan(`${opt.title}. ${opt.body}`);
    setPlanFacts(opt.facts);
    setStageResults([{ name: "STAGE 1 // THE DISTRACTION", ...r }]);
    track("strategy_choice", { stage: 1, option: opt.id, score: r.score, source: "card" });
    setPhase("stage2");
    sfx.correct();
    say(r.score >= 75 ? "Good plan." : "Risky…", { ms: 2200 });
  };

  const submitStage2 = () => {
    if (!chakraSel.length) { setFeedback("Select at least one jutsu before committing."); sfx.wrong(); return; }
    setFeedback(null);
    const r2 = scoreStage2(chakraSel);
    setStageResults((s) => [...s, { name: "STAGE 2 // CHAKRA MANAGEMENT", ...r2 }]);
    track("strategy_choice", { stage: 2, option: chakraSel.map((a) => a.id).join("+"), score: r2.score, source: "cards" });
    setPhase("stage3");
    setAlerted(false);
    sfx.wrong(); // the alarm
    play(hasClones ? "worried_reaction" : "mission_alert");
    say("Something's wrong!", { ms: 2200, mood: "surprised" });
    timers.current.push(setTimeout(() => setAlerted(true), 900));
  };

  const adaptCtx = { reserve: 100 - spent >= 20, clones: hasClones, shield: chakraSel.some((a) => a.id === "shield"), left: 100 - spent };
  const submitAdaptCard = () => {
    const opt = (hasClones ? L3_ADAPT.clones : L3_ADAPT.patrol).find((o) => o.id === adaptPick);
    if (!opt) return;
    const r = scoreAdaptChoice(opt, adaptCtx);
    track("twist_response", { event: hasClones ? "clone-spotted" : "patrol", option: opt.id, points: r.score, source: "card" });
    finishStage3(`${opt.title}. ${opt.body}`, r);
  };
  const submitStage3 = (text) => {
    const r = scoreStage3(text, chakraSel, spent);
    track("twist_response", { event: hasClones ? "clone-spotted" : "patrol", option: "typed", points: r.score, source: "text" });
    finishStage3(text, r);
  };
  const finishStage3 = (text, r) => {
    setAdaptText(text);
    const all = [...stageResults, { name: "STAGE 3 // THE UNEXPECTED EVENT", ...r }];
    setStageResults(all);
    const avg = Math.round(all.reduce((s, x) => s + x.score, 0) / all.length);
    const ok = avg >= PASS_SCORE;
    setPassed(ok);
    if (ok) onComplete(3); // saved now, so progress is safe even if the visitor leaves before stage 5
    setPhase("stage4");
    if (r.score >= PASS_SCORE) { sfx.correct(); play("success_reaction"); } else { sfx.wrong(); }
  };

  const toReport = () => {
    sfx.transition();
    setPhase("stage5");
    if (passed) { sfx.win(); play("level3_win"); } else { sfx.fail(); play("level3_fail"); }
  };

  const retry = () => {
    timers.current.forEach(clearTimeout);
    setPhase("intro"); setPlan(""); setPlanFacts([]); setPlanPick(null); setAdaptPick(null); setAdaptText(""); setStageResults([]); setChakraSel([]); setPassed(false); setFeedback(null);
    playSequence(["level3_instructions"]);
  };

  const s3 = stageResults[2];
  const adaptOk = !!s3 && s3.score >= PASS_SCORE;

  // The shinobi's face is driven by what is happening in the mission.
  const mood =
    phase === "intro" ? "determined"
    : phase === "stage1" ? "determined"
    : phase === "stage2" ? "thinking"
    : phase === "stage3" ? (alerted ? "worried" : "surprised")
    : phase === "stage4" ? (adaptOk ? "relieved" : "disappointed")
    : passed ? "celebrating" : "defeated";

  const bubble =
    phase === "stage1" ? "Mission start. I'm ready. What's the plan?"
    : phase === "stage2" ? "Chakra is limited. Spend it wisely."
    : phase === "stage3" ? (alerted ? (hasClones ? "They spotted my clone!" : "The patrol changed!") : "Wait… what was that?!")
    : phase === "stage4" ? (adaptOk ? "Phew! That worked." : "That didn't go to plan…")
    : phase === "stage5" ? (passed ? "Mission accomplished!" : "We'll get them next time.")
    : "";

  const side = (
    <div className="flex flex-col items-center md:sticky md:top-32 md:self-start" data-testid="l3-character">
      <CharacterReaction kind="shinobi" mood={mood} size={150} testId="l3-shinobi" />
      {bubble && (
        <motion.div key={bubble} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative mt-1 max-w-[190px] rounded-lg border border-aura/40 bg-slate-950 px-3 py-2 text-center text-[11px] text-slate-200" data-testid="l3-bubble">
          {bubble}
        </motion.div>
      )}
    </div>
  );

  return (
    <LevelShell level={LEVEL} onBack={onBack} onHome={onHome} onReplayInstructions={() => play("level3_instructions")}>
      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hud-panel-purple mx-auto max-w-2xl rounded-xl p-8 text-center" data-testid="l3-intro-panel">
          <div className="flex justify-center"><CharacterReaction kind="shinobi" mood="determined" size={140} /></div>
          <Eye className="mx-auto mt-1 h-8 w-8 text-aura" />
          <h2 className="font-display mt-3 text-xl font-bold text-white">THE MISSION</h2>
          <p className="mt-3 text-sm text-slate-300">Break into the stronghold with limited chakra. Pick a plan, spend your resources, then adapt when it goes wrong.</p>
          <p className="mt-3 text-xs text-aura">{TOTAL_STAGES} STAGES · SCORE {PASS_SCORE}+ TO PASS</p>
          <button
            data-testid="l3-start-btn"
            onClick={() => { sfx.transition(); setPhase("stage1"); }}
            className="mt-6 rounded-md bg-aura px-8 py-3 font-display text-xs font-bold tracking-[0.25em] text-white transition-shadow hover:shadow-[0_0_24px_rgba(168,85,247,0.6)] focus:outline-none focus:ring-2 focus:ring-aura"
          >
            ACCEPT MISSION
          </button>
        </motion.div>
      )}

      {phase !== "intro" && (
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[200px_1fr]">
          {side}
          <div className="min-w-0">
            {phase === "stage1" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="l3-stage1">
                <StageHeader n={1} total={TOTAL_STAGES} title="THE DISTRACTION" icon={Shield} tone="aura" />
                <div className="hud-panel-purple rounded-xl p-6">
                  <h3 className="font-display text-lg font-bold text-white">Three guards. One entrance. Zero alarms allowed.</h3>
                  <div className="mt-4 flex justify-center gap-6">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3 }}
                        className="flex h-14 w-14 items-center justify-center rounded-lg border border-blood/50 bg-blood/10" data-testid={`l3-guard-${i}`}>
                        <Shield className="h-6 w-6 text-blood" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-400">Choose your plan.</p>
                </div>
                <div className="mt-5 space-y-4">
                  <ChoiceDeck testId="l3-plan-deck" accent="aura" options={L3_PLANS} value={planPick} onChange={(o) => setPlanPick(o ? o.id : null)} label="Plan options" />
                  <button data-testid="l3-plan-confirm" disabled={!planPick} onClick={submitPlanCard}
                    className="w-full rounded-md bg-aura py-3 font-display text-xs font-bold tracking-[0.25em] text-white transition-shadow hover:shadow-[0_0_24px_rgba(168,85,247,0.6)] focus:outline-none focus:ring-2 focus:ring-aura disabled:cursor-not-allowed disabled:opacity-30">
                    COMMIT PLAN
                  </button>
                  <div>
                    <button onClick={() => setTypePlan((t) => !t)} data-testid="l3-plan-type-toggle" className="text-[11px] tracking-wider text-slate-400 underline-offset-4 hover:text-white hover:underline">
                      {typePlan ? "Hide" : "Or describe your own plan"}
                    </button>
                    {typePlan && (
                      <div className="mt-3">
                        <VoiceInput testId="l3-strategy" accent="aura" size="lg"
                          placeholder="Objective, resources, sequence."
                          submitLabel="COMMIT PLAN" onSubmit={submitStage1} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === "stage2" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="l3-stage2">
                <StageHeader n={2} total={TOTAL_STAGES} title="CHAKRA MANAGEMENT" icon={Sparkles} tone="aura" />
                <div className="hud-panel-purple rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold tracking-[0.3em] text-aura">SPEND UP TO 100</div>
                    <div className="text-[10px] tracking-widest text-slate-400" data-testid="l3-chakra-remaining">
                      CHAKRA LEFT: <span className={100 - spent < 20 ? "text-blood" : "text-neon"}>{100 - spent}</span>/100
                    </div>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full border border-slate-700 bg-slate-900" data-testid="ninja-chakra-budget-slider">
                    <motion.div animate={{ width: `${spent}%` }} className={`h-full ${spent > 80 ? "bg-blood" : spent > 60 ? "bg-ember" : "bg-aura"}`} />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Choose what to carry in. Keep some chakra back.</p>
                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {CHAKRA_ACTIONS.map((a) => {
                      const Icon = a.icon;
                      const on = chakraSel.some((x) => x.id === a.id);
                      return (
                        <button
                          key={a.id}
                          data-testid={`chakra-${a.id}`}
                          aria-pressed={on}
                          onClick={() => toggleAction(a)}
                          className={`rounded-lg border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-aura ${
                            on ? "border-aura bg-aura/15 shadow-[0_0_14px_rgba(168,85,247,0.3)]" : "border-slate-700 bg-slate-950 hover:border-aura/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon className={`h-4 w-4 ${on ? "text-aura" : "text-slate-500"}`} />
                            <span className={`text-[10px] font-bold ${on ? "text-aura" : "text-slate-500"}`}>{a.cost} CHAKRA</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-white">{a.name}</div>
                          <div className="text-[10px] text-slate-500">{a.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  {feedback && <div className="mt-3 text-xs text-blood" data-testid="l3-stage2-feedback">{feedback}</div>}
                  <button
                    data-testid="ninja-submit-trial-btn"
                    onClick={submitStage2}
                    className="mt-5 w-full rounded-md bg-aura py-3 font-display text-xs font-bold tracking-[0.25em] text-white transition-shadow hover:shadow-[0_0_24px_rgba(168,85,247,0.6)] focus:outline-none focus:ring-2 focus:ring-aura"
                  >
                    LOCK IN ALLOCATION
                  </button>
                </div>
              </motion.div>
            )}

            {phase === "stage3" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5" data-testid="l3-stage3">
                <StageHeader n={3} total={TOTAL_STAGES} title="THE UNEXPECTED EVENT" icon={AlertTriangle} tone="blood" />
                <OriginalPlan plan={plan} facts={planFacts} chakraSel={chakraSel} spent={spent} />
                <div className="rounded-xl border border-blood/50 bg-blood/5 p-6 shadow-[0_0_24px_rgba(239,68,68,0.15)]" data-testid="l3-event">
                  <div className="flex items-start gap-2 text-sm font-black tracking-wider text-blood" data-testid="l3-event-title">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" />
                    {hasClones ? "OH NO! THE ENEMY HAS DISCOVERED ONE OF YOUR SHADOW CLONES!" : "OH NO! THE GUARDS HAVE CHANGED THEIR PATROL!"}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {hasClones
                      ? "A guard just spotted a clone and the sweep is heading toward your planned entry."
                      : "A sentry just noticed movement and the guards are now sweeping your planned entry."}{" "}
                    The moon is setting: minutes before the stronghold wakes. Your original plan might not work anymore. What will you do?
                  </p>
                </div>
                <ChoiceDeck testId="l3-adapt-deck" accent="aura" options={hasClones ? L3_ADAPT.clones : L3_ADAPT.patrol} value={adaptPick} onChange={(o) => setAdaptPick(o ? o.id : null)} label="Response options" />
                <button data-testid="l3-adapt-confirm" disabled={!adaptPick} onClick={submitAdaptCard}
                  className="w-full rounded-md bg-aura py-3 font-display text-xs font-bold tracking-[0.25em] text-white transition-shadow hover:shadow-[0_0_24px_rgba(168,85,247,0.6)] focus:outline-none focus:ring-2 focus:ring-aura disabled:cursor-not-allowed disabled:opacity-30">
                  FINAL DECISION
                </button>
                <div>
                  <button onClick={() => setTypeAdapt((t) => !t)} data-testid="l3-adapt-type-toggle" className="text-[11px] tracking-wider text-slate-400 underline-offset-4 hover:text-white hover:underline">
                    {typeAdapt ? "Hide" : "Or say it in your own words"}
                  </button>
                  {typeAdapt && (
                    <div className="mt-3">
                      <VoiceInput testId="l3-adapt" accent="aura" size="lg"
                        heading="USE WISPR FLOW TO SPEAK YOUR RESPONSE, OR TYPE IT DIRECTLY."
                        subheading=""
                        placeholder="What changed, how you adapt, how you still finish."
                        submitLabel="FINAL DECISION" onSubmit={submitStage3} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "stage4" && s3 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5" data-testid="l3-stage4">
                <StageHeader n={4} total={TOTAL_STAGES} title="THE OUTCOME" icon={ClipboardCheck} tone={adaptOk ? "neon" : "blood"} />
                <div className={`rounded-xl border p-5 ${adaptOk ? "border-neon/50 bg-neon/5" : "border-blood/50 bg-blood/5"}`} data-testid="l3-outcome">
                  <div className={`font-display text-lg font-black ${adaptOk ? "text-neon" : "text-blood"}`} data-testid="l3-outcome-title">
                    {adaptOk ? "THE ADAPTATION WORKED" : "THE ADAPTATION FELL APART"}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {adaptOk
                      ? "You acknowledged the problem, changed the plan and kept the mission alive."
                      : "The new plan left gaps. The checks below show what the guards noticed."}
                  </p>
                  <div className="mt-3 border-l-2 border-slate-600 pl-3 text-[11px] italic leading-relaxed text-slate-400" data-testid="l3-received-response">
                    <span className="not-italic text-[9px] tracking-[0.25em] text-slate-500">YOUR RESPONSE (AS RECEIVED)</span><br />“{adaptText}”
                  </div>
                </div>
                <div className="hud-panel rounded-xl p-5" data-testid="l3-outcome-checks">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.25em] text-slate-300">WHY IT {adaptOk ? "WORKED" : "FAILED"}</span>
                    <span className={`font-display text-sm font-black ${s3.score >= 60 ? "text-neon" : s3.score >= 40 ? "text-ember" : "text-blood"}`}>{s3.score}/100</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {s3.checks.map((c) => (
                      <li key={c.label} className="text-[11px]">
                        <div className={`flex gap-2 ${c.pass ? "text-neon" : "text-slate-400"}`}><span>{c.pass ? "✓" : "✗"}</span> {c.label}</div>
                        <div className="ml-5 mt-0.5 text-[10px] text-slate-500">{c.why}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  data-testid="l3-to-report-btn"
                  onClick={toReport}
                  className="w-full rounded-md bg-aura py-3 font-display text-xs font-bold tracking-[0.25em] text-white transition-shadow hover:shadow-[0_0_24px_rgba(168,85,247,0.6)] focus:outline-none focus:ring-2 focus:ring-aura sm:w-auto sm:px-10"
                >
                  SEE MISSION REPORT →
                </button>
              </motion.div>
            )}

            {phase === "stage5" && (
              <div className="space-y-5" data-testid="l3-stage5">
                <StageHeader n={5} total={TOTAL_STAGES} title="MISSION REPORT" icon={passed ? Trophy : Target} tone={passed ? "neon" : "blood"} />
                {passed ? (
                  <VictoryScreen
                    type="victory"
                    title="LEVEL COMPLETED"
                    unlockText="NEW SPACE UNLOCKED // THE GROWTH KINGDOM"
                    message={resultsMessage(stageResults)}
                    story={NARRATION.level3_story.text}
                    onPlayStory={() => play("level3_story")}
                    character={<CharacterReaction kind="shinobi" mood="celebrating" size={120} />}
                    continueLabel="REVEAL: MY MIND"
                    onContinue={() => { sfx.unlock(); keepAudio(); play("level3_story"); onBack("mind"); }}
                    onReturn={() => onBack()}
                  />
                ) : (
                  <VictoryScreen
                    type="defeat"
                    title="MISSION FAILED"
                    message={resultsMessage(stageResults) + " Review each stage's rubric below: the dungeon grades logic, not luck."}
                    character={<CharacterReaction kind="shinobi" mood="defeated" size={120} />}
                    onRetry={retry}
                    onReturn={() => onBack()}
                  />
                )}
              </div>
            )}

            {stageResults.length > 0 && phase !== "stage1" && (
              <div className="mt-8 space-y-3" data-testid="l3-scoring">
                {stageResults.map((r) => (
                  <div key={r.name} className="hud-panel rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.25em] text-slate-300">{r.name}</span>
                      <span className={`font-display text-sm font-black ${r.score >= 60 ? "text-neon" : r.score >= 40 ? "text-ember" : "text-blood"}`} data-testid={`${r.name.split(" ")[1]}-score`}>
                        {r.score}/100
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {r.checks.map((c) => (
                        <li key={c.label} className={`flex gap-2 text-[10px] ${c.pass ? "text-neon" : "text-slate-500"}`}>
                          <span>{c.pass ? "✓" : "✗"}</span> {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </LevelShell>
  );
}

function resultsMessage(stageResults) {
  const avg = Math.round(stageResults.reduce((s, x) => s + x.score, 0) / Math.max(1, stageResults.length));
  return `MISSION SCORE: ${avg}/100. ${stageResults.map((r) => `${r.name.split("//")[1].trim()} ${r.score}`).join(" · ")}.`;
}
