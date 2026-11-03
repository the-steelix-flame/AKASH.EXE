// Soothing background music for the whole journey. Generated live with the Web Audio API,
// so there is no audio file to download and nothing to license.
//
//   - slow, warm pad chords (Cmaj9 > Am9 > Fmaj7 > G6/9), one chord every 8 seconds
//   - soft bell notes from the C major pentatonic scale drifting over the top, with a gentle echo
//   - everything runs through a low-pass filter and a long reverb, at a deliberately low volume
//
// Browsers only allow sound after a click, tap or key press, so it starts on the visitor's first one.
// The preference (on / off) is remembered. Narration "ducks" the music instead of fighting it.
//
// Want a real track instead? Drop it at  public/audio/music/ambient.mp3  and it is used in place of the
// generated music (see README, "Background music").

import { makeRng } from "@/utils/rng";

const KEY = "akash_exe_music_v1";
// The music has its own random generator, so it never shares (or disturbs) the page's Math.random stream.
const audioRng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0);
const BASE_GAIN = 0.2; // overall loudness of the music
const DUCK = 0.3; // fraction of the volume left while a narration clip plays
const BAR = 8; // seconds per chord
const LOOKAHEAD = 14; // seconds of music scheduled in advance

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const CHORDS = [
  [48, 52, 55, 59, 62], // Cmaj9
  [45, 52, 55, 59, 60], // Am9
  [41, 48, 52, 55, 57], // Fmaj7
  [43, 50, 52, 57, 59], // G6/9
];
const BELLS = [72, 74, 76, 79, 81, 84]; // C5 D5 E5 G5 A5 C6

// ------------------------------------------------------------------ pure sound design (testable offline)
const IR_SECONDS = 3;
function emptyImpulse(ctx) { return ctx.createBuffer(2, Math.floor(ctx.sampleRate * IR_SECONDS), ctx.sampleRate); }
function fillImpulse(buf, from, to) {
  const n = buf.length;
  for (let ch = 0; ch < 2; ch += 1) {
    const d = buf.getChannelData(ch);
    for (let i = from; i < Math.min(to, n); i += 1) d[i] = (audioRng() * 2 - 1) * Math.pow(1 - i / n, 2.6);
  }
}
// The reverb tail is "noise that fades away". Making it is a few hundred thousand numbers, so live it is built in
// small slices between frames (the page never stalls); until it is ready the reverb is simply silent.
function buildReverbAsync(reverb, ctx) {
  const buf = emptyImpulse(ctx);
  const step = 12000;
  let i = 0;
  const slice = () => { fillImpulse(buf, i, i + step); i += step; if (i < buf.length) setTimeout(slice, 6); else reverb.buffer = buf; };
  setTimeout(slice, 50);
}

// out -> master gain -> destination. `pad` and `bell` are the two inputs the scheduler writes into.
export function makeBus(ctx, destination, { sync = false } = {}) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(destination);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.4;
  comp.connect(master);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass"; tone.frequency.value = 1700; tone.Q.value = 0.4;
  tone.connect(comp);

  const reverb = ctx.createConvolver();
  if (sync) { const buf = emptyImpulse(ctx); fillImpulse(buf, 0, buf.length); reverb.buffer = buf; } else buildReverbAsync(reverb, ctx);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  reverb.connect(wet); wet.connect(tone);

  const pad = ctx.createGain(); pad.gain.value = 1;
  pad.connect(tone); pad.connect(reverb);

  const echo = ctx.createDelay(1.5); echo.delayTime.value = 0.62;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const echoTone = ctx.createBiquadFilter(); echoTone.type = "lowpass"; echoTone.frequency.value = 1500;
  echo.connect(echoTone); echoTone.connect(fb); fb.connect(echo); echoTone.connect(reverb); echoTone.connect(tone);

  const bell = ctx.createGain(); bell.gain.value = 1;
  bell.connect(tone); bell.connect(reverb); bell.connect(echo);

  return { master, pad, bell };
}

function padNote(ctx, out, midi, t, len, vol) {
  const f = hz(midi);
  [[f, "sine", 1, -3], [f, "sine", 0.7, 4]].forEach(([freq, type, g, cents]) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = cents;
    const a = ctx.createGain();
    const peak = vol * g;
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(peak, t + 2.6); // slow swell
    a.gain.setValueAtTime(peak, t + len - 0.2);
    a.gain.linearRampToValueAtTime(0.0001, t + len + 3.2); // long fade into the next chord
    o.connect(a); a.connect(out);
    o.start(t); o.stop(t + len + 3.4);
  });
}

function bellNote(ctx, out, midi, t, vol) {
  const f = hz(midi);
  [[f, 1], [f * 2.01, 0.22]].forEach(([freq, g]) => {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = freq;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(vol * g, t + 0.03);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    o.connect(a); a.connect(out);
    o.start(t); o.stop(t + 4.3);
  });
}

// One bar (= one chord) starting at time t. `rng` is injectable so a test can make it deterministic.
export function scheduleBar(ctx, bus, barIndex, t, rng = audioRng) {
  const chord = CHORDS[barIndex % CHORDS.length];
  chord.forEach((m, i) => padNote(ctx, bus.pad, m, t + i * 0.12, BAR, i === 0 ? 0.075 : 0.05));
  // a few unhurried bells, never the same note twice in a row
  let last = -1;
  const count = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < count; k += 1) {
    let idx = Math.floor(rng() * BELLS.length);
    if (idx === last) idx = (idx + 2) % BELLS.length;
    last = idx;
    bellNote(ctx, bus.bell, BELLS[idx], t + 1.2 + (k + rng() * 0.6) * (BAR - 1.8) / count, 0.045 + rng() * 0.02);
  }
}

// ------------------------------------------------------------------ live engine
let ctx = null;
let bus = null;
let timer = null;
let nextBar = 0;
let barNo = 0;
let fileEl = null; // when public/audio/music/ambient.mp3 exists
let probed = false;
let fileUrl = null;
let gestured = false;
let hidden = false;
let suspendTimer = null;

const read = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
const state = { on: read(), muted: false, duck: false, running: false };
const listeners = new Set();
let snap = { on: state.on, running: false };
const notify = () => {
  const running = !!(ctx && ctx.state === "running" && state.on && !state.muted) || !!(fileEl && !fileEl.paused);
  if (snap.on !== state.on || snap.running !== running) { snap = { on: state.on, running }; listeners.forEach((l) => l()); }
};

const target = () => (state.on && !state.muted && !hidden ? BASE_GAIN * (state.duck ? DUCK : 1) : 0);

async function probeFile() {
  if (probed) return fileUrl;
  probed = true;
  try {
    const r = await fetch("/audio/music/ambient.mp3", { method: "HEAD" });
    const type = r.headers.get("content-type") || "";
    if (r.ok && /audio|mpeg|octet-stream/i.test(type) && !/html/i.test(type)) fileUrl = "/audio/music/ambient.mp3";
  } catch { /* no file: use the generated music */ }
  return fileUrl;
}

function pump() {
  if (!ctx || !bus) return;
  while (nextBar < ctx.currentTime + LOOKAHEAD) {
    scheduleBar(ctx, bus, barNo, nextBar);
    barNo += 1;
    nextBar += BAR;
  }
}

function applyGain() {
  const g = target();
  if (fileEl) fileEl.volume = Math.min(1, g * 2.2);
  if (!ctx || !bus) return;
  bus.master.gain.cancelScheduledValues(ctx.currentTime);
  bus.master.gain.setTargetAtTime(g, ctx.currentTime, g === 0 ? 0.35 : 0.9);
}

function ensureRunning() {
  if (!gestured) return;
  if (fileEl) {
    if (target() > 0) fileEl.play().catch(() => {}); else fileEl.pause();
    applyGain(); notify(); return;
  }
  const audible = target() > 0;
  if (!ctx && !audible) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    ctx.addEventListener("statechange", notify);
    bus = makeBus(ctx, ctx.destination);
    nextBar = ctx.currentTime + 0.2;
    barNo = 0;
  }
  clearTimeout(suspendTimer);
  if (audible) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!timer) { pump(); timer = setInterval(pump, 2000); }
    applyGain();
  } else {
    applyGain(); // fade out first, then stop the scheduler and sleep the audio engine
    clearInterval(timer); timer = null;
    suspendTimer = setTimeout(() => { if (ctx && target() === 0) ctx.suspend().catch(() => {}); }, 1500);
  }
  notify();
}

async function settle() {
  if (gestured && !probed) {
    const url = await probeFile();
    if (url && !fileEl) { fileEl = new Audio(url); fileEl.loop = true; fileEl.addEventListener("play", notify); fileEl.addEventListener("pause", notify); }
  }
  ensureRunning();
}

const UNLOCK_EVENTS = ["pointerdown", "pointerup", "keydown", "touchend", "click"];
let startedAt = 0; // when the visitor's first click / tap / key press actually woke the music up
const isSilentNow = () => !(ctx && ctx.state === "running") && !(fileEl && !fileEl.paused);
const onGesture = () => {
  const wasSilent = isSilentNow();
  if (!gestured) {
    gestured = true;
    settle();
  } else if (ctx && ctx.state === "suspended" && target() > 0) {
    ctx.resume().catch(() => {});
  }
  if (wasSilent && state.on && !state.muted) startedAt = performance.now();
  if (ctx && ctx.state === "running") UNLOCK_EVENTS.forEach((e) => document.removeEventListener(e, onGesture, true));
};

export const ambient = {
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot: () => snap,
  /** Call once at start-up: waits for the first click / tap / key press, then begins. */
  attach() {
    UNLOCK_EVENTS.forEach((e) => document.addEventListener(e, onGesture, true));
    // The music is ON by default: try to start straight away. Browsers that allow autoplay (or remember this
    // visitor) play at once; the others keep it ready and it begins on the very first click, tap or key press.
    if (state.on) { gestured = true; settle(); }
    const vis = () => { hidden = document.hidden; ensureRunning(); }; // a hidden tab goes quiet and sleeps
    document.addEventListener("visibilitychange", vis);
    return () => {
      UNLOCK_EVENTS.forEach((e) => document.removeEventListener(e, onGesture, true));
      document.removeEventListener("visibilitychange", vis);
    };
  },
  setOn(v) {
    state.on = !!v;
    try { localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* private mode */ }
    gestured = gestured || v; // pressing the button is itself a user gesture
    settle(); notify();
  },
  toggle() {
    // If this very click is what just woke the music up (first interaction of the visit), it must not also switch it off.
    if (state.on && startedAt && performance.now() - startedAt < 800) { startedAt = 0; return; }
    ambient.setOn(!state.on);
  },
  setMuted(v) { if (state.muted !== v) { state.muted = v; settle(); notify(); } },
  setDuck(v) { if (state.duck !== v) { state.duck = v; applyGain(); } },
  // test hooks
  _debug: () => ({ ctxState: ctx && ctx.state, gain: bus ? bus.master.gain.value : null, target: target(), usingFile: !!fileEl, bars: barNo, on: state.on, muted: state.muted, duck: state.duck }),
};

/** Renders `seconds` of the generated music offline and reports loudness (used to verify it makes sound). */
export async function renderPreview(seconds = 32) {
  const rate = 22050;
  const off = new OfflineAudioContext(2, rate * seconds, rate);
  const b = makeBus(off, off.destination, { sync: true });
  b.master.gain.value = BASE_GAIN;
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i * BAR < seconds; i += 1) scheduleBar(off, b, i, i * BAR, rng);
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  let sum = 0; let peak = 0; let nan = 0;
  for (let i = 0; i < d.length; i += 1) { const v = d[i]; if (Number.isNaN(v)) nan += 1; sum += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
  return { rmsDb: 20 * Math.log10(Math.sqrt(sum / d.length) + 1e-9), peak, nan, seconds };
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  window.__ambient = ambient;
  window.__ambientPreview = renderPreview;
}
