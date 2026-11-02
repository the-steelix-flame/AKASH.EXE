// Structured answers for Levels 1 and 3. Scoring is plain JavaScript: no LLM, no network.
// points / checks are fixed per option, so the same pick always gives the same result.

// ---------------------------------------------------------------- Level 1: Swiper's riddle
export const L1_RIDDLE = {
  question: "What is one thing you learn by actually building and shipping products?",
  options: [
    { id: "reality", title: "Real users break things your tests never did", body: "People use your work in ways you didn't plan.", points: 2, verdict: "full", why: "Right. Reality is the best test suite." },
    { id: "failure", title: "Every failure turns into the next fix", body: "It breaks, you learn why, you ship the better version.", points: 2, verdict: "full", why: "Right. Learning from a failure and shipping again is the loop." },
    { id: "speed", title: "Shipping early beats polishing forever", body: "Don't wait until it's perfect.", points: 1, verdict: "partial", why: "Partly right. Shipping early helps because of what reality teaches you afterwards." },
    { id: "idea", title: "The idea matters more than the code", body: "Build later, plan more.", points: 0, verdict: "wrong", why: "Not quite. An idea nobody can use teaches you nothing. Building is where you find out what works." },
  ],
};

// ---------------------------------------------------------------- Level 3, stage 1: the plan
// checks follow the same four-point rubric the typed answer is scored against.
export const L3_RUBRIC = [
  "Objective identified (get past guards / enter)",
  "Resource allocation mentioned (clones / tools / team)",
  "Clear action sequence (then / while / after)",
  "Distraction logic (draw guards away, not fight all three)",
];

export const L3_PLANS = [
  {
    id: "clones", title: "Clones on the flanks, I take the gate",
    body: "Two shadow clones pull the left and right guards away while I walk through the main gate.",
    facts: ["You planned to use two shadow clones.", "You planned to distract the left and right guards.", "You planned to enter through the main gate."],
    checks: [true, true, true, true],
    why: "A distraction first, then entry: it uses resources and avoids a three-on-one fight.",
  },
  {
    id: "smoke", title: "Smoke bomb, then the back door",
    body: "Fill the courtyard with smoke and slip in through the back door while the guards cough.",
    facts: ["You planned to use a smoke bomb.", "You planned to enter through the back door."],
    checks: [true, true, true, false],
    why: "A good sequence, but the smoke only hides you. It doesn't pull the guards away.",
  },
  {
    id: "wait", title: "Wait for the shift change",
    body: "Watch the guards, wait until they swap shifts, then walk in.",
    facts: ["You planned to wait for the shift change."],
    checks: [true, false, false, false],
    why: "Safe, but you commit no resources and the moon is setting. There is a deadline.",
  },
  {
    id: "fight", title: "Take all three head-on",
    body: "Three guards, three quick fights, no tricks.",
    facts: ["You planned to fight all three guards."],
    checks: [true, true, false, false],
    why: "One loud fight spends your chakra and trips the alarm. The rubric rewards drawing guards away instead.",
  },
];

export function scorePlanChoice(option) {
  const checks = L3_RUBRIC.map((label, i) => ({ label, pass: option.checks[i], why: option.checks[i] ? "Covered by this plan." : option.why }));
  return { score: option.checks.filter(Boolean).length * 25, checks };
}

// ---------------------------------------------------------------- Level 3, stage 3: the unexpected event
// needs: a resource from stage 2 that this response depends on. If the player didn't keep it, the check fails.
export const L3_ADAPT = {
  clones: [
    { id: "cover", title: "Spend reserve chakra to cover the clone, then keep going", body: "Shield the spotted clone so it can fall back, and still go in by the gate.", ack: true, adapts: true, completes: true, needs: "reserve" },
    { id: "bait", title: "Use the spotted clone as bait", body: "Let the guards chase it east while you enter from the west.", ack: true, adapts: true, completes: true, needs: "clones" },
    { id: "abort", title: "Pull everyone back and abort", body: "Live to fight another night.", ack: true, adapts: true, completes: false, needs: null, uses: true },
    { id: "charge", title: "Ignore it and charge the gate", body: "Speed over stealth.", ack: false, adapts: false, completes: true, needs: null, uses: false },
  ],
  patrol: [
    { id: "gap", title: "Slip through the gap the patrol left behind", body: "They swept east. The west wall is empty for a minute.", ack: true, adapts: true, completes: true, needs: null, uses: true },
    { id: "shield", title: "Take the long route behind your shield", body: "Slower, but a barrier covers you if they turn around.", ack: true, adapts: true, completes: true, needs: "shield" },
    { id: "hold", title: "Hold position on your reserve and wait it out", body: "Keep still until the sweep passes.", ack: true, adapts: true, completes: false, needs: "reserve" },
    { id: "charge", title: "Ignore them and run for the gate", body: "Speed over stealth.", ack: false, adapts: false, completes: true, needs: null, uses: false },
  ],
};

const NEED_TEXT = { reserve: "keep at least 20 chakra in reserve", clones: "bring Shadow Clones", shield: "bring a Defensive Shield" };

// ctx: { reserve: boolean (>=20 chakra unspent), clones: boolean, shield: boolean, left: number }
export function scoreAdaptChoice(option, ctx) {
  const has = option.needs ? !!ctx[option.needs] : option.uses;
  const checks = [
    { label: "Acknowledges what changed (detected / blocked / timer)", pass: option.ack, why: option.ack ? "You responded to the new situation." : "This ignores what just happened." },
    { label: "Adapts the original plan (new route / role swap / reserve)", pass: option.adapts, why: option.adapts ? "The plan changes." : "The plan stays exactly the same." },
    { label: "Still completes the objective (get in / finish mission)", pass: option.completes, why: option.completes ? "You still get in." : "The mission ends here." },
    {
      label: `Uses what you actually kept (you have ${ctx.left} chakra unspent)`,
      pass: has,
      why: has ? "You had what this needs." : option.needs ? `This needed you to ${NEED_TEXT[option.needs]}, and you didn't.` : "No real resource behind it.",
    },
  ];
  return { score: checks.filter((c) => c.pass).length * 25, checks };
}
