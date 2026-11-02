// CENTRAL AUDIO CONFIGURATION
// ---------------------------------------------------------------------------
// Every narration / reaction clip in the game is defined in audioManifest.json
// (id -> file path, caption, purpose). Game components only ever call play("<id>").
//
// To replace a recording, copy your file to  frontend/public/audio/<file>.wav
// (e.g. public/audio/level1/intro.wav). No code changes needed. See README.md:
// "HOW TO ADD MY VOICE RECORDINGS".
//
// Lookup order for each clip (first file that exists wins):
//   <file>.wav  ->  <file>.mp3  ->  <file>.m4a  ->  <file>.ogg  ->  <file>.placeholder.mp3 (AI voice)
// If none exist the game stays fully playable and shows the caption instead.

import manifest from "@/data/audioManifest.json";

export const AUDIO_BASE = "/audio/";

// Order matters: your own recordings beat the AI placeholder.
export const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "ogg"];
export const PLACEHOLDER_SUFFIX = "placeholder.mp3";

export const AUDIO_MANIFEST = manifest;

export const NARRATION = Object.fromEntries(manifest.map((m) => [m.id, m]));

// Ids used by earlier versions of the game (kept so previously saved uploads still resolve).
export const LEGACY_IDS = {
  react_round1: "swiper_approach",
  react_round2: "swiper_approach",
  react_round3: "swiper_approach",
  react_correct: "swiper_repelled",
  react_wrong: "magic_words_hint",
};

export const resolveId = (id) => (NARRATION[id] ? id : LEGACY_IDS[id] || id);

export const getTrack = (id) => {
  const t = NARRATION[resolveId(id)];
  if (!t) return null;
  return { id: t.id, file: t.file, label: t.label, text: t.text, purpose: t.purpose };
};
