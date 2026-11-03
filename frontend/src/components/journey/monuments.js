import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { makeRng } from "@/utils/rng";

// 3D neon wireframe "monuments", one per waypoint of the scroll journeys. Everything is generated from code (no images,
// no model files): primitives are turned into line segments, merged per colour and drawn as glowing thick lines.
// Each builder returns { group, update(t), h, r }: h = height and r = radius, used to frame the camera.

export const COLORS = { neon: 0x39ff14, volt: 0x00f0ff, aura: 0xa855f7, ember: 0xfb923c, blood: 0xef4444, white: 0xe8fff2, gold: 0xfacc15, pink: 0xf472b6 };

// ------------------------------------------------------------------ geometry helpers (all return Float32Array of segment endpoints)
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _e = new THREE.Euler(); const _p = new THREE.Vector3(); const _s = new THREE.Vector3(); const _v = new THREE.Vector3();
function xf(arr, t = {}) {
  _p.set(t.x || 0, t.y || 0, t.z || 0);
  _q.setFromEuler(_e.set(t.rx || 0, t.ry || 0, t.rz || 0));
  _s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
  _m.compose(_p, _q, _s);
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i += 3) { _v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(_m); out[i] = _v.x; out[i + 1] = _v.y; out[i + 2] = _v.z; }
  return out;
}
const edges = (geo, thr = 20) => { const g = new THREE.EdgesGeometry(geo, thr); const a = Float32Array.from(g.attributes.position.array); geo.dispose(); g.dispose(); return a; };
const box = (w, h, d, t) => xf(edges(new THREE.BoxGeometry(w, h, d)), t);
const cyl = (rt, rb, h, seg, t) => xf(edges(new THREE.CylinderGeometry(rt, rb, h, seg, 1), 15), t);
const tor = (r, tube, rs, ts, t) => xf(edges(new THREE.TorusGeometry(r, tube, rs, ts), 5), t);
const ico = (r, det, t) => xf(edges(new THREE.IcosahedronGeometry(r, det), 1), t);
const cone = (r, h, seg, t) => xf(edges(new THREE.ConeGeometry(r, h, seg), 15), t);
const sph = (r, ws, hs, t) => xf(edges(new THREE.SphereGeometry(r, ws, hs), 1), t);
const lathe = (pts, seg, t) => xf(edges(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), 1), t);
const knotG = (r, tube, t) => xf(edges(new THREE.TorusKnotGeometry(r, tube, 80, 5, 2, 3), 1), t);
const merge = (...arrs) => { const a = arrs.flat(Infinity); const n = a.reduce((s, x) => s + x.length, 0); const out = new Float32Array(n); let o = 0; a.forEach((x) => { out.set(x, o); o += x.length; }); return out; };
// polyline through points [[x,y,z]...] as segment pairs
const pl = (pts, closed = false, t) => {
  const n = closed ? pts.length : pts.length - 1; const out = new Float32Array(n * 6);
  for (let i = 0; i < n; i += 1) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; out.set([a[0], a[1], a[2] || 0, b[0], b[1], b[2] || 0], i * 6); }
  return t ? xf(out, t) : out;
};
const circle = (r, n = 40, t) => pl(Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, 0, Math.sin((i / n) * Math.PI * 2) * r]), true, t);
const rect = (w, h, t) => pl([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], true, t);
const ln = (a, b, t) => { const o = new Float32Array([a[0], a[1], a[2] || 0, b[0], b[1], b[2] || 0]); return t ? xf(o, t) : o; };
// a w x h grid of lines in the XY plane
const gridXY = (w, h, nx, ny, t) => { const o = []; for (let i = 0; i <= nx; i += 1) o.push(ln([-w / 2 + (w * i) / nx, -h / 2], [-w / 2 + (w * i) / nx, h / 2])); for (let j = 0; j <= ny; j += 1) o.push(ln([-w / 2, -h / 2 + (h * j) / ny], [w / 2, -h / 2 + (h * j) / ny])); return xf(merge(o), t); };

// Glow without post-processing: every neon object is drawn as a thin bright core plus one or two wider, faint copies of itself
// (additive blending, so overlapping lines bloom brighter). The halos are children of the core, so they move, spin and scale
// with it, and a setter on the core's opacity keeps them fading in step with it.
let GLOW = 2; // 0 = off, 1 = one halo (phones), 2 = two halos
export const setGlow = (v) => { GLOW = v; };
const HALOS = { 1: [[4, 0.22]], 2: [[3.4, 0.22], [8.5, 0.1]] };
const MINT = 0x6dffc4; // white structures glow mint-green, so the whole scene reads as neon
export function neon(arrs, color, width = 1.7, opacity = 0.95) {
  const g = new LineSegmentsGeometry();
  g.setPositions(merge(arrs));
  const mk = (lw, op, c = color) => new LineMaterial({ color: c, linewidth: lw, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, worldUnits: false });
  const m = mk(width, opacity); m.fog = true;
  const core = new LineSegments2(g, m);
  core.frustumCulled = false;
  const halos = (HALOS[GLOW] || []).map(([k, a]) => { const hm = mk(width * k, opacity * a, color === COLORS.white ? MINT : color); hm.fog = true; const h = new LineSegments2(g, hm); h.frustumCulled = false; h.userData.k = a; core.add(h); return h; });
  if (halos.length) {
    let op = opacity;
    Object.defineProperty(m, "opacity", { get: () => op, set: (v) => { op = v; halos.forEach((h) => { h.material.opacity = v * h.userData.k; }); }, configurable: true });
  }
  return core;
}
const W = COLORS.white;
const wrap = (...objs) => { const g = new THREE.Group(); objs.forEach((o) => g.add(o)); return g; };
const floorRing = (r, color = COLORS.white) => neon([circle(r, 64), circle(r * 0.86, 64)], color, 1.2, 0.35);

// ------------------------------------------------------------------ KNOW ME
function gate(a) {
  const parts = [];
  [-8, 8].forEach((x) => parts.push(box(2, 18, 2, { x, y: 9 }), box(3.6, 1, 3.6, { x, y: 0.5 })));
  parts.push(box(26, 2.2, 2.8, { y: 19.2 }), box(30, 1.1, 3.4, { y: 21.2 }), box(20, 1, 1.4, { y: 15.4 }));
  for (let i = 0; i < 4; i += 1) parts.push(box(36 - i * 4, 0.6, 14 - i * 2, { y: 0.3 + i * 0.6 - 2.4, z: 1 }));
  const ring = neon([tor(5, 0.12, 4, 48), tor(3.4, 0.1, 4, 36)], a, 1.8);
  const plaque = neon([box(9, 5.4, 0.6, { y: 9.5 }), gridXY(7, 3.4, 7, 3, { y: 9.5, z: 0.4 })], a, 1.4);
  const g = wrap(neon(parts, W), plaque, ring);
  ring.position.y = 31; ring.rotation.x = Math.PI / 2;
  return { group: g, h: 34, r: 24, update: (t) => { ring.rotation.z = t * 0.6; ring.position.y = 31 + Math.sin(t) * 0.8; } };
}

function campus(a) {
  const parts = []; const win = [];
  parts.push(box(66, 16, 13, { y: 8 }), box(18, 24, 13, { x: -4, y: 12 }), box(10, 4, 7, { x: -4, y: 26 }), cyl(8, 8, 16, 20, { x: 38, y: 8 }));
  parts.push(ln([-4, 28, 0], [-4, 46, 0]), ln([-8, 40, 0], [0, 40, 0]), ln([-6, 35, 0], [-2, 35, 0]));
  parts.push(box(22, 0.8, 7, { x: -4, y: 6.4, z: 9.5 }), box(40, 1.6, 16, { x: -4, y: -0.8, z: 2 }));
  for (let i = 0; i < 4; i += 1) parts.push(box(16 - i, 0.5, 2, { x: -4, y: 0.25 + i * 0.5 - 1.5, z: 12 + i }));
  [-9, -1].forEach((x) => parts.push(ln([x, 6, 9.5], [x + 1.5, 0, 9.5]), ln([x + 5, 6, 9.5], [x + 1.5, 0, 9.5])));
  // windows: bay grids left and right of the centre block, ground-floor row, the big glass wall
  for (let f = 0; f < 3; f += 1) {
    for (let c = 0; c < 4; c += 1) win.push(rect(3.4, 3.4, { x: -29 + c * 5.6, y: 4 + f * 4.4, z: 6.6 }), rect(3.4, 3.4, { x: 14 + c * 5.6, y: 4 + f * 4.4, z: 6.6 }));
    win.push(rect(1.6, 2.6, { x: -12.6, y: 4 + f * 4.4, z: 6.6 }), rect(1.6, 2.6, { x: 4.6, y: 4 + f * 4.4, z: 6.6 }));
  }
  win.push(gridXY(11, 14, 9, 11, { x: -4, y: 13, z: 6.7 }));
  for (let c = 0; c < 7; c += 1) win.push(rect(2.2, 1.8, { x: -32 + c * 4.8, y: 1.6, z: 6.6 }));
  const rot = [];
  for (let c = 1; c < 8; c += 1) rot.push(ln([38 + Math.cos((c / 8) * Math.PI * 2) * 8, 0.2, Math.sin((c / 8) * Math.PI * 2) * 8], [38 + Math.cos((c / 8) * Math.PI * 2) * 8, 15.8, Math.sin((c / 8) * Math.PI * 2) * 8]));
  const g = wrap(neon(parts, W), neon([win, rot], a, 1.3, 0.9));
  g.scale.setScalar(0.72);
  return { group: g, h: 34, r: 34, update: () => {} };
}

function tower(a) {
  const parts = [box(15, 10, 15, { y: 5 }), box(12, 8, 12, { y: 14 }), box(9, 8, 9, { y: 22 }), cone(3.6, 6, 4, { y: 29, ry: Math.PI / 4 }), ln([0, 32, 0], [0, 42, 0]), ln([-2, 38, 0], [2, 38, 0])];
  const fl = [];
  for (let y = 2; y < 26; y += 2.4) { const s = y < 10 ? 15 : y < 18 ? 12 : 9; fl.push(box(s + 0.2, 0.1, s + 0.2, { y })); }
  const windows = [];
  for (let y = 2; y < 26; y += 2.4) for (let i = -2; i <= 2; i += 1) { const s = y < 10 ? 7.5 : y < 18 ? 6 : 4.5; if (Math.abs(i * 2.6) < s - 0.5) windows.push(rect(1.2, 1.3, { x: i * 2.6, y: y + 1.2, z: s + 0.1 })); }
  // a film reel beside it: the text-to-video pipeline
  const reel = neon([tor(6, 0.35, 4, 40), ...[0, 1, 2, 3, 4, 5].map((i) => ln([0, 0, 0], [Math.cos((i / 6) * Math.PI * 2) * 6, Math.sin((i / 6) * Math.PI * 2) * 6, 0])), ...[0, 1, 2, 3, 4].map((i) => tor(1.1, 0.1, 3, 14, { x: Math.cos((i / 5) * Math.PI * 2) * 3.4, y: Math.sin((i / 5) * Math.PI * 2) * 3.4 }))], a, 1.7);
  reel.position.set(21, 14, 0);
  const play = neon([pl([[-1.6, -2, 0], [2.4, 0, 0], [-1.6, 2, 0]], true, { x: 21, y: 14 })], a, 1.7);
  const g = wrap(neon(parts, W), neon([fl, windows], a, 1.1, 0.75), reel, play);
  return { group: g, h: 40, r: 34, update: (t) => { reel.rotation.z = -t * 0.7; } };
}

function podium(a) {
  const steps = [box(8, 10, 8, { y: 5 }), box(8, 7, 8, { x: -9, y: 3.5 }), box(8, 5, 8, { x: 9, y: 2.5 })];
  const cup = lathe([[0, 0], [1.6, 0], [1.6, 0.7], [0.5, 1.2], [0.5, 3], [2.6, 4.6], [3.1, 7], [2.6, 7.6], [0, 7.6]], 14);
  const handles = [tor(1.5, 0.12, 4, 14, { x: 3.2, y: 5.6, rz: 0.5 }), tor(1.5, 0.12, 4, 14, { x: -3.2, y: 5.6, rz: -0.5 })];
  const trophy = neon([cup, handles], a, 1.9); trophy.position.y = 12;
  const halo = neon([tor(6, 0.1, 3, 48)], COLORS.gold, 1.4, 0.8); halo.position.y = 16; halo.rotation.x = Math.PI / 2;
  const stars = neon([1, 2, 3].map((i) => pl([[0, 0.9, 0], [0.3, 0.3, 0], [0.9, 0.3, 0], [0.4, -0.1, 0], [0.6, -0.8, 0], [0, -0.35, 0], [-0.6, -0.8, 0], [-0.4, -0.1, 0], [-0.9, 0.3, 0], [-0.3, 0.3, 0]], true, { x: (i - 2) * 9, y: [6.5, 10.5, 4.5][i - 1] + 0.1, z: 4.2, s: 1.5 })), a, 1.4);
  const g = wrap(neon(steps, W), trophy, halo, stars);
  return { group: g, h: 22, r: 20, update: (t) => { trophy.rotation.y = t * 0.8; halo.rotation.z = t * 0.5; } };
}

function gearShape(R, teeth, z, a) {
  const pts = [];
  for (let i = 0; i < teeth; i += 1) {
    const s = (Math.PI * 2) / teeth;
    [[0.04, R], [0.2, R * 1.2], [0.42, R * 1.2], [0.58, R]].forEach(([k, r]) => pts.push([Math.cos(i * s + s * k) * r, Math.sin(i * s + s * k) * r, z]));
  }
  return pl(pts, true);
}
function gears(a) {
  const mk = (R, teeth, color) => {
    const front = gearShape(R, teeth, 0.9); const back = gearShape(R, teeth, -0.9);
    const links = []; for (let i = 0; i < teeth * 4; i += 4) links.push(ln([front[i * 6], front[i * 6 + 1], 0.9], [front[i * 6], front[i * 6 + 1], -0.9]));
    const hub = [tor(R * 0.28, 0.1, 3, 18, {}), circle(R * 0.6, 24, { rx: Math.PI / 2, y: 0.9 })];
    const spokes = [0, 1, 2, 3, 4, 5].map((i) => ln([Math.cos((i / 6) * Math.PI * 2) * R * 0.28, Math.sin((i / 6) * Math.PI * 2) * R * 0.28, 0.9], [Math.cos((i / 6) * Math.PI * 2) * R * 0.6, Math.sin((i / 6) * Math.PI * 2) * R * 0.6, 0.9]));
    return neon([front, back, links, hub, spokes], color, 1.6);
  };
  const g1 = mk(9, 14, W); const g2 = mk(6, 10, a); const g3 = mk(4, 7, W);
  g1.position.set(-3, 8, 0); g2.position.set(11.2, 14.6, 0); g3.position.set(8.2, -1.5, 0);
  return { group: wrap(g1, g2, g3), h: 22, r: 22, update: (t) => { g1.rotation.z = t * 0.3; g2.rotation.z = -t * 0.3 * (14 / 10) + 0.2; g3.rotation.z = -t * 0.3 * (14 / 7) + 0.1; } };
}

function compass(a) {
  const ticks = []; for (let i = 0; i < 48; i += 1) { const t = (i / 48) * Math.PI * 2; const r1 = i % 12 === 0 ? 10.5 : i % 4 === 0 ? 11.4 : 12; ticks.push(ln([Math.cos(t) * r1, 0, Math.sin(t) * r1], [Math.cos(t) * 12.6, 0, Math.sin(t) * 12.6])); }
  const arms = [0, 1, 2, 3].map((i) => { const t = (i * Math.PI) / 2; const c = Math.cos(t); const s = Math.sin(t); return pl([[c * 14, 0, s * 14], [-s * 1.6, 0, c * 1.6], [0, 0, 0], [s * 1.6, 0, -c * 1.6]], true); });
  const needle = neon([cone(1.4, 9, 4, { y: 4.5, rx: Math.PI / 2, ry: Math.PI / 4 }), cone(1.4, 9, 4, { y: -4.5, rx: -Math.PI / 2, ry: Math.PI / 4 })].map((x) => xf(x, { rx: Math.PI / 2 })), a, 2);
  needle.position.y = 6;
  const post = neon([ln([0, 0, 0], [0, 6, 0]), cyl(1.2, 1.8, 1.2, 8, { y: 0.6 })], W);
  const boards = neon([0, 1, 2].map((i) => xf(merge(rect(7, 1.8, {}), pl([[3.5, 0.9, 0], [5, 0, 0], [3.5, -0.9, 0]])), { x: 0, y: 8 + i * 2.6, z: 0, ry: i * 0.9 - 0.7 })), a, 1.2, 0.85);
  boards.position.set(0, 4, -14);
  const base = neon([tor(12, 0.25, 3, 56, { rx: Math.PI / 2 }), tor(9, 0.12, 3, 44, { rx: Math.PI / 2 }), ticks, arms], W);
  return { group: wrap(base, post, needle, boards), h: 22, r: 22, update: (t) => { needle.rotation.y = Math.sin(t * 0.7) * 1.4 + t * 0.3; } };
}

// ------------------------------------------------------------------ MY BUILDS
function orderbook(a) {
  const bids = []; const asks = []; const candles = []; const wick = [];
  for (let i = 0; i < 12; i += 1) {
    const hb = 3 + (11 - i) * 1.3 + (i % 3) * 0.6; const ha = 3 + (11 - i) * 1.1 + ((i + 1) % 3) * 0.7;
    bids.push(box(1.6, hb, 2.4, { x: -2.6 - i * 2, y: hb / 2 })); asks.push(box(1.6, ha, 2.4, { x: 2.6 + i * 2, y: ha / 2 }));
  }
  const prices = [14, 17, 15, 20, 18, 24, 22]; prices.forEach((p, i) => { const up = i % 2 === 0; candles.push(box(1.6, 3 + (i % 3), 1.6, { x: -9 + i * 3, y: 26 + p * 0.45, z: 0 })); wick.push(ln([-9 + i * 3, 24 + p * 0.45, 0], [-9 + i * 3, 31 + p * 0.45 + (up ? 2 : 0), 0])); });
  const trend = pl(prices.map((p, i) => [-9 + i * 3, 27 + p * 0.45, 0]));
  const spread = neon([box(2.4, 0.4, 3, { y: 0.2 })], a, 2);
  const g = wrap(neon(bids, COLORS.neon, 1.6), neon(asks, COLORS.blood, 1.6), neon([candles, wick], W, 1.5), neon([trend], a, 2.2), spread, neon([box(60, 0.4, 5, { y: -0.2 })], W, 1.2, 0.6));
  return { group: g, h: 38, r: 34, update: (t) => { spread.position.y = Math.sin(t * 2) * 0.4; } };
}

function vase(a) {
  const prof = [[0, 0], [4, 0], [5.5, 3], [7.2, 8], [6.6, 13], [3.6, 16.5], [3, 19], [4.2, 21.5], [4.6, 23], [0, 23]];
  const body = lathe(prof, 18);
  const bands = []; [4, 9, 14].forEach((y) => bands.push(circle(7 - Math.abs(y - 9) * 0.16, 36, { y })));
  const weave = []; for (let i = 0; i < 12; i += 1) weave.push(ln([Math.cos((i / 12) * Math.PI * 2) * 5, 5, Math.sin((i / 12) * Math.PI * 2) * 5], [Math.cos(((i + 1) / 12) * Math.PI * 2) * 6.9, 11, Math.sin(((i + 1) / 12) * Math.PI * 2) * 6.9]));
  const pot = (x, s) => neon([lathe(prof.map(([r, y]) => [r * s, y * s]), 12, { x, z: 6 })], a, 1.3, 0.8);
  const loom = neon([box(30, 24, 0.6, { y: 12, z: -9 }), ...Array.from({ length: 14 }, (_, i) => ln([-14 + i * 2.15, 0.6, -9], [-14 + i * 2.15, 23.4, -9])), ...Array.from({ length: 3 }, (_, i) => ln([-14, 7 + i * 5, -9], [14, 7 + i * 5, -9]))], W, 1, 0.5);
  const v = neon([body, bands, weave], a, 1.8);
  const g = wrap(v, pot(-14, 0.45), pot(14, 0.35), loom, floorRing(9, a));
  return { group: g, h: 26, r: 28, update: (t) => { v.rotation.y = t * 0.5; } };
}

function ledger(a) {
  const slabs = []; const checks = []; const rails = [];
  for (let i = 0; i < 5; i += 1) {
    const x = (i % 2 === 0 ? -1 : 1) * 1.6;
    slabs.push(box(12, 0.9, 8, { x, y: 1 + i * 4 }));
    checks.push(pl([[-2.2 + x, 1.5 + i * 4, 1], [-0.8 + x, 1.5 + i * 4, 2.2], [2.2 + x, 1.5 + i * 4, -1.4]], false, { y: 0 }));
    if (i < 4) rails.push(ln([x - 5, 1.5 + i * 4, 4], [-x * 1 - 5, 3.2 + i * 4, 4]), ln([x + 5, 1.5 + i * 4, 4], [-x + 5, 3.2 + i * 4, 4]));
  }
  const arrows = [0, 1, 2, 3].map((i) => cone(0.7, 1.6, 4, { x: 9, y: 3 + i * 4, rz: Math.PI, ry: Math.PI / 4 }));
  const top = neon([slabs[4], checks[4]], a, 2);
  const g = wrap(neon([slabs.slice(0, 4), checks.slice(0, 4), rails, arrows, ln([9, 0, 0], [9, 19, 0])], W), top, floorRing(10, a));
  return { group: g, h: 24, r: 22, update: (t) => { top.position.y = Math.sin(t * 1.5) * 0.7; } };
}

function knot(a) {
  const k = neon([knotG(8, 1.7)], a, 1.5); k.position.y = 12;
  const coins = neon([cyl(1.7, 1.7, 0.35, 14, { rx: Math.PI / 2 })], W, 1.6); const coin2 = neon([cyl(1.7, 1.7, 0.35, 14, { rx: Math.PI / 2 })], W, 1.6); const coin3 = neon([cyl(1.7, 1.7, 0.35, 14, { rx: Math.PI / 2 })], COLORS.gold, 1.6);
  const arr = neon([tor(14, 0.12, 3, 64, { rx: Math.PI / 2 }), cone(1, 2.4, 4, { x: 14, rx: 0, rz: -Math.PI / 2 + 0.2, ry: Math.PI / 4 })], W, 1.2, 0.6); arr.position.y = 12;
  return { group: wrap(k, coins, coin2, coin3, arr), h: 26, r: 24, update: (t) => { k.rotation.y = t * 0.4; k.rotation.x = Math.sin(t * 0.3) * 0.3; [coins, coin2, coin3].forEach((c, i) => { const ang = t * 0.8 + (i * Math.PI * 2) / 3; c.position.set(Math.cos(ang) * 14, 12 + Math.sin(t * 2 + i) * 0.6, Math.sin(ang) * 14); c.rotation.y = ang; }); } };
}

function archive(a) {
  const cubes = []; const inner = [];
  for (let i = 0; i < 14; i += 1) { const ang = (i / 14) * Math.PI * 2 * 1.5; const y = 3 + i * 1.8; const r = 13; const t = { x: Math.cos(ang) * r, y, z: Math.sin(ang) * r, ry: -ang }; cubes.push(box(4, 4, 4, t)); inner.push(box(2, 2, 2, t)); }
  const spine = neon([ln([0, 0, 0], [0, 32, 0]), circle(3, 24, { y: 4 }), circle(3, 24, { y: 16 }), circle(3, 24, { y: 28 })], W, 1.3, 0.7);
  const g = wrap(neon(cubes, W), neon(inner, a, 1.6), spine, floorRing(16, a));
  return { group: g, h: 34, r: 28, update: (t) => { g.rotation.y = t * 0.25; } };
}

// ------------------------------------------------------------------ HOW I THINK
function brain(a) {
  const rng = makeRng(5); const pts = Array.from({ length: 44 }, () => { const u = rng() * 2 - 1; const th = rng() * Math.PI * 2; const r = 6 + rng() * 6; const s = Math.sqrt(1 - u * u); return [Math.cos(th) * s * r, u * r * 0.9, Math.sin(th) * s * r]; });
  const links = []; pts.forEach((p, i) => { const d = pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2); d.forEach(([j]) => links.push(ln(p, pts[j]))); });
  const nodes = pts.map((p) => ico(0.5, 0, { x: p[0], y: p[1], z: p[2] }));
  const shell = neon([ico(13.5, 1)], W, 1.1, 0.55); const net = neon([links, nodes], a, 1.5);
  const g = wrap(shell, net, floorRing(14, a)); shell.position.y = 15; net.position.y = 15;
  return { group: g, h: 30, r: 26, update: (t) => { shell.rotation.y = t * 0.15; net.rotation.y = t * 0.15; net.rotation.x = Math.sin(t * 0.2) * 0.1; } };
}

function clipbars(a) {
  const ok = []; const clipped = []; const caps = [];
  const spec = [[10, 1], [-10, 1], [1.5, 0], [10, 1], [-1.2, 0], [-10, 1]];
  spec.forEach(([v, pinned], i) => { const x = -12.5 + i * 5; const h = Math.abs(v) * 1.4; const arr = pinned ? clipped : ok; arr.push(box(2.8, h, 2.8, { x, y: 14 + (v > 0 ? h / 2 : -h / 2) })); if (pinned) caps.push(box(4.2, 0.5, 4.2, { x, y: 14 + (v > 0 ? 14 : -14) })); });
  const frame = [gridXY(32, 4, 8, 1, { y: 28.4, rx: Math.PI / 2 }), gridXY(32, 4, 8, 1, { y: -0.4, rx: Math.PI / 2 }), ln([-16, 14, 0], [16, 14, 0]), ln([-16, 0, 0], [-16, 28, 0]), ln([16, 0, 0], [16, 28, 0])];
  const pinnedObj = neon([clipped, caps], COLORS.blood, 2.2); const okObj = neon([ok], COLORS.neon, 1.8);
  const g = wrap(neon(frame, W, 1.1, 0.6), pinnedObj, okObj);
  return { group: g, h: 30, r: 24, update: (t) => { pinnedObj.material.opacity = 0.65 + Math.sin(t * 5) * 0.3; } };
}

function pillars4(a) {
  const solid = []; const cracks = []; const broken = [];
  for (let i = 0; i < 4; i += 1) {
    const x = -13.5 + i * 9; const h = 14 + (i % 2) * 3;
    solid.push(box(3.4, h * 0.62, 3.4, { x, y: (h * 0.62) / 2 }), box(5, 0.8, 5, { x, y: 0.4 }));
    broken.push(box(3.4, h * 0.34, 3.4, { x: x + 1.4, y: h * 0.62 + 1.6 + i * 0.4, rz: 0.18 }));
    cracks.push(pl([[x - 1.7, h * 0.2, 1.75], [x - 0.3, h * 0.32, 1.75], [x - 1, h * 0.4, 1.75], [x + 0.5, h * 0.52, 1.75], [x + 0.2, h * 0.62, 1.75]]));
  }
  const bro = neon([broken, cracks], a, 2);
  return { group: wrap(neon(solid, W), bro, floorRing(18, a)), h: 20, r: 24, update: (t) => { bro.position.y = Math.sin(t * 1.2) * 0.4; } };
}

function bridge(a) {
  const arch = pl(Array.from({ length: 25 }, (_, i) => { const x = -14 + (28 * i) / 24; return [x, 4 + 9 * Math.sqrt(Math.max(0, 1 - (x / 14) ** 2)), 0]; }));
  const hangers = Array.from({ length: 11 }, (_, i) => { const x = -12 + i * 2.4; return ln([x, 6, 0], [x, 4 + 9 * Math.sqrt(Math.max(0, 1 - (x / 14) ** 2)), 0]); });
  const deck = [box(32, 0.8, 5, { y: 5.4 }), box(5, 6, 6, { x: -17, y: 3 }), box(5, 6, 6, { x: 17, y: 3 })];
  const water = []; for (let i = 0; i < 6; i += 1) water.push(pl(Array.from({ length: 14 }, (_, k) => [-14 + (28 * k) / 13, -1 - i * 0.5, 6 + Math.sin(k + i) * 0.5])));
  const arc = neon([arch, hangers], a, 2.2); const g = wrap(neon(deck, W), arc, neon(water, COLORS.volt, 1, 0.4));
  return { group: g, h: 18, r: 28, update: (t) => { arc.material.opacity = 0.8 + Math.sin(t * 2) * 0.15; } };
}

function lattice(a) {
  const cubes = []; const hot = [];
  for (let x = 0; x < 3; x += 1) for (let y = 0; y < 3; y += 1) for (let z = 0; z < 3; z += 1) { const t = { x: (x - 1) * 7, y: 10 + (y - 1) * 7, z: (z - 1) * 7 }; if (x === 1 && y === 1 && z === 1) hot.push(box(4.6, 4.6, 4.6, t), box(2.6, 2.6, 2.6, t)); else cubes.push(box(4, 4, 4, t)); }
  const lines = [ln([-7, 10, 0], [7, 10, 0]), ln([0, 3, 0], [0, 17, 0]), ln([0, 10, -7], [0, 10, 7])];
  const g = wrap(neon([cubes], W, 1.4, 0.8), neon([hot, lines], a, 2));
  return { group: g, h: 28, r: 24, update: (t) => { g.rotation.y = t * 0.3; g.rotation.x = Math.sin(t * 0.4) * 0.15; } };
}

// ------------------------------------------------------------------ WISPR PITCH
function mic(a) {
  const head = neon([sph(4.2, 14, 10, { sy: 1.5 }), ...[-4, -2, 0, 2, 4, 6].map((y) => circle(Math.sqrt(Math.max(0.1, 17.6 - (y / 1.5) ** 2)), 24, { y }))], a, 1.7);
  head.position.y = 16;
  const body = neon([cyl(3, 2.2, 8, 14, { y: 6 }), cyl(3.6, 3.6, 0.8, 14, { y: 10.4 }), cyl(0.7, 0.7, 4, 8, { y: 0 }), cyl(5, 6, 1, 18, { y: -2 })], W);
  const waves = [0, 1, 2].map((i) => { const w = neon([tor(8 + i * 3, 0.1, 3, 40, { rx: Math.PI / 2 })], a, 1.4); w.position.y = 16; return w; });
  return { group: wrap(head, body, ...waves), h: 24, r: 20, update: (t) => { waves.forEach((w, i) => { const k = (t * 0.4 + i / 3) % 1; w.scale.setScalar(0.6 + k * 1.4); w.material.opacity = (1 - k) * 0.85; }); } };
}

function crowd(a) {
  const people = []; const rings = []; let n = 0;
  [[8, 8], [14, 12], [20, 16]].forEach(([r, c], ri) => { rings.push(circle(r - 2.2, 50)); for (let i = 0; i < c; i += 1) { const t = (i / c) * Math.PI * 2 + ri; people.push(merge(cyl(0.7, 1, 2.6, 6, { x: Math.cos(t) * r, y: 1.3, z: Math.sin(t) * r }), sph(0.8, 6, 5, { x: Math.cos(t) * r, y: 3.4, z: Math.sin(t) * r }))); n += 1; } });
  const beam = neon([cyl(0.4, 2.4, 22, 8, { y: 11 }), tor(2.8, 0.12, 3, 24, { rx: Math.PI / 2, y: 22 })], a, 2);
  const crowdObj = neon(people, a, 1.3, 0.85);
  return { group: wrap(crowdObj, neon(rings, W, 1, 0.4), beam), h: 24, r: 30, update: (t) => { crowdObj.position.y = Math.sin(t * 2) * 0.25; beam.rotation.y = t * 0.8; } };
}

function wave(a) {
  const mk = (idx) => { const bars = []; for (let i = idx; i < 24; i += 3) { const t = (i / 24) * Math.PI * 2; bars.push(box(1.4, 8 + Math.abs(Math.sin(i * 1.7)) * 8, 1.4, { x: Math.cos(t) * 11, y: 6 + Math.abs(Math.sin(i * 1.7)) * 4, z: Math.sin(t) * 11 })); } return neon(bars, idx === 1 ? W : a, 1.6); };
  const groups = [mk(0), mk(1), mk(2)];
  const rings = [0, 1, 2].map((i) => { const r = neon([tor(6, 0.1, 3, 44, { rx: Math.PI / 2 })], a, 1.4); r.position.y = 0.4; return r; });
  return { group: wrap(...groups, ...rings, floorRing(13, W)), h: 22, r: 22, update: (t) => { groups.forEach((g, i) => { g.scale.y = 0.55 + 0.45 * Math.abs(Math.sin(t * 2 + i * 1.3)); }); rings.forEach((r, i) => { const k = (t * 0.35 + i / 3) % 1; r.scale.setScalar(0.5 + k * 2.2); r.material.opacity = (1 - k) * 0.8; }); } };
}

function megaphone(a) {
  const body = neon([cone(7, 14, 14, { x: 6, rz: -Math.PI / 2 }), cyl(2.4, 2.4, 6, 10, { x: -4, rz: Math.PI / 2 }), box(3, 7, 2.4, { x: -2, y: -6, rz: -0.25 }), tor(7, 0.3, 3, 24, { x: 13, ry: Math.PI / 2 })], a, 1.8);
  body.position.y = 12;
  const arcs = [0, 1, 2, 3].map((i) => { const m = neon([tor(4 + i * 2.5, 0.1, 3, 24, { ry: Math.PI / 2 })], W, 1.3); m.position.set(16, 12, 0); return m; });
  return { group: wrap(body, ...arcs, floorRing(10, a)), h: 22, r: 26, update: (t) => { arcs.forEach((r, i) => { const k = (t * 0.45 + i / 4) % 1; r.position.x = 14 + k * 14; r.scale.setScalar(0.6 + k * 1.2); r.material.opacity = (1 - k) * 0.85; }); } };
}

function kpibars(a) {
  const bars = Array.from({ length: 8 }, (_, i) => { const h = 3 + i * 2.6; return box(3, h, 3, { x: -14 + i * 4, y: h / 2 }); });
  const line = pl(Array.from({ length: 8 }, (_, i) => [-14 + i * 4, 5 + i * 2.8 + (i % 2) * 1.2, 2]));
  const axes = [ln([-18, 0, 0], [18, 0, 0]), ln([-18, 0, 0], [-18, 26, 0]), ...[1, 2, 3, 4].map((i) => ln([-18, i * 6, 0], [18, i * 6, 0]))];
  const gauge = neon([tor(4, 0.2, 3, 30), ln([0, 0, 0], [3, 2.6, 0])], a, 2); gauge.position.set(-12, 30, 0);
  const g = wrap(neon(bars, a, 1.8), neon([line], W, 2.2), neon(axes, W, 1, 0.4), gauge);
  return { group: g, h: 34, r: 26, update: (t) => { gauge.rotation.z = Math.sin(t) * 0.4; } };
}

function calendar(a) {
  const weeks = [[], [], [], []]; const frames = [];
  for (let d = 0; d < 30; d += 1) { const wk = Math.min(3, Math.floor(d / 7.5)); const col = d % 6; const row = Math.floor(d / 6); weeks[wk].push(box(3, 0.8, 3, { x: -10 + col * 4, z: -8 + row * 4, y: 0.4 })); }
  frames.push(box(28, 0.3, 24, { y: -0.2, z: 0 }));
  const cols = [COLORS.neon, COLORS.volt, COLORS.aura, COLORS.ember];
  const objs = weeks.map((w, i) => neon(w, cols[i], 1.7));
  return { group: wrap(neon(frames, W, 1, 0.5), ...objs), h: 10, r: 22, update: (t) => { objs.forEach((o, i) => { o.position.y = Math.max(0, Math.sin(t * 1.6 - i * 0.9)) * 2.2; }); } };
}

function infinity(a) {
  const curve = (z) => Array.from({ length: 80 }, (_, i) => { const t = (i / 80) * Math.PI * 2; const d = 1 + Math.sin(t) ** 2; return [(13 * Math.cos(t)) / d, 14 + (13 * Math.sin(t) * Math.cos(t)) / d, z]; });
  const lines = [pl(curve(-1.5), true), pl(curve(0), true), pl(curve(1.5), true)];
  const ribs = Array.from({ length: 30 }, (_, i) => { const t = (i / 30) * Math.PI * 2; const d = 1 + Math.sin(t) ** 2; const p = [(13 * Math.cos(t)) / d, 14 + (13 * Math.sin(t) * Math.cos(t)) / d]; return ln([p[0], p[1], -1.5], [p[0], p[1], 1.5]); });
  const orb = neon([box(1.6, 1.6, 1.6)], W, 2);
  const g = wrap(neon([lines, ribs], a, 1.6), orb, floorRing(12, a));
  return { group: g, h: 30, r: 24, update: (t) => { g.rotation.y = Math.sin(t * 0.3) * 0.5; const d = 1 + Math.sin(t) ** 2; orb.position.set((13 * Math.cos(t)) / d, 14 + (13 * Math.sin(t) * Math.cos(t)) / d, 0); orb.rotation.set(t, t * 1.3, 0); } };
}

export const MONUMENTS = { gate, campus, tower, podium, gears, compass, orderbook, vase, ledger, knot, archive, brain, clipbars, pillars4, bridge, lattice, mic, crowd, wave, megaphone, kpibars, calendar, infinity };

export function buildMonument(name, accent) {
  const make = MONUMENTS[name] || MONUMENTS.compass;
  return make(accent);
}
