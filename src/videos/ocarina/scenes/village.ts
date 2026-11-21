// Scene `village` (shot 4, f557-799, day): a forest village of six round huts on a wooded slope, a green full of
// villagers, and the console on a stump in the lower corner.
//   4a 557-637  wide: 16 villagers wave and stroll, the console shakes and smokes, from f595 the crowd lags (5-frame steps)
//   4b 637-694  medium: three villagers; a fairy pops in over each one's shoulder (f652, f663, f675)
//   4c 694-751  wide: the villagers vanish in puffs (f699-722), only ~16 fairy lights stay; the console calms down
//   4d 751-799  the hero walks in from the left toward one light by a hut; at f777 its owner pops into existence
// Everything is a pure function of the frame. Lenses look toward -z; the green is the flat ground z > -5.5.
import * as THREE from "three";
import { Batch, V, lam, addVeg } from "../build";
import { ctex, rep } from "../paint";
import { NOINK } from "../ink";
import { Key, Dof, V3, dolly, pushK, pop, ramp, smooth, lerp, rolled } from "../timeline";
import { act, WHO, Act } from "../chars";
import { makeConsole, Fairy } from "../props";
import { hh } from "../cast";
import { Pen, fxBurst } from "../toon";
import type { Scene, Frame } from "./types";

// ---------------- timing ----------------
const B4 = 637, C4 = 694, D4 = 751, POP = 777;
const LAG0 = 595;                 // the crowd starts to stutter
const VAN0 = 699, VAN1 = 722;     // villagers vanish (far ones first)

// ---------------- terrain ----------------
/** ground height: flat green, then a slope that climbs 3.4 m behind it (the huts and the forest stack up the frame) */
const hillY = (x: number, z: number) => 3.4 * smooth((-5.8 - z + 0.03 * x * x) / 11);

const wrap = (S: number, x: number, y: number, r: number, fn: (x: number, y: number) => void) => {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -r && x + ox < S + r && y + oy > -r && y + oy < S + r) fn(x + ox, y + oy);
};
/** forest floor, 1024 px = 6 m: deep moss green (darker than the shell's lawn so the fairy lights read), soft patches, tufts, leaves */
const floorTex = () => ctex("vilFloor", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#33683a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    const x = r() * S, y = r() * S, rad = 80 + r() * 190, light = r() > 0.5;
    wrap(S, x, y, rad, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, 0, xx, yy, rad), c = light ? "78,134,62" : "28,74,48";
      gr.addColorStop(0, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(xx - rad, yy - rad, 2 * rad, 2 * rad);
    });
  }
  g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 1100; i++) {
    const x = r() * S, y = r() * S, h = 7 + r() * 10, lean = r() * 6 - 3, light = r() < 0.4;
    wrap(S, x, y, 20, (xx, yy) => {
      g.strokeStyle = light ? "rgba(128,190,84,0.4)" : "rgba(30,84,46,0.45)";
      g.beginPath(); g.moveTo(xx - 3 + lean, yy - h); g.lineTo(xx, yy); g.lineTo(xx + 3 + lean, yy - h * 0.8); g.stroke();
    });
  }
  for (let i = 0; i < 70; i++) { // fallen leaves
    const x = r() * S, y = r() * S, a = r() * 3.14, c = ["#b89a4a", "#a8713c", "#8fae4a"][Math.floor(r() * 3)];
    wrap(S, x, y, 12, (xx, yy) => { g.fillStyle = c; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(xx, yy, 7, 3.5, a, 0, 7); g.fill(); g.globalAlpha = 1; });
  }
  for (let i = 0; i < 16; i++) { // tiny flowers
    const x = r() * S, y = r() * S, c = ["#f4eedc", "#f2cf4e", "#e9a3c0"][Math.floor(r() * 3)];
    wrap(S, x, y, 8, (xx, yy) => { g.fillStyle = c; g.beginPath(); g.arc(xx, yy, 3.6, 0, 7); g.fill(); });
  }
});
/** hut wall (repeat 3 x 1 around): cream plaster, a painted leaf-green band with terracotta dots, dirt toward the ground */
const wallTex = () => ctex("vilWall", 512, 512, (g, r) => {
  g.fillStyle = "#ecdcb4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = r() * 512, rad = 30 + r() * 70, c = r() > 0.5 ? "255,246,220" : "196,170,120";
    wrap(512, x, y, rad, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, 0, xx, yy, rad); gr.addColorStop(0, `rgba(${c},0.3)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(xx - rad, yy - rad, 2 * rad, 2 * rad);
    });
  }
  const gr = g.createLinearGradient(0, 260, 0, 512); gr.addColorStop(0, "rgba(150,120,80,0)"); gr.addColorStop(1, "rgba(120,100,70,0.45)");
  g.fillStyle = gr; g.fillRect(0, 260, 512, 252);
  g.fillStyle = "#5f9a56"; g.fillRect(0, 104, 512, 30);          // band (canvas y = 104 is ~1.2 m up the wall)
  g.fillStyle = "#c9704f"; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(32 + i * 64, 119, 8, 0, 7); g.fill(); }
});
/** cone roof shingles (repeat 9 x 4): scalloped courses, light lip, dark course shadow */
const roofTex = (col: string, dark: string, light: string) => ctex("vilRoof" + col, 256, 256, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    const y0 = row * 64, off = (row % 2) * 32;
    for (let i = -1; i < 5; i++) {
      const x = i * 64 + off;
      g.fillStyle = r() > 0.5 ? light : dark; g.globalAlpha = 0.12 + 0.12 * r();
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 64, y0); g.lineTo(x + 64, y0 + 34); g.quadraticCurveTo(x + 32, y0 + 74, x, y0 + 34); g.closePath(); g.fill();
      g.globalAlpha = 0.6; g.strokeStyle = dark; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x, y0 + 30); g.quadraticCurveTo(x + 32, y0 + 74, x + 64, y0 + 30); g.stroke();
      g.globalAlpha = 1;
    }
  }
});
const ringTex = () => ctex("vilRings", 256, 256, (g) => {
  g.fillStyle = "#e3c891"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#b98f5a"; g.lineWidth = 5;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.ellipse(128 + i * 2, 128 - i, i * 21, i * 20, 0, 0, 7); g.stroke(); }
});

const yawM = (x: number, y: number, z: number, yaw: number, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s));
const col = (key: string, c: string) => lam("vil" + key, () => ({ color: c }));

/** a round hut: cream wall, stone plinth, shingled cone roof with a knob, arched plank door (local +z), two round windows */
const hut = (b: Batch, x: number, z: number, yaw: number, s: number, style: number) => {
  const M = yawM(x, hillY(x, z), z, yaw, s);
  const put = (g: THREE.BufferGeometry, m: THREE.Material, px = 0, py = 0, pz = 0, e?: THREE.Euler) =>
    b.add(g, m, M.clone().multiply(new THREE.Matrix4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(e ?? new THREE.Euler()), V(1, 1, 1))));
  const wall = lam("vilWallM", () => ({ map: rep(wallTex(), 3, 1) }));
  const roofs: [string, string, string][] = [["#c9785a", "#7a3b2c", "#f0b08a"], ["#6f9f58", "#2f5a34", "#b4d48a"], ["#d59a52", "#8a5a2a", "#f4cf8e"]];
  const rc = roofs[style % 3], roof = lam("vilRoofM" + rc[0], () => ({ map: rep(roofTex(...rc), 9, 4) }));
  put(new THREE.CylinderGeometry(1.22, 1.3, 2.6, 30, 1, true), wall, 0, 0.45, 0);
  put(new THREE.CylinderGeometry(1.36, 1.42, 1.3, 30), col("Plinth", "#b7a98f"), 0, -0.36, 0);
  put(new THREE.ConeGeometry(1.98, 2.2, 40, 1), roof, 0, 1.52 + 1.1, 0);
  put(new THREE.SphereGeometry(0.15, 14, 10), col("Knob", "#e2b45a"), 0, 3.76, 0);
  // door: stone surround + planks + knob
  const arch = (w: number, h: number, d: number) => { const g = new THREE.CylinderGeometry(w / 2, w / 2, d, 20); g.rotateX(Math.PI / 2); g.translate(0, h, 0); return g; };
  const stone = col("Frame", "#cdbd9c"), wood = col("Door", "#8a5a3a");
  put(new THREE.BoxGeometry(0.88, 1.12, 0.16), stone, 0, 0.56, 1.2); put(arch(0.88, 1.12, 0.16), stone, 0, 0, 1.2);
  put(new THREE.BoxGeometry(0.64, 1.06, 0.16), wood, 0, 0.53, 1.25); put(arch(0.64, 1.06, 0.16), wood, 0, 0, 1.25);
  put(new THREE.SphereGeometry(0.05, 10, 8), col("Knob", "#e2b45a"), 0.2, 0.62, 1.35);
  for (const side of [-1, 1]) {
    const a = side * 1.02, e = new THREE.Euler(0, a, 0);
    const glass = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 20); glass.rotateX(Math.PI / 2);
    put(glass, col("Glass", "#5f7fb8"), Math.sin(a) * 1.2, 1.02, Math.cos(a) * 1.2, e);
    put(new THREE.TorusGeometry(0.27, 0.06, 8, 22), wood, Math.sin(a) * 1.24, 1.02, Math.cos(a) * 1.24, e);
  }
};
/** a dark storybook pine: tapered trunk + four stacked cones (deep forest greens: the backdrop of the fairy lights) */
const pine = (b: Batch, x: number, z: number, h: number, seed: number) => {
  const y = hillY(x, z) - 0.25, leaf = col("Pine" + (seed % 3), ["#2f7247", "#296742", "#377b4b"][seed % 3]);
  b.add(new THREE.CylinderGeometry(0.05 * h, 0.08 * h, 0.3 * h + 0.25, 8), col("Bark", "#7d5439"), new THREE.Matrix4().makeTranslation(x, y + 0.15 * h, z));
  for (let i = 0; i < 4; i++) {
    const r = (0.25 - 0.05 * i) * h, ht = 0.32 * h;
    b.add(new THREE.ConeGeometry(r, ht, 14, 1), leaf, new THREE.Matrix4().makeTranslation(x + (hh(seed, i) - 0.5) * 0.04 * h, y + (0.2 + 0.19 * i) * h + ht / 2, z));
  }
};

// ---------------- cast layout ----------------
type Kind = "wave" | "hop" | "idle" | "chat" | "stroll";
/** home x, z, villager id, behaviour, stroll span (m). Staged in depth for the tall frame: near ones low, far ones high. */
const P: [number, number, number, Kind, number][] = [
  [-0.2, 3.7, 0, "wave", 0], [1.15, 4.0, 1, "chat", 0],
  [-1.0, 2.3, 2, "hop", 0], [0.55, 2.0, 3, "stroll", 1.0], [1.6, 2.5, 5, "idle", 0],
  [-2.0, 0.5, 6, "wave", 0], [-0.3, 0.3, 4, "stroll", 1.1], [1.5, 0.6, 7, "idle", 0],
  [-1.3, -1.3, 8, "hop", 0], [0.65, -1.5, 9, "wave", 0], [2.2, -1.2, 10, "stroll", 0.8],
  [-2.65, -3.0, 12, "wave", 0], [-0.4, -3.1, 11, "hop", 0], [1.7, -2.9, 13, "chat", 0],
  [-1.0, -4.6, 14, "stroll", 0.8], [0.75, -4.5, 15, "wave", 0],
];
const N = P.length, OWNER = 11; // the light the hero walks up to in 4d
const whoOf = (k: number) => WHO.villager(P[k][2]);
const sizeOf = (k: number) => (whoOf(k).o.build === "kid" ? 0.72 : 1);
/** vanish frame per villager: far ones first, the last one on "luz" */
const VF: number[] = (() => {
  const order = P.map((_, k) => k).sort((a, b) => P[a][1] - P[b][1]), out: number[] = [];
  order.forEach((k, rank) => { out[k] = VAN0 + Math.round((rank * (VAN1 - VAN0)) / (N - 1)); });
  return out;
})();
const TINTS: [number, number, number][] = [[1, 0.88, 0.5], [1, 0.7, 0.78], [0.62, 1, 0.74], [0.6, 0.86, 1], [1, 0.82, 0.55], [0.86, 0.74, 1]];
/** the three villagers of the medium shot (4b): P index, mark x, frame their fairy pops in */
const FEAT = [{ k: 1, x: -0.72, f0: 652 }, { k: 2, x: 0.02, f0: 663 }, { k: 3, x: 0.8, f0: 675 }];

/** animation clock of the crowd (frames): from f595 the game lags and only updates every 5th frame */
const lagF = (f: number) => (f >= LAG0 && f < B4 ? LAG0 + Math.floor((f - LAG0) / 5) * 5 : f >= C4 && f < D4 ? C4 + Math.floor((f - C4) / 5) * 5 : f);
const vpos = (k: number, ta: number) => {
  const [x, z, , kind, span] = P[k];
  if (kind !== "stroll") return { x, z, dirx: 0, phase: 0 };
  const d = 0.62 * ta + k * 0.37, s = d % (2 * span), fwd = s < span;
  return { x: x - span / 2 + (fwd ? s : 2 * span - s), z, dirx: fwd ? 1 : -1, phase: d / 0.88 };
};
/** one villager of the crowd doing its own thing at animation time ta (s) */
const stageVil = (u: Frame, k: number, ta: number, sc = 1, over: Partial<Act> = {}) => {
  const kind = P[k][3], who = whoOf(k), p = vpos(k, ta), s = sizeOf(k);
  let a: Act = { x: p.x, z: p.z };
  if (kind === "stroll") a = { ...a, dir: [p.dirx, 0], mode: "stroll", phase: p.phase, stride: 0.55, stomp: 0.5, expr: "smile" };
  else if (kind === "wave") a = { ...a, expr: "grin", wave: Math.sin(ta * 9 + k), tilt: 2.5 * Math.sin(ta * 2.2 + k) };
  else if (kind === "hop") a = { ...a, expr: "laugh", wave: Math.sin(ta * 11 + k), y: 0.15 * s * Math.abs(Math.sin(ta * 5.5 + k)), groundY: 0 };
  else if (kind === "chat") a = { ...a, expr: Math.floor(ta * 1.4 + k) % 2 ? "laugh" : "grin", look: k % 2 ? -1 : 1, tilt: 3 * Math.sin(ta * 3 + k), headTilt: 4 * Math.sin(ta * 2.1 + k) };
  else { const l = Math.sin(ta * 1.2 + k * 2); a = { ...a, expr: "smile", look: l > 0.35 ? 1 : l < -0.35 ? -1 : 0, headTilt: 4 * Math.sin(ta * 1.7 + k) }; }
  if (sc !== 1) a.scale = s * sc;
  act(u.out, u.cam, ta, who, { ...a, ...over });
  return p;
};
/** where a villager's fairy hovers: over the screen-left shoulder (the right arm is the waving one) */
const shoulder = (x: number, y: number, z: number, s: number): V3 => [x - 0.38 * s, y + 1.72 * s + 0.06, z + 0.06];

// ---------------- console on the stump ----------------
const SX = -0.95, SZ = 4.5, STUMP = 0.56;
const smokeDraw = (v: number, tone: number) => (p: Pen) => {
  const fill = ["#b3afbb", "#8f8b98", "#6f6b79"][tone], hi = ["#d3cfd9", "#aeaab6", "#8d8996"][tone];
  const cs: [number, number, number][] = v ? [[100, 112, 50], [58, 124, 34], [144, 120, 36], [80, 76, 36], [128, 72, 32]] : [[100, 108, 54], [56, 104, 32], [146, 110, 34], [102, 62, 34]];
  for (const [x, y, r] of cs) p.ell(x, y, r, r, fill, 15);
  for (const [x, y, r] of cs) p.ell(x, y, r - 6, r - 6, fill, 0);
  for (const [x, y, r] of cs) p.ell(x - r * 0.25, y - r * 0.3, r * 0.42, r * 0.34, hi, 0);
};
const glowDraw = (rgb: string) => (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.3, `rgba(${rgb},0.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
/** a cartoon twinkle on a 300 x 300 canvas: a fat 4-point star with ink, two small dots; s = size 0..1 */
const twinkleDraw = (s: number) => (p: Pen) => {
  const c = 150, R = 30 + 110 * s, r = 0.32 * R, pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 4 === 0 ? R : i % 2 ? r : r * 1.15; pts.push([c + rr * Math.cos(a), c + rr * Math.sin(a)]); }
  p.poly(pts, "#fff3a8", 10);
  p.ell(c, c, r * 0.55, r * 0.55, "#fffbe6", 0);
  for (const [dx, dy, d] of [[1, -1, 0.85], [-1, 1, 0.7]]) p.ell(c + dx * R * d * 0.75, c + dy * R * d * 0.75, 7 + 8 * s, 7 + 8 * s, "#fff3a8", 6);
};
/** a villager vanishing: a light outlined cloud puff that pops big then shrinks away (n = frames since the vanish) */
const vanishPuff = (u: Frame, i: number, n: number, x: number, y: number, z: number, s: number) => {
  if (n < 0 || n >= 11) return;
  const w = s * (n < 3 ? 0.55 + 0.2 * n : 1.15 * (1 - (n - 3) / 9)) * 0.75;
  u.out.fx.push({ key: `vilVan${i % 2}`, cw: 200, ch: 200, draw: smokeDraw(i % 2, 0), x, y: y + 0.04 * n, z, w, h: w, rot: 0.2 * i + 0.03 * n });
};
/** smoke puffs: [spawn frame, life]. Sparse at first, thick while the village is full, thinning out as the villagers vanish */
const SMOKE: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let f = 579; f <= 712;) { out.push([f, f > 700 ? 18 : 28]); f += f < 593 ? 7 : f < 607 ? 5 : f < 700 ? 3 : 6; }
  return out;
})();
/** how hard the console is struggling, 0..1 */
const strain = (f: number) => Math.min(ramp(f, 572, 609), 1 - ramp(f, VAN0, VAN1 + 2));

// ---------------- cameras ----------------
const W_POS: V3 = [0.2, 4.6, 12.6], W_LOOK: V3 = [0, 1.2, -0.6];
const wide = (f: number) => dolly(W_POS, W_LOOK, pushK(f, 557, 0.0015));
const wide2 = (f: number) => dolly([0.1, 4.75, 12.2], [0, 1.15, -0.9], pushK(f, C4, 0.0016));
const D_LOOK0: V3 = [-3.95, 1.6, -3.0], D_LOOK1: V3 = [-3.45, 1.6, -3.0];
const cams: Record<number, Key[]> = {
  4: [
    { f: 549, s: wide },
    { f: 601, dur: 30, s: rolled(wide, -0.035) },
    { f: B4, cut: true, s: (f) => dolly([0.15, 1.5, 6.4], [0.05, 1.15, 0], pushK(f, B4, 0.0024)) },
    { f: C4, cut: true, s: wide2 },
    { f: D4, cut: true, s: (f) => dolly([D_LOOK0[0] - 0.1, 1.45, 4.1], D_LOOK0, pushK(f, D4, 0.0015)) },
    { f: 753, dur: 22, s: (f) => dolly([D_LOOK1[0] - 0.1, 1.45, 4.1], D_LOOK1, pushK(f, D4, 0.0015, 0.006, 16)) },
  ],
};
const dof: Dof[] = [
  { f: 549, cInf: 0 },
  { f: B4, cInf: 11, focus: () => [0.05, 1.4, 0] },
  { f: C4, cInf: 0 },
  { f: D4, cInf: 10, focus: () => [-3.4, 1.45, -3.0] },
];

export const village: Scene = (() => {
  const fairies: Fairy[] = [];
  let rig: THREE.Group, led: THREE.Mesh;
  const ledPos = new THREE.Vector3();

  const build = (root: THREE.Group) => {
    const b = new Batch();
    // ---- ground: forest floor over the lawn, rising into the slope behind the green ----
    const g = new THREE.PlaneGeometry(90, 70, 90, 70); g.rotateX(-Math.PI / 2); g.translate(0, 0, -22);
    const pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, hillY(x, z) + 0.012); uv.setXY(i, x / 6, z / 6);
    }
    g.computeVertexNormals();
    b.add(g, lam("vilFloorM", () => ({ map: floorTex() })));
    // ---- six huts: two on the green's far edge, three up the slope, one on top ----
    hut(b, -3.3, -7.0, 0.15, 1.0, 0);
    hut(b, 3.3, -7.4, -0.35, 1.05, 1);
    hut(b, -0.2, -10.2, 0.0, 1.0, 2);
    hut(b, -4.6, -11.4, 0.3, 0.95, 1);
    hut(b, 4.1, -11.8, -0.3, 0.95, 0);
    hut(b, 1.7, -15.4, -0.1, 1.0, 1);
    // stepping stones from the green up to the doors
    const stoneM = col("Step", "#b9b2a2");
    for (const [x, z] of [[-3.0, -5.3], [-2.6, -4.5], [2.8, -5.7], [2.4, -4.9], [-0.25, -8.3], [-0.5, -7.4], [-0.3, -6.5], [-0.1, -5.6], [0.9, -13.2], [0.4, -12.2]]) {
      const s = new THREE.CylinderGeometry(0.26, 0.3, 0.07, 12);
      b.add(s, stoneM, new THREE.Matrix4().compose(V(x, hillY(x, z) + 0.03, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), x * 3), V(1.2, 1, 0.9)));
    }
    // ---- forest: dark pines up the slope and around, a few leafy trees and bushes between the huts ----
    const pines: [number, number, number][] = [
      [-6.4, -8.2, 6.5], [-7.6, -13.5, 8], [-2.6, -13.6, 6.5], [-0.9, -17.8, 7.5], [4.4, -16.5, 7], [6.9, -9.2, 6.5], [7.4, -14.2, 8.5],
      [-5.2, -17.5, 8], [-9.5, -9.8, 9], [9.6, -11.5, 9], [2.2, -20.5, 8.5], [-3.4, -21.5, 9], [6.4, -20.8, 9.5], [-8.4, -19.8, 10],
      [10.5, -17.2, 10], [-11.8, -14.6, 10], [0.2, -24.5, 10], [-6.2, -25.2, 11], [4.6, -25.5, 11], [9.6, -24.2, 11.5], [-11.2, -23.6, 11.5],
      [13.4, -21.5, 12], [-14.6, -19.4, 12], [-2.2, -28.8, 12], [2.8, -29.5, 12.5], [7.6, -29.6, 12], [-8.6, -29.8, 12.5], [13, -28, 13], [-14, -27.5, 13],
      [-7.2, -3.6, 7.5], [-8.4, 0.4, 8.5], [-7.4, 4.2, 8], [-10.4, -5.4, 9.5], [-11.5, 2.2, 10], [8.6, -5.6, 8], [10.8, -2.2, 9.5], [9.4, 2.6, 9], [12.6, -7.4, 10.5],
      [-17, -10, 12], [17, -12, 12], [-18, -24, 13], [18, -25, 13], [-13, 6, 11], [13, 7, 11],
    ];
    pines.forEach(([x, z, h], i) => pine(b, x, z, h, i));
    const leafy: [number, number, number, "round" | "fat" | "tall"][] = [[-5.4, -14.6, 5.5, "round"], [3.6, -19.2, 6, "fat"], [7.2, -12.2, 5.5, "round"], [-2.2, -18.8, 5.5, "tall"], [-9.2, -16.2, 6.5, "fat"], [10.6, -20, 7, "round"]];
    leafy.forEach(([x, z, h, k], i) => addVeg(b, k, x, hillY(x, z), z, h, 31 + i * 7, 1));
    const bushes: [number, number, number][] = [[-4.5, -6.1, 0.9], [-1.2, -6.9, 0.75], [4.7, -6.4, 0.9], [1.3, -7.4, 0.7], [-1.9, -10.6, 0.85], [1.5, -10.4, 0.8], [-6.2, -11.6, 0.9], [5.8, -11.4, 0.9],
      [3.4, -15.2, 0.8], [0.1, -15.8, 0.8], [-3.2, -15.5, 0.9], [-5.4, -5.2, 0.7], [5.6, -4.8, 0.7], [-6.6, -1.4, 0.9], [6.8, -0.6, 0.9], [-6.2, 2.6, 0.8], [6.4, 3.4, 0.8]];
    bushes.forEach(([x, z, h], i) => addVeg(b, "bush", x, hillY(x, z), z, h, 91 + i * 5, 1));
    // mushrooms by the stump and the huts (red caps, cream stems)
    for (const [x, z, s] of [[SX - 0.85, SZ + 0.25, 1], [SX - 0.6, SZ - 0.5, 0.7], [-1.6, -5.4, 1], [3.9, -5.2, 0.9], [1.2, -8.9, 0.9], [-4.1, -7.9, 1]]) {
      const y = hillY(x, z);
      b.add(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.16 * s, 8), col("Stem", "#efe4c8"), new THREE.Matrix4().makeTranslation(x, y + 0.08 * s, z));
      b.add(new THREE.SphereGeometry(0.13 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), col("Cap", "#d2553f"), new THREE.Matrix4().compose(V(x, y + 0.14 * s, z), new THREE.Quaternion(), V(1, 0.8, 1)));
    }
    // ---- the stump (lower corner of the wide) ----
    b.add(new THREE.CylinderGeometry(0.5, 0.62, STUMP, 20), col("Stump", "#8d5d3c"), new THREE.Matrix4().makeTranslation(SX, STUMP / 2, SZ));
    b.add(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 20), lam("vilRingsM", () => ({ map: ringTex() })), new THREE.Matrix4().makeTranslation(SX, STUMP + 0.005, SZ));
    for (let i = 0; i < 4; i++) {
      const a = 0.6 + i * 1.6;
      b.add(new THREE.SphereGeometry(0.2, 10, 8), col("Stump", "#8d5d3c"), new THREE.Matrix4().compose(V(SX + Math.cos(a) * 0.55, 0.04, SZ + Math.sin(a) * 0.55), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -a), V(1.5, 0.6, 0.7)));
    }
    b.build(root);
    // ---- the console (1.6x) + its status lamp ----
    rig = new THREE.Group();
    const con = makeConsole(); con.scale.setScalar(1.6); rig.add(con);
    led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0x30c050 }));
    led.position.set(0.0, 0.3, 0.32); led.layers.set(NOINK); rig.add(led);
    root.add(rig);
    for (let k = 0; k < N; k++) fairies.push(new Fairy(root, k * 1.37, TINTS[k % TINTS.length]));
  };

  /** fairy light of villager k after its owner vanished: drifts from the shoulder to a slow hover */
  const hover = (k: number, f: number, t: number): V3 => {
    const pv = vpos(k, lagF(VF[k]) / 30), s = sizeOf(k), a = shoulder(pv.x, 0, pv.z, s);
    if (k === OWNER) return a;
    const e = ramp(f, VF[k], VF[k] + 16);
    return [lerp(a[0], pv.x - 0.15, e) + e * 0.14 * Math.sin(t * 1.15 + k * 2.3), lerp(a[1], 1.3, e) + e * 0.11 * Math.sin(t * 1.7 + k * 1.1), a[2] + e * 0.1 * Math.cos(t * 0.9 + k)];
  };

  const consoleFx = (u: Frame) => {
    const f = u.f, k = strain(f);
    // shake: frame-hashed jitter + a jump with every puff
    const j = (s: number) => (hh(f, s) - 0.5) * 2 * k;
    rig.position.set(SX + 0.022 * j(1), STUMP + 0.02 + 0.03 * k * Math.abs(Math.sin(f * 1.9)), SZ + 0.012 * j(2));
    rig.rotation.set(0.05 * j(3), 0.3 + 0.05 * j(4), 0.07 * j(5));
    const relief = Math.max(0, f - 727), sigh = f >= 727 ? 0.07 * Math.exp(-relief / 5) * Math.cos(relief * 0.9) : 0;
    rig.scale.set(1 + 0.05 * k * Math.sin(f * 2.3) - sigh * 0.5, 1 - 0.05 * k * Math.sin(f * 2.3) + sigh, 1);
    // status lamp: red blink while it struggles, calm green pulses at "relief"
    const mat = led.material as THREE.MeshBasicMaterial;
    const pulse = (n: number) => (n < 0 ? 0 : n < 3 ? n / 3 : Math.exp(-(n - 3) / 6));
    const green = f >= 724 ? Math.max(pulse(f - 727), pulse(f - 740)) : 0, red = k > 0.25 && Math.floor(f / 4) % 2 === 0 ? k : 0;
    if (red > 0) mat.color.setRGB(4 * red, 0.35, 0.25); else mat.color.setRGB(0.15, 0.55 + 4 * green, 0.25 + 0.8 * green);
    rig.updateMatrixWorld(true); led.getWorldPosition(ledPos);
    if (red > 0 || green > 0.05) {
      const a = red > 0 ? 0.7 * red : green;
      u.out.fx.push({ key: "vilGlow" + (red > 0 ? "R" : "G"), cw: 128, ch: 128, draw: glowDraw(red > 0 ? "255,90,60" : "120,255,150"), x: ledPos.x, y: ledPos.y, z: ledPos.z + 0.08,
        w: 0.16 + 0.22 * a, h: 0.16 + 0.22 * a, add: true, glow: 0.6 + 1.2 * a });
    }
    // smoke: outlined puffs rising off the deck, darker as the strain grows
    for (let i = 0; i < SMOKE.length; i++) {
      const [f0, life] = SMOKE[i], age = f - f0;
      if (age < 0 || age >= life) continue;
      const e = age / life, tone = f0 < 597 ? 0 : f0 < 611 || f0 >= 694 ? 1 : 2;
      const size = (0.28 + 0.52 * Math.sqrt(e)) * (1 - ramp(age, life - 7, life)) * (f0 > 700 ? 0.7 : 1) * pop(age, 0, 5);
      u.out.fx.push({ key: `vilSmoke${i % 2}_${tone}`, cw: 200, ch: 200, draw: smokeDraw(i % 2, tone), x: SX + 0.1 + (hh(i, 1) - 0.5) * 0.55 * e + 0.1 * Math.sin(age * 0.3 + i),
        y: STUMP + 0.5 + 1.9 * e * (0.8 + 0.4 * hh(i, 2)), z: SZ + 0.1 + 0.002 * i, w: size, h: size, rot: (hh(i, 3) - 0.5) * 0.8 + 0.02 * age });
    }
    // sparks while it is at the limit
    if (f >= 607 && f < 634) for (let n = 0; n < 2; n++) {
      const s = Math.floor((f - 607 + n * 2) / 4), age = (f - 607 + n * 2) % 4;
      u.out.fx.push({ key: `vilSpark${age}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, (age + 0.5) / 4, "#ffe14a", 6, 34, 220),
        x: SX + (hh(s, 7 + n) - 0.5) * 1.0, y: STUMP + 0.3 + 0.45 * hh(s, 9 + n), z: SZ + 0.35, w: 0.62, h: 0.62, rot: hh(s, 11) * 3, glow: 1.5 });
    }
  };

  const update = (u: Frame) => {
    const f = u.f, t = u.t, ta = lagF(f) / 30;
    for (const fy of fairies) fy.hide();
    consoleFx(u);
    const light = (k: number, p: V3, size: number, glow = 1) => fairies[k].pose(p[0], p[1], p[2], t, u.camera, 0.75 * size, 0.75 * glow); // the shared fairy is 20 cm with a 0.95 m halo at size 1
    const spark = (n: number, life: number, x: number, y: number, z: number, w: number) => {
      if (n < 0 || n >= life) return;
      const k = Math.round(6 * Math.sin((Math.PI * (n + 1)) / (life + 1))) / 6;
      u.out.fx.push({ key: `vilTw${k}`, cw: 300, ch: 300, draw: twinkleDraw(k), x, y, z, w, h: w, rot: 0.15 * n, glow: 1.25 });
    };

    if (f < B4) {
      // ---- 4a: the crowded green ----
      for (let k = 0; k < N; k++) stageVil(u, k, ta);
    } else if (f < C4) {
      // ---- 4b: three villagers, three fairies (the rows behind them get theirs too, out of focus) ----
      // (the rows behind stay plain: only the three featured villagers get a fairy, one clear beat each)
      for (let k = 8; k < N; k++) stageVil(u, k, t);
      for (const { k, x, f0 } of FEAT) {
        // fairy on the shoulder toward a free gap: left one -> right, kid -> right (toward the gap), right one -> left
        const who = whoOf(k), s = sizeOf(k), n = f - f0, seen = n >= 2, side: -1 | 1 = x < 0.4 ? 1 : -1;
        const hop = n >= 2 && n < 10 ? 0.11 * s * Math.sin((Math.PI * (n - 2)) / 8) : 0;
        act(u.out, u.cam, t, who, { x, z: 0, y: hop, groundY: 0, expr: !seen ? "smile" : n < 6 ? "shock" : n < 26 ? "grin" : "relief",
          look: seen ? side : 0, facing: n >= 6 ? side : 0, headTilt: seen ? 7 * side * ramp(f, f0 + 2, f0 + 8) + 1.5 * Math.sin(t * 3 + k) : 2 * Math.sin(t * 2 + k),
          tilt: 1.5 * Math.sin(t * 1.6 + k * 2), wave: n >= 12 && n < 30 && k === 2 ? Math.sin(t * 12) : undefined });
        if (n >= 0) {
          const a0 = shoulder(x, 0, 0, s), a: V3 = [x + side * (x - a0[0]), a0[1], a0[2]], e = pop(f, f0, 8), orbit = ramp(f, f0 + 8, f0 + 20);
          light(k, [a[0] - 0.04 + 0.05 * orbit * Math.sin(t * 2.6 + k), a[1] + 0.04 + 0.04 * orbit * Math.cos(t * 2.6 + k), a[2]], 1.15 * e, 1 + 0.6 * (1 - ramp(f, f0, f0 + 10)));
          spark(n, 7, a[0] - 0.04, a[1] + 0.04, a[2] - 0.02, 0.7);
        }
      }
    } else if (f < D4) {
      // ---- 4c: seen from afar, only the lights stay ----
      for (let k = 0; k < N; k++) {
        const s = sizeOf(k), n = f - VF[k];
        if (n < 0) {
          const p = stageVil(u, k, ta, n === -2 ? 1.1 : n === -1 ? 0.82 : 1);
          light(k, shoulder(p.x, 0, p.z, s), 1.3, 0.7);
        } else {
          const pv = vpos(k, lagF(VF[k]) / 30);
          vanishPuff(u, k, n, pv.x, 0.85 * s, pv.z + 0.15, 1.25 * s);
          light(k, hover(k, f, t), 1.35 + 0.6 * Math.exp(-n / 4), 0.6 + 0.5 * Math.exp(-n / 5));
        }
      }
    } else {
      // ---- 4d: the hero walks up to one light; its owner pops in ----
      const [ox, oz] = P[OWNER], n = f - POP, HX = -4.2;
      for (let k = 0; k < N; k++) light(k, hover(k, f, t), k === OWNER ? 1.2 + (n >= 0 ? 0.5 * Math.exp(-n / 4) : 0) : 1.3, 0.75);
      if (n >= 0) {
        act(u.out, u.cam, t, whoOf(OWNER), { x: ox, z: oz, scale: Math.max(0.05, pop(f, POP, 7)), expr: n < 16 ? "grin" : "laugh", look: -1, facing: -1,
          wave: Math.sin(t * 13), tilt: -3 + 2 * Math.sin(t * 4), y: n > 7 ? 0.05 * Math.abs(Math.sin(t * 7)) : 0, groundY: 0 });
        spark(n, 8, ox + 0.28, 1.98, oz + 0.1, 0.8);
        if (n < 7) u.out.fx.push({ key: `vilVan${n % 2}`, cw: 200, ch: 200, draw: smokeDraw(n % 2, 0), x: ox - 0.1 + 0.05 * n, y: 0.3, z: oz - 0.2, w: 0.9 * (1 - n / 8), h: 0.9 * (1 - n / 8), rot: 0.1 * n });
      }
      if (f < 775) {
        const x = HX - (1.6 * (775 - f)) / 30;
        act(u.out, u.cam, t, WHO.hero, { x, z: oz, dir: [1, 0], mode: "march", phase: ((((x - HX) / 1.6) % 1) + 1) % 1, expr: "smile", stomp: 0.7 });
      } else if (n < 0) act(u.out, u.cam, t, WHO.hero, { x: HX, z: oz, face: "side", mirror: false, expr: "neutral" });
      else if (n < 8) act(u.out, u.cam, t, WHO.hero, { x: HX - 0.025 * (n + 1), z: oz, y: 0.36 * Math.sin((Math.PI * (n + 0.6)) / 8.2), groundY: 0, mode: "fall", expr: "shock", look: 1, tilt: -6 });
      else act(u.out, u.cam, t, WHO.hero, { x: HX - 0.2, z: oz, expr: n < 15 ? "shock" : "nervous", facing: 1, look: 1,
        tilt: -7 * Math.exp(-(n - 8) / 6) + 0.6 * Math.sin(f * 2.1) * Math.exp(-(n - 8) / 5), headTilt: -3 });
    }
  };

  return {
    name: "village",
    build, update, cams, dof,
    kicks: [[POP, 0.5]],
    cues: [
      [585, "sputter", "console on the stump starts to cough smoke"],
      [LAG0, "lag_stutter", "the crowd drops to a low frame rate (optional glitch ticks until 637)"],
      [619, "strain", "sparks, red lamp, shaking"],
      [652, "twinkle", "fairy 1 pops in"], [663, "twinkle", "fairy 2 (the kid's)"], [675, "twinkle", "fairy 3"],
      [VAN0, "puffs", "villagers vanish one by one until 722"],
      [727, "relief", "console sighs, calm green blink (again at 740)"],
      [POP, "pop", "the owner pops into existence, hero jolts"],
    ],
  };
})();
