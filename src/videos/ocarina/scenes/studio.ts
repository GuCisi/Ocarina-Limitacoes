// Scene `studio`: a storybook 1990s Kyoto street in front of the cream studio townhouse (cherry tree, stone lantern,
// low fence). A long table carries the KINGDOM MODEL (field, river, five huts, tiny trees, a dark castle on a mound;
// the castle is its own liftable object); a small table carries the grey console (1.6x).
// Shot 2 (108-470): establishing -> the flat map pops up into the model -> glide over the kingdom -> the photo stack
// that will not fit (one photo goes in) -> close-up "Uma." -> the producer keeps only the castle, the rest slides away.
// Shot 9 (1368-1525): the team cheers the delay -> frozen, staring at one tiny cartridge next to the big model.
// Shot 12 (1900-1938): close-up of the producer still holding the little castle, raised brow, then a look to the lens.
import * as THREE from "three";
import { Batch, lam, house, addVeg } from "../build";
import { cobbleHD, stoneHD, ctex } from "../paint";
import { SHOTS, dolly, pushK, pop, ramp, clamp01, lerp, wf, V3, Key } from "../timeline";
import { act, WHO } from "../chars";
import { makeConsole, makeCartridge, makePhoto, makeTable, flatMat } from "../props";
import { hh, q, Who } from "../cast";
import { fxBurst, fxPuff, Pen, Expr } from "../toon";
import type { Scene, Frame } from "./types";

// ---------------- layout ----------------
const TZ = 0; // long table centre (long axis along z)
const KZ = -0.25; // kingdom model centre (z), on the table top
const TOP = 0.82; // table top height
const CX = 3.4, CZ = 1.0; // console table
const CS = 1.6; // console scale
const SLOT_Y = TOP + 0.19 * CS, SLOT_Z = CZ - 0.06 * CS;
const PROD: [number, number] = [0, -1.62];
const CASTLE_LOCAL: V3 = [0.08, 0.112, -0.62]; // castle base on the mound (kingdom local)
const DEV0: [number, number] = [CX - 0.38, CZ - 0.5];
// raised right hand of a front-view adult (bodyFront, wave 0): 0.31 m to screen right, 1.43 m up
const HAND_R = 0.38, HAND_Y = 1.45;

// ---------------- small geometry helpers ----------------
const M = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(sx, sy, sz));
const box = (b: Batch, col: string, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0) =>
  b.add(new THREE.BoxGeometry(w, h, d), flatMat(col), M(x, y + h / 2, z, ry));
const cyl = (b: Batch, col: string, x: number, y: number, z: number, r0: number, r1: number, h: number, seg = 14) =>
  b.add(new THREE.CylinderGeometry(r1, r0, h, seg), flatMat(col), M(x, y + h / 2, z));
const cone = (b: Batch, col: string, x: number, y: number, z: number, r: number, h: number, seg = 14, ry = 0) =>
  b.add(new THREE.ConeGeometry(r, h, seg), flatMat(col), M(x, y + h / 2, z, ry));
const ball = (b: Batch, col: string, x: number, y: number, z: number, r: number, sy = 1, seg = 18) =>
  b.add(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.65))), flatMat(col), M(x, y, z, 0, 1, sy, 1));

// ---------------- the paper map (flat, before the pop-up) ----------------
const mapTex = () => ctex("studioMap", 512, 1024, (g) => {
  g.fillStyle = "#f2e4c0"; g.fillRect(0, 0, 512, 1024);
  g.strokeStyle = "#b89a6a"; g.lineWidth = 10; g.strokeRect(10, 10, 492, 1004);
  g.fillStyle = "#8fca6a"; g.fillRect(40, 40, 432, 944);
  g.fillStyle = "#79b85a"; g.beginPath(); g.ellipse(270, 160, 140, 90, 0, 0, 7); g.fill(); // mound
  g.strokeStyle = "#e8cf9a"; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(250, 980); g.bezierCurveTo(200, 760, 330, 520, 280, 200); g.stroke();
  g.strokeStyle = "#4a9fe0"; g.lineWidth = 46; g.beginPath(); g.moveTo(30, 520); g.bezierCurveTo(160, 600, 300, 470, 482, 560); g.stroke();
  g.fillStyle = "#a8724a"; g.fillRect(250, 510, 60, 40); // bridge
  g.fillStyle = "#3f8a3f";
  for (const [x, y] of [[90, 300], [130, 360], [400, 330], [420, 420], [80, 700], [420, 760], [110, 880], [380, 900], [150, 450]]) { g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); }
  for (const [x, y] of [[170, 690], [250, 760], [330, 690], [300, 830], [190, 830]]) {
    g.fillStyle = "#f4ead2"; g.fillRect(x - 18, y - 6, 36, 26);
    g.fillStyle = "#d2453c"; g.beginPath(); g.moveTo(x - 26, y - 4); g.lineTo(x, y - 34); g.lineTo(x + 26, y - 4); g.fill();
  }
  g.fillStyle = "#6f6884"; g.fillRect(240, 120, 70, 60); g.fillRect(310, 70, 26, 110);
  g.fillStyle = "#2f5f66"; g.beginPath(); g.moveTo(304, 72); g.lineTo(323, 30); g.lineTo(342, 72); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 5; g.strokeRect(240, 120, 70, 60); g.strokeRect(310, 70, 26, 110);
});

// ---------------- the kingdom diorama (local: x +-0.45, z +-0.9, y = 0 at the table top) ----------------
const buildKingdom = (grp: THREE.Group) => {
  const b = new Batch();
  box(b, "#9a6a44", 0, 0, 0, 0.92, 0.035, 1.82); // wooden base
  box(b, "#7cc35a", 0, 0.035, 0, 0.9, 0.018, 1.8); // bright field
  for (const [x, z, r] of [[-0.3, 0.55, 0.16], [0.32, -0.15, 0.14], [-0.28, -0.35, 0.13]]) ball(b, "#86cc62", x, 0.05, z, r, 0.22);
  ball(b, "#6db650", CASTLE_LOCAL[0], 0.05, CASTLE_LOCAL[2], 0.24, 0.27, 24); // castle mound
  const path: [number, number][] = [[0.02, 0.88], [-0.06, 0.6], [0.05, 0.3], [0.1, 0.0], [0.04, -0.3], [0.07, -0.46]];
  for (let i = 0; i + 1 < path.length; i++) {
    const [x0, z0] = path[i], [x1, z1] = path[i + 1], l = Math.hypot(x1 - x0, z1 - z0);
    b.add(new THREE.BoxGeometry(0.06, 0.004, l + 0.03), flatMat("#ecd29c"), M((x0 + x1) / 2, 0.055, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)));
  }
  const riv: [number, number][] = [[-0.47, 0.06], [-0.25, 0.16], [-0.05, 0.08], [0.15, 0.03], [0.32, 0.12], [0.47, 0.1]];
  for (let i = 0; i + 1 < riv.length; i++) {
    const [x0, z0] = riv[i], [x1, z1] = riv[i + 1], l = Math.hypot(x1 - x0, z1 - z0);
    b.add(new THREE.BoxGeometry(l + 0.05, 0.006, 0.1), flatMat("#4aa3e6"), M((x0 + x1) / 2, 0.056, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)));
  }
  b.add(new THREE.BoxGeometry(0.09, 0.016, 0.16), flatMat("#a8724a"), M(0.1, 0.064, 0.03, 0.1)); // bridge
  const roofs = ["#d2453c", "#e0873a", "#c9583a", "#d86a4a", "#e0a03a"];
  [[-0.17, 0.5], [0.02, 0.62], [0.22, 0.48], [0.15, 0.72], [-0.12, 0.74]].forEach(([x, z], i) => {
    cyl(b, "#f4ead2", x, 0.054, z, 0.042, 0.04, 0.05, 12);
    cone(b, roofs[i], x, 0.102, z, 0.06, 0.065, 12);
    box(b, "#5a3b2a", x, 0.054, z + 0.038, 0.018, 0.028, 0.012);
  });
  const trees: [number, number, number][] = [[-0.36, -0.05, 1], [-0.38, 0.3, 0], [-0.3, 0.33, 1], [0.37, 0.38, 0], [0.38, -0.42, 1], [0.34, 0.66, 1],
    [-0.36, 0.62, 0], [-0.37, -0.6, 1], [-0.25, -0.75, 0], [0.33, -0.72, 0], [-0.4, 0.84, 1], [0.4, 0.84, 0], [-0.18, -0.12, 1], [0.27, 0.25, 1]];
  trees.forEach(([x, z, k], i) => {
    const s = 0.85 + 0.35 * hh(i, 4);
    cyl(b, "#8a5a3c", x, 0.054, z, 0.009, 0.007, 0.04 * s, 6);
    if (k) ball(b, i % 2 ? "#3f9a45" : "#4fae4a", x, 0.054 + 0.07 * s, z, 0.04 * s, 1.05, 12);
    else cone(b, "#2f8a4a", x, 0.054 + 0.025 * s, z, 0.04 * s, 0.11 * s, 10);
  });
  for (let i = 0; i < 16; i++) ball(b, ["#f7d24a", "#f28ab0", "#f4f0e6"][i % 3], -0.42 + 0.84 * hh(i, 7), 0.058, -0.85 + 1.7 * hh(i, 8), 0.008, 1, 6);
  b.build(grp);
};
/** the little dark castle (origin at its base centre, front toward +z) */
const buildCastle = (grp: THREE.Group) => {
  const b = new Batch();
  const st = "#7a7290", st2 = "#6a6382", teal = "#2b5b63", dark = "#2a2433";
  box(b, st, 0, 0, 0, 0.17, 0.12, 0.13); // keep
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) box(b, st2, sx * 0.065, 0.12, sz * 0.055, 0.03, 0.025, 0.02);
  for (const sx of [-1, 1]) box(b, st2, sx * 0.075, 0.12, 0, 0.02, 0.025, 0.03);
  box(b, dark, 0, 0, 0.062, 0.05, 0.065, 0.012); // gate
  cyl(b, st, 0.075, 0, -0.04, 0.042, 0.038, 0.3, 16); // tall round tower
  cone(b, teal, 0.075, 0.3, -0.04, 0.055, 0.12, 16);
  box(b, "#8a5aa0", 0.075, 0.42, -0.04, 0.004, 0.05, 0.004);
  box(b, "#8a3aa0", 0.09, 0.445, -0.04, 0.03, 0.02, 0.004); // purple banner
  cyl(b, st2, -0.085, 0, 0.055, 0.026, 0.024, 0.17, 12); cone(b, teal, -0.085, 0.17, 0.055, 0.036, 0.075, 12);
  for (const y of [0.18, 0.24]) box(b, dark, 0.075, y, -0.002, 0.012, 0.022, 0.006); // tower windows
  b.build(grp);
};

// ---------------- the street set ----------------
const buildStreet = (root: THREE.Group) => {
  const b = new Batch();
  // cobbled street: runs well under and behind every lens (no lawn seam at the bottom of the wide)
  const pave = new THREE.PlaneGeometry(60, 40); pave.rotateX(-Math.PI / 2);
  const uv = pave.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 15, uv.getY(i) * 10);
  b.add(pave, lam("cobbleHD", () => ({ map: cobbleHD() })), M(0, 0.012, 15.2));
  b.add(new THREE.BoxGeometry(36, 0.1, 1.2), lam("studioCurb", () => ({ map: stoneHD("studioCurb", ["#d8cdb8", "#cfc3ad", "#e0d6c2", "#c8bba4"]) })), M(0, 0.05, -4.25));
  house(b, 0, -7.4, 0, 7.2, 5, 5.4, 0);
  house(b, -8.2, -7.8, 0, 7, 5, 4.4, 4);
  house(b, 8.3, -7.6, 0, 7.4, 5, 4.8, 6);
  house(b, -16, -8.2, 0, 7, 5, 5.0, 1);
  house(b, 16.4, -8, 0, 7, 5, 4.2, 3);
  const wood = "#9a6a44";
  for (let x = -6.4; x <= 6.41; x += 0.55) { if (Math.abs(x) < 0.85) continue; box(b, wood, x, 0.1, -3.62, 0.07, 0.72, 0.07); }
  for (const s of [-1, 1]) for (const y of [0.38, 0.65]) box(b, "#a8784e", s * 3.65, y, -3.62, 5.6, 0.05, 0.04);
  for (const [x, h] of [[-5.6, 0.8], [-1.6, 0.7], [1.9, 0.75], [5.2, 0.85], [-9.5, 0.9], [9.8, 0.8]]) addVeg(b, "bush", x, 0.1, -4.25, h, x * 31 + 7, 0);
  addVeg(b, "round", 12.5, 0, -4.8, 4.4, 3, 0);
  addVeg(b, "fat", -12.6, 0, -5, 4.2, 9, 0);
  // two cherry trees (pink canopies of soft lobes) with fallen petals
  const pinks = ["#f4a8c4", "#f7bdd2", "#ec96b6", "#f9cadb"];
  const cherry = (TX: number, TZz: number, s: number, seed: number) => {
    b.add(new THREE.CylinderGeometry(0.13 * s, 0.22 * s, 2.4 * s, 12), flatMat("#7a4f3a"), M(TX, 1.2 * s, TZz));
    for (const [ry, rz] of [[0, 0.7], [2.1, 0.6], [4.2, 0.75]]) {
      const g = new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 1.3 * s, 8); g.translate(0, 0.65 * s, 0);
      b.add(g, flatMat("#7a4f3a"), M(TX, 2.1 * s, TZz, ry, 1, 1, 1, 0, rz));
    }
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + seed, d = (i === 0 ? 0 : 0.55 + 0.6 * hh(i + seed, 2)) * s, r = (0.62 + 0.35 * hh(i + seed, 3)) * s;
      ball(b, pinks[(i + seed) % 4], TX + d * Math.cos(a), (3.1 + 0.7 * hh(i + seed, 5) - (d > 0.9 * s ? 0.25 : 0)) * s, TZz + d * 0.8 * Math.sin(a), r, 0.88, 22);
    }
    for (let i = 0; i < 50; i++) {
      const a = hh(i + seed, 21) * 6.28, d = (0.4 + 2.4 * hh(i + seed, 22)) * s;
      b.add(new THREE.CircleGeometry(0.035, 6), flatMat(pinks[i % 4]), M(TX + d * Math.cos(a), 0.016, TZz + 0.4 + d * 0.7 * Math.sin(a), 0, 1, 1, 1, -Math.PI / 2));
    }
  };
  cherry(4.0, -3.0, 1, 0);
  cherry(5.6, -2.9, 0.85, 5);
  // red torii gate down the street (left), framing the far end of the block
  const RED = "#d23a2e", BLK = "#2f2a30", GX = -3.5, GZ = -1.3, GW = 0.85;
  for (const s of [-1, 1]) { cyl(b, RED, GX + s * GW, 0, GZ, 0.13, 0.11, 3.0, 14); cyl(b, BLK, GX + s * GW, 0, GZ, 0.16, 0.16, 0.22, 14); }
  box(b, RED, GX, 2.45, GZ, 2 * GW + 0.5, 0.16, 0.16); // nuki
  box(b, RED, GX, 2.95, GZ, 2 * GW + 1.0, 0.2, 0.24); // kasagi
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.5, 0.2, 0.26), flatMat(BLK), M(GX + s * (GW + 0.55), 3.2, GZ, 0, 1, 1, 1, 0, s * 0.28)); // upturned tips
  box(b, BLK, GX, 3.12, GZ, 2 * GW + 0.7, 0.12, 0.28);
  box(b, RED, GX, 2.61, GZ, 0.16, 0.34, 0.12); // centre strut
  // red paper lanterns hung along the studio front, on a dark rope under the eaves
  box(b, BLK, 0, 4.25, -4.78, 6.2, 0.03, 0.03);
  for (const x of [-2.7, -1.6, 1.6, 2.7]) {
    box(b, BLK, x, 4.0, -4.7, 0.015, 0.25, 0.015);
    ball(b, "#e0402f", x, 3.72, -4.7, 0.22, 1.25, 18);
    cyl(b, BLK, x, 3.93, -4.7, 0.13, 0.13, 0.06, 12); cyl(b, BLK, x, 3.44, -4.7, 0.13, 0.13, 0.06, 12);
  }
  // a curved dark-tile awning over the studio door
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(1.4, 0.09, 0.95), flatMat("#3d4452"), M(s * 0.62, 2.95, -4.45, 0, 1, 1, 1, 0.32, s * -0.12));
  box(b, "#3d4452", 0, 3.05, -4.55, 0.35, 0.14, 0.7);
  // stone lantern
  const LX = 2.5, LZ = -2.9, sg = "#bdb6a8", sd = "#a59e90";
  cyl(b, sd, LX, 0, LZ, 0.36, 0.32, 0.16, 6);
  cyl(b, sg, LX, 0.16, LZ, 0.12, 0.1, 0.75, 10);
  cyl(b, sd, LX, 0.91, LZ, 0.3, 0.3, 0.1, 6);
  cyl(b, sg, LX, 1.01, LZ, 0.2, 0.2, 0.32, 6);
  box(b, "#5a4636", LX, 1.08, LZ + 0.17, 0.14, 0.17, 0.02);
  box(b, "#5a4636", LX + 0.17, 1.08, LZ, 0.02, 0.17, 0.14);
  cone(b, sd, LX, 1.33, LZ, 0.46, 0.26, 6, Math.PI / 6);
  ball(b, sg, LX, 1.64, LZ, 0.08, 1.2, 12);
  // a potted plant by the console table
  cyl(b, "#c8643f", CX + 1.0, 0, CZ - 0.9, 0.16, 0.2, 0.32, 14);
  addVeg(b, "bush", CX + 1.0, 0.3, CZ - 0.9, 0.5, 77, 0);
  b.build(root);
};

// ---------------- photo tower (console beat) ----------------
const N_PH = 34;
const phRand = (i: number, s: number) => hh(i + 100, s);
/** landing spot of scattered photo i on the ground (outside the table footprint) */
const landAt = (i: number): [number, number, number] => {
  const side = i % 3; // 0 front, 1 left, 2 right
  if (side === 0) return [CX - 1.0 + 2.0 * phRand(i, 1), 0.016 + 0.0016 * (i % 5), CZ + 0.5 + 0.9 * phRand(i, 2)];
  const s = side === 1 ? -1 : 1;
  return [CX + s * (0.68 + 0.6 * phRand(i, 3)), 0.016 + 0.0016 * (i % 5), CZ - 0.5 + 1.6 * phRand(i, 4)];
};

// ---------------- the scene ----------------
let kingdom: THREE.Group, castle: THREE.Group, map: THREE.Mesh, cart: THREE.Group, slotPh: THREE.Group, con: THREE.Group;
const tower: THREE.Group[] = [];
const prodHand = (u: Frame, bob = 0): V3 => [PROD[0] + HAND_R * u.cam.right.x, HAND_Y + 0.04 + bob, PROD[1] + HAND_R * u.cam.right.z + 0.12];

const s2 = SHOTS[1], s9 = SHOTS[8], s12 = SHOTS[11];
const F_POP = wf(2, "três") - 2; // 195
const F_CLICK = wf(3, "foto") - 2; // 342
const F_UMA = wf(3, "uma", 1); // 370
const confDraw = (c: string) => (p: Pen) => p.poly([[4, 4], [60, 4], [60, 36], [4, 36]], c, 4);

const confetti = (u: Frame, f0: number, n: number, freezeAt = Infinity, slow = 1) => {
  const cols = ["#f2545b", "#f7c548", "#4aa3e6", "#6fcf6a", "#c77dff", "#ff9f43"];
  for (let i = 0; i < n; i++) {
    const t0 = f0 + 14 * hh(i, 31);
    let f = u.f;
    if (f > freezeAt) f = freezeAt + (f - freezeAt) * slow;
    const t = (f - t0) / 30;
    if (t <= 0) continue;
    const x0 = -1.3 + 2.6 * hh(i, 32), z0 = -1.4 + 2.4 * hh(i, 33);
    const up = 2.2 + 1.2 * hh(i, 34);
    const y = t < 0.45 ? 1.4 + up * Math.sin((t / 0.45) * Math.PI / 2) : 1.4 + up - 0.75 * (t - 0.45);
    if (y < 0.05) continue;
    const x = x0 + 0.12 * Math.sin(t * 5 + i), z = z0 + 0.1 * Math.cos(t * 4 + i);
    const c = cols[i % 6];
    u.out.fx.push({ key: `conf${c}`, cw: 64, ch: 40, draw: confDraw(c), x, y, z, w: 0.12, h: 0.075, rot: t * 6 + i });
  }
};

export const studio: Scene = {
  name: "studio",
  build(root) {
    buildStreet(root);
    const table = makeTable(1.1, 2.6, TOP); table.position.set(0, 0, TZ); root.add(table);
    kingdom = new THREE.Group(); buildKingdom(kingdom); root.add(kingdom);
    castle = new THREE.Group(); buildCastle(castle); root.add(castle);
    const mg = new THREE.PlaneGeometry(0.9, 1.8); mg.rotateX(-Math.PI / 2);
    map = new THREE.Mesh(mg, lam("studioMap", () => ({ map: mapTex() }))); map.receiveShadow = true; root.add(map);
    const t2 = makeTable(1.0, 0.7, TOP); t2.position.set(CX, 0, CZ); root.add(t2);
    con = makeConsole(); con.scale.setScalar(CS); con.position.set(CX, TOP, CZ); root.add(con);
    cart = makeCartridge(); root.add(cart);
    for (let i = 0; i < N_PH; i++) {
      const h = new THREE.Group(), ph = makePhoto(i % 8); ph.position.y = -0.16; h.add(ph); h.rotation.order = "YXZ"; root.add(h); tower.push(h);
    }
    slotPh = makePhoto(3); root.add(slotPh);
  },

  update(u) {
    const f = u.f, t = u.t, id = u.id;
    kingdom.visible = true; kingdom.position.set(0, TOP, KZ); kingdom.rotation.set(0, 0, 0); kingdom.scale.set(1, 1, 1);
    const cl = (): V3 => [CASTLE_LOCAL[0], TOP + CASTLE_LOCAL[1], KZ + CASTLE_LOCAL[2]];
    castle.visible = true; castle.position.set(...cl()); castle.rotation.set(0, 0, 0); castle.scale.setScalar(1);
    map.visible = false; map.position.set(0, TOP + 0.004, KZ);
    cart.visible = false; slotPh.visible = false;
    for (const h of tower) h.visible = false;
    con.scale.setScalar(CS);

    if (id === 2) {
      if (f < F_POP) { kingdom.visible = false; castle.visible = false; map.visible = true; }
      else {
        const p = Math.max(0.02, pop(f, F_POP, 10));
        kingdom.scale.set(1, p, 1);
        castle.scale.set(1, p, 1);
        castle.position.y = TOP + CASTLE_LOCAL[1] * p;
        map.visible = f < F_POP + 2;
        if (f < F_POP + 12) {
          const k = (f - F_POP) / 12;
          u.out.fx.push({ key: `burst${q(k, 12)}`, cw: 500, ch: 500, draw: (pp) => fxBurst(pp, k, "#fff3b0", 12, 40, 240), x: 0, y: TOP + 0.55, z: KZ - 0.2, w: 1.5, h: 1.5 });
        }
      }
      if (f < 271) {
        // ---- 2a / 2b / 2c: the team around the model table ----
        const idea = ramp(f, 170, 178);
        const wow = f >= F_POP - 2;
        const hop = (i: number) => (wow && f < F_POP + 22 ? 0.16 * Math.max(0, Math.sin(((f - F_POP + 2 + i * 3) / 9) * Math.PI)) : 0);
        const ex = (base: Expr): Expr => (f < F_POP - 2 ? base : f < F_POP + 4 ? "shock" : f < 240 ? "laugh" : "grin");
        act(u.out, u.cam, t, WHO.producer, { x: PROD[0], z: PROD[1], expr: f < 170 ? "smile" : f < F_POP - 2 ? "grin" : ex("smile"),
          wave: idea > 0.05 && f < 262 ? -0.6 + 0.6 * idea + 0.25 * Math.sin(t * 9) : undefined, y: hop(0), groundY: 0 });
        act(u.out, u.cam, t, WHO.designer, { x: -0.84, z: -0.78, expr: ex("smile"), look: 0.6, y: hop(1), groundY: 0, facing: 1,
          wave: wow && f < 240 ? Math.sin(t * 10) : undefined });
        act(u.out, u.cam, t, WHO.dev(1), { x: 0.86, z: -0.6, expr: ex("neutral"), look: -0.6, y: hop(2), groundY: 0, facing: -1 });
        act(u.out, u.cam, t, WHO.dev(0), { x: -0.9, z: 0.5, expr: ex("neutral"), look: 0.7, y: hop(3), groundY: 0, facing: 1 });
        act(u.out, u.cam, t, WHO.dev(2), { x: 0.92, z: 0.62, expr: ex("smile"), look: -0.7, y: hop(4), groundY: 0, facing: -1,
          wave: wow && f < 236 ? Math.sin(t * 11 + 1) : undefined });
      } else if (f < 389) {
        // ---- line 3: the photo stack and the console ----
        const push = f >= 300 && f < 336 ? Math.max(0, Math.sin(((f - 300) / 12) * Math.PI)) * (0.5 + (0.5 * (f - 300)) / 36) : 0;
        const conSq = 1 - 0.06 * push;
        con.scale.set(CS * (1 + 0.03 * push), CS * conSq, CS * (1 + 0.03 * push));
        const deck = TOP + 0.19 * CS * conSq + 0.008;
        const TXc = CX + 0.13, TZc = SLOT_Z;
        const scat = f >= F_CLICK;
        for (let i = 0; i < N_PH; i++) {
          const h = tower[i]; h.visible = i > 0 || f < F_CLICK - 6;
          const gap = 0.017 * (1 - 0.3 * push);
          const sway = f < F_CLICK ? 0.035 * Math.sin(t * 3.1) + 0.02 * Math.sin(t * 7.3) * push : 0;
          const drop = f >= F_CLICK ? 0.017 : f >= F_CLICK - 6 ? ramp(f, F_CLICK - 6, F_CLICK) * 0.017 : 0;
          const hy = (i + 0.5) * gap;
          let x = TXc + Math.sin(sway) * hy + 0.02 * (phRand(i, 5) - 0.5), y = deck + hy * Math.cos(sway) - drop, z = TZc + 0.02 * (phRand(i, 6) - 0.5);
          let ry = 0.25 * (phRand(i, 7) - 0.5), rx = -Math.PI / 2, rz = -sway;
          if (scat && i > 0) {
            const k = f - F_CLICK;
            const bounce = k < 4 ? Math.sin((k / 4) * Math.PI) * 0.2 : 0;
            const d0 = 2 + 2 * phRand(i, 8), dur = 5 + 3 * phRand(i, 9);
            const s = clamp01((k - d0) / dur);
            const [lx, ly, lz] = landAt(i);
            if (s <= 0) { y += bounce; rz += 0.15 * Math.sin(k); }
            else {
              const arc = (0.6 + 0.9 * phRand(i, 10)) * 4 * s * (1 - s);
              x = lerp(x, lx, s); z = lerp(z, lz, s); y = lerp(y + 0.1, ly, s) + arc;
              const spin = (1 - s) * (3 + 4 * phRand(i, 11));
              rx = -Math.PI / 2 + spin; ry += 3 * phRand(i, 12) * s; rz = spin * 0.6;
            }
          }
          h.position.set(x, y, z); h.rotation.set(rx, ry, rz, "YXZ");
        }
        if (f >= F_CLICK - 6) {
          slotPh.visible = true;
          const s = ramp(f, F_CLICK - 6, F_CLICK);
          const yIn = SLOT_Y - 0.13, y0 = deck + 0.02;
          slotPh.position.set(lerp(TXc, CX, s), lerp(y0 + 0.05, yIn, s), lerp(TZc + 0.16, SLOT_Z, s));
          slotPh.rotation.set(lerp(-Math.PI / 2, 0, Math.min(1, s * 1.6)), 0, 0);
          if (f >= F_CLICK) { const w = f - F_CLICK; slotPh.position.y = yIn + 0.012 * Math.sin(w * 1.6) * Math.exp(-w / 6); }
        }
        const ex: Expr = f < 300 ? "grin" : f < F_CLICK ? (push > 0.3 ? "pained" : "nervous") : f < 352 ? "shock" : "neutral";
        act(u.out, u.cam, t, WHO.dev(0), { x: DEV0[0], z: DEV0[1], expr: ex, wave: f < F_CLICK + 3 ? -0.25 - 0.15 * push : undefined,
          look: f >= 352 ? 0 : 0.5, tilt: -3 * push, blink: f >= 352 ? 0.5 : undefined });
        if (f >= F_CLICK && f < F_CLICK + 10) {
          const k = (f - F_CLICK) / 10;
          u.out.fx.push({ key: `puffS${q(k, 10)}`, cw: 300, ch: 300, draw: (pp) => fxPuff(pp, k), x: CX + 0.35, y: SLOT_Y + 0.02, z: SLOT_Z + 0.3, w: 0.55, h: 0.55, soft: true });
        }
        if (f >= F_UMA - 2 && f < F_UMA + 8) {
          const k = (f - F_UMA + 2) / 10;
          u.out.fx.push({ key: `bonk${q(k, 10)}`, cw: 500, ch: 500, draw: (pp) => fxBurst(pp, k, "#fff3b0", 8, 30, 180), x: CX, y: SLOT_Y + 0.25, z: SLOT_Z + 0.1, w: 0.45, h: 0.45 });
        }
      } else {
        // ---- 4a: the producer keeps only the castle; the rest of the model slides away ----
        const lift = ramp(f, 437, 447);
        const hand = prodHand(u, 0.01 * Math.sin(t * 3));
        const c0 = cl();
        if (lift > 0) {
          castle.position.set(lerp(c0[0], hand[0], lift), lerp(c0[1], hand[1], lift) + 0.18 * Math.sin(lift * Math.PI), lerp(c0[2], hand[2], lift));
          castle.rotation.z = 0.15 * Math.sin(lift * Math.PI);
        }
        const s = clamp01((f - 443) / 22), dx = 1.6 * s * s;
        const over = Math.max(0, dx - 0.55);
        kingdom.position.set(dx, TOP - over * over * 1.6, KZ);
        kingdom.rotation.z = -Math.min(1.1, over * 1.8);
        const exP: Expr = f < 430 ? "neutral" : f < 452 ? "smile_closed" : "relief";
        act(u.out, u.cam, t, WHO.producer, { x: PROD[0], z: PROD[1], expr: exP, blink: f < 430 ? 0.5 : undefined, look: f > 447 ? 0.8 : 0.2,
          wave: f >= 433 ? -0.1 + 0.05 * Math.sin(t * 2) : undefined, headTilt: f > 447 ? 4 : 0 });
        if (f >= 443 && f < 449) {
          const k = (f - 443) / 6;
          u.out.fx.push({ key: `puffK${q(k, 6)}`, cw: 300, ch: 300, draw: (pp) => fxPuff(pp, k), x: -0.4, y: TOP + 0.08, z: KZ + 0.3, w: 0.6, h: 0.6, soft: true });
        }
      }
    } else if (id === 9) {
      // ---------------- shot 9: cheer -> frozen at one tiny cartridge ----------------
      cart.visible = true; cart.position.set(0.05, TOP, 0.98); cart.rotation.set(0, -0.12, 0);
      const frozen = f >= 1442;
      const ff = frozen ? 1440 : f;
      const tt = ff / 30;
      const hop = (i: number) => (ff >= 1398 ? 0.24 * Math.max(0, Math.sin(tt * 7.5 + i * 1.3)) : ff >= 1372 ? 0.1 * Math.max(0, Math.sin(tt * 6 + i)) : 0);
      const cheerEx = (i: number): Expr => (frozen ? (i % 2 ? "shock" : "nervous") : ff < 1385 ? "grin" : i % 2 ? "laugh" : "relief_open");
      const W = (i: number) => Math.sin(tt * (9 + i) + i * 2);
      const team: [Who, number, number, boolean][] = [
        [WHO.producer, PROD[0], PROD[1], true], [WHO.designer, -0.84, -0.78, true], [WHO.dev(1), 0.86, -0.6, false],
        [WHO.dev(0), f >= 1442 ? -0.66 : -0.9, f >= 1442 ? 0.36 : 0.5, true], [WHO.dev(2), f >= 1442 ? 0.66 : 0.92, f >= 1442 ? 0.42 : 0.62, true],
      ];
      team.forEach(([who, x, z, waves], i) => {
        act(u.out, u.cam, t, who, { x, z, y: frozen ? 0 : hop(i), groundY: 0, expr: cheerEx(i), wave: waves || frozen ? W(i) : undefined,
          look: frozen ? (x < 0 ? 0.5 : -0.5) : 0, facing: x < -0.1 ? 1 : x > 0.1 ? -1 : 0, tilt: frozen ? 0 : 4 * W(i + 3), blink: frozen ? 0 : undefined });
      });
      confetti(u, 1401, 46, 1441, 0.06);
      for (let k = 0; k < 3; k++) {
        const t0 = 1400 + k * 4, ft = frozen ? 1441 + (f - 1441) * 0.06 : f, s = (ft - t0) / 30;
        if (s <= 0) continue;
        const x0 = [-0.84, 0.92, 0][k], z0 = [-0.78, 0.62, -1.4][k];
        const y = 1.6 + 2.4 * s - 1.6 * s * s;
        if (y < 0.1) continue;
        u.out.fx.push({ key: "paperSheet", cw: 160, ch: 200, draw: (p: Pen) => { p.poly([[10, 10], [150, 10], [150, 190], [10, 190]], "#f6f0e0", 7); for (let r = 0; r < 5; r++) p.stroke([[30, 45 + r * 30], [130, 45 + r * 30]], 4, "#b8c4d8"); },
          x: x0 + 0.5 * s * (k - 1), y, z: z0 + 0.3, w: 0.26, h: 0.32, rot: s * 4 + k });
      }
      if (frozen) {
        const s = clamp01((f - 1475) / 30), land = f >= 1505;
        const y = land ? TOP + 0.305 : lerp(TOP + 2.3, TOP + 0.305, s);
        const x = 0.05 + (land ? 0 : 0.08 * Math.sin(s * 9)), r = land ? 0.3 : s * 7;
        u.out.fx.push({ key: "conf#f2545b", cw: 64, ch: 40, draw: confDraw("#f2545b"), x, y, z: 1.02, w: 0.1, h: 0.065, rot: r });
        if (f >= 1505 && f < 1513) {
          const k = (f - 1505) / 8;
          u.out.fx.push({ key: `ding${q(k, 8)}`, cw: 500, ch: 500, draw: (pp) => fxBurst(pp, k, "#fff3b0", 8, 30, 160), x: 0.05, y: TOP + 0.34, z: 1.03, w: 0.36, h: 0.36 });
        }
      }
    } else {
      // ---------------- shot 12: the producer still holding the little castle ----------------
      kingdom.visible = false;
      const hand = prodHand(u, 0.008 * Math.sin(t * 2.5));
      castle.position.set(...hand); castle.rotation.z = 0.04 * Math.sin(t * 2);
      const toLens = f >= 1917;
      act(u.out, u.cam, t, WHO.producer, { x: PROD[0], z: PROD[1], expr: toLens ? "smile" : "neutral", look: toLens ? 0 : 0.9,
        wave: -0.1, headTilt: toLens ? -3 : 6, blink: !toLens && f > 1903 ? 0.5 : undefined });
    }
  },

  cams: {
    2: [
      { f: s2.a - 8, s: (f) => dolly([1.9, 3.3, 17.5], [-1.85, 2.5, -3.2], pushK(f, s2.a - 8, 0.0022)) },
      { f: 158, cut: true, s: (f) => dolly([0.9, 3.05, 6.9], [0, 1.15, -0.45], pushK(f, 158, 0.0022)) },
      { f: 227, cut: true, s: (f) => {
        const k = ramp(f, 227, 276);
        return { pos: [lerp(0.55, 0.12, k), lerp(1.36, 1.2, k), lerp(1.75, 0.95, k)] as V3, look: [0.05, lerp(0.95, 1.02, k), lerp(-0.4, -0.95, k)] as V3, fov: 46 };
      } },
      { f: 271, cut: true, s: (f) => dolly([CX + 0.35, 1.8, CZ + 4.6], [CX - 0.05, 1.42, CZ - 0.1], pushK(f, 271, 0.0022)) },
      { f: 352, cut: true, s: (f) => dolly([CX + 0.12, 1.45, CZ + 2.8], [CX - 0.15, 1.3, CZ - 0.2], pushK(f, 352, 0.0025) * pushK(f, F_UMA - 4, 0, 0.011, 24)) },
      { f: 389, cut: true, s: (f) => dolly([0.55, 2.05, 3.4], [0.05, 1.22, -1.15], pushK(f, 389, 0.0022)) },
    ] as Key[],
    9: [
      { f: s9.a - 8, s: (f) => dolly([-0.35, 2.75, 7.3], [0.02, 1.3, -0.35], pushK(f, s9.a - 8, 0.0022)) },
      { f: 1442, cut: true, s: (f) => {
        const x = f - 1442, k = Math.exp(-(0.0072 * Math.min(x, 57) + 0.0012 * Math.max(0, x - 57)));
        return dolly([0.25, 3.4, 6.5], [0.03, 1.05, 0.72], k);
      } },
    ] as Key[],
    12: [
      { f: s12.a - 8, s: (f) => dolly([0.5, 1.55, 1.25], [0.14, 1.52, -1.55], pushK(f, s12.a - 8, 0.003)) },
    ] as Key[],
  },
  dof: [
    { f: 108, cInf: 0 },
    { f: 158, cInf: 10, focus: () => [0, 1.1, -0.3] },
    { f: 227, cInf: 12, focus: () => [0.05, 1.0, -0.75] },
    { f: 271, cInf: 10, focus: () => [CX - 0.1, 1.4, CZ - 0.3] },
    { f: 352, cInf: 14, focus: () => [CX - 0.1, 1.35, CZ - 0.25] },
    { f: 389, cInf: 11, focus: () => [0, 1.45, -1.55] },
    { f: 470, cInf: 0 },
    { f: 1368, cInf: 10, focus: () => [0, 1.3, -0.3] },
    { f: 1442, cInf: 12, focus: () => [0.05, 1.0, 0.98] },
    { f: 1525, cInf: 0 },
    { f: 1900, cInf: 14, focus: () => [0.1, 1.5, -1.55] },
    { f: 1938, cInf: 0 },
  ],
  // sun from behind-right of the lens so the cream studio facade and the faces are lit
  sun: { 2: { az: 125, el: 46 }, 9: { az: 125, el: 46 }, 12: { az: 125, el: 46 } },
  kicks: [[F_POP, 0.5], [368, 0.5]],
  cues: [
    [112, "koto", "establishing street"],
    [F_POP, "pop_up", "flat map pops into the 3D kingdom"],
    [F_CLICK, "click", "one photo slides into the slot"],
    [348, "scatter", "the rest of the stack scatters on the ground"],
    [368, "bonk", "Uma. punch-in"],
    [443, "slide", "the rest of the model slides off the table"],
    [1401, "cheer", "team cheers"],
    [1415, "party_horn", ""],
    [1442, "stop", "freeze, staring at the cartridge"],
    [1505, "tiny_ding", "last confetti lands on the cartridge"],
    [1903, "hm", "producer looks at the castle"],
  ],
};
