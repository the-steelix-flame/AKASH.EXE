// Text normalisation + lightweight rule-based evaluation helpers.

export const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Accepts "Swiper no swiping", "Swiper, no swiping!", casing/punctuation variants,
// and common STT slips like "wiper no swiping" / "no swiping swiper".
export const isSwiperPhrase = (input) => {
  const t = normalize(input);
  if (!t) return false;
  const hasSwiper = /swiper|swipper|swyper|wiper/.test(t);
  const hasNo = /\bno\b|\bdon t\b|\bdont\b|\bstop\b/.test(t);
  const hasSwiping = /swip/.test(t);
  return hasSwiper && hasNo && hasSwiping;
};

export const wordCount = (s) => normalize(s).split(" ").filter(Boolean).length;

export const hasAny = (text, keywords) => {
  const t = " " + normalize(text) + " ";
  return keywords.some((k) => t.includes(" " + normalize(k)));
};

// First keyword that appears in the text (or null). Lets evaluators explain *what* they matched.
export const findAny = (text, keywords) => {
  const t = " " + normalize(text) + " ";
  return keywords.find((k) => t.includes(" " + normalize(k))) || null;
};

// Generic relevance scorer: rewards length + domain keywords. Transparent by design.
export function relevanceScore(text, keywordGroups, minWords = 8) {
  const wc = wordCount(text);
  const hits = keywordGroups.map((g) => hasAny(text, g.words));
  const groupScore = keywordGroups.length
    ? (hits.filter(Boolean).length / keywordGroups.length) * 70
    : 70;
  const lengthScore = Math.min(wc / minWords, 1) * 30;
  return {
    score: Math.round(groupScore + lengthScore),
    wc,
    groupHits: hits,
    groups: keywordGroups.map((g) => g.label),
  };
}
