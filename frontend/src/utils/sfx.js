// Retro game SFX via Web Audio oscillators — no audio files needed.

let ctx = null;
let enabled = true;

export const setSfxEnabled = (v) => { enabled = v; };

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = "square", vol = 0.12, when = 0, slideTo = null) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0.06, "square", 0.07),
  hover: () => tone(440, 0.04, "sine", 0.04),
  correct: () => { tone(523, 0.1, "square", 0.1); tone(784, 0.14, "square", 0.1, 0.09); },
  wrong: () => tone(180, 0.25, "sawtooth", 0.1, 0, 90),
  hit: () => { tone(220, 0.08, "sawtooth", 0.14, 0, 60); tone(90, 0.12, "square", 0.1, 0.02, 40); },
  crit: () => { tone(880, 0.06, "square", 0.12); tone(220, 0.15, "sawtooth", 0.14, 0.04, 50); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "square", 0.1, i * 0.11)); },
  fail: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, "sawtooth", 0.09, i * 0.14)); },
  unlock: () => { tone(392, 0.1, "sine", 0.1); tone(587, 0.1, "sine", 0.1, 0.1); tone(880, 0.24, "sine", 0.12, 0.2); },
  transition: () => tone(140, 0.5, "sine", 0.1, 0, 660),
  powerup: () => tone(120, 0.9, "sawtooth", 0.08, 0, 1200),
  tick: (left = 3) => tone(left <= 1 ? 880 : left <= 2 ? 660 : 520, 0.07, "square", left <= 1 ? 0.13 : 0.09),
  buzzer: () => { tone(110, 0.5, "sawtooth", 0.14, 0, 70); tone(95, 0.5, "square", 0.09, 0.02, 60); },
  kamehameha: () => { tone(100, 1.1, "sawtooth", 0.1, 0, 900); tone(50, 1.1, "square", 0.06, 0.1, 400); },
};
