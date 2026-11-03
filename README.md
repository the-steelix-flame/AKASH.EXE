# AKASH.EXE // The Growth Quest

A portfolio you play. Four levels unlock my work: Know Me, My Builds, How I Think, and a pitch for Wispr Flow India.
React (CRA + craco) frontend, FastAPI + MongoDB backend. Progress is kept in the browser (`akash_exe_progress_v1`, unchanged).

## Run locally

```powershell
# 1. MongoDB (Docker)
docker run -d --name portfolio-mongo -p 27017:27017 -v portfolio-mongo-data:/data/db mongo:7

# 2. Backend  (copy backend/.env.example to backend/.env first)
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn server:app --port 8001

# 3. Frontend  (copy frontend/.env.example to frontend/.env first)
cd frontend
yarn install
yarn start        # http://localhost:3000
```

The game works without the backend. The backend only receives anonymous analytics and serves the private dashboard.

## Voice and typing

Every answer box is an ordinary text field. Dictate into it with **Wispr Flow**, or type. The status line under each box reflects
only what the page can see (text arriving, text ready, evaluating); it never claims the site is recording. The page cannot hear
Wispr Flow. It reads the words that land in the box. The optional *Browser mic* button is separate, and the only thing that asks
for microphone permission. Where a question has set answers (swipe cards), no free text is needed at all.

## HOW TO ADD MY VOICE RECORDINGS

Narration is your voice; visitors' voices are a different thing (they dictate answers with Wispr Flow).

1. Every line and its script is in `frontend/src/data/audioManifest.json` (field `text`). The same text shows as the speech bubble
   from the flying Akash agent, one sentence at a time.
2. Record each line and copy it into `frontend/public/audio/` with exactly these names (`.wav` preferred; `.mp3 .m4a .ogg` also work):

```
frontend/public/audio/
  intro.wav                      final_message.wav
  level1/  intro  instructions  win  fail  story  swiper_approach  swiper_celebration  swiper_repelled  magic_words_hint
  level2/  intro  instructions  win  fail  story  battle_start  attack  damage  faint  super_effective  not_very_effective
  level3/  intro  instructions  win  fail  story  mission_alert  worried_reaction  success_reaction
  level4/  intro  instructions  win  fail  story  energy_charge  kamehameha
```

3. `node scripts/audio_checklist.mjs` prints which files exist and writes `AUDIO_ASSET_CHECKLIST.md`.
   Until a file exists, the AI placeholder (`<name>.placeholder.mp3`) plays; if neither exists the game shows the caption and carries on.
   `backend\.venv\Scripts\python scripts\generate_audio.py` regenerates placeholders (delete one to regenerate it).

**These nine scripts changed in the last update and need re-recording if you already recorded the old ones:**
`level1/intro, level1/instructions, level1/story, level2/instructions, level2/story, level3/instructions, level3/story, level4/instructions, level4/story`
(the old Level 1 story named a degree that isn't in the Project Bank, and the Level 3 story now tells the Chronos input-clipping story).

### Other assets

```
frontend/public/images/projects/<id>.webp          project posters (14, from the old portfolio)
frontend/public/videos/<id>.mp4                    project demo videos (14, re-encoded to 960 px)
frontend/public/images/characters/akash-agent.svg  OPTIONAL: your own art for the flying agent (.svg, .png or .webp).
                                                   If present it replaces the built-in character.
frontend/public/images/characters/pokemon/<id>.png OPTIONAL: art for pikachu, squirtle, onix, ...
```

## Background music

Soothing ambient music plays through the whole journey, on by default, and loops forever. It is generated live with the Web Audio
API (slow pad chords with soft bell notes, `src/utils/ambient.js`), so there is no audio file to license or download. Browsers only
allow sound after a click, tap or key press, so it starts by itself where the browser allows autoplay and otherwise on the visitor's
first interaction. The nav has a music button (remembered per browser) and the existing mute button silences everything. The music
ducks to about 30% while a narration clip speaks, and sleeps (no CPU) when switched off or when the tab is hidden.

Want a real track instead? Put it at `frontend/public/audio/music/ambient.mp3` and it replaces the generated music (looped).

## Scroll-driven 3D journeys (Know Me, My Builds, How I Think, Wispr Pitch)

Each of the four portfolio pages is a scrollytelling journey: one sticky full-screen stage, and as you scroll a camera flies along a
path of neon wireframe monuments (an entrance gate, a campus, a tower with a film reel, a podium and trophy, gears, a compass; an order
book, a vase, an approval ledger, a looping knot; a brain, clipped bars, broken pillars, a bridge; a microphone, a crowd, a megaphone,
a calendar...), one per waypoint, with that waypoint's story card fading in beside it. Nothing is an image or a model file: every
monument is generated from code (`src/components/journey/monuments.js`, three.js lines) and the stage is `JourneyStage.jsx`.
Edit the story in the section files (`src/components/sections/*`) or `data/*`; pick a monument per chapter with `monument: "gate"`
(see the `MONUMENTS` list). The render loop only runs while a stage is on screen. Visitors with "reduce motion" on, or no WebGL, get
the same stories as a plain stack. three.js is code-split and only downloads when a journey is about to show.

## Level 1 rounds

Round 1 is the Swiper challenge (say the magic words, 20 seconds). Round 2, "Look for it", is a bright cartoon jungle packed with the
things I build with; find the one golden trophy (30 seconds, 3 wrong taps). Round 3 is a treasure map: five identical trails cross on
their way up to five of my projects (Chronos, Kalakriti, DealFlow360, Reflow, ECHO); pick the trail that reaches Chronos (no timer,
3 wrong trails; a new map every attempt). Then the final riddle. Layouts are seeded from `src/utils/rng.js`, so they differ every visit.
Round 2 and 3 use an original explorer cast (`ExplorerCast.jsx`: Explorer Akash and the Trail Map), not any TV character.

## The flying Akash agent

`AkashAgent.jsx` parks at the left edge for 10 seconds, glides to the right edge, parks for 10 seconds, glides back, and repeats.
It speaks the narration one sentence at a time and short contextual lines from the levels (`useAgent().say("...")`). It is
only reacts where the character itself is (its speech bubble and the space around it never block a click), and it picks lanes that overlap the fewest buttons, inputs and headings,
re-checking every couple of seconds. No existing flying-Akash artwork was found in any supplied folder, so it is built on the same character engine as the other
characters. Drop your own art at the path above to replace it.

## Analytics (anonymous, consent first)

**What is recorded, only after the visitor chooses:** a random anonymous ID, pages/levels/projects visited and time spent, device type
and browser family, the referring site's hostname, and (only with "Allow all") which answers were picked in the games.
**Never recorded:** names, emails, IP addresses, raw user agents, microphone audio, or anything typed or dictated into a box
(a typed pitch is dropped unless `ANALYTICS_STORE_FREE_TEXT=true`). Do Not Track is honoured. Everything is deleted automatically
after `ANALYTICS_RETENTION_DAYS` (default 180) via MongoDB TTL indexes. Visitors can delete their own data from the shield icon
in the nav. Consent is enforced on the server too: answer events are discarded unless the visitor chose "full".

Abuse protection: strict per-event property whitelist and sanitising, 32 KB body cap, max 25 events per batch, per-IP and
per-visitor rate limits, login lockout, CORS limited to `CORS_ORIGINS`, no public API docs, no cookies.

### Private admin dashboard

Open `/admin` (it is not linked anywhere). It stays disabled until you set credentials:

```powershell
backend\.venv\Scripts\python scripts\admin_setup.py     # prompts for a password, prints 3 env lines
```

Put `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (a bcrypt hash, not the password) and `ADMIN_JWT_SECRET` in the backend environment only.
The dashboard shows visitors (total, unique, returning), daily and weekly traffic, top pages with time spent, projects opened and
videos played, level completion/drop-off/revisits, exits, game statistics, the most common answers, a per-visitor timeline,
date filters, CSV export (events or sessions) and data deletion. The session token lives in `sessionStorage` only.

## Content sources and what to confirm

Source of truth: `Akash-Kumar-Project-Bank.pdf`, the old portfolio at `3d-portfolio` (project videos, posters, links) and your Chronos write-up.
Corrections made: removed the "BS Data Science, IIT Madras" line (not in the PDF); replaced all `[EDIT: ...]` placeholders and fake
LinkedIn/GitHub links with real ones; replaced five placeholder projects with the 14 real ones, strongest first; added the IntelGrader
internship and the verified hackathon placements; replaced the generic "how I think" flow and the old tick-size story with your Chronos story.

**Left out because the PDF says it can't be verified:** LeetCode "top 5% globally", "finalist in 7+ national hackathons",
and "20+ hackathons entered" (from the old site).

**Added on request:** WBJEE (West Bengal JEE), All India Rank 1691 out of 150,000, from the resume shared in the chat
(`groww_akash_kumar.pdf`). It shows as a chip and a timeline card on the Know Me page.

**Please decide / confirm (not shown on the site until you do):**
- Which email to show (`akash3571kumar@gmail.com` vs `akash9836566391@gmail.com`), and whether to add a resume PDF.
- Schools and Class X/XII results. Add them to `SCHOOLS` in `frontend/src/data/personalData.js`
  (`{ name, place, years, board, result }`); each one then appears on the Know Me page by itself. None are shown until real data is added.
- Exact event dates for Kalakriti, DealFlow360 and Reflow (the PDF dates them Sep 2026 from commit history).
- ECHO's model version (not named on the site because the sources disagree).
- LeetCode contest rating 1800+ is shown (listed as safe in the PDF).
- The Reflow demo video shows a different table from the README figures quoted in text; the text uses the README's.

## Progress

Stored in `localStorage` under `akash_exe_progress_v1`. A completed level stays unlocked across refreshes and navigation, and its
section can be revisited from its map marker or the menu without replaying.

## Deploy

See `render.yaml` (backend as a Docker web service, frontend as a static site). Backend env: `MONGO_URL`, `DB_NAME`,
`CORS_ORIGINS` (the frontend URL), `TRUST_PROXY=true`, and the three admin variables. Frontend env: `REACT_APP_BACKEND_URL`.
