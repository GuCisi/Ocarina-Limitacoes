// Scene `plaza`: the town square with the GIANT cartridge on its pedestal.
// Shot 1 (hook): sparkle ring, eight photos stream from a phone into the cartridge, satisfied bounce.
// Shot 11 (release, golden): cloth whipped away, crowd cheers, confetti, the strength-tester tower (99 vs the rest).
// Shot 14 (end, golden): the photos pop back out and orbit; hero, fairy and producer look up, content.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Batch, lam, boxGeo, house, addVeg, V } from "../build";
import { cobbleHD, stoneHD, ctex } from "../paint";
import { SHOTS, dolly, pushK, pop, clamp01, easeOut, lerp, smooth, V3 } from "../timeline";
import { act, WHO } from "../chars";
import { makeCartridge, makePhoto, Fairy, flatMat, paintedFace } from "../props";
import { hh } from "../cast";
import { Pen, Expr } from "../toon";
import type { Scene, Frame } from "./types";

// ---------------- layout ----------------
const PED_H = 1.2, CART_S = 8, CART_TOP = PED_H + 0.3 * CART_S; // 3.6 m
const TX = 3.6, TZ = -0.2; // strength tester
const COL0 = 0.4, COL1 = 5.4, PUCK_REST = 0.52, PUCK_TOP = 5.22;
const PAD: V3 = [TX, 0.16, TZ + 0.78];
const BOX_S = [1853, 1868, 1881], BOX_H = [1.95, 2.65, 1.3];
const BOX_COL = ["#3f6fb5", "#5d9a3a", "#8a4fb0"];
const ENTER = (k: number) => 59 + 5 * k; // shot 1: photo k dives into the cartridge
const POP14 = (k: number) => 2062 + 2.5 * k; // shot 14: photo k pops back out
const WHIP = 1762;
const CART_YAW1 = -0.85;
const CART_YAW2 = -0.7; // shots 11 + 14 (the face turned away from the lens, so the shell's thickness reads 3/4)

// ---------------- little drawings ----------------
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const t = ((a + 15 * i) * Math.PI) / 180; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return pts;
};
const drawSparkle = (p: Pen) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) { const r = k % 2 ? 22 : 92, a = (k * Math.PI) / 4 - Math.PI / 2; pts.push([100 + r * Math.cos(a), 100 + r * Math.sin(a)]); }
  p.poly(pts, "#fff4b8", 0);
  p.dot(100, 100, 20, "#ffffff");
};
const drawPhone = (p: Pen) => {
  p.poly(rr(10, 10, 150, 250, 26), "#2c2e3a", 9);
  p.poly(rr(26, 30, 134, 222, 10), "#a8ecff", 0);
  p.g.fillStyle = "rgba(255,255,255,0.55)"; p.g.fillRect(36, 40, 30, 172);
  p.dot(80, 236, 6, "#5a5d6c");
};
const CONF = ["#f2c14e", "#e2453c", "#3f8fd2", "#5ab84a", "#f08ab0", "#fff6e0"];
const drawConf = (c: string) => (p: Pen) => { p.poly([[4, 4], [60, 4], [60, 36], [4, 36]], c, 0); };
const drawRay = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 0, 400);
  gr.addColorStop(0, "rgba(255,240,190,0)"); gr.addColorStop(0.5, "rgba(255,240,190,0.55)"); gr.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(40, 400); g.lineTo(60, 0); g.lineTo(140, 0); g.lineTo(160, 400); g.fill();
};

// ---------------- meshes ----------------
const clothGeo = () => {
  // superellipse drape over the cartridge: rounded shoulders on top, folds that deepen and flare toward the hem
  const NT = 56, NV = 22, A = 1.86, B = 0.46, top = CART_TOP + 0.08, bot = PED_H + 0.01, H = top - bot;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    let rf: number, y: number;
    if (v < 0.22) { const ph = (v / 0.22) * (Math.PI / 2); rf = Math.sin(ph); y = top - 0.26 * (1 - Math.cos(ph)); }
    else { const s = (v - 0.22) / 0.78; rf = 1 + 0.08 * s * s; y = top - 0.26 - s * (H - 0.26); }
    const s2 = Math.max(0, (v - 0.22) / 0.78);
    for (let i = 0; i <= NT; i++) {
      const th = (i / NT) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const fold = 1 + 0.06 * s2 * Math.sin(9 * th + 0.7) + 0.03 * s2 * Math.sin(5 * th);
      const x = A * rf * fold * Math.sign(c) * Math.abs(c) ** 0.5, z = B * rf * fold * Math.sign(sn) * Math.abs(sn) ** 0.5;
      pos.push(x, y + (v > 0.95 ? 0.03 * Math.sin(7 * th) : 0), z); uv.push((i / NT) * 6, v * 3);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NT; i++) {
    const a = j * (NT + 1) + i, b = a + 1, c = a + NT + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const starGeo = (r0: number, r1: number, d: number) => {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? r0 : r1, a = (k * Math.PI) / 5 + Math.PI / 2; if (k) s.lineTo(r * Math.cos(a), r * Math.sin(a)); else s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
};
const scaleTex = () => ctex("plazaScale", 128, 1024, (g) => {
  const bands = ["#5ab84a", "#9ccf3e", "#e8d040", "#f2a23a", "#e8643a", "#d23a3a"];
  for (let i = 0; i < 6; i++) { g.fillStyle = bands[i]; g.fillRect(0, 1024 - (i + 1) * (1024 / 6), 128, 1024 / 6 + 1); }
  g.fillStyle = "#241726";
  for (let i = 1; i < 24; i++) { const y = 1024 - i * (1024 / 24); g.fillRect(i % 4 ? 72 : 30, y - 3, 128, 6); }
  g.fillRect(0, 0, 10, 1024); g.fillRect(118, 0, 10, 1024);
});
const boxFace = (k: number) => ctex("plazaBox" + k, 256, 356, (g) => {
  g.fillStyle = ["#5e8fd8", "#86c25a", "#a874d0"][k]; g.fillRect(0, 0, 256, 356);
  g.strokeStyle = "#241726"; g.lineWidth = 10; g.lineJoin = "round"; g.strokeRect(12, 12, 232, 332);
  g.fillStyle = ["#ffd75e", "#f6f2e8", "#f2a23a"][k];
  g.beginPath();
  if (k === 0) g.arc(128, 170, 70, 0, 7);
  else if (k === 1) { g.moveTo(128, 90); g.lineTo(210, 240); g.lineTo(46, 240); g.closePath(); }
  else for (let i = 0; i < 10; i++) { const r = i % 2 ? 34 : 80, a = (i * Math.PI) / 5 - Math.PI / 2; g.lineTo(128 + r * Math.cos(a), 175 + r * Math.sin(a)); }
  g.fill(); g.stroke();
});

const pinsTex = () => ctex("plazaPins", 512, 72, (g) => {
  g.fillStyle = "#2f5a3a"; g.fillRect(0, 0, 512, 72);
  g.fillStyle = "#e8c45a"; for (let i = 0; i < 24; i++) g.fillRect(10 + i * 21, 14, 12, 58);
});

// ---------------- state built once ----------------
let cartPivot: THREE.Group, cloth: THREE.Mesh, tower: THREE.Group, bell: THREE.Group, puck: THREE.Mesh, star: THREE.Mesh;
let tabs: THREE.Mesh[] = [], boxes: THREE.Group[] = [], photos: THREE.Group[] = [];
let fairy: Fairy;
const cartMeshes: THREE.Mesh[] = [];
/** golden shots: a cool grey that ignores most of the orange key (emissive base + a little lambert for the side/top modelling) */
const coolMat = (c: THREE.Color) => new THREE.MeshLambertMaterial({ color: c.clone().multiplyScalar(0.28), emissive: c.clone().multiplyScalar(0.72) });

// ---------------- helpers ----------------
const camDist = (u: Frame, x: number, y: number, z: number) => Math.hypot(u.cam.pos.x - x, u.cam.pos.y - y, u.cam.pos.z - z);
const faceCam = (u: Frame, x: number, z: number) => Math.atan2(u.cam.pos.x - x, u.cam.pos.z - z);
const bez = (a: V3, b: V3, c: V3, t: number): V3 => [0, 1, 2].map((i) => (1 - t) * (1 - t) * a[i] + 2 * (1 - t) * t * b[i] + t * t * c[i]) as V3;
/** a ring of twinkling sparkles bursting outward around (cx, cy, cz) in the picture plane */
const sparkles = (u: Frame, f0: number, cx: number, cy: number, cz: number, n: number, r0: number, r1: number, life = 22, size = 1) => {
  const k = (u.f - f0) / life;
  if (k < 0 || k > 1) return;
  const R = lerp(r0, r1, easeOut(k)), right = u.cam.right;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3 * k + hh(i, 3), rad = R * (0.85 + 0.3 * hh(i, 5));
    const s = size * (0.25 + 0.3 * hh(i, 7)) * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.8 + 0.2 * Math.sin(u.f * 1.7 + i));
    if (s < 0.02) continue;
    const ox = Math.cos(a) * rad * 0.75, oy = Math.sin(a) * rad;
    u.out.fx.push({ key: "plazaSpark", cw: 200, ch: 200, draw: drawSparkle, x: cx + right.x * ox, y: cy + oy, z: cz + right.z * ox, w: s, h: s, rot: k * 2 + i, glow: 2.2, add: true });
  }
};

/** cartridge squash / hop: [scaleY, lift] */
const cartBounce = (f: number): [number, number] => {
  let sy = 1, lift = 0;
  for (let k = 0; k < 8; k++) { const d = f - ENTER(k); if (d >= 0 && d < 6) sy *= 1 - 0.05 * Math.sin((d / 6) * Math.PI); }
  // f96: satisfied squash + one hop
  const d = f - 93;
  if (d >= 0 && d < 3) sy *= 1 - 0.16 * smooth(d / 3);
  else if (d >= 3 && d < 13) { const t = (d - 3) / 10; lift = 0.55 * 4 * t * (1 - t); sy *= t < 0.5 ? 1.1 - 0.1 * t : 1.05; }
  else if (d >= 13 && d < 20) sy *= 1 - 0.12 * Math.sin(((d - 13) / 7) * Math.PI) * (1 - (d - 13) / 7);
  // shot 11: release wiggle, stomp for the tester
  const w = f - WHIP - 1;
  if (w >= 0 && w < 10) sy *= 1 + 0.08 * Math.sin((w / 10) * Math.PI);
  const s = f - 1799;
  if (s >= 0 && s < 6) { const t = s / 6; lift = 0.45 * 4 * t * (1 - t); sy *= 1.06; }
  else if (s >= 6 && s < 14) sy *= 1 - 0.15 * Math.sin(((s - 6) / 8) * Math.PI) * (1 - (s - 6) / 10);
  return [sy, lift];
};
/** puck height (centre) */
const puckY = (f: number) => {
  if (f >= 1805 && f < 1848) {
    if (f < 1823) return lerp(PUCK_REST, PUCK_TOP, easeOut((f - 1805) / 18));
    if (f < 1838) return PUCK_TOP - 0.02 * Math.sin((f - 1823) * 1.3) * Math.max(0, 1 - (f - 1823) / 8);
    const t = clamp01((f - 1838) / 7); return lerp(PUCK_TOP, PUCK_REST, t * t);
  }
  for (let k = 0; k < 3; k++) {
    const S = BOX_S[k], L = S - 5;
    if (f >= L && f < S + 7) {
      if (f < S) return lerp(PUCK_REST, BOX_H[k], easeOut((f - L) / 5));
      if (f < S + 3) return BOX_H[k];
      const t = clamp01((f - S - 3) / 4); return lerp(BOX_H[k], PUCK_REST, t * t);
    }
  }
  return PUCK_REST;
};
/** game box k: position, tilt (slump), squash, yaw */
const boxPose = (k: number, f: number) => {
  const S = BOX_S[k], Q: V3 = [4.5 + 0.62 * k, 0, 0.75], P: V3 = PAD, O: V3 = [4.3 + 0.62 * k, 0, -0.55];
  const hop = (a: V3, b: V3, t: number, h: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + h * 4 * t * (1 - t), lerp(a[2], b[2], t)];
  const idle = 0.03 * Math.max(0, Math.sin(f * 0.5 + k * 2));
  if (f < S - 10) return { x: Q[0], y: idle, z: Q[2], tilt: 0, sy: 1 - idle, yaw: -0.5 };
  if (f < S - 5) { const t = (f - (S - 10)) / 5, p = hop(Q, P, t, 0.9); return { x: p[0], y: p[1], z: p[2], tilt: 0.3 * Math.sin(t * Math.PI), sy: 1.08, yaw: lerp(-0.5, -0.25, t) }; }
  if (f < S + 2) { const d = f - (S - 5); return { x: P[0], y: P[1], z: P[2], tilt: 0, sy: 1 - 0.2 * Math.sin((d / 7) * Math.PI) * (d < 3 ? 1 : 0.5), yaw: -0.25 }; }
  if (f < S + 7) { const t = (f - (S + 2)) / 5, p = hop(P, O, t, 1.0); return { x: p[0], y: p[1], z: p[2], tilt: 0.2, sy: 1, yaw: -0.4 }; }
  return { x: O[0], y: 0, z: O[2], tilt: 0.28 + 0.03 * Math.sin(f * 0.2 + k), sy: 0.94, yaw: -0.45 }; // slumped
};

// ---------------- cameras ----------------
const S1 = SHOTS[0], S11 = SHOTS[10], S14 = SHOTS[13];
const cams: Scene["cams"] = {
  1: [
    { f: S1.a - 8, s: (f) => dolly([1.5, 2.15, 7.1], [0.3, 2.45, 0], pushK(f, -8, 0.0015), { fov: 40 }) },
    { f: 50, cut: true, s: (f) => dolly([3.0, 1.3, 12.4], [0.1, 2.4, 0], pushK(f, 50, 0.0022), { fov: 40 }) },
  ],
  11: [
    { f: S11.a - 8, s: (f) => dolly([1.3, 4.0, 17.0], [-0.4, 2.25, 0.5], pushK(f, S11.a - 8, 0.0018, f > WHIP - 4 ? 0.005 : 0, 30), { fov: 40 }) },
    { f: 1805, cut: true, s: (f) => dolly([8.2, 2.5, 12.6], [1.9, 3.0, -0.2], pushK(f, 1805, 0.002), { fov: 40 }) },
    { f: 1807, dur: 18, s: (f) => dolly([5.9, 4.9, 4.6], [TX, 5.3, TZ], pushK(f, 1825, 0.003), { fov: 40 }) },
    { f: 1845, cut: true, s: (f) => dolly([7.4, 1.4, 7.3], [4.6, 1.5, 0.5], pushK(f, 1845, 0.002), { fov: 40 }) },
    { f: 1879, dur: 18, s: (f) => dolly([6.4, 4.6, 7.4], [3.9, 4.55, 0.0], pushK(f, 1879, 0.002), { fov: 40 }) },
  ],
  14: [
    { f: S14.a - 8, s: (f) => {
      const x = clamp01((f - (S14.a - 8)) / 110), k = 0.8 * smooth(x) + 0.2 * x;
      return { pos: [lerp(0.6, 1.0, k), lerp(1.5, 2.5, k), lerp(10.6, 14.6, k)], look: [0, lerp(2.5, 2.85, k), 0], fov: 40 };
    } },
  ],
};

// ---------------- the scene ----------------
export const plaza: Scene = {
  name: "plaza",
  build(root) {
    const b = new Batch();
    // paving
    const disc = new THREE.CircleGeometry(17, 64); disc.rotateX(-Math.PI / 2);
    const uv = disc.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8.5, uv.getY(i) * 8.5);
    b.add(disc, lam("cobbleHD", () => ({ map: cobbleHD() })), new THREE.Matrix4().makeTranslation(0, 0.012, 0));
    // pedestal
    const ped = lam("plazaPed", () => ({ map: stoneHD("copeHD") })), cap = lam("plazaPedCap", () => ({ color: "#e6d6b8" }));
    b.add(boxGeo(V(-2.25, 0, -0.95), V(2.25, 0.22, 0.95), 1.2), ped);
    b.add(boxGeo(V(-1.95, 0.22, -0.65), V(1.95, PED_H - 0.16, 0.65), 1.2), ped);
    b.add(boxGeo(V(-2.1, PED_H - 0.16, -0.78), V(2.1, PED_H, 0.78)), cap);
    // houses ringing the square (fronts face the centre)
    const N = 13;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.12, R = 16.5 + (i % 3) * 0.8, x = Math.sin(a) * R, z = Math.cos(a) * R;
      house(b, x, z, Math.atan2(-x, -z), 6.2 + (i % 3) * 0.8, 6, 5.2 + ((i * 7) % 3) * 1.1, i);
    }
    // trees and bushes between the houses
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * Math.PI * 2 + 0.12, R = 14.2, x = Math.sin(a) * R, z = Math.cos(a) * R;
      if (z > 6) continue;
      addVeg(b, i % 3 ? "round" : "fat", x, 0, z, 4.2 + (i % 2) * 1.2, i * 71 + 5);
      addVeg(b, "bush", x * 0.93 + 1.2, 0, z * 0.93, 0.9, i * 31 + 2);
    }
    // lamp posts
    const iron = lam("plazaIron", () => ({ color: "#3d3a48" })), lampG = lam("plazaLamp", () => ({ color: "#f6d98a" }));
    for (const a of [2.3, 3.0, 3.6, 4.2]) {
      const x = Math.sin(a) * 9.5, z = Math.cos(a) * 9.5;
      b.add(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 10).translate(0, 1.6, 0), iron, new THREE.Matrix4().makeTranslation(x, 0, z));
      b.add(new THREE.SphereGeometry(0.22, 14, 10), lampG, new THREE.Matrix4().makeTranslation(x, 3.35, z));
    }
    // bunting over the back half of the square
    const flagM = ["#e2453c", "#f2c14e", "#3f8fd2", "#5ab84a", "#f08ab0"].map((c) => lam("plazaFlag" + c, () => ({ color: c, side: THREE.DoubleSide })));
    const rope = lam("plazaRope", () => ({ color: "#efe3c8" }));
    const ang = (d: number) => (d * Math.PI) / 180;
    const strings: [number, number, number, number][] = [[105, 150, 5.0, 4.6], [150, 210, 4.6, 4.8], [210, 255, 4.8, 5.0], [125, 230, 5.2, 5.2], [160, 260, 5.0, 4.8], [100, 200, 4.9, 5.1]];
    let fi = 0;
    for (const [a0, a1, h0, h1] of strings) {
      const A = V(Math.sin(ang(a0)) * 13.6, h0, Math.cos(ang(a0)) * 13.6), Bp = V(Math.sin(ang(a1)) * 13.6, h1, Math.cos(ang(a1)) * 13.6);
      const len = A.distanceTo(Bp), n = Math.floor(len / 0.55), sag = 0.07 * len, dir = Bp.clone().sub(A).normalize();
      const P = (s: number) => A.clone().lerp(Bp, s).add(V(0, -sag * 4 * s * (1 - s), 0));
      for (let i = 0; i < 24; i++) {
        const p0 = P(i / 24), p1 = P((i + 1) / 24), m = p0.clone().add(p1).multiplyScalar(0.5), l = p0.distanceTo(p1);
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize());
        b.add(new THREE.CylinderGeometry(0.018, 0.018, l, 5), rope, new THREE.Matrix4().compose(m, q, V(1, 1, 1)));
      }
      for (let i = 1; i < n; i++) {
        const c = P(i / n), w = 0.17;
        const g = new THREE.BufferGeometry().setFromPoints([c.clone().addScaledVector(dir, -w), c.clone().addScaledVector(dir, w), c.clone().add(V(0, -0.42, 0))]);
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); g.computeVertexNormals();
        b.add(g, flagM[fi++ % 5]);
      }
    }
    b.build(root);
    // strength tester (own group: only shown in shot 11)
    tower = new THREE.Group(); root.add(tower);
    const tb = new Batch();
    const red = lam("plazaRed", () => ({ color: "#c8463a" })), cream = lam("plazaCream", () => ({ color: "#efe0bf" })), gold = lam("plazaGold", () => ({ color: "#e6b441" }));
    const wood = lam("plazaWood", () => ({ color: "#8a5a3a" }));
    tb.add(boxGeo(V(TX - 0.55, 0, TZ - 0.35), V(TX + 0.55, COL0, TZ + 0.35)), red);
    tb.add(boxGeo(V(TX - 0.2, COL0, TZ - 0.12), V(TX + 0.2, COL1, TZ + 0.12)), cream);
    for (const s of [-1, 1]) tb.add(new THREE.CylinderGeometry(0.035, 0.035, COL1 - COL0, 8).translate(TX + s * 0.27, (COL0 + COL1) / 2, TZ + 0.08), gold);
    tb.add(boxGeo(V(TX - 0.34, COL1, TZ - 0.16), V(TX + 0.34, COL1 + 0.08, TZ + 0.16)), red);
    tb.add(new THREE.CylinderGeometry(0.36, 0.38, 0.1, 24).translate(PAD[0], 0.06, PAD[2]), red);
    tb.add(boxGeo(V(TX - 0.06, 0.04, TZ + 0.3), V(TX + 0.06, 0.12, PAD[2])), wood);
    tb.build(tower);
    const sc = paintedFace(scaleTex(), 0.32, COL1 - COL0 - 0.1); sc.position.set(TX, (COL0 + COL1) / 2, TZ + 0.125); tower.add(sc);
    const bellGold = new THREE.MeshLambertMaterial({ color: new THREE.Color("#ffc83a").multiplyScalar(0.35), emissive: new THREE.Color("#f0b020").multiplyScalar(0.75) });
    bell = new THREE.Group(); bell.position.set(TX, COL1 + 0.08, TZ);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bellGold); dome.position.y = 0.06; dome.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), bellGold); knob.position.y = 0.42;
    bell.add(dome, knob); tower.add(bell);
    puck = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.24, 0.26, 3, 0.05), coolMat(new THREE.Color("#ffffff"))); puck.castShadow = true; tower.add(puck);
    const shine = new THREE.MeshBasicMaterial({ color: "#ffcf3a" });
    star = new THREE.Mesh(starGeo(0.15, 0.34, 0.08), shine); star.castShadow = true; tower.add(star);
    tabs = BOX_COL.map((c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), flatMat(c)); m.castShadow = true; tower.add(m); return m; });
    boxes = BOX_COL.map((c, k) => {
      const g = new THREE.Group(), inner = new THREE.Group();
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.72, 0.14, 3, 0.03), flatMat(c)); m.position.y = 0.36; m.castShadow = true;
      const face = paintedFace(boxFace(k), 0.44, 0.62); face.position.set(0, 0.36, 0.072);
      inner.add(m, face); g.add(inner); g.userData.inner = inner; root.add(g); return g;
    });
    // the giant cartridge on a squash pivot, its cloth, the eight photos, the fairy
    cartPivot = new THREE.Group(); cartPivot.position.set(0, PED_H, 0);
    const cart = makeCartridge(); cart.scale.setScalar(CART_S); cartPivot.add(cart); root.add(cartPivot);
    cart.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m.material as THREE.Material).type === "MeshBasicMaterial") return;
      const c = ((m.material as THREE.MeshLambertMaterial).color ?? new THREE.Color("#9ea2ad")).clone();
      m.userData.day = m.material; m.userData.cool = coolMat(c);
      cartMeshes.push(m);
    });
    for (const zs of [1, -1]) { const pins = paintedFace(pinsTex(), 0.28, 0.04); pins.position.set(0, 0.025, zs * 0.0262); pins.rotation.y = zs > 0 ? 0 : Math.PI; cart.add(pins); }
    cloth = new THREE.Mesh(clothGeo(), lam("plazaCloth", () => ({ color: "#9c2f4a", side: THREE.DoubleSide }))); cloth.castShadow = true; root.add(cloth);
    photos = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const g = new THREE.Group(), ph = makePhoto(i); ph.scale.setScalar(2); g.add(ph); g.visible = false; root.add(g); return g; });
    fairy = new Fairy(root, 3);
  },

  update(u) {
    const f = u.f, t = u.t, id = u.id;
    const [sy, lift] = cartBounce(f);
    cartPivot.position.y = PED_H + lift;
    cartPivot.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6);
    cartPivot.rotation.y = id === 1 ? CART_YAW1 : CART_YAW2;
    for (const m of cartMeshes) m.material = u.light === "golden" ? m.userData.cool : m.userData.day;
    for (const p of photos) p.visible = false;
    fairy.hide();
    tower.visible = id === 11;
    for (const bx of boxes) bx.visible = id === 11;
    cloth.visible = false;

    if (id === 1) {
      // ---- townsfolk around the square ----
      // a foreground band of heads across the bottom of the hook lens (3-3.6 m in front of it)
      const ring: [number, number, number][] = ([[-0.56, 5.1, 0], [-0.19, 4.85, 1], [0.19, 5.15, 2], [0.56, 4.9, 4]] as const).map(([o, d, k]) =>
        [1.5 - 0.206 * d + 0.979 * o, 6.9 - 0.979 * d - 0.206 * o, k] as [number, number, number]);
      ring.forEach(([x, z, k], i) => act(u.out, u.cam, t, WHO.crowd(k + i), {
        x, z, scale: 0.8, expr: f > 97 ? "laugh" : f > 60 ? "grin" : "smile", look: x < 0 ? 0.6 : -0.6,
        y: f > 97 && f < 108 ? 0.18 * Math.max(0, Math.sin((f - 97 + i) * 0.6)) : 0, groundY: 0, wave: i % 2 && f > 97 ? Math.sin(t * 9 + i) : undefined,
      }));
      sparkles(u, 24, 0, 2.4, 0, 16, 1.5, 2.7, 26, 1.8);
      // ---- the phone holder (foreground lower left) + the photo stream ----
      const HX = 1.2, HZ = 6.7, up = f >= 44 ? pop(f, 44, 6) : 0;
      if (f >= 46) act(u.out, u.cam, t, WHO.crowd(3), { x: HX, z: HZ, expr: f > 96 ? "laugh" : f > 58 ? "grin" : "smile", look: 0.7, wave: -0.2 + 0.05 * Math.sin(t * 3), headTilt: 4 });
      const r = u.cam.right, cd = Math.hypot(u.cam.pos.x - HX, u.cam.pos.z - HZ), tx = (u.cam.pos.x - HX) / cd, tz = (u.cam.pos.z - HZ) / cd;
      const phone: V3 = [HX + r.x * 0.33 + tx * 0.08, 1.56, HZ + r.z * 0.33 + tz * 0.08];
      if (up > 0.01) {
        u.out.fx.push({ key: "plazaPhone", cw: 160, ch: 260, draw: drawPhone, x: phone[0], y: phone[1], z: phone[2], w: 0.2 * up, h: 0.33 * up, rot: -0.15, glow: 1.15 });
        const fl = 0.5 + 0.5 * Math.sin(f * 2.1);
        u.out.fx.push({ key: "plazaSpark", cw: 200, ch: 200, draw: drawSparkle, x: phone[0], y: phone[1] + 0.05, z: phone[2] + 0.02, w: 0.18 + 0.12 * fl, h: 0.18 + 0.12 * fl, glow: 1.6, add: true });
      }
      const topIn: V3 = [0, CART_TOP + lift + 0.35, 0];
      for (let k = 0; k < 8; k++) {
        const E = ENTER(k), L = E - 12, g = photos[k];
        if (f < Math.max(L, 50) || f > E + 4) continue;
        g.visible = true;
        if (f < E - 2) {
          const s = (f - L) / 10, pp = bez(phone, [lerp(phone[0], 0, 0.45) - 0.4 + 0.12 * (k % 3), 5.3 + 0.12 * (k % 3), lerp(phone[2], 0, 0.5)], topIn, smooth(s));
          g.position.set(...pp); g.scale.setScalar(lerp(0.25, 1, pop(f, L, 6)));
          g.rotation.set(0.4 * (1 - s), faceCam(u, pp[0], pp[2]) + (1 - s) * 0.6 * (k % 2 ? 1 : -1), (1 - s) * (k % 2 ? 2.2 : -2.2));
        } else {
          const d = (f - (E - 2)) / 6;
          g.position.set(0, lerp(topIn[1], CART_TOP + lift - 0.75, d * d), 0); g.scale.setScalar(1); g.rotation.set(0, CART_YAW1, 0);
        }
        if (f >= E && f < E + 8) sparkles(u, E, 0, CART_TOP + 0.15, 0.3, 5, 0.2, 0.7, 8);
      }
      if (f >= 96) sparkles(u, 96, 0, 2.2, 0, 12, 1.2, 2.6, 14);
    }

    if (id === 11) {
      // ---- cloth: tug, then whipped up and off to screen right ----
      const w = f - WHIP;
      if (w < 12) {
        cloth.visible = true;
        const e = w < 0 ? 0 : (w / 12) ** 1.6;
        const tug = w < 0 && w > -6 ? -0.06 * Math.sin(((w + 6) / 6) * Math.PI) : 0;
        cloth.position.set(5.5 * e + tug, 5.0 * e + 0.25 * Math.sin(e * Math.PI), 1.2 * e);
        cloth.rotation.set(0.4 * e, CART_YAW2, -1.4 * e + tug);
        cloth.scale.set(1 - 0.35 * e, 1 - 0.55 * e, 1);
      }
      sparkles(u, WHIP + 1, 0, 2.4, 0.2, 18, 1.4, 3.1, 28);
      if (f > WHIP && f < WHIP + 50) {
        const a = 1 - clamp01((f - WHIP - 10) / 40);
        for (let i = 0; i < 5; i++) u.out.fx.push({ key: "plazaRay", cw: 200, ch: 400, draw: drawRay, x: 0, y: 4.6, z: -0.3, w: 1.1 * a, h: 4.0, rot: -0.9 + i * 0.45 + 0.05 * Math.sin(f * 0.1), soft: true, add: true, glow: 1.2 });
      }
      // ---- crowd: expectant, then cheering ----
      const crowd: [number, number][] = [[-2.6, 2.2], [-1.8, 3.0], [-0.9, 2.4], [-3.1, 3.6], [-0.2, 3.8], [-2.2, 4.4], [-1.2, 4.9],
        [1.0, 2.3], [1.8, 3.1], [0.6, 3.3], [1.3, 4.3], [0.2, 4.9], [2.4, 2.0], [-0.7, 4.4]];
      crowd.forEach(([x0, z], i) => {
        const x = -0.35 + (x0 + 0.35) * 0.82;
        const go = WHIP + 1 + Math.floor(hh(i, 11) * 5), ch = f >= go, ph = (f - go) * 0.42 + i * 1.3;
        const hop = ch ? 0.22 * Math.max(0, Math.sin(ph)) * (i % 3 === 0 ? 1.3 : 1) : 0;
        let expr: Expr = f < WHIP - 10 ? "smile" : f < go ? "nervous" : i % 2 ? "laugh" : "grin";
        if (f >= 1823 && f < 1832 && i % 3 === 1) expr = "shock";
        act(u.out, u.cam, t, WHO.crowd(i), { x, z, y: hop, groundY: 0, expr, look: x < 0 ? 0.6 : -0.6,
          wave: ch && i % 4 !== 3 ? Math.sin(t * 10 + i) : undefined, tilt: ch ? 3 * Math.sin(ph) : 0, scale: 0.92 + 0.12 * hh(i, 2) });
      });
      // ---- confetti rain ----
      for (let i = 0; i < 38; i++) {
        const ts = WHIP + 2 + hh(i, 21) * 14, dt = (f - ts) / 30;
        if (dt < 0) continue;
        const y = 6.2 + 3 * hh(i, 22) - dt * (0.9 + 0.5 * hh(i, 23));
        if (y < 0.05) continue;
        const x = -3.6 + 8.2 * hh(i, 24) + 0.25 * Math.sin(dt * 4 + i), z = -0.6 + 5.6 * hh(i, 25);
        if (camDist(u, x, y, z) < 4) continue;
        const c = CONF[i % 6];
        u.out.fx.push({ key: "plazaConf" + c, cw: 64, ch: 40, draw: drawConf(c), x, y, z, w: 0.24, h: 0.15 * (0.3 + 0.7 * Math.abs(Math.cos(dt * 6 + i))), rot: dt * 3 + i });
      }
      // ---- strength tester ----
      puck.position.set(TX, puckY(f), TZ + 0.2);
      bell.rotation.set(0, 0, f >= 1823 ? 0.14 * Math.sin((f - 1823) * 1.9) * Math.exp(-(f - 1823) / 10) : 0);
      const ss = f >= 1823 ? pop(f, 1823, 8) : 0;
      star.visible = ss > 0.01; star.position.set(TX + 0.62, PUCK_TOP, TZ + 0.3); star.scale.setScalar(Math.max(0.001, ss)); star.rotation.set(0, -0.5, 0.15 * Math.sin(t * 3));
      if (f >= 1823 && f < 1840) sparkles(u, 1823, TX, PUCK_TOP + 0.2, TZ + 0.3, 8, 0.3, 1.0, 14, 0.8);
      if (f >= 1826) { const tw = 0.22 + 0.1 * Math.sin(f * 0.9); u.out.fx.push({ key: "plazaSpark", cw: 200, ch: 200, draw: drawSparkle, x: TX + 0.8, y: PUCK_TOP + 0.3, z: TZ + 0.4, w: tw, h: tw, rot: f * 0.05, glow: 2, add: true }); }
      tabs.forEach((m, k) => {
        const s = f >= BOX_S[k] ? pop(f, BOX_S[k], 6) : 0;
        m.visible = s > 0.01; m.position.set(TX + 0.42, BOX_H[k], TZ + 0.2); m.scale.setScalar(Math.max(0.001, s));
      });
      boxes.forEach((g, k) => {
        const p = boxPose(k, f);
        g.position.set(p.x, p.y, p.z); g.rotation.set(0, p.yaw, 0);
        const inner = g.userData.inner as THREE.Group; inner.rotation.set(p.tilt, 0, 0); inner.scale.set(1 + (1 - p.sy) * 0.5, p.sy, 1);
      });
    }

    if (id === 14) {
      // ---- the three beside the pedestal, looking up, content ----
      act(u.out, u.cam, t, WHO.hero, { x: -1.3, z: 1.8, expr: f > 2064 ? "relief" : "smile_closed", look: 0.9, facing: 1, headTilt: 20 + 1.5 * Math.sin(t * 1.5) });
      act(u.out, u.cam, t, WHO.producer, { x: 1.3, z: 1.6, expr: f > 2066 ? "relief" : "smile_closed", look: -0.9, facing: -1, headTilt: -20 + 1.2 * Math.sin(t * 1.2) });
      // the fairy rises from the hero's shoulder into the sky above the square, where its glow reads
      const fu = smooth(clamp01((f - 2046) / 34));
      fairy.pose(lerp(-0.95, -0.95, fu) + 0.08 * Math.sin(t * 1.3), lerp(2.15, 5.0, fu) + 0.08 * Math.sin(t * 0.9), lerp(1.9, 2.3, fu), t, u.camera, 1.4, 1.3);
      // ---- photos pop out of the top and fan into a slow orbit ----
      for (let k = 0; k < 8; k++) {
        const P = POP14(k), g = photos[k];
        if (f < P) continue;
        g.visible = true;
        const th = (k / 8) * Math.PI * 2 + 0.25 + (f - 2062) * 0.012, R = 2.3, hy = 3.25 + 0.75 * Math.cos(th + 0.6) + 0.06 * Math.sin(t * 2 + k);
        const orbit: V3 = [Math.sin(th) * R, hy, Math.cos(th) * R], top: V3 = [0, CART_TOP + 0.9, 0];
        const a = clamp01((f - P) / 6), b2 = smooth(clamp01((f - P - 5) / 14));
        const pp: V3 = b2 > 0 ? bez(top, [orbit[0] * 0.6, top[1] + 0.3, orbit[2] * 0.6], orbit, b2) : [0, lerp(CART_TOP - 0.5, top[1], easeOut(a)), 0];
        g.position.set(...pp); g.scale.setScalar(lerp(0.6, 1, pop(f, P, 7)));
        g.rotation.set(0.08 * Math.sin(t + k), faceCam(u, pp[0], pp[2]), 0.12 * Math.sin(t * 1.3 + k));
        if (f < P + 8) sparkles(u, P, 0, CART_TOP + 0.2, 0.3, 4, 0.15, 0.6, 8);
      }
    }
  },
  cams,
  dof: [
    { f: 50, cInf: 4, focus: () => [0.1, 2.4, 0] },
    { f: 108, cInf: 0 },
    { f: 1845, cInf: 10, focus: () => [4.4, 1.0, 0.7] },
    { f: 1879, dur: 18, cInf: 4, focus: () => [3.7, 4.6, 0] },
    { f: 1900, cInf: 0 },
    { f: 2036, cInf: 9, focus: () => [0, 2.4, 0] },
    { f: 2080, dur: 30, cInf: 4, focus: () => [0, 2.5, 0] },
  ],
  kicks: [[96, 0.8], [1823, 0.6]],
  // golden shots: the low sun comes from behind the lens (warm faces and facades) instead of the preset backlight
  sun: { 11: { az: 165, el: 42 }, 14: { az: 150, el: 27 } }, // el 15 put the whole square in the shadow of the houses behind the lens
  cues: [
    [24, "sparkle", "ring of sparkles bursts around the giant cartridge"],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): [number, string, string] => [ENTER(k), "pop", `photo ${k + 1} dives into the cartridge`]),
    [96, "thump", "cartridge squashes and bounces, satisfied"],
    [WHIP, "whoosh", "cloth whipped off the cartridge"],
    [WHIP + 2, "fanfare", "release"],
    [WHIP + 3, "cheer", "crowd cheers, confetti"],
    [1805, "rise", "tester puck shoots up"],
    [1823, "ding", "puck stops a hair below the bell; bell quivers"],
    [BOX_S[0], "thunk", "box 1: puck stops low"],
    [BOX_S[1], "thunk", "box 2: puck stops low"],
    [BOX_S[2], "thunk", "box 3: puck stops lowest"],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): [number, string, string] => [Math.round(POP14(k)), "pop", `photo ${k + 1} pops out (flurry)`]),
    [2068, "final_chord", "end"],
  ],
};
