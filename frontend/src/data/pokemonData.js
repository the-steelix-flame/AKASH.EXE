// Level 2 battle engine: data + pure rule-based logic (no React in here, so it is unit-testable).

// ---------------------------------------------------------------------------
// TYPE CHART  (attacker -> defender). Source of truth for every damage calculation.
// This is the standard Gen 6+ chart (18 types). Anything not listed is 1x.
// ---------------------------------------------------------------------------
export const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export const TYPE_CHART = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export const TYPE_META = {
  normal:   { emoji: "⚪", color: "#a8a29e" },
  fire:     { emoji: "🔥", color: "#f97316" },
  water:    { emoji: "💧", color: "#38bdf8" },
  electric: { emoji: "⚡", color: "#facc15" },
  grass:    { emoji: "🌱", color: "#4ade80" },
  ice:      { emoji: "❄️", color: "#a5f3fc" },
  fighting: { emoji: "🥊", color: "#ef4444" },
  poison:   { emoji: "☠️", color: "#c084fc" },
  ground:   { emoji: "🟤", color: "#b45309" },
  flying:   { emoji: "🕊️", color: "#93c5fd" },
  psychic:  { emoji: "🔮", color: "#f472b6" },
  bug:      { emoji: "🐛", color: "#a3e635" },
  rock:     { emoji: "🪨", color: "#a8a29e" },
  ghost:    { emoji: "👻", color: "#8b5cf6" },
  dragon:   { emoji: "🐉", color: "#6366f1" },
  dark:     { emoji: "🌑", color: "#64748b" },
  steel:    { emoji: "⚙️", color: "#94a3b8" },
  fairy:    { emoji: "🧚", color: "#f9a8d4" },
};

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const typesLabel = (types) => types.map(cap).join("/");

// Single attack type vs ONE defending type.
export const singleEffectiveness = (attackType, defenderType) => {
  const row = TYPE_CHART[attackType];
  if (!row) return 1;
  return row[defenderType] !== undefined ? row[defenderType] : 1;
};

// Attack type vs a defender with one OR two types: multipliers are multiplied together.
// Water vs Rock/Ground = 2 x 2 = 4x.  Electric vs Water/Ground = 2 x 0 = 0x.
export const effectivenessOf = (attackType, defenderTypes) => {
  const list = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes];
  return list.reduce((m, t) => m * singleEffectiveness(attackType, t), 1);
};

export const effectivenessBreakdown = (attackType, defenderTypes) =>
  defenderTypes.map((t) => ({ type: t, mult: singleEffectiveness(attackType, t) }));

export const fmtMult = (n) => `${n}x`;

// What a battle banner should say for a given multiplier (null = neutral, no banner).
export function effectivenessBanner(eff) {
  if (eff === 0) return { kind: "none", text: "IT HAD NO EFFECT!" };
  if (eff > 1) return { kind: "super", text: `SUPER EFFECTIVE! ${fmtMult(eff)} DAMAGE` };
  if (eff < 1) return { kind: "weak", text: `NOT VERY EFFECTIVE! ${fmtMult(eff)} DAMAGE` };
  return null;
}

// Human explanation that always matches the real calculation.
export function explainEffectiveness(move, defender, eff) {
  const parts = effectivenessBreakdown(move.type, defender.types)
    .map((b) => `${cap(b.type)} ${fmtMult(b.mult)}`)
    .join(" × ");
  const total = defender.types.length > 1 ? ` = ${fmtMult(eff)}` : "";
  return `${cap(move.type)} vs ${typesLabel(defender.types)}: ${parts}${total}`;
}

// What a type is good/bad against, derived from the chart (used by the tap-a-type cheat sheet).
export function typeRelations(type) {
  const strongAgainst = TYPES.filter((d) => singleEffectiveness(type, d) > 1);
  const weakAgainst = TYPES.filter((d) => singleEffectiveness(type, d) < 1 && singleEffectiveness(type, d) > 0);
  const noEffectOn = TYPES.filter((d) => singleEffectiveness(type, d) === 0);
  const weakTo = TYPES.filter((a) => singleEffectiveness(a, type) > 1);
  const resists = TYPES.filter((a) => singleEffectiveness(a, type) < 1 && singleEffectiveness(a, type) > 0);
  const immuneTo = TYPES.filter((a) => singleEffectiveness(a, type) === 0);
  return { strongAgainst, weakAgainst, noEffectOn, weakTo, resists, immuneTo };
}

// The compact subset shown in the always-visible cheat sheet (the engine uses the full chart).
export const CHEAT_SHEET = [
  ["water", "fire"], ["electric", "water"], ["grass", "water"], ["fire", "grass"],
  ["ground", "electric"], ["water", "ground"], ["grass", "ground"], ["electric", "flying"],
  ["ice", "flying"], ["fighting", "normal"], ["ghost", "psychic"], ["psychic", "fighting"], ["rock", "flying"],
];

// ---------------------------------------------------------------------------
// MOVES
// ---------------------------------------------------------------------------
export const MOVES = {
  thunderbolt:  { id: "thunderbolt",  name: "Thunderbolt",  type: "electric", power: 90,  acc: 100, note: "Reliable electric blast" },
  thunder:      { id: "thunder",      name: "Thunder",      type: "electric", power: 110, acc: 70,  note: "Huge power, risky aim" },
  quick_attack: { id: "quick_attack", name: "Quick Attack", type: "normal",   power: 40,  acc: 100, priority: 1, note: "Always strikes first" },
  iron_tail:    { id: "iron_tail",    name: "Iron Tail",    type: "steel",    power: 100, acc: 75,  note: "Heavy steel swing" },
  flamethrower: { id: "flamethrower", name: "Flamethrower", type: "fire",     power: 90,  acc: 100, note: "Reliable fire blast" },
  air_slash:    { id: "air_slash",    name: "Air Slash",    type: "flying",   power: 75,  acc: 95,  note: "Cutting wind" },
  dragon_claw:  { id: "dragon_claw",  name: "Dragon Claw",  type: "dragon",   power: 80,  acc: 100, note: "Dragon coverage" },
  focus_blast:  { id: "focus_blast",  name: "Focus Blast",  type: "fighting", power: 120, acc: 70,  note: "Massive but unreliable" },
  razor_leaf:   { id: "razor_leaf",   name: "Razor Leaf",   type: "grass",    power: 75,  acc: 95,  note: "Sharp leaves" },
  vine_whip:    { id: "vine_whip",    name: "Vine Whip",    type: "grass",    power: 60,  acc: 100, note: "Never misses" },
  sludge_bomb:  { id: "sludge_bomb",  name: "Sludge Bomb",  type: "poison",   power: 90,  acc: 100, note: "Toxic blast" },
  body_slam:    { id: "body_slam",    name: "Body Slam",    type: "normal",   power: 85,  acc: 100, note: "Neutral fallback" },
  aqua_tail:    { id: "aqua_tail",    name: "Aqua Tail",    type: "water",    power: 90,  acc: 90,  note: "Crashing wave" },
  water_gun:    { id: "water_gun",    name: "Water Gun",    type: "water",    power: 60,  acc: 100, note: "Light but accurate" },
  bite:         { id: "bite",         name: "Bite",         type: "dark",     power: 60,  acc: 100, note: "Dark coverage" },
  ice_beam:     { id: "ice_beam",     name: "Ice Beam",     type: "ice",      power: 90,  acc: 100, note: "Freezing beam" },
  brave_bird:   { id: "brave_bird",   name: "Brave Bird",   type: "flying",   power: 110, acc: 90,  note: "Dive-bomb" },
  wing_attack:  { id: "wing_attack",  name: "Wing Attack",  type: "flying",   power: 60,  acc: 100, note: "Steady strike" },
  heat_wave:    { id: "heat_wave",    name: "Heat Wave",    type: "fire",     power: 95,  acc: 90,  note: "Scorching gust" },
  shadow_ball:  { id: "shadow_ball",  name: "Shadow Ball",  type: "ghost",    power: 80,  acc: 100, note: "Spectral orb" },
  dark_pulse:   { id: "dark_pulse",   name: "Dark Pulse",   type: "dark",     power: 80,  acc: 100, note: "Dark shockwave" },
  rock_throw:   { id: "rock_throw",   name: "Rock Throw",   type: "rock",     power: 60,  acc: 95,  note: "Flung boulder" },
  rock_slide:   { id: "rock_slide",   name: "Rock Slide",   type: "rock",     power: 75,  acc: 90,  note: "Avalanche" },
  earthquake:   { id: "earthquake",   name: "Earthquake",   type: "ground",   power: 90,  acc: 100, note: "Shakes the ground" },
  cross_chop:   { id: "cross_chop",   name: "Cross Chop",   type: "fighting", power: 100, acc: 80,  note: "Brutal double chop" },
  karate_chop:  { id: "karate_chop",  name: "Karate Chop",  type: "fighting", power: 60,  acc: 100, note: "Quick chop" },
  psychic:      { id: "psychic",      name: "Psychic",      type: "psychic",  power: 100, acc: 100, note: "Mind crush" },
  psybeam:      { id: "psybeam",      name: "Psybeam",      type: "psychic",  power: 75,  acc: 100, note: "Warping beam" },
};

const mv = (...ids) => ids.map((id) => MOVES[id]);

// ---------------------------------------------------------------------------
// POKÉMON  (types is an array: 1 or 2 types; each has 4 different moves)
// ---------------------------------------------------------------------------
export const PLAYER_TEAM = [
  { id: "pikachu",   name: "Pikachu",   types: ["electric"],           hp: 100, atk: 60, def: 45, spd: 95,  moves: mv("thunderbolt", "thunder", "quick_attack", "iron_tail") },
  { id: "charizard", name: "Charizard", types: ["fire", "flying"],     hp: 120, atk: 70, def: 55, spd: 85,  moves: mv("flamethrower", "air_slash", "dragon_claw", "focus_blast") },
  { id: "bulbasaur", name: "Bulbasaur", types: ["grass", "poison"],    hp: 115, atk: 55, def: 60, spd: 50,  moves: mv("razor_leaf", "vine_whip", "sludge_bomb", "body_slam") },
  { id: "squirtle",  name: "Squirtle",  types: ["water"],              hp: 110, atk: 55, def: 65, spd: 45,  moves: mv("aqua_tail", "water_gun", "bite", "ice_beam") },
  { id: "pidgeot",   name: "Pidgeot",   types: ["normal", "flying"],   hp: 105, atk: 65, def: 50, spd: 100, moves: mv("brave_bird", "wing_attack", "quick_attack", "heat_wave") },
  { id: "gengar",    name: "Gengar",    types: ["ghost", "poison"],    hp: 95,  atk: 75, def: 45, spd: 110, moves: mv("shadow_ball", "dark_pulse", "sludge_bomb", "thunderbolt") },
];

export const OPPONENTS = [
  { id: "onix",     name: "Onix",     types: ["rock", "ground"],   hp: 140, atk: 55, def: 90,  spd: 30,  moves: mv("rock_throw", "earthquake", "iron_tail", "body_slam") },
  { id: "vaporeon", name: "Vaporeon", types: ["water"],            hp: 150, atk: 60, def: 60,  spd: 40,  moves: mv("water_gun", "aqua_tail", "ice_beam", "quick_attack") },
  { id: "jolteon",  name: "Jolteon",  types: ["electric"],         hp: 95,  atk: 65, def: 45,  spd: 110, moves: mv("thunderbolt", "quick_attack", "shadow_ball", "bite") },
  { id: "flareon",  name: "Flareon",  types: ["fire"],             hp: 110, atk: 85, def: 55,  spd: 55,  moves: mv("flamethrower", "bite", "quick_attack", "body_slam") },
  { id: "machamp",  name: "Machamp",  types: ["fighting"],         hp: 130, atk: 90, def: 60,  spd: 45,  moves: mv("cross_chop", "karate_chop", "rock_slide", "earthquake") },
  { id: "alakazam", name: "Alakazam", types: ["psychic"],          hp: 90,  atk: 80, def: 40,  spd: 120, moves: mv("psychic", "psybeam", "shadow_ball", "focus_blast") },
  { id: "golem",    name: "Golem",    types: ["rock", "ground"],   hp: 120, atk: 80, def: 100, spd: 35,  moves: mv("earthquake", "rock_slide", "rock_throw", "body_slam") },
  { id: "lapras",   name: "Lapras",   types: ["water", "ice"],     hp: 150, atk: 60, def: 75,  spd: 35,  moves: mv("ice_beam", "water_gun", "body_slam", "thunderbolt") },
  { id: "arcanine", name: "Arcanine", types: ["fire"],             hp: 125, atk: 85, def: 60,  spd: 95,  moves: mv("flamethrower", "bite", "quick_attack", "body_slam") },
  { id: "venusaur", name: "Venusaur", types: ["grass", "poison"],  hp: 125, atk: 65, def: 70,  spd: 60,  moves: mv("razor_leaf", "sludge_bomb", "vine_whip", "body_slam") },
];

export function pickOpponents(count = 2, rng = Math.random) {
  const pool = [...OPPONENTS];
  const picked = [];
  while (picked.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// DAMAGE
//   base   = (power x attack / defence) x 0.12 + 3   (tuned by simulation: 3-5 turn battles)
//   damage = base x STAB(1.5) x TYPE(0 / .25 / .5 / 1 / 2 / 4) x crit(1.5) x random(.85-1)
// rng is injectable so tests are deterministic.
// ---------------------------------------------------------------------------
export function calcDamage(attacker, defender, move, rng = Math.random) {
  const effectiveness = effectivenessOf(move.type, defender.types);
  if (rng() * 100 >= move.acc) {
    return { missed: true, damage: 0, effectiveness, stab: false, crit: false };
  }
  if (effectiveness === 0) {
    return { missed: false, damage: 0, effectiveness: 0, stab: false, crit: false };
  }
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const crit = rng() < 0.0625 ? 1.5 : 1;
  const variance = 0.85 + rng() * 0.15;
  const base = ((move.power * attacker.atk) / defender.def) * 0.12 + 3;
  const damage = Math.max(1, Math.round(base * stab * effectiveness * crit * variance));
  return { missed: false, damage, effectiveness, stab: stab > 1, crit: crit > 1 };
}

// Expected damage with no randomness: used by the opponent to choose a move and by tests.
export function expectedDamage(attacker, defender, move) {
  const eff = effectivenessOf(move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const base = ((move.power * attacker.atk) / defender.def) * 0.12 + 3;
  return base * stab * eff * (move.acc / 100);
}

// Opponent AI: usually picks its best move (so type matchups genuinely matter), sometimes not.
export function chooseOpponentMove(attacker, defender, rng = Math.random) {
  const ranked = [...attacker.moves].sort((a, b) => expectedDamage(attacker, defender, b) - expectedDamage(attacker, defender, a));
  if (rng() < 0.75) return ranked[0];
  const useful = ranked.filter((m) => effectivenessOf(m.type, defender.types) > 0);
  const pool = useful.length ? useful : ranked;
  return pool[Math.floor(rng() * pool.length)];
}

// Who acts first: move priority, then speed (ties go to the player).
export function turnOrder(player, playerMove, opponent, opponentMove) {
  const pp = playerMove.priority || 0;
  const op = opponentMove.priority || 0;
  if (pp !== op) return pp > op ? ["player", "opponent"] : ["opponent", "player"];
  return player.spd >= opponent.spd ? ["player", "opponent"] : ["opponent", "player"];
}

export function describeHit(attackerName, move, defender, result) {
  if (result.missed) return `${attackerName}'s ${move.name} missed!`;
  const bits = [`${attackerName} used ${move.name}.`];
  const banner = effectivenessBanner(result.effectiveness);
  if (banner) bits.push(`${banner.text}`, `(${explainEffectiveness(move, defender, result.effectiveness)})`);
  if (result.damage > 0) bits.push(`${result.damage} damage to ${defender.name}.`);
  if (result.stab) bits.push("Same-type attack bonus.");
  if (result.crit) bits.push("A critical hit!");
  return bits.join(" ");
}

export function verdictText(playerMon, playerMove, opponent, result, playerWon) {
  if (!playerMove || !result) {
    return playerWon ? `Your ${playerMon.name} defeated ${opponent.name}.` : `${opponent.name} outlasted your ${playerMon.name}.`;
  }
  const eff = result.effectiveness;
  const how = `${cap(playerMove.type)}-type ${playerMove.name} against ${typesLabel(opponent.types)} was ${fmtMult(eff)}`;
  if (playerWon) {
    const why = eff > 1 ? "Type advantage decided the battle." : eff < 1 ? "You won even though the type matchup was against you." : "A neutral matchup, won on stats and nerve.";
    return `Your ${playerMon.name} defeated ${opponent.name}. Final blow: ${how}. ${why}`;
  }
  return `${opponent.name} outlasted your ${playerMon.name}. Your last attack: ${how}. A different Pokémon or move could flip this battle.`;
}

// "Choose Pikachu and use Thunderbolt" -> { mon, attack, foreignAttack }
const norm = (s) => " " + s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ") + " ";
export function parseCommand(input, activeMon = null) {
  const t = norm(input);
  let mon = null;
  for (const p of PLAYER_TEAM) {
    if (t.includes(" " + p.name.toLowerCase())) { mon = p; break; }
  }
  const subject = mon || activeMon;
  let attack = null;
  if (subject) attack = subject.moves.find((m) => t.includes(" " + m.name.toLowerCase())) || null;
  let foreignAttack = null;
  if (!attack) {
    const all = PLAYER_TEAM.flatMap((p) => p.moves);
    foreignAttack = all.find((m) => t.includes(" " + m.name.toLowerCase())) || null;
  }
  return { mon, attack, foreignAttack };
}
