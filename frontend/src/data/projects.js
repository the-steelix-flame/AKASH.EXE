// Every claim here comes from Akash-Kumar-Project-Bank.pdf (README / test-backed figures).
// Team projects: "role" says exactly which part is Akash's. Reflow numbers are from a simulated batch.
// Order = strongest first inside each group.

const GH = "https://github.com/the-steelix-flame/";

export const PROJECT_GROUPS = [
  { id: "flagship", label: "FLAGSHIP", note: "The deepest work" },
  { id: "platforms", label: "FULL-STACK PLATFORMS", note: "Auth, workflows, real users" },
  { id: "ai", label: "AI AND VISION", note: "RAG, vision, agents" },
];

export const PROJECTS = [
  {
    id: "chronos", group: "flagship", accent: "volt",
    name: "Chronos", tagline: "Reactive market digital twin",
    when: "Mar 2026 to present", role: "Solo: architecture, engine, agents, infrastructure",
    summary: "A market simulator where your order moves the price. A normal backtester replays a frozen tape; Chronos matches against a live limit-order book of 99 agents.",
    bullets: [
      "99 agents: 15 PPO market-makers, 4 PPO whales, 80 heuristic retail.",
      "Single-threaded matching core with strict price-time priority and SQLite, so any seeded run replays exactly.",
      "Price impact is emergent: a large order walks the book and the levels it eats are gone.",
      "pytest suite guards book priority, ledger conservation, book-driven price and deterministic runs.",
    ],
    stack: ["Python", "PyTorch", "Stable-Baselines3", "FastAPI", "SQLite", "ZeroMQ", "Gemini"],
    links: { github: GH + "chronos" },
  },
  {
    id: "kalakriti", group: "flagship", accent: "ember",
    name: "Kalakriti", tagline: "AI market linkage for artisans",
    when: "Sep 2026", role: "Full-stack: backend, AI pipeline, cluster and settlement model, mobile app (team project)",
    recognition: "Smart India Hackathon 2026 top-50 nomination · Hack Heritage 4.0",
    summary: "An artisan photographs her work and describes it by voice. A GSTIN-holding cluster owner becomes the seller of record, so she can sell where she legally couldn't.",
    bullets: [
      "Settlement model: payouts on the net amount after fee, GST by HSN and logistics, over an append-only wallet ledger that is re-verified by re-summing.",
      "Two-signal vision pipeline: on-device OCR for text, a vision-language model for object, material and craft.",
      "Resumable uploads that return results cheapest first, so a 2G connection can't cost an artisan her work.",
      "Public Provenance Passport with Ed25519-signed claims anyone can verify.",
    ],
    stack: ["Expo / React Native", "FastAPI", "Supabase Postgres", "Nemotron", "Llama 3.2 Vision", "Razorpay"],
    links: { github: GH + "Kalakriti", live: "https://kalakriti-api-2rho.onrender.com/market" },
  },
  {
    id: "dealflow", group: "flagship", accent: "neon",
    name: "DealFlow360", tagline: "Self-governing sales operations",
    when: "Sep 2026", role: "Quotation builder, risk engine, approvals and customer portal (one of three)",
    recognition: "Odoo Hackathon finals: 35th of 800 selected teams",
    summary: "Quote-to-cash where discount rules are enforced by the application, not remembered by a reviewer.",
    bullets: [
      "Discount risk engine as a pure Python function: every line scored against the stricter of its customer-tier and category ceiling.",
      "Score blends worst offender (50%), weighted average excess (30%) and order discount (20%); clean quotes auto-approve with an audit log.",
      "Token-scoped customer negotiation portal; counter-offers re-enter approval automatically.",
      "28 unit tests (12 risk engine, 6 split planner, 10 proration) plus a full end-to-end run on a clean database.",
    ],
    stack: ["Next.js 16", "TypeScript", "Django 5", "Django Ninja", "PostgreSQL"],
    links: { github: GH + "48-odoo-final" },
  },
  {
    id: "reflow", group: "flagship", accent: "aura",
    name: "Reflow", tagline: "Payment failure recovery agent",
    when: "Sep 2026", role: "Agent design, simulation, evaluation, dashboard",
    summary: "An agent that works out why a payment failed, picks a bounded recovery action, and escalates fraud and disputes to a person.",
    bullets: [
      "On a simulated 200-event batch (INR 19.3 lakh at risk): recovered INR 5.73 lakh against INR 5.08 lakh for a retry ladder, with 112 charge attempts instead of 442.",
      "Benchmarked against four baselines on identical events, so any gain comes from diagnosis, not scheduling.",
      "Tests fail the build if agent code imports ground truth. The ladder still wins two rows of the full table.",
    ],
    stack: ["Python", "Streamlit", "SQLite", "pytest"],
    links: { github: GH + "Reflow" },
  },
  {
    id: "assetflow", group: "platforms", accent: "volt",
    name: "AssetFlow", tagline: "Enterprise asset and resource management",
    when: "Jul 2026", role: "Full-stack: API design, auth model, frontend (team Placement Impossible)",
    recognition: "Odoo Hackathon nomination round: 48th of 5,000+ teams, through to the finals",
    summary: "A multi-tenant platform for assets, allocations, bookings, maintenance and audits.",
    bullets: [
      "Supabase owns identity, but roles and company access always resolve from the backend database, so signup metadata can't grant privilege.",
      "Join codes validate against the backend first: a wrong code creates no account and sends no email.",
      "New users wait in PENDING_APPROVAL until an admin approves.",
    ],
    stack: ["Django 5", "Django Ninja", "Next.js", "Supabase Auth", "PostgreSQL", "Docker", "Render"],
    links: { github: GH + "Placement_Impossible-AssetFlow" },
  },
  {
    id: "patterniq", group: "platforms", accent: "ember",
    name: "PatternIQ", tagline: "AI-native trading intelligence",
    when: "Jul 2025", role: "Full-stack: AI workflow, sandbox, backend, frontend",
    recognition: "Securities Market Hackathon",
    summary: "Turns a plain-English trading strategy into a backtest in three checkable stages instead of one prompt.",
    bullets: [
      "Generated strategy code is sandboxed with an AST allow-list (no filesystem, network or imports) and an isolated subprocess with a hard timeout. Never a raw exec().",
      "Shared content (daily quizzes, calendar, macro debrief) is generated once and cached in Firestore to cut AI cost.",
      "Deployed FinBERT, an LSTM autoencoder and a candlestick CNN for 'The Arena'.",
    ],
    stack: ["FastAPI", "React", "Gemini", "Firestore", "Docker", "Vercel"],
    links: { github: GH + "PatternIQ", live: "https://pattern-iq-1o1d.vercel.app/" },
  },
  {
    id: "nivaran", group: "platforms", accent: "neon",
    name: "Nivaran", tagline: "Hyperlocal civic repair network",
    when: "2026", role: "Full-stack: AI pipeline, consensus model, authority tooling",
    recognition: "Vibe2Ship: Community Hero",
    summary: "Turns citizen photos into verified, prioritised municipal work orders.",
    bullets: [
      "Every report is anchored to provable location: JPEG EXIF GPS, browser GPS or a map click.",
      "Reports within 50 metres merge into one case, so volume becomes evidence.",
      "Gemini reads the original evidence and checks before/after photos that a repair really happened.",
    ],
    stack: ["Gemini", "Firestore", "Open311", "PBKDF2"],
    links: { github: GH + "Nivaran-Vibe2Ship" },
  },
  {
    id: "trackintrade", group: "platforms", accent: "volt",
    name: "TrackInTrade", tagline: "AI trading journal",
    when: "Apr 2025", role: null,
    recognition: "Built for Design Thinking Lab, HITK",
    summary: "Log trades and see true net performance, with commissions and fees included.",
    bullets: [
      "Stateless JWT auth with bcrypt; a dashboard with KPI cards and four charts.",
      "Gemini insights over the full trade history to surface behavioural patterns.",
    ],
    stack: ["React", "Node / Express", "PostgreSQL", "JWT", "Gemini"],
    links: { github: GH + "TrackInTrade", live: "https://track-in-trade-gevv.vercel.app/" },
  },
  {
    id: "echo", group: "ai", accent: "aura",
    name: "ECHO", tagline: "Emotional contextual holistic oracle",
    when: "Apr 2026", role: "AI pipeline architecture and backend (team repo)",
    recognition: "OpenAImer, AI in Mental Health",
    summary: "A five-layer agentic pipeline for supportive conversation: Signal Decoder, Narrative Engine, Retrieval Core, Response Synthesiser and Safety Gate.",
    bullets: [
      "Signal Decoder extracts a 10-dimension emotional reading so later stages reason over structure, not raw text.",
      "Hybrid RAG over ChromaDB, plus a quality gate that regenerates weak answers.",
      "Separate safety pass for crisis detection that escalates to India-specific helplines.",
    ],
    stack: ["Gemini", "ChromaDB", "Sentence Transformers", "Docker", "Hugging Face Spaces"],
    links: { github: "https://github.com/mandrita16/ECHO-Mental-Health-AI", live: "https://huggingface.co/spaces/kumar-akash/echo-backend" },
  },
  {
    id: "facereco", group: "ai", accent: "blood",
    name: "FacE-RecO", tagline: "Spoof-resistant attendance",
    when: "Mar 2025", role: null,
    recognition: "FLUXUS, IIT Indore: finalist among 1,000+ participants",
    summary: "Real-time face-recognition attendance that rejects a photo or phone screen held to the camera.",
    bullets: [
      "Spoof check (light reflection and facial depth) is kept separate from identity matching.",
      "Admins train the model and read logs; users can only mark attendance.",
    ],
    stack: ["Python", "OpenCV", "face_recognition", "Flask"],
    links: { github: GH + "FacE-RecO" },
  },
  {
    id: "lookalike", group: "ai", accent: "ember",
    name: "LookALike", tagline: "Full-stack face matching",
    when: "Aug 2025", role: null,
    summary: "Webcam or upload, then matches against a face database.",
    bullets: [
      "Averages embeddings across captures so one bad photo can't ruin a match.",
      "pgvector similarity search runs inside Postgres as an indexed query.",
    ],
    stack: ["Next.js", "Flask (Docker)", "PostgreSQL + pgvector"],
    links: { github: GH + "LookALike.com", live: "https://newlook-alike.vercel.app/" },
  },
  {
    id: "symbiosis", group: "ai", accent: "neon",
    name: "Symbiosis", tagline: "Environmental action platform",
    when: "Aug 2025", role: null,
    recognition: "Hack Heritage 3.0: runner-up",
    summary: "A per-state Eco-Score from crowdsourced data, with Gemini predicting environmental hotspots on a Leaflet map.",
    bullets: [],
    stack: ["React", "Leaflet", "Node / Express", "Gemini"],
    links: { github: GH + "Symbiosis", live: "https://symbiosis-ochre.vercel.app" },
  },
  {
    id: "lexi", group: "ai", accent: "volt",
    name: "Lexi SimplifAI", tagline: "Cloud AI document pipeline",
    when: "2025", role: null,
    summary: "OCR with Google Cloud Vision, then Gemini summarises, flags risk and translates legal-style documents.",
    bullets: [],
    stack: ["Cloud Vision", "Gemini", "Node.js", "Firebase", "Vercel"],
    links: { github: GH + "lexi-simplifai", live: "https://lexi-simplifai-kitb.vercel.app/" },
  },
  {
    id: "aera", group: "ai", accent: "aura",
    name: "AERA", tagline: "Health-optimised routing",
    when: "2025", role: null,
    summary: "Picks travel routes with lower air-pollutant exposure: a 40% reduction in modelled PM2.5 and NO2 along a route.",
    bullets: [],
    stack: ["React", "FastAPI", "Gemini Pro", "Open-Meteo", "Leaflet"],
    links: { github: GH + "aera", live: "https://aera-hackathon-b3711.web.app/" },
  },
];

// Smaller or unfinished work, one line each. Nothing here claims more than the Project Bank does.
export const OTHER_PROJECTS = [
  { name: "Live Assist", note: "Always-on-top desktop overlay: local whisper.cpp transcription, Silero VAD, Claude Haiku with prompt caching. In progress, local only." },
  { name: "The Invisible Internet", note: "Paid eBook delivery: Razorpay Payment Links, HMAC-verified webhooks, idempotent purchases, private bucket with signed URLs." },
  { name: "Route Resilience", note: "ISRO hackathon demo: ranks real Bengaluru roads by edge betweenness centrality and simulates targeted vs random failure." },
  { name: "Aura", note: "Chrome extension: create your own hand gestures to control web pages." },
  { name: "CleanFeed", note: "Chrome extension that filters harmful Instagram content for teens." },
  { name: "Institutional VWAP Screener", note: "Scans Nifty stocks for relative volume above 2.0 sitting on the VWAP line." },
];

export const projectById = (id) => PROJECTS.find((p) => p.id === id);
