// Scene `field` (shots 5 and 7, day): an open meadow, the hero with his sword facing off a grumpy purple blob monster.
//   5   799-850   face-off, circling; f828 an inverted yellow triangle (3D prism) pops above the monster; push in
//   7a 1013-1044  the triangle drops with a clunk (f1016); the fairy takes its place
//   7b 1044-1099  the fairy loops monster -> hero -> monster leaving a dotted trail; the hero strikes (f1075), the monster squashes
//   7c 1099-1120  close-up: the fairy beside the hero's face, a tiny bow; he glances at it and smiles
// Pure function of the frame. Lenses look toward -z.
import * as THREE from "three";
import { Batch, V, lam, addVeg } from "../build";
import { Key, Dof, V3, dolly, pushK, pop, ramp, lerp, clamp01, rolled } from "../timeline";
import { act, WHO } from "../chars";
import { Fairy } from "../props";
import { hh, blob, q } from "../cast";
import { Pen, INK, fxStars } from "../toon";
import type { Scene, Frame } from "./types";

// ---------------- marks and timing ----------------
const H0: V3 = [-0.65, 0, 1.0];   // hero mark
const M0: V3 = [0.62, 0, -0.55]; // monster mark
const TRI_IN = 828, TRI_DROP0 = 1009, TRI_LAND = 1016;
const FAIRY_IN = 1019, LOOP0 = 1046, LOOP1 = 1068, STRIKE = 1075, BONK = 1078, CU = 1099;
const TRI_Y = 2.2;

/** small circling of the pair in shot 5 / 7a (radians around their midpoint) */
const circ = (f: number) => (f < 1000 ? 0.12 * Math.sin((f - 799) / 26) : 0.1 * Math.sin((f - 1005) / 24));
const around = (p: V3, a: number): V3 => {
  const cx = (H0[0] + M0[0]) / 2, cz = (H0[2] + M0[2]) / 2, dx = p[0] - cx, dz = p[2] - cz;
  return [cx + dx * Math.cos(a) - dz * Math.sin(a), 0, cz + dx * Math.sin(a) + dz * Math.cos(a)];
};
/** hero position: the face-off mark (circling), a lunge toward the monster for the strike */
const heroAt = (f: number): V3 => {
  const base = around(H0, f < 1060 ? circ(f) : circ(1060));
  const l = ramp(f, 1071, 1074) - 0.85 * ramp(f, 1086, 1097), back = 0.04 * ramp(f, 1062, 1066) * (1 - ramp(f, 1071, 1074)); // hop back for the windup, lunge in, step back after the bonk
  return [lerp(base[0] - back, -0.08, l), 0, lerp(base[2] + 0.5 * back, 0.35, l)];
};
const monAt = (f: number): V3 => around(M0, f < 1060 ? circ(f) : circ(1060));

// ---------------- the monster (our own design: a round grumpy purple blob with little horns and stubby legs) ----------------
type MonFace = "grump" | "glare" | "ouch" | "dazed";
const monDraw = (face: MonFace, look: number, step: number) => (p: Pen) => {
  const g = p.g, cx = 450, cy = 530;
  // stubby legs (alternating step), little arms, horns: all behind the body
  for (const s of [-1, 1]) {
    const lift = Math.max(0, s * step);
    p.ell(cx + s * 120, 790 - lift * 30, 78, 62, "#6a3f9e", 14);
  }
  for (const s of [-1, 1]) p.ell(cx + s * 318, 590, 56, 44, "#8656c4", 13, 0, 360, s * 25);
  for (const s of [-1, 1]) {
    const bx = cx + s * 120;
    p.poly([[bx - 40, 290], [bx + 40, 290], [bx + s * 30, 170], [bx + s * 40, 120], [bx + s * 6, 160]], "#f1e3c0", 13);
  }
  // body: an egg, wider at the bottom
  const pts: [number, number][] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, sy = Math.sin(a);
    pts.push([cx + 320 * Math.cos(a) * (1 + 0.06 * sy), cy + 290 * sy]);
  }
  p.shadedFill(pts, "#9a68d4", "#6c43a6", -2.3, 300);
  p.ell(cx + 10, 650, 190, 130, "#b98ee6", 0);
  p.poly(pts, null, 17);
  // eyes
  const ex = 105, ey = 450, lx = look * 18;
  if (face === "dazed") {
    for (const s of [-1, 1]) {
      p.ell(cx + s * ex, ey, 62, 66, "#fbf6ee", 10);
      const sp: [number, number][] = [];
      for (let i = 0; i < 40; i++) { const a = i * 0.45 * s, r = 4 + i * 1.25; sp.push([cx + s * ex + r * Math.cos(a), ey + r * Math.sin(a)]); }
      p.stroke(sp, 8);
    }
  } else if (face === "ouch") {
    for (const s of [-1, 1]) { const e = cx + s * ex; p.stroke([[e - s * 38, ey - 30], [e + s * 26, ey], [e - s * 38, ey + 30]], 16); }
  } else {
    const sq = face === "glare" ? 0.62 : 1;
    for (const s of [-1, 1]) {
      p.ell(cx + s * ex, ey + 6, 62, 66 * sq, "#fbf6ee", 10);
      p.dot(cx + s * ex + lx, ey + 12, face === "glare" ? 20 : 25);
    }
  }
  // heavy grumpy brows (inner ends low)
  if (face !== "dazed") for (const s of [-1, 1]) {
    const drop = face === "glare" ? 22 : face === "ouch" ? -10 : 0;
    p.poly([[cx + s * 40, 392 + drop], [cx + s * 175, 340], [cx + s * 180, 312], [cx + s * 30, 362 + drop]], INK, 0);
  }
  // mouth
  if (face === "dazed") {
    p.stroke([[cx - 80, 600], [cx - 40, 585], [cx, 602], [cx + 40, 585], [cx + 80, 600]], 12);
    p.ell(cx + 30, 612, 26, 30, "#e86a8a", 8, 0, 180);
  } else if (face === "ouch") {
    p.ell(cx, 600, 60, 46, "#5a1e3a", 12);
  } else {
    // frown with one fang poking up from the lower lip
    g.lineCap = "round";
    p.arc(cx, 640, 92, 50, 205, 335, 14);
    p.poly([[cx + 36, 606], [cx + 62, 608], [cx + 52, 574]], "#fbf6ee", 8);
  }
};
const MON_H = 1.95; // card height for a ~1.6 m tall monster (drawing spans canvas y 120..870)

// ---------------- effect drawings ----------------
/** the hero's sword raised for the windup (160 x 560, hilt at the bottom); SW_HAND = raised hand offset from the hero's mark */
const SW_HAND: [number, number] = [0.3, 1.44];
const swordDraw = (p: Pen) => {
  p.poly([[66, 400], [94, 400], [92, 70], [80, 22], [68, 70]], "#e4ebf2", 9);
  p.stroke([[80, 390], [80, 80]], 6, "#9aa6b4");
  p.band([[30, 410], [130, 410]], "#e8c45a", 22, 7, "round");
  p.band([[80, 420], [80, 520]], "#6a4630", 22, 7, "round");
};
const twinkleDraw = (s: number) => (p: Pen) => {
  const c = 150, R = 30 + 110 * s, r = 0.32 * R, pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 4 === 0 ? R : i % 2 ? r : r * 1.15; pts.push([c + rr * Math.cos(a), c + rr * Math.sin(a)]); }
  p.poly(pts, "#fff3a8", 10);
};
const twinkle = (u: Frame, n: number, life: number, x: number, y: number, z: number, w: number) => {
  if (n < 0 || n >= life) return;
  const k = Math.round(6 * Math.sin((Math.PI * (n + 1)) / (life + 1))) / 6;
  u.out.fx.push({ key: `fldTw${k}`, cw: 300, ch: 300, draw: twinkleDraw(k), x, y, z, w, h: w, rot: 0.15 * n, glow: 1.25 });
};
/** swoosh arc of the sword strike, 400 x 400 */
const swooshDraw = (t: number) => (p: Pen) => {
  const pts: [number, number][] = [];
  const a0 = -1.9 + 1.5 * t, a1 = 0.55;
  for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; pts.push([200 + 160 * Math.cos(a), 220 + 160 * Math.sin(a)]); }
  for (let i = 16; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / 16, r = 160 - 62 * Math.sin((Math.PI * i) / 16); pts.push([200 + r * Math.cos(a), 220 + r * Math.sin(a)]); }
  p.poly(pts, "#eaf6ff", 9);
};

/** one dash of the navigation trail (160 x 64) and its arrowhead (200 x 200, pointing +x): opaque yellow, plum ink */
const dashDraw = (p: Pen) => p.ell(80, 32, 62, 18, "#ffd84a", 9);
const arrowDraw = (p: Pen) => p.poly([[34, 36], [184, 100], [34, 164], [70, 100]], "#ffd84a", 11);
/** jagged impact star (500 x 500) */
const impactDraw = (k: number) => (p: Pen) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 18; i++) { const a = (i * Math.PI) / 9 + 0.1, r = (i % 2 ? 90 : 210 + 30 * ((i * 7) % 3)) * (0.55 + 0.45 * k); pts.push([250 + r * Math.cos(a), 250 + r * Math.sin(a)]); }
  p.poly(pts, "#fff4b8", 12);
  const inner = pts.map(([x, y]) => [250 + (x - 250) * 0.55, 250 + (y - 250) * 0.55] as [number, number]);
  p.poly(inner, "#ffffff", 0);
};
const P1 = new THREE.Vector3(), P2 = new THREE.Vector3();
/** on-screen angle (radians, counter-clockwise from screen right) of the world direction a -> b */
const screenAng = (cam: THREE.Camera, a: V3, b: V3) => {
  P1.set(a[0], a[1], a[2]).project(cam); P2.set(b[0], b[1], b[2]).project(cam);
  return Math.atan2((P2.y - P1.y) * 1920, (P2.x - P1.x) * 1080);
};

// ---------------- the fairy's flight ----------------
const fairyHome = (f: number): V3 => { const m = monAt(f); return [m[0] + 0.02, TRI_Y + 0.05, m[2] + 0.05]; };
/** the navigation trail: an arc from just over the hero's head to the monster's head (s 0..1) */
const trailPt = (f: number, s: number): V3 => {
  const h = heroAt(Math.min(f, 1068)), m = monAt(f), a: V3 = [h[0] + 0.37, 2.0, h[2] + 0.1], b: V3 = [m[0] - 0.3, 1.72, m[2] + 0.2];
  return [lerp(a[0], b[0], s), lerp(a[1], b[1], s) + 0.3 * Math.sin(Math.PI * s), lerp(a[2], b[2], s)];
};
/** how far along the trail the fairy is (0..1) */
const trailS = (f: number) => clamp01(((f - LOOP0) / (LOOP1 - LOOP0) - 0.65) / (0.35 * 0.8));
/** frame the fairy passes trail point s */
const trailF = (s: number) => LOOP0 + (LOOP1 - LOOP0) * (0.65 + 0.35 * 0.8 * s);
/** fairy path during the loop: monster -> around the hero's head -> along the trail back to the monster */
const loopPos = (f: number): V3 => {
  const u = clamp01((f - LOOP0) / (LOOP1 - LOOP0)), m = fairyHome(f), h = heroAt(f);
  const hx = h[0] + 0.05, hy = 2.0, hz = h[2] + 0.1;
  if (u < 0.35) { const v = u / 0.35, e = v * v * (3 - 2 * v); return [lerp(m[0], hx + 0.32, e), lerp(m[1], hy, e) + 0.35 * Math.sin(Math.PI * e), lerp(m[2], hz, e)]; }
  if (u < 0.65) { const v = (u - 0.35) / 0.3, a = v * Math.PI * 2; return [hx + 0.32 * Math.cos(a), hy + 0.22 * Math.sin(a), hz + 0.3 * Math.sin(a)]; }
  const v = (u - 0.65) / 0.35;
  if (v < 0.8) return trailPt(f, v / 0.8);
  const e = (v - 0.8) / 0.2, b = trailPt(f, 1);
  return [lerp(b[0], m[0], e), lerp(b[1], m[1], e), lerp(b[2], m[2], e)];
};
const fairyAt = (f: number, t: number): V3 => {
  if (f < LOOP0) {
    const e = ramp(f, FAIRY_IN, FAIRY_IN + 8), m = fairyHome(f);
    return [m[0] + 0.06 * Math.sin(t * 2.2), lerp(m[1] + 0.9, m[1], e), m[2]];
  }
  if (f < LOOP1) return loopPos(f);
  if (f < CU) { const m = fairyHome(f); return [m[0] + 0.07 * Math.sin(t * 2.5), m[1] + (f >= BONK ? -0.35 * ramp(f, BONK, BONK + 6) : 0), m[2]]; }
  const h = heroAt(f), bow = f < CU + 9 ? -0.06 * Math.sin((Math.PI * (f - CU)) / 9) : 0;
  return [h[0] + 0.42, 1.64 + bow + 0.02 * Math.sin(t * 3), h[2] + 0.12];
};

// ---------------- cameras ----------------
const two = (f: number, f0: number) => dolly([-0.4 + (f - f0) * 0.004, 1.05, 6.6], [0.08, 1.0, 0.15], pushK(f, f0, 0.002), { fov: 40 });
const two7 = (f: number, punch = 0, dx = 0) => dolly([-0.4 + dx, 1.1, 7.15 + dx], [dx, 1.08, 0.15], pushK(f, 1040, 0.002, punch, 20), { fov: 40 });
const cams: Record<number, Key[]> = {
  5: [
    { f: 791, s: (f) => two(f, 791) },
    { f: TRI_IN - 2, dur: 26, s: (f) => dolly([0.3, 1.2, 5.6], [0.62, 1.6, -0.5], pushK(f, TRI_IN, 0.002, 0.004, 22), { fov: 40 }) },
  ],
  7: [
    { f: 1005, s: (f) => two(f, 1005) },
    { f: 1040, dur: 24, s: (f) => two7(f) },
    { f: 1074, dur: 18, s: rolled((f) => two7(f, 0.002, 0.22), 0.045) },
    { f: CU, cut: true, s: (f) => { const h = heroAt(f); return dolly([h[0] - 0.4, 1.66, h[2] + 2.9], [h[0] + 0.06, 1.58, h[2]], pushK(f, CU, 0.003), { fov: 40 }); } },
  ],
};
const dof: Dof[] = [
  { f: 791, cInf: 10, focus: (f) => { const m = monAt(f); return [m[0], 1.2, m[2]]; } },
  { f: 1005, cInf: 10, focus: () => [0, 1.3, 0.2] },
  { f: CU, cInf: 14, focus: (f) => { const h = heroAt(f); return [h[0], 1.62, h[2]]; } },
];

export const field: Scene = (() => {
  let fairy: Fairy, tri: THREE.Mesh, fg: THREE.Group;
  const build = (root: THREE.Group) => {
    const b = new Batch();
    // rocks
    const rock = lam("fldRock", () => ({ color: "#a69c92" })), rock2 = lam("fldRock2", () => ({ color: "#8f8a96" }));
    const rocks: [number, number, number, number][] = [[2.6, -2.4, 0.45, 0], [-2.9, -3.2, 0.6, 1], [3.4, 1.6, 0.35, 2], [-2.2, 2.9, 0.3, 3], [1.4, -6.5, 0.8, 4], [-4.5, -8, 1.0, 5], [5.5, -9, 0.9, 6]];
    for (const [x, z, s, i] of rocks) {
      b.add(new THREE.DodecahedronGeometry(1, 0), i % 2 ? rock : rock2,
        new THREE.Matrix4().compose(V(x, 0.25 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(hh(i, 1), hh(i, 2) * 6, 0)), V(s, 0.7 * s, s * 0.9)));
    }
    // flowers scattered over the meadow (kept out of the lens path and off the marks)
    const stem = lam("fldStem", () => ({ color: "#4f8a3a" }));
    const heads = ["#f4eedc", "#f2cf4e", "#e98aa8", "#b48ae0"].map((c) => lam("fldFl" + c, () => ({ color: c })));
    for (let i = 0; i < 110; i++) {
      const x = (hh(i, 3) - 0.5) * 16, z = -12 + hh(i, 4) * 16;
      if (z > 2.4 && Math.abs(x) < 3) continue;
      if (Math.hypot(x, z - 0.2) < 1.8) continue;
      b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), stem, new THREE.Matrix4().makeTranslation(x, 0.07, z));
      b.add(new THREE.SphereGeometry(0.1, 10, 6), heads[i % 4], new THREE.Matrix4().compose(V(x, 0.15, z), new THREE.Quaternion(), V(1, 0.55, 1)));
    }
    // trees and bushes in the distance
    const trees: [number, number, number, "round" | "fat" | "tall" | "cone"][] = [[-6.5, -14, 6, "round"], [4.5, -18, 7, "fat"], [9, -12, 5.5, "tall"], [-11, -20, 7.5, "fat"], [1.5, -26, 7, "round"]];
    trees.forEach(([x, z, h, k], i) => addVeg(b, k, x, 0, z, h, 11 + i * 13, 1));
    const bushes: [number, number, number][] = [[-4.2, -5.5, 0.9], [4.6, -6.5, 1.0], [-3.2, -11, 1.1], [6.5, -15, 1.2], [-8, -12, 1.1], [3, -12.5, 0.9]];
    bushes.forEach(([x, z, h], i) => addVeg(b, "bush", x, 0, z, h, 70 + i * 9, 1));
    b.build(root);
    // near-foreground grass tufts and flowers (soft in the lens blur; hidden for the close-up, whose lens sits among them)
    fg = new THREE.Group(); root.add(fg);
    const fb = new Batch(), tuft = lam("fldTuft", () => ({ color: "#4c9a3c" })), tuft2 = lam("fldTuft2", () => ({ color: "#3a8236" }));
    const clumps: [number, number, number, number][] = [[-0.5, 3.45, 1.0, 0], [0.22, 3.15, 0.85, 1]];
    for (const [cx, cz, sc, j] of clumps) {
      for (let i = 0; i < 9; i++) {
        const a = hh(j * 13 + i, 5) * 6.28, d = 0.12 * hh(j * 13 + i, 6) * sc, h = (0.22 + 0.2 * hh(j * 13 + i, 7)) * sc;
        fb.add(new THREE.ConeGeometry(0.035 * sc, h, 5), i % 2 ? tuft : tuft2,
          new THREE.Matrix4().compose(V(cx + d * Math.cos(a), h / 2, cz + d * Math.sin(a)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25 * Math.sin(a), 0, 0.25 * Math.cos(a))), V(1, 1, 1)));
      }
      for (let i = 0; i < 3; i++) {
        const x = cx + (hh(j, i + 20) - 0.5) * 0.3 * sc, z = cz + (hh(j, i + 30) - 0.5) * 0.2, h = (0.3 + 0.12 * hh(j, i + 40)) * sc;
        fb.add(new THREE.CylinderGeometry(0.012, 0.012, h, 5), stem, new THREE.Matrix4().makeTranslation(x, h / 2, z));
        fb.add(new THREE.SphereGeometry(0.075 * sc, 10, 6), heads[(j + i) % 4], new THREE.Matrix4().compose(V(x, h, z), new THREE.Quaternion(), V(1, 0.6, 1)));
      }
    }
    fb.build(fg);
    // the targeting triangle: an inverted prism, unlit bright yellow (outlined by the world ink)
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.09, 3);
    geo.rotateX(Math.PI / 2); // the first vertex (+z) goes to -y: point down
    tri = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.9, 0.08) }));
    tri.visible = false; root.add(tri);
    fairy = new Fairy(root, 3);
  };

  const update = (u: Frame) => {
    const f = u.f, t = u.t;
    fairy.hide(); tri.visible = false; fg.visible = f < CU;
    const hp = heroAt(f), mp = monAt(f);

    // ---- triangle ----
    if (f >= TRI_IN && f < 1060) {
      tri.visible = true;
      let y = TRI_Y + 0.06 * Math.sin(t * 4), rx = 0, ry = 0.9 * t, ox = 0, oz = 0;
      const s = f < 1000 ? pop(f, TRI_IN, 7) : 1;
      if (f >= TRI_DROP0) {
        const v = clamp01((f - TRI_DROP0) / (TRI_LAND - TRI_DROP0));
        y = lerp(TRI_Y, 0.21, v * v); ry = 0.9 * (TRI_DROP0 / 30) + 0.4 * v;
        if (f >= TRI_LAND) {
          const n = f - TRI_LAND;
          y = 0.08 + 0.12 * Math.abs(Math.sin(n * 0.5)) * Math.exp(-n / 3); rx = -1.45 * ramp(f, TRI_LAND, TRI_LAND + 5); ox = -0.25; oz = 0.35;
        }
      }
      tri.position.set(mp[0] + ox, y, mp[2] + oz);
      tri.rotation.set(rx, ry, 0);
      tri.scale.setScalar(Math.max(0.01, s));
      if (f < 1000) twinkle(u, f - TRI_IN, 6, mp[0], TRI_Y, mp[2] + 0.1, 0.8);
    }

    // ---- monster ----
    let face: MonFace = "grump", look = -1;
    if (f >= TRI_IN && f < TRI_IN + 14) face = "glare";
    if (f >= 1060 && f < BONK) face = "glare";
    if (f >= LOOP0 && f < LOOP1) look = loopPos(f)[0] < mp[0] - 0.4 ? -1 : 0;
    const breath = Math.sin(t * 3.2);
    let sx = 1 + 0.025 * breath, sy = 1 - 0.025 * breath;
    if (f >= TRI_IN && f < TRI_IN + 8) { const w = Math.sin((Math.PI * (f - TRI_IN)) / 8); sy *= 1 - 0.12 * w; sx *= 1 + 0.08 * w; }
    if (f >= TRI_LAND && f < TRI_LAND + 6) sy *= 0.94;
    if (f >= 1071 && f < BONK - 1) { face = "glare"; sy *= 1 - 0.06 * ramp(f, 1071, 1075); sx *= 1 + 0.04 * ramp(f, 1071, 1075); } // braces for it
    if (f >= BONK - 1) {
      const n = f - (BONK - 1);
      face = n < 6 ? "ouch" : "dazed";
      // slammed flat, springs back up past its height, settles a bit squat and dizzy
      sy = n < 2 ? 0.38 : 0.88 - 0.5 * Math.exp(-(n - 2) / 3.2) * Math.cos((n - 2) * 0.8);
      sx = 0.97 / Math.sqrt(sy);
    }
    const step = f < 1060 ? Math.round(Math.sin(t * 5) * 2) / 2 : 0;
    const mh = MON_H * sy, mw = MON_H * sx;
    if (f < CU) { // the close-up keeps the monster fully out of frame
      u.out.fx.push({ key: `fldMon|${face}|${look}|${step}`, cw: 900, ch: 900, draw: monDraw(face, look, step), x: mp[0], y: mh / 2 - 0.035 * mh, z: mp[2], w: mw, h: mh });
      blob(u.out, mp[0], 0, mp[2], 1.5 * sx);
    }
    if (f >= BONK + 2 && f < CU) {
      const n = f - BONK - 2, ph = q((n % 12) / 12, 12);
      u.out.fx.push({ key: `fldStars${ph}`, cw: 420, ch: 210, draw: (p) => fxStars(p, ph), x: mp[0], y: mh + 0.12, z: mp[2] + 0.05, w: 1.3, h: 0.65 });
    }
    if (f >= 1076 && f < 1083) {
      const n = f - 1076, k = q(n < 2 ? 0.6 + 0.4 * n : 1 - (n - 2) * 0.17, 10);
      u.out.fx.push({ key: `fldImpact${k}`, cw: 500, ch: 500, draw: impactDraw(k), x: mp[0] - 0.12, y: 1.4 - 0.04 * n, z: mp[2] + 0.3, w: 1.6, h: 1.6, rot: 0.2 * n, glow: 1.2 });
    }

    // ---- hero ----
    let k = 0.25, expr: "stern" | "grin" | "smile" | "shock" | "neutral" = "stern", hlook = 1, facing: -1 | 0 | 1 = 1;
    if (f >= TRI_IN && f < TRI_IN + 10) expr = "shock";
    if (f >= LOOP0 && f < LOOP1) { hlook = loopPos(f)[0] > hp[0] + 0.1 ? 1 : -1; expr = "neutral"; }
    if (f >= 1061) { k = f < 1072 ? lerp(0.25, 0, ramp(f, 1061, 1065)) : lerp(0.15, 1, ramp(f, 1073, STRIKE)); expr = "stern"; } // sword high and back over the head 1065-1072
    if (f >= BONK + 4) expr = "grin";
    if (f >= 1086) k = lerp(1, 0.25, ramp(f, 1086, 1094));
    if (f >= CU) { k = 0.25; const g = f - CU; hlook = g >= 3 ? 1 : 0; expr = g < 6 ? "neutral" : "smile"; facing = g >= 3 ? 1 : 0; }
    // anticipation: leans back with the sword cocked (1064-1071), then throws his weight forward into the swing
    const lunge = f < 1061 || f >= 1086 ? 0 : f < 1072 ? -11 * ramp(f, 1061, 1066) : f < 1080 ? lerp(-11, 13, ramp(f, 1072, 1075)) : 13 * (1 - ramp(f, 1080, 1086));
    const windup = f >= 1064 && f < 1073; // the arm is raised high and the sword drawn as its own card, held back over the head
    const hop = f >= 1062 && f < 1068 ? 0.16 * Math.sin((Math.PI * (f - 1062)) / 6) : 0;
    act(u.out, u.cam, t, WHO.hero, { x: hp[0], z: hp[2], y: hop, groundY: 0, expr, prop: windup ? null : ["sword", k], wave: windup ? 0 : undefined, look: hlook, facing, tilt: lunge + (f < 1064 ? 1.5 * Math.sin(t * 2.4) : 0),
      headTilt: f >= CU + 3 ? 6 * ramp(f, CU + 3, CU + 8) : 0 });
    if (windup) {
      const r = 0.55 + 0.25 * ramp(f, 1064, 1067), hx = hp[0] + SW_HAND[0], hy = SW_HAND[1] + hop, L = 0.42;
      u.out.fx.push({ key: "fldSwordUp", cw: 160, ch: 560, draw: swordDraw, x: hx - L * Math.sin(r), y: hy + L * Math.cos(r), z: hp[2] + 0.03, w: 0.25, h: 0.88, rot: r });
    }
    if (f >= 1073 && f < 1079) {
      const n = f - 1073;
      u.out.fx.push({ key: `fldSwoosh${n}`, cw: 400, ch: 400, draw: swooshDraw(Math.min(1, n / 5)), x: (hp[0] + mp[0]) / 2 + 0.05, y: 1.35, z: (hp[2] + mp[2]) / 2 + 0.15, w: 1.3, h: 1.3 });
    }

    // ---- fairy + its dotted trail ----
    if (f >= FAIRY_IN) {
      const fp = fairyAt(f, t);
      fairy.pose(fp[0], fp[1], fp[2], t, u.camera, f >= CU ? 0.62 : 0.85, f >= CU ? 0.55 : 0.8);
      if (f < FAIRY_IN + 7) twinkle(u, f - FAIRY_IN, 7, fp[0], fp[1], fp[2] + 0.05, 0.7);
      if (f >= CU && f < CU + 7) twinkle(u, f - CU, 7, fp[0] + 0.12, fp[1] + 0.12, fp[2] + 0.05, 0.25);
    }
    if (f >= LOOP0 && f < 1092) {
      // a bold dashed trail: a short comet behind the fairy on its way out, then dashes laid from the hero to the monster
      // as it flies back, capped by an arrowhead at the monster; it shrinks away after the strike
      const fade = 1 - ramp(f, 1083, 1091), sF = trailS(f);
      const dash = (a: V3, b: V3, sc: number, arrow = false) => {
        if (sc < 0.02) return;
        const rot = screenAng(u.camera, a, b);
        if (arrow) u.out.fx.push({ key: "fldArrow", cw: 200, ch: 200, draw: arrowDraw, x: b[0], y: b[1], z: b[2], w: 0.3 * sc, h: 0.3 * sc, rot, glow: 1.1 });
        else u.out.fx.push({ key: "fldDash", cw: 160, ch: 64, draw: dashDraw, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, w: 0.12 * sc, h: 0.055 * sc, rot, glow: 1.1 });
      };
      if (f < trailF(0)) for (let j = 1; j <= 3; j++) dash(loopPos(f - 2 * j - 1), loopPos(f - 2 * j + 1), 0.8 - 0.15 * j);
      const N = 8;
      for (let i = 0; i < N; i++) {
        const s0 = (i + 0.5) / N, age = f - trailF(s0);
        if (sF >= s0 || f >= LOOP1) dash(trailPt(f, s0 - 0.035), trailPt(f, s0 + 0.035), fade * Math.min(1, (age + 1) / 2.5));
      }
      if (f >= trailF(1)) dash(trailPt(f, 0.95), trailPt(f, 1), fade * pop(f, trailF(1), 5), true);
    }
  };

  return {
    name: "field",
    build, update, cams, dof,
    kicks: [[TRI_LAND, 0.4], [BONK, 0.7]],
    cues: [
      [TRI_IN, "blip", "the yellow target triangle pops above the monster"],
      [TRI_LAND, "clunk", "the triangle drops on the grass"],
      [FAIRY_IN, "twinkle", "the fairy takes its place"],
      [LOOP0, "zip", "fairy loop monster -> hero -> monster, dotted trail"],
      [1073, "swish", "sword swing"],
      [BONK, "bonk", "monster squashed flat, sees stars"],
      [CU, "chime", "the fairy's tiny bow"],
    ],
  };
})();
