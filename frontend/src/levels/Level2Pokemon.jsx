import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Swords } from "lucide-react";
import BattleArena from "@/components/pokemon/BattleArena";
import HintsOverlay from "@/components/pokemon/HintsOverlay";
import CharacterReaction from "@/components/CharacterReaction";
import LevelShell from "@/components/LevelShell";
import VictoryScreen from "@/components/VictoryScreen";
import VoiceInput from "@/components/VoiceInput";
import { NARRATION } from "@/data/audioData";
import { LEVELS } from "@/data/levelsData";
import {
  PLAYER_TEAM, TYPE_META, calcDamage, chooseOpponentMove, describeHit, effectivenessBanner,
  pickOpponents, parseCommand, turnOrder, typesLabel, verdictText,
} from "@/data/pokemonData";
import { useAgentActions } from "@/hooks/useAgent";
import { useAudioActions } from "@/hooks/useAudio";
import { useLevelAudio } from "@/hooks/useLevelAudio";
import { track } from "@/utils/analytics";
import { sfx } from "@/utils/sfx";

const LEVEL = LEVELS[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FRESH_VIEW = { pMood: "confident", oMood: "confident", pAct: "idle", oAct: "idle", pTrig: 0, oTrig: 0 };

export default function Level2Pokemon({ onComplete, onBack, onHome }) {
  const { play, playSequence } = useAudioActions();
  const { say } = useAgentActions();
  const { keepAudio } = useLevelAudio(["level2_intro", "level2_instructions"]);

  const [phase, setPhase] = useState("intro"); // intro | battle | result | won | lost
  const [opponents, setOpponents] = useState([]);
  const [round, setRound] = useState(0);
  const [selMon, setSelMon] = useState(null);
  const [stage, setStage] = useState("pre"); // pre | intro | fight
  const [hpView, setHpView] = useState({ p: 0, o: 0 });
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(true);
  const [turn, setTurn] = useState("select"); // select | player | opponent | over
  const [view, setView] = useState(FRESH_VIEW);
  const [projectile, setProjectile] = useState(null);
  const [impact, setImpact] = useState(null);
  const [floaters, setFloaters] = useState([]);
  const [banner, setBanner] = useState(null);
  const [shake, setShake] = useState({ key: 0, level: "" });
  const [verdict, setVerdict] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);

  // Live values for the async turn runner (state would be stale inside long awaits).
  const hp = useRef({ p: 0, o: 0 });
  const battle = useRef({ mon: null, opp: null });
  const last = useRef({ move: null, res: null });
  const token = useRef(0); // bump to cancel any in-flight animation sequence
  const uid = useRef(0);
  const pending = useRef(null); // attack spoken together with the Pokémon name
  const busyRef = useRef(true); // synchronous guard against double submits
  const paused = useRef(false); // true while the hint overlay is open
  const turnsTaken = useRef(0);
  const logRef = useRef(null);

  const patch = useCallback((o) => setView((v) => ({ ...v, ...(typeof o === "function" ? o(v) : o) })), []);
  const addLog = useCallback((line) => setLog((l) => [...l.slice(-40), line]), []);
  const lock = (v) => { busyRef.current = v; setBusy(v); };
  // Every pause between steps also waits here while the hint overlay is open.
  const wait = async (ms, tok) => {
    await sleep(ms);
    while (paused.current && tok === token.current) await sleep(80);
    return tok === token.current;
  };

  useEffect(() => () => { token.current += 1; }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { paused.current = hintsOpen; }, [hintsOpen]);

  const opponent = opponents[round];

  // -------------------------------------------------------------- flow
  const resetBattleView = (opp) => {
    token.current += 1;
    battle.current = { mon: null, opp };
    hp.current = { p: 0, o: opp.hp };
    last.current = { move: null, res: null };
    pending.current = null;
    turnsTaken.current = 0;
    setSelMon(null);
    setStage("pre");
    setHpView({ p: 0, o: opp.hp });
    setView(FRESH_VIEW);
    setProjectile(null); setImpact(null); setFloaters([]); setBanner(null);
    setVerdict(null); setCelebrate(false);
    setTurn("select");
    lock(true);
    setLog([`A wild ${opp.name} (${typesLabel(opp.types)}) blocks the gate. Choose your Pokémon.`]);
  };

  const startGame = () => {
    sfx.transition();
    const opps = pickOpponents(2);
    setOpponents(opps);
    setRound(0);
    resetBattleView(opps[0]);
    setPhase("battle");
    say("Stuck? Open Hints.", { ms: 4200 });
  };

  const pickMon = async (mon, queuedAttack = null) => {
    if (battle.current.mon || !battle.current.opp) return;
    const tok = ++token.current;
    battle.current.mon = mon;
    hp.current.p = mon.hp;
    pending.current = queuedAttack;
    track("pokemon_pick", { pokemon: mon.id, opponent: battle.current.opp.id, round: round + 1 });
    setSelMon(mon);
    setHpView({ p: mon.hp, o: hp.current.o });
    setStage("intro");
    lock(true);
    patch({ pMood: "confident", oMood: "confident" });
    addLog(`${battle.current.opp.name} enters the arena. Go, ${mon.name}!`);
    sfx.transition();
    play("battle_start");
    if (!(await wait(1700, tok))) return;
    setStage("fight");
    setTurn("select");
    lock(false);
    addLog(`${mon.name} is ready. Pick an attack.`);
    if (pending.current) {
      const m = pending.current;
      pending.current = null;
      doAttack(m);
    }
  };

  const floater = (side, text, tone, big = false) => {
    const id = ++uid.current;
    setFloaters((f) => [...f, { id, side, text, tone, big }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1100);
  };

  // One attack: lunge -> projectile -> impact/damage -> (faint). Returns null if cancelled.
  const perform = async (side, move, tok) => {
    const { mon, opp } = battle.current;
    const atk = side === "player" ? mon : opp;
    const def = side === "player" ? opp : mon;
    const defSide = side === "player" ? "opponent" : "player";
    const aKey = side === "player" ? "p" : "o";
    const dKey = side === "player" ? "o" : "p";
    const res = calcDamage(atk, def, move);
    const meta = TYPE_META[move.type];

    addLog(`${side === "player" ? "Your " : ""}${atk.name} used ${move.name}!`);
    patch((v) => ({ [`${aKey}Act`]: "lunge", [`${aKey}Mood`]: "excited", [`${aKey}Trig`]: v[`${aKey}Trig`] + 1 }));
    if (side === "player") {
      play("attack", { low: true });
      track("pokemon_attack", { pokemon: mon.id, move: move.id, effectiveness: res.effectiveness, round: round + 1 });
    }
    if (!(await wait(230, tok))) return null;

    if (res.missed) {
      floater(defSide, "MISS", "text-slate-300");
      addLog(describeHit(atk.name, move, def, res));
      sfx.wrong();
      if (!(await wait(650, tok))) return null;
      patch({ [`${aKey}Act`]: "idle", [`${aKey}Mood`]: "confident" });
      return { res, fainted: false };
    }

    setProjectile({ key: ++uid.current, from: side, emoji: meta.emoji, color: meta.color });
    if (!(await wait(370, tok))) return null;
    setProjectile(null);

    const eff = res.effectiveness;
    const bn = effectivenessBanner(eff);
    const strength = eff === 0 ? "none" : eff > 1 ? "super" : eff < 1 ? "weak" : "normal";
    setImpact({ key: ++uid.current, target: defSide, strength, color: meta.color });
    if (bn) setBanner({ key: ++uid.current, ...bn });
    setShake({ key: ++uid.current, level: strength === "super" ? "big" : strength === "normal" ? "small" : "" });

    hp.current[dKey] = Math.max(0, hp.current[dKey] - res.damage);
    setHpView({ p: hp.current.p, o: hp.current.o });
    if (res.damage > 0) {
      patch((v) => ({ [`${dKey}Act`]: "hit", [`${dKey}Mood`]: "hurt", [`${dKey}Trig`]: v[`${dKey}Trig`] + 1 }));
      floater(defSide, `-${res.damage}`, strength === "super" ? "text-neon" : "text-blood", strength === "super" || res.crit);
      if (res.crit) setTimeout(() => floater(defSide, "CRITICAL!", "text-volt"), 250);
      if (strength === "super" || res.crit) sfx.crit(); else sfx.hit();
    } else {
      floater(defSide, "NO EFFECT", "text-slate-300");
      sfx.wrong();
    }
    addLog(describeHit(side === "player" ? `Your ${atk.name}` : atk.name, move, def, res));

    if (side === "player") {
      if (eff > 1) { play("super_effective"); say("Super effective!", { ms: 1800, mood: "excited" }); }
      else if (eff > 0 && eff < 1) play("not_very_effective");
    } else if (res.damage > 0) {
      play("damage", { low: true });
    }

    if (!(await wait(strength === "super" ? 900 : 680, tok))) return null;
    setImpact(null);
    setBanner(null);

    const fainted = hp.current[dKey] <= 0;
    if (fainted) {
      patch({ [`${dKey}Act`]: "faint", [`${dKey}Mood`]: "defeated", [`${aKey}Act`]: "idle", [`${aKey}Mood`]: "celebrating" });
      addLog(`${def.name} fainted!`);
      play("faint");
      if (!(await wait(950, tok))) return null;
    } else {
      const low = hp.current[dKey] / def.hp < 0.3;
      patch({ [`${dKey}Act`]: "idle", [`${dKey}Mood`]: low ? "worried" : "confident", [`${aKey}Act`]: "idle", [`${aKey}Mood`]: "confident" });
    }
    return { res, fainted };
  };

  const finishRound = (playerWon) => {
    const { mon, opp } = battle.current;
    const l = last.current;
    setTurn("over");
    lock(true);
    track("battle_result", { won: playerWon, pokemon: mon.id, opponent: opp.id, round: round + 1, turns: turnsTaken.current });
    setVerdict({ won: playerWon, text: verdictText(mon, l.move, opp, l.res, playerWon) });
    if (playerWon) {
      patch({ pMood: "celebrating", pAct: "idle", oAct: "faint" });
      setCelebrate(true);
      sfx.win();
      if (round === 1) onComplete(2); // saved immediately, even if the visitor never presses the button
    } else {
      patch({ pMood: "defeated", pAct: "faint", oMood: "celebrating", oAct: "idle" });
      sfx.fail();
    }
    setPhase("result");
  };

  const doAttack = async (move) => {
    const { mon, opp } = battle.current;
    if (busyRef.current || paused.current) return; // one attack at a time, none while Hints is open
    if (!mon || !opp || hp.current.p <= 0 || hp.current.o <= 0) return;
    lock(true);
    const tok = token.current;
    turnsTaken.current += 1;
    const oppMove = chooseOpponentMove(opp, mon);
    const order = turnOrder(mon, move, opp, oppMove);
    for (const who of order) {
      if (hp.current.p <= 0 || hp.current.o <= 0) break;
      setTurn(who);
      const out = await perform(who, who === "player" ? move : oppMove, tok);
      if (!out) return; // cancelled (left the level / new round)
      if (who === "player") last.current = { move, res: out.res };
      if (out.fainted) break;
    }
    if (hp.current.o <= 0) return finishRound(true);
    if (hp.current.p <= 0) return finishRound(false);
    setTurn("select");
    lock(false);
  };

  const afterResult = () => {
    if (!verdict) return;
    if (!verdict.won) {
      setPhase("lost");
      playSequence(["level2_fail"]);
      return;
    }
    if (round === 0) {
      setRound(1);
      resetBattleView(opponents[1]);
      setPhase("battle");
      sfx.unlock();
    } else {
      setPhase("won");
      play("level2_win");
    }
  };

  const handleCommand = (text) => {
    if (phase !== "battle" || paused.current) return;
    const { mon, attack, foreignAttack } = parseCommand(text, battle.current.mon);
    if (!battle.current.mon) {
      if (!mon) { addLog(`Oak: "I don't know that Pokémon. Choose one of your six."`); sfx.wrong(); return; }
      if (attack) pickMon(mon, attack);
      else if (foreignAttack) { pickMon(mon); addLog(`${mon.name} doesn't know ${foreignAttack.name}.`); }
      else pickMon(mon);
      return;
    }
    const cur = battle.current.mon;
    if (busyRef.current) { addLog("Wait for your turn."); sfx.wrong(); return; }
    if (mon && mon.id !== cur.id) { addLog(`${cur.name} is already out. No swapping mid-battle.`); sfx.wrong(); return; }
    if (attack) { doAttack(attack); return; }
    if (foreignAttack) { addLog(`${cur.name} can't use ${foreignAttack.name}. It knows: ${cur.moves.map((m) => m.name).join(", ")}.`); sfx.wrong(); return; }
    addLog(`Name an attack: ${cur.moves.map((m) => m.name).join(", ")}.`);
    sfx.wrong();
  };

  const turnLabel = stage === "pre" ? "CHOOSE YOUR POKÉMON"
    : stage === "intro" ? "BATTLE START"
    : turn === "player" ? "YOUR POKÉMON ATTACKS"
    : turn === "opponent" ? `${battle.current.opp?.name.toUpperCase()} ATTACKS`
    : turn === "over" ? "BATTLE OVER"
    : "YOUR TURN";

  const inBattle = (phase === "battle" || phase === "result") && opponent;

  return (
    <LevelShell level={LEVEL} onBack={onBack} onHome={onHome} onReplayInstructions={() => play("level2_instructions")}>
      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hud-panel-cyan mx-auto max-w-xl rounded-xl p-8 text-center" data-testid="l2-intro-panel">
          <div className="flex justify-center"><CharacterReaction kind="professor" mood="speaking" size={130} /></div>
          <Swords className="mx-auto mt-2 h-7 w-7 text-volt" />
          <h2 className="font-display mt-3 text-xl font-bold text-white">PROFESSOR OAK'S ADMISSION TEST</h2>
          <p className="mt-3 text-sm text-slate-300">Win two battles against random opponents. Pick the right Pokémon and the right attack.</p>
          <button
            data-testid="l2-start-btn"
            onClick={startGame}
            className="mt-6 rounded-md bg-volt px-8 py-3 font-display text-xs font-bold tracking-[0.25em] text-void transition-shadow hover:shadow-[0_0_24px_rgba(0,240,255,0.6)] focus:outline-none focus:ring-2 focus:ring-volt"
          >
            ENTER THE ACADEMY
          </button>
        </motion.div>
      )}

      {inBattle && (
        <div className="mx-auto max-w-6xl space-y-4" data-testid="l2-battle-screen">
          <div className="flex items-center justify-between text-[10px] tracking-[0.3em] text-slate-500" data-testid="l2-round-indicator">
            <span>BATTLE {round + 1} OF 2 {round === 1 && <span className="text-neon">// 1 WIN SECURED</span>}</span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.2em] ${turn === "opponent" ? "border-blood/60 text-blood" : "border-volt/60 text-volt"}`} data-testid="l2-turn-indicator">{turnLabel}</span>
          </div>

          {/* left: hints | centre: battle field | right: controls (stacks on phones) */}
          <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)_300px]">
            <div>
              <button
                type="button"
                onClick={() => { setHintsOpen(true); track("hints_open", {}); }}
                data-testid="hints-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ember/70 bg-ember/10 px-3 py-3 font-display text-xs font-black tracking-[0.2em] text-ember transition-colors hover:bg-ember/20 focus:outline-none focus:ring-2 focus:ring-ember lg:h-32 lg:flex-col lg:px-1"
              >
                <Lightbulb className="h-5 w-5" /> HINTS
              </button>
            </div>

            <div className="min-w-0 space-y-3">
              <BattleArena
                player={selMon}
                opponent={opponent}
                pHp={hpView.p}
                oHp={hpView.o}
                pMood={view.pMood}
                oMood={view.oMood}
                pAct={view.pAct}
                oAct={view.oAct}
                pTrig={view.pTrig}
                oTrig={view.oTrig}
                projectile={projectile}
                impact={impact}
                floaters={floaters}
                banner={banner}
                shake={shake}
                stage={stage}
                celebrate={celebrate}
              />
              <div ref={logRef} className="h-28 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3" data-testid="l2-battle-log" aria-live="polite">
                {log.map((line, i) => (
                  <p key={i} className="mb-1.5 text-[11px] leading-relaxed text-slate-300"><span className="text-volt">▸</span> {line}</p>
                ))}
              </div>
            </div>

            <aside className="min-w-0" data-testid="l2-controls">
              {phase === "battle" && !selMon && (
                <div data-testid="pokemon-select-grid">
                  <div className="mb-2 text-[10px] font-bold tracking-[0.3em] text-volt">CHOOSE YOUR POKÉMON</div>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    {PLAYER_TEAM.map((p) => (
                      <button
                        key={p.id}
                        data-testid={`pokemon-select-${p.id}`}
                        onClick={() => pickMon(p)}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-left transition-colors hover:border-volt focus:outline-none focus:ring-2 focus:ring-volt"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <span aria-label={typesLabel(p.types)}>{p.types.map((t) => TYPE_META[t].emoji).join("")}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>HP {p.hp}</span><span>ATK {p.atk}</span><span>SPD {p.spd}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === "battle" && selMon && (
                <div data-testid="l2-attack-panel">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold tracking-[0.3em] text-volt">{selMon.name.toUpperCase()}'S ATTACKS</div>
                    {busy && stage === "fight" && <div className="text-[10px] tracking-widest text-slate-500">WAIT…</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    {selMon.moves.map((m) => {
                      const meta = TYPE_META[m.type];
                      return (
                        <button
                          key={m.id}
                          disabled={busy || stage !== "fight"}
                          data-testid={`attack-${m.name.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => doAttack(m)}
                          className="rounded-lg border bg-slate-950 p-3 text-left transition-colors hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-neon disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ borderColor: `${meta.color}88` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">{m.name}</span>
                            <span className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>{meta.emoji} {m.type}</span>
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                            <span>PWR {m.power}</span><span>ACC {m.acc}%</span>{m.priority ? <span className="text-volt">FIRST</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-500">Opponent: {opponent.name}, {typesLabel(opponent.types)}</div>
                </div>
              )}

              {phase === "result" && verdict && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} data-testid="l2-verdict" className={`hud-panel rounded-xl p-5 text-center ${verdict.won ? "" : "border-blood/40"}`}>
                  <h3 className={`font-display text-xl font-black ${verdict.won ? "text-neon text-glow-lime" : "text-blood"}`} data-testid="l2-verdict-title">{verdict.won ? "BATTLE WON" : "BATTLE LOST"}</h3>
                  <p className="mt-3 text-xs leading-relaxed text-slate-300" data-testid="l2-verdict-text">{verdict.text}</p>
                  <button
                    data-testid="l2-verdict-continue-btn"
                    onClick={afterResult}
                    className="mt-4 w-full rounded-md bg-volt px-4 py-3 font-display text-xs font-bold tracking-[0.2em] text-void focus:outline-none focus:ring-2 focus:ring-volt"
                  >
                    {verdict.won ? (round === 0 ? "NEXT OPPONENT" : "CLAIM VICTORY") : "CONTINUE"}
                  </button>
                </motion.div>
              )}
            </aside>
          </div>

          {/* bottom: answer input (Wispr Flow or typing) */}
          {phase === "battle" && (
            <VoiceInput
              testId="l2-command"
              accent="volt"
              evalDelay={250}
              disabled={hintsOpen}
              heading="USE WISPR FLOW TO SPEAK YOUR COMMAND"
              subheading='Or type it: "Choose Pikachu and use Thunderbolt".'
              placeholder={selMon ? `e.g. "Use ${selMon.moves[0].name}!"` : 'e.g. "Choose Pikachu and use Thunderbolt"'}
              submitLabel="COMMAND"
              onSubmit={handleCommand}
            />
          )}

          <HintsOverlay open={hintsOpen} onClose={() => setHintsOpen(false)} player={selMon} opponent={opponent} />
        </div>
      )}

      {phase === "won" && (
        <VictoryScreen
          type="victory"
          title="LEVEL COMPLETED"
          unlockText="UNLOCKED: THE MIND DUNGEON"
          message="Two battles, two wins. My builds are open."
          story={NARRATION.level2_story.text}
          onPlayStory={() => play("level2_story")}
          character={<CharacterReaction kind="professor" mood="celebrating" size={120} />}
          continueLabel="OPEN: MY BUILDS"
          onContinue={() => { sfx.unlock(); keepAudio(); play("level2_story"); onBack("builds"); }}
          onReturn={() => onBack()}
        />
      )}

      {phase === "lost" && (
        <VictoryScreen
          type="defeat"
          title="ACADEMY REJECTED"
          message="Oak says: study the type matchups. You'll get two fresh random opponents."
          character={<CharacterReaction kind="professor" mood="disappointed" size={120} />}
          onRetry={() => { setPhase("intro"); playSequence(["level2_instructions"]); }}
          onReturn={() => onBack()}
        />
      )}
    </LevelShell>
  );
}

