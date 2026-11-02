// Level 4: growth simulator + the real Wispr Flow India proposal.
// All scoring is deterministic JavaScript. Campaign figures are simulated, never real Wispr Flow data.

export const AUDIENCES = [
  { id: "students", name: "College students", why: "They write all day and spread tools fast. Win one campus and word of mouth does the rest." },
  { id: "developers", name: "Software developers", why: "They type all day and trust what they see working. Their public workflows become proof for everyone else." },
  { id: "creators", name: "Content creators", why: "They think out loud for a living. Every creator showing the workflow on camera is a demo with an audience." },
  { id: "professionals", name: "Working professionals", why: "Email and reports eat their hours, so the payoff is clear. But they need trust before they change habits." },
  { id: "founders", name: "Startup founders", why: "Few in number, big in influence. One vocal founder normalises a tool across a whole circle." },
];

export const CAMPAIGNS = [
  { id: "campus", name: "Campus Ambassador Programme", hint: "Student leaders run challenges on their own campuses." },
  { id: "regional", name: "Regional Language Creator Campaign", hint: "Creators show voice-first work in their own language." },
  { id: "reels", name: "Instagram Reels Challenge", hint: "Typing vs speaking the same task, side by side." },
  { id: "dev", name: "Developer Community Activation", hint: "Meetups and Discord demos with hackable workflows." },
  { id: "referral", name: "Referral Programme", hint: "Users challenge friends; activated referrals earn rewards." },
  { id: "productivity", name: "Productivity Challenge", hint: "Seven public days of replacing typing tasks with voice." },
  { id: "hackathon", name: "College Hackathon Activation", hint: "Sponsor hackathons and spotlight voice-first builds." },
];

export const BUDGET_TOTAL = 100000; // ₹1,00,000
export const BUDGET_MIN_SPEND = 50000;

// Each twist has three structured responses. points: best 100, partial 60, poor 20.
export const TWIST_EVENTS = [
  {
    id: "low-engagement", title: "LOW ENGAGEMENT",
    body: "Day 10: your biggest-budget campaign gets impressions but almost no engagement. People scroll past.",
    options: [
      { id: "a", title: "Test new creatives and move budget to what works", body: "Keep the channel, change the message, and fund the winners.", points: 100, why: "Right. Diagnose the message before you abandon the channel, and follow the data." },
      { id: "b", title: "Double the spend to get more reach", body: "More impressions will fix it.", points: 20, why: "More reach on a message nobody reacts to just burns budget faster." },
      { id: "c", title: "Pause it and wait a week", body: "See if it improves by itself.", points: 60, why: "Pausing stops the waste, but with 30 days you can't afford a week of doing nothing." },
    ],
  },
  {
    id: "influencer-dropout", title: "INFLUENCER DROPOUT",
    body: "Day 12: the anchor creator for one campaign just signed with a competitor. Launch is in 5 days.",
    options: [
      { id: "a", title: "Move to your campus ambassadors and smaller creators", body: "Spread the launch across several voices.", points: 100, why: "Right. Several smaller voices are a safer launch than one anchor you can lose." },
      { id: "b", title: "Chase a bigger creator at any price", body: "Replace like for like.", points: 60, why: "It can work, but paying a premium at the last minute puts you in a weak position." },
      { id: "c", title: "Cancel the launch", body: "Not worth the risk.", points: 20, why: "Cancelling gives away the whole campaign window for one lost partner." },
    ],
  },
  {
    id: "competitor", title: "COMPETITOR STRIKES",
    body: "Day 14: a rival launches a lookalike campus challenge with a bigger prize pool. Yours starts next week.",
    options: [
      { id: "a", title: "Lean into what they can't copy: real campus ambassadors and your own format", body: "Don't match the prize pool.", points: 100, why: "Right. You can't outspend them, so compete on people and a format they don't own." },
      { id: "b", title: "Match their prize pool", body: "Spend whatever it takes.", points: 20, why: "A prize race spends your whole budget on a fight you're likely to lose." },
      { id: "c", title: "Launch earlier with a smaller version", body: "Be first, be lean.", points: 60, why: "Speed helps, but a rushed smaller launch can look weaker next to theirs." },
    ],
  },
  {
    id: "regional-traction", title: "UNEXPECTED TRACTION",
    body: "Day 9: a regional-language creator you barely funded is pulling 10x the engagement of everything else.",
    options: [
      { id: "a", title: "Shift budget to them and brief more creators in that language", body: "Follow the signal.", points: 100, why: "Right. Strong early signal is exactly what you reallocate toward, and you can repeat it." },
      { id: "b", title: "Leave the plan alone", body: "Stick to the original split.", points: 20, why: "Ignoring a 10x signal because of a spreadsheet is how campaigns miss their best channel." },
      { id: "c", title: "Fund that one creator heavily and cut everything else", body: "Go all in.", points: 60, why: "Good instinct, but one creator is a single point of failure. Spread the bet." },
    ],
  },
  {
    id: "retention-dip", title: "RETENTION DIP",
    body: "Day 15: sign-ups look great, but most new users try dictation once and never return.",
    options: [
      { id: "a", title: "Fix onboarding and push the 7-day challenge to bring them back", body: "Get them to a second and third use.", points: 100, why: "Right. The problem is after sign-up, so fix the first week, not the top of the funnel." },
      { id: "b", title: "Buy more sign-ups", body: "Bigger numbers hide it.", points: 20, why: "More sign-ups into a leaky funnel just makes the leak bigger." },
      { id: "c", title: "Send a reminder email to everyone", body: "A nudge might do it.", points: 60, why: "A reminder helps a little, but without a reason to come back it won't fix the habit." },
    ],
  },
];

export const PITCH_PROMPT = "30 seconds. Convince Indian students to try Wispr Flow.";
export const PITCH_EXAMPLE = "Stop typing your assignments. Start speaking them.";
export const PITCH_PASS_SCORE = 60;

// Build the pitch from four cards. Max 100 points.
export const PITCH_DECKS = [
  {
    id: "hook", label: "OPENING HOOK", max: 25,
    options: [
      { id: "stop", title: "“Stop typing your assignments.”", points: 25, why: "A direct line that interrupts the scroll." },
      { id: "imagine", title: "“Imagine finishing your notes in half the time.”", points: 25, why: "Gives a picture they want." },
      { id: "tool", title: "“Wispr Flow is a dictation tool.”", points: 5, why: "Describes the product, not why a student should care." },
      { id: "hello", title: "“Hello students, please try our app.”", points: 0, why: "Nothing here makes anyone stop." },
    ],
  },
  {
    id: "audience", label: "WHO IT'S FOR", max: 20,
    options: [
      { id: "specific", title: "“Every assignment, project report and email to a professor.”", points: 20, why: "Specific student moments." },
      { id: "generic", title: "“For busy people everywhere.”", points: 8, why: "True of everyone, so it speaks to no one." },
      { id: "devs", title: "“For developers who type all day.”", points: 4, why: "Wrong audience for this pitch." },
    ],
  },
  {
    id: "promise", label: "THE PROMISE", max: 30,
    options: [
      { id: "clean", title: "“Speak it, get clean text in seconds. Type less, say more.”", points: 30, why: "A clear, concrete benefit." },
      { id: "faster", title: "“You speak faster than you type, so you save time.”", points: 22, why: "True and useful, but less vivid." },
      { id: "ai", title: "“It's powered by advanced AI technology.”", points: 5, why: "Says how, not why anyone should care." },
    ],
  },
  {
    id: "cta", label: "CALL TO ACTION", max: 25,
    options: [
      { id: "challenge", title: "“Join the 7-day Speak Challenge and tag three friends.”", points: 25, why: "A clear next step that also recruits." },
      { id: "download", title: "“Download it today.”", points: 15, why: "Clear, but no reason to share it." },
      { id: "think", title: "“Think about it.”", points: 0, why: "Not an action." },
    ],
  },
];

export function scorePitchPicks(picks) {
  const checks = PITCH_DECKS.map((d) => {
    const o = d.options.find((x) => x.id === picks[d.id]);
    return { label: d.label, pass: !!o && o.points >= d.max * 0.8, pts: o ? o.points : 0, max: d.max, why: o ? o.why : "" };
  });
  return { score: checks.reduce((s, c) => s + c.pts, 0), checks };
}

export function buildPitch(picks) {
  return PITCH_DECKS.map((d) => d.options.find((x) => x.id === picks[d.id])?.title.replace(/[“”]/g, "")).filter(Boolean).join(" ");
}

export const REAL_CAMPAIGN = {
  name: "SPEAK INDIA. PLAY DIFFERENT.",
  message: "India has a billion voices. It's time they all started creating.",
  positioning: "Not a dictation utility: a way for people to turn how they actually talk into written work.",
  pillars: [
    {
      id: "campus", name: "SPEAK YOUR CAMPUS",
      body: "A college challenge: students show how they use voice for assignments, documentation, emails and presentations.",
      details: [
        "One trained ambassador per campus, with a challenge kit and a leaderboard.",
        "Weekly inter-campus rankings; winning campuses get a workshop and ambassador certificates.",
      ],
    },
    {
      id: "languages", name: "INDIA SPEAKS DIFFERENTLY",
      body: "Regional-language creators show voice-first work in the language they think in.",
      details: [
        "Language support has to be checked against what Wispr Flow really handles before anything ships. Creators only demo what it supports.",
        "A Tamil creator demoing in Tamil will convert Tamil audiences better than an English ad.",
      ],
    },
    {
      id: "challenge", name: "THE 7-DAY SPEAK CHALLENGE",
      body: "Replace selected typing tasks with voice for seven days, and document the difference.",
      details: [
        "Before/after videos: the same task, typed vs spoken.",
        "Friend nominations turn every finisher into a recruiter.",
      ],
    },
  ],
  viralLoop: {
    title: "THE SHARE LOOP",
    body: "Finishers get a completion card, 'I completed the Speak India challenge', with a built-in challenge to tag three friends who type too much. Sharing is the reward, not a request.",
  },
  kpis: {
    note: "Proposed metrics. Not Wispr Flow company data.",
    items: [
      { k: "Reach", v: "Impressions across campus and creator content" },
      { k: "First successful dictation", v: "The activation moment: did they speak once?" },
      { k: "D7 / D30 retention", v: "Cohort curves per channel" },
      { k: "Cost per activated user", v: "Budget divided by users who completed a first dictation" },
    ],
  },
  rollout: [
    { week: "WEEK 1", title: "Seed", body: "Onboard ambassadors and creators, build kits and tracking, pilot with 5 to 10 campuses." },
    { week: "WEEK 2", title: "Launch campus", body: "Speak Your Campus goes live with leaderboards. First referral cards ship." },
    { week: "WEEK 3", title: "Regional and UGC", body: "Regional creators launch in verified languages. The 7-day challenge opens to everyone." },
    { week: "WEEK 4", title: "Referral and tune", body: "Referrals peak. Move budget to the lowest cost per activated user." },
  ],
  differentiation: "Influencer marketing rents attention and loses it when the spend stops. This builds things that stay: ambassadors, a recurring challenge, completion cards that turn participants into distribution.",
};
