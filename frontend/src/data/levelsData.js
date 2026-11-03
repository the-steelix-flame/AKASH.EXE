// Space map / level metadata.

export const LEVELS = [
  {
    n: 1,
    space: "THE ORIGIN SPACE",
    game: "SWIPER'S CHALLENGE",
    section: "KNOW ME",
    sectionKey: "knowme",
    theme: "Cyber-jungle memory heist",
    description: "Swiper is stealing three memories. Stop him with the magic words, find what he hid, then follow the map.",
    difficulty: 1,
    accent: "neon",
  },
  {
    n: 2,
    space: "THE BUILDER'S ARENA",
    game: "PROFESSOR OAK'S BATTLE ACADEMY",
    section: "MY BUILDS",
    sectionKey: "builds",
    theme: "Turn-based battle academy",
    description: "Two Pokémon battles. Pick the right Pokémon and attack for the type matchup.",
    difficulty: 2,
    accent: "volt",
  },
  {
    n: 3,
    space: "THE MIND DUNGEON",
    game: "THE SHINOBI STRATEGY TRIAL",
    section: "HOW I THINK",
    sectionKey: "mind",
    theme: "Ninja strategy mission",
    description: "Plan a break-in, spend 100 chakra, then adapt when it goes wrong.",
    difficulty: 3,
    accent: "aura",
  },
  {
    n: 4,
    space: "THE GROWTH KINGDOM",
    game: "THE 100K KAMEHAMEHA",
    section: "WISPR FLOW PITCH",
    sectionKey: "growth",
    theme: "Growth marketing simulator",
    description: "₹1,00,000, 30 days, 100,000 people. Pick an audience, split the budget, handle a twist, pitch.",
    difficulty: 4,
    accent: "ember",
  },
];

// Where each level's marker sits on the illustrated space map (percent of the map box).
export const MAP_POSITIONS = {
  1: { x: 24, y: 20.8, territory: "ORIGIN JUNGLE" },
  2: { x: 74, y: 43.3, territory: "BUILDER'S ARENA" },
  3: { x: 26, y: 70, territory: "MIND DUNGEON" },
  4: { x: 73, y: 90, territory: "GROWTH KINGDOM" },
};

export const DIFFICULTY_LABELS = ["ROOKIE", "ADEPT", "ELITE", "LEGENDARY"];
