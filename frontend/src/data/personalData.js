// Personal content. Source of truth: Akash-Kumar-Project-Bank.pdf and Akash's own Chronos write-up.
// If it isn't in those, it isn't here. Open items are listed in the README ("Content to confirm").

export const PROFILE = {
  name: "Akash Kumar",
  location: "Kolkata, India",
  github: "https://github.com/the-steelix-flame",
  linkedin: "https://www.linkedin.com/in/ak-a-sh/",
  leetcode: "https://leetcode.com/u/mee_akash/",
};

export const HERO = {
  title: "AKASH.EXE",
  campaign: "THE GROWTH QUEST",
  tagline: "I build AI systems and the software around them.",
  opening: "Skip the resume. Play it.",
};

export const KNOW_ME_FACTS = [
  "B.Tech CSE, Heritage Institute of Technology, Kolkata (2027)",
  "CGPA 8.50 / 10",
  "AI Engineer intern, IntelGrader",
  "LeetCode contest rating 1800+",
];

export const TIMELINE = [
  {
    id: "education",
    tag: "EDUCATION",
    title: "Heritage Institute of Technology",
    sub: "B.Tech, Computer Science · Kolkata · graduating June 2027",
    body: "CGPA 8.50 out of 10 (8.06, 8.51 and 8.94 by year).",
  },
  {
    id: "experience",
    tag: "EXPERIENCE",
    title: "AI Engineer intern, IntelGrader",
    sub: "Jun 2026 to Aug 2026",
    items: [
      "Built a text-to-video pipeline: one click makes a narrated 2D educational video on any topic, from validated JSON scene plans, local TTS (Kokoro), word-synced captions and Remotion rendering.",
      "Shipped full-stack features to client production environments across several repositories, and contributed to core architecture decisions.",
      "Used Claude Code, Antigravity and Codex to move faster while owning the architecture and reviewing what they generated.",
    ],
  },
  {
    id: "hackathons",
    tag: "HACKATHONS",
    title: "Built under a deadline",
    items: [
      "Odoo Hackathon finals: 35th of 800 selected teams (DealFlow360).",
      "Odoo nomination round: 48th of 5,000+ teams (AssetFlow).",
      "Smart India Hackathon 2026: top-50 nomination (Kalakriti).",
      "FLUXUS, IIT Indore: finalist among 1,000+ (FacE-RecO).",
      "Vibe2Ship: Community Hero (Nivaran).",
      "Hack Heritage: 3.0 runner-up (Symbiosis), 4.0 (Kalakriti).",
    ],
  },
  {
    id: "stack",
    tag: "TOOLS",
    title: "What I've actually shipped with",
    body: "Python in most projects. FastAPI, Django Ninja and Node on the backend; Next.js and React on the front, React Native for Kalakriti. Postgres with pgvector, SQLite, Firestore. PPO with Stable-Baselines3, RAG with ChromaDB, OpenCV, Gemini.",
  },
  {
    id: "next",
    tag: "FIT",
    title: "Roles my projects fit",
    body: "AI and agentic engineering, ML and reinforcement learning, backend and full-stack, fintech and payments.",
  },
];

// Level 3 reward: the hardest problem, in Akash's own account.
export const HARDEST_PROBLEM = {
  project: "CHRONOS",
  title: "Four of six inputs were stuck at the clip limit",
  intro: "Chronos is a market simulator for backtesting trading strategies. User strategies trade against an order book populated by AI agents. My part was the agents and the backend design.",
  trained: [
    "A market maker that quotes bid and ask offsets and size. Reward: P&L minus a squared inventory penalty.",
    "A directional 'smart money' agent with a hysteresis band, a drawdown penalty and an end-of-day flatten.",
  ],
  trainedNote: "Both are PPO policies (Stable-Baselines3) trained on about a million rows of 1-minute SPY data.",
  symptom: "In deployment the agents behaved identically and all drifted to the same short position. No errors anywhere.",
  method: "I loaded the saved VecNormalize statistics and recomputed what the model saw on a live tick. Four of the six inputs were pinned at the ±10 clip.",
  causes: [
    "A tick size that put volatility 160 standard deviations out of range.",
    "An RSI feature that was never computed in training.",
    "One observation slot meant return in training but position when live.",
    "A reward that penalised inventory the agent could not see.",
  ],
  fixes: [
    "Price bands for the tick size and position caps.",
    "Aligned the observation between training and live.",
    "Removed a fake regime generator: the engine was deciding price direction instead of the participants.",
  ],
  next: "Next: retraining with one shared observation function, and an Avellaneda–Stoikov baseline to beat.",
};

// Level 3 reward: decisions I'd defend. All from the Project Bank's interview notes.
export const DECISIONS = [
  { project: "CHRONOS", title: "Replay beats guessing", body: "With 99 agents, the only way to debug a strange price is to replay it. So the matching core is single-threaded and seeded." },
  { project: "CHRONOS", title: "Impact can't be a constant", body: "An earlier fudge factor wiped the book past 50k shares. Now a large order moves the price because the levels it eats are gone." },
  { project: "KALAKRITI", title: "Compliance sits on the cluster", body: "An artisan has no GSTIN, so the cluster owner becomes seller of record. One decision that shaped the whole system. And the wallet balance is a cache: the transaction rows are the truth." },
  { project: "KALAKRITI", title: "Cut it rather than fake it", body: "I removed an AI 'market trends' panel and a hard-coded group-order screen instead of demoing them. Neither was real." },
  { project: "DEALFLOW360", title: "A pure function for risk", body: "No database, no ORM: testable before the models existed, and reused unchanged when a customer counter-offers. The sales rep never asks for approval, because asking is where discretion creeps back in." },
];

export const ENDING = {
  title: "QUEST COMPLETE.",
  lines: [
    "That's the portfolio. The last level is my pitch for Wispr Flow India.",
  ],
  cta: "LET'S BUILD SOMETHING INDIA TALKS ABOUT.",
};

export const WISPR_NOTE = "Click any answer box and dictate with Wispr Flow, or just type.";
