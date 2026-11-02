// Anonymous interaction analytics. Privacy rules enforced here AND again on the server:
//  - nothing is collected until the visitor chooses (consent "full" or "basic"); "none" = nothing leaves the browser
//  - Do Not Track is respected: no prompt, nothing collected
//  - "basic" = page / level / project activity only. "full" adds the answers chosen inside the games
//  - only an anonymous random id; no names, emails, IPs, microphone audio or typed text
//  - events are queued and sent in batches (every few seconds, or on tab close via sendBeacon)

const BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const URL_EVENTS = `${BASE}/api/analytics/events`;
const URL_DELETE = `${BASE}/api/analytics/me`;

const CONSENT_KEY = "akash_exe_consent_v1";
const VID_KEY = "akash_exe_vid";
const SID_KEY = "akash_exe_sid";

// Events that describe what someone chose inside a game. Only sent with "full" consent.
export const ANSWER_EVENTS = new Set([
  "mc_answer", "swiper_result", "pokemon_pick", "pokemon_attack", "battle_result",
  "strategy_choice", "audience_pick", "budget_alloc", "twist_response", "pitch_submit",
]);

const safeGet = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const safeSet = (store, key, v) => { try { store.setItem(key, v); } catch { /* private mode */ } };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

export const analyticsAvailable = () => !!BASE;
export const doNotTrack = () => typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || window.doNotTrack === "1");

// "full" | "basic" | "none" | null (not asked yet)
export function getConsent() {
  if (doNotTrack()) return "none";
  const v = safeGet(localStorage, CONSENT_KEY);
  return v === "full" || v === "basic" || v === "none" ? v : null;
}

let queue = [];
let timer = null;
let page = { name: null, since: 0 };
let sessionStarted = false;
const listeners = new Set();
export const onConsentChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function ids() {
  let vid = safeGet(localStorage, VID_KEY);
  if (!vid) { vid = uuid(); safeSet(localStorage, VID_KEY, vid); }
  let sid = safeGet(sessionStorage, SID_KEY);
  if (!sid) { sid = uuid(); safeSet(sessionStorage, SID_KEY, sid); }
  return { vid, sid };
}

function clean(props) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 120);
    else if (Array.isArray(v)) out[k] = v.slice(0, 12).map((x) => (typeof x === "number" ? x : String(x).slice(0, 60)));
    else if (v && typeof v === "object") out[k] = clean(v);
  }
  return out;
}

function allowed(type) {
  const c = getConsent();
  if (!BASE || !c || c === "none") return false;
  if (ANSWER_EVENTS.has(type) && c !== "full") return false;
  return true;
}

function send(useBeacon = false) {
  clearTimeout(timer);
  timer = null;
  if (!queue.length || !BASE) return;
  const { vid, sid } = ids();
  const consent = getConsent();
  if (!consent || consent === "none") { queue = []; return; }
  const batch = queue.splice(0, 25);
  const body = JSON.stringify({ vid, sid, consent, events: batch });
  try {
    // text/plain keeps it a "simple" request: no CORS preflight, and it works with sendBeacon.
    if (useBeacon && navigator.sendBeacon) navigator.sendBeacon(URL_EVENTS, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    else fetch(URL_EVENTS, { method: "POST", body, headers: { "Content-Type": "text/plain;charset=UTF-8" }, keepalive: true, credentials: "omit" }).catch(() => {});
  } catch { /* analytics must never break the app */ }
  if (queue.length) timer = setTimeout(() => send(useBeacon), 400);
}

function schedule() {
  if (queue.length >= 12) send();
  else if (!timer) timer = setTimeout(() => send(), 6000);
}

export function track(type, props = {}) {
  try {
    if (!allowed(type)) return;
    ids(); // make sure the anonymous id exists as soon as the first (consented) event is queued
    if (!sessionStarted) startSession();
    queue.push({ t: type, ts: Date.now(), p: clean(props) });
    if (queue.length > 100) queue.shift();
    schedule();
  } catch { /* ignore */ }
}

function startSession() {
  sessionStarted = true;
  let ref = "";
  try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch { ref = ""; }
  if (ref === window.location.hostname) ref = "";
  queue.push({
    t: "session_start", ts: Date.now(),
    p: clean({ ref, w: window.innerWidth, lang: (navigator.language || "").slice(0, 8), returning: !!safeGet(localStorage, `${VID_KEY}_seen`) }),
  });
  safeSet(localStorage, `${VID_KEY}_seen`, "1");
}

// Call whenever the visible "page" changes (home, level:2, section:builds ...). Records time spent on the previous one.
export function setPage(name) {
  if (page.name === name) return;
  const now = Date.now();
  if (page.name) track("page_time", { page: page.name, ms: Math.min(now - page.since, 30 * 60 * 1000) });
  page = { name, since: now };
  track("page_view", { page: name });
}

export function endSession() {
  const now = Date.now();
  if (page.name) {
    track("page_time", { page: page.name, ms: Math.min(now - page.since, 30 * 60 * 1000) });
    track("session_end", { exit: page.name });
    page = { name: page.name, since: now };
  }
  send(true);
}

export function setConsent(level) {
  safeSet(localStorage, CONSENT_KEY, level);
  if (level === "none") { queue = []; clearTimeout(timer); timer = null; }
  listeners.forEach((fn) => fn(level));
}

// "Delete my data": removes this anonymous id's records server-side, and forgets the id locally.
export async function deleteMyData() {
  const vid = safeGet(localStorage, VID_KEY);
  queue = [];
  if (BASE && vid) {
    try { await fetch(URL_DELETE, { method: "DELETE", body: JSON.stringify({ vid }), headers: { "Content-Type": "text/plain;charset=UTF-8" }, credentials: "omit" }); } catch { /* offline */ }
  }
  try { localStorage.removeItem(VID_KEY); localStorage.removeItem(`${VID_KEY}_seen`); sessionStorage.removeItem(SID_KEY); } catch { /* ignore */ }
  sessionStarted = false;
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") endSession(); });
  window.addEventListener("pagehide", endSession);
}
