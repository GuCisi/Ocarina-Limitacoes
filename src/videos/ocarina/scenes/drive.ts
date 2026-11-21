// Scene `drive` (shot 8, 1120-1368, day): the studio back yard. Brick wall with a pin board (blueprint that rips) and
// a wall calendar (pages fly off); the giant grey console (4x) on its slow disk drive at the end of a conveyor; a queue
// of hero poses (all the same hero) riding the belt; the producer yanks the drive and tosses it into a dumpster.
import * as THREE from "three";
import { Batch, lam, boxGeo, V, house, addVeg } from "../build";
import { cobbleHD, brick, planksHD, ctex, rep } from "../paint";
import { SHOTS, dolly, pushK, wf, ramp, pop, clamp01, lerp, Key, Dof } from "../timeline";
import { act, WHO, Act } from "../chars";
import { makeConsole, flatMat, propMesh } from "../props";
import { hh, q, blob } from "../cast";
import { NOINK } from "../ink";
import { Pen, INK, fxBurst, fxPuff } from "../toon";
import type { Scene } from "./types";

const S8 = SHOTS[7];
// ---------------- layout ----------------
const WALL_X = -3.3;           // brick wall face (faces +x)
const BELT_Y = 0.32;           // conveyor belt top
const ZF = -10;                // drive front face
const PIN_Z = 5.0, CAL_Z = -3.0;
const HS = 0.45;               // hero pose scale on the belt
const N_HERO = 14;
const DUMP: [number, number] = [3.9, -11.2];
const F_RIP = wf(7, "quebrou") - 2;       // 1141
const F_YANK = wf(7, "adeus");            // 1284
const F_LAND = wf(7, "disco", 1);         // 1304
const F_SNAIL = wf(7, "lento") - 2;       // 1252

const unlit = (tex: THREE.Texture, w: number, h: number, alpha = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xe4e4e4, alphaTest: alpha ? 0.5 : 0, side: THREE.DoubleSide }));
  m.layers.set(NOINK); return m;
};
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: string) =>
  propMesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), flatMat(col), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

// ---------------- painted textures ----------------
const BP_W = 1024, BP_H = 760;
const tearX = (y: number) => 512 + 26 * Math.sin(y * 0.05) + 18 * Math.sin(y * 0.17 + 1) + ((Math.floor(y / 23) % 2) ? 12 : -12);
const paintBlueprint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#2f62ad"; g.fillRect(0, 0, BP_W, BP_H);
  g.strokeStyle = "rgba(200,225,255,0.22)"; g.lineWidth = 2;
  for (let x = 0; x < BP_W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, BP_H); g.stroke(); }
  for (let y = 0; y < BP_H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(BP_W, y); g.stroke(); }
  g.strokeStyle = "#eef6ff"; g.fillStyle = "#eef6ff"; g.lineWidth = 7; g.lineJoin = "round"; g.lineCap = "round";
  g.strokeRect(30, 30, BP_W - 60, BP_H - 60);
  g.beginPath(); g.moveTo(60, 560); g.quadraticCurveTo(250, 380, 470, 540); g.quadraticCurveTo(700, 400, 960, 520); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(80, 690); g.bezierCurveTo(300, 600, 420, 720, 600, 640); g.bezierCurveTo(760, 580, 860, 690, 960, 650); g.stroke();
  g.lineWidth = 7;
  g.strokeRect(700, 250, 150, 170); g.strokeRect(660, 190, 50, 230); g.strokeRect(840, 210, 50, 210);
  for (const [x, y] of [[685, 190], [865, 210]]) { g.beginPath(); g.moveTo(x - 34, y); g.lineTo(x, y - 70); g.lineTo(x + 34, y); g.closePath(); g.stroke(); }
  g.beginPath(); g.arc(775, 420, 34, Math.PI, 0); g.stroke();
  for (let i = 0; i < 5; i++) g.strokeRect(705 + i * 30, 232, 16, 18);
  for (const [x, y] of [[120, 470], [210, 430], [300, 480]]) {
    g.strokeRect(x - 30, y - 40, 60, 50); g.beginPath(); g.moveTo(x - 42, y - 40); g.lineTo(x, y - 82); g.lineTo(x + 42, y - 40); g.closePath(); g.stroke();
  }
  for (const [x, y] of [[420, 380], [480, 300], [560, 420], [380, 260], [600, 300]]) { g.beginPath(); g.arc(x, y, 30, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y + 60); g.stroke(); }
  g.setLineDash([14, 18]); g.beginPath(); g.moveTo(250, 520); g.bezierCurveTo(400, 600, 560, 520, 700, 430); g.stroke(); g.setLineDash([]);
  g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 18 : 48; g.lineTo(120 + r * Math.sin(a), 130 - r * Math.cos(a)); } g.closePath(); g.stroke();
};
/** one half of the blueprint (side -1 left / 1 right), cut along the jagged tear, ink-bordered */
const bpHalf = (side: number) => ctex("bpHalf" + side, BP_W, BP_H, (g) => {
  const pts: [number, number][] = [];
  for (let y = 0; y <= BP_H; y += 12) pts.push([tearX(y), y]);
  g.save(); g.beginPath();
  if (side < 0) { g.moveTo(0, 0); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(0, BP_H); }
  else { g.moveTo(BP_W, 0); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(BP_W, BP_H); }
  g.closePath(); g.clip(); paintBlueprint(g);
  g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.restore();
  g.strokeStyle = "#f4f0e6"; g.lineWidth = 6; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] - side * 6, p[1]) : g.moveTo(p[0] - side * 6, p[1]))); g.stroke();
});
const corkTex = () => ctex("cork", 512, 512, (g, r) => {
  g.fillStyle = "#c79a62"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,80,40,0.35)" : "rgba(240,210,160,0.35)"; g.fillRect(r() * 512, r() * 512, 3 + r() * 4, 3 + r() * 4); }
});
const noteTex = (k: number) => ctex("note" + k, 256, 256, (g) => {
  g.fillStyle = ["#f6e27a", "#f4a6b8", "#a8e0c0"][k % 3]; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = INK; g.lineWidth = 12; g.strokeRect(6, 6, 244, 244);
  g.lineWidth = 9; g.lineCap = "round";
  if (k === 0) { g.beginPath(); g.arc(128, 120, 60, 0, 7); g.stroke(); g.beginPath(); g.moveTo(128, 120); g.lineTo(128, 80); g.moveTo(128, 120); g.lineTo(158, 140); g.stroke(); }
  else if (k === 1) { g.beginPath(); g.moveTo(60, 180); g.lineTo(128, 60); g.lineTo(196, 180); g.closePath(); g.stroke(); }
  else { for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(50, 60 + i * 45); g.lineTo(206 - (i % 2) * 50, 60 + i * 45); g.stroke(); } }
});
/** calendar page: season doodle on top, a ruled grid of empty day boxes (no digits) */
const pageTex = (k: number) => ctex("calPage" + k, 512, 640, (g) => {
  g.fillStyle = "#f7f1e3"; g.fillRect(0, 0, 512, 640);
  const s = Math.floor((k % 12) / 3);
  const cx = 256, cy = 150;
  g.lineWidth = 9; g.strokeStyle = INK; g.lineJoin = "round";
  if (s === 0) {
    g.fillStyle = "#f49ab8"; for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.arc(cx + 46 * Math.cos(a), cy + 46 * Math.sin(a), 34, 0, 7); g.fill(); g.stroke(); }
    g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(cx, cy, 24, 0, 7); g.fill(); g.stroke();
  } else if (s === 1) {
    g.fillStyle = "#ffcf3a"; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.fill(); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i * 0.628; g.beginPath(); g.moveTo(cx + 66 * Math.cos(a), cy + 66 * Math.sin(a)); g.lineTo(cx + 92 * Math.cos(a), cy + 92 * Math.sin(a)); g.stroke(); }
  } else if (s === 2) {
    g.fillStyle = "#e07a2e"; g.beginPath(); g.moveTo(cx - 70, cy + 50); g.quadraticCurveTo(cx - 60, cy - 70, cx + 70, cy - 60); g.quadraticCurveTo(cx + 60, cy + 60, cx - 70, cy + 50); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 70, cy + 50); g.lineTo(cx + 40, cy - 30); g.stroke();
  } else {
    g.strokeStyle = "#4f8fd8"; g.lineWidth = 12; g.lineCap = "round";
    for (let i = 0; i < 3; i++) { const a = i * 1.047; g.beginPath(); g.moveTo(cx - 75 * Math.cos(a), cy - 75 * Math.sin(a)); g.lineTo(cx + 75 * Math.cos(a), cy + 75 * Math.sin(a)); g.stroke(); }
    g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.stroke();
  }
  g.strokeStyle = "#8a7a6a"; g.lineWidth = 4;
  for (let r = 0; r <= 5; r++) { g.beginPath(); g.moveTo(40, 270 + r * 66); g.lineTo(472, 270 + r * 66); g.stroke(); }
  for (let c = 0; c <= 7; c++) { g.beginPath(); g.moveTo(40 + c * 61.7, 270); g.lineTo(40 + c * 61.7, 600); g.stroke(); }
  g.fillStyle = "rgba(200,60,50,0.85)"; g.beginPath(); g.arc(40 + 61.7 * (2 + (k * 3) % 5) + 31, 270 + 66 * (1 + k % 4) + 33, 18, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 14; g.strokeRect(7, 7, 498, 626);
});
const platterTex = () => ctex("platter", 512, 512, (g) => {
  const gr = g.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, "#d9dde3"); gr.addColorStop(1, "#8f96a2");
  g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#e7b63a"; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 248, -0.45, 0.45); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,60,80,0.35)"; g.lineWidth = 3; for (let r = 90; r < 250; r += 28) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
  g.fillStyle = "#3a3c46"; g.beginPath(); g.arc(256, 256, 62, 0, 7); g.fill();
  g.fillStyle = "#c9ccd2"; g.beginPath(); g.arc(256, 256, 26, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 248, 0, 7); g.stroke();
});
const beltTex = () => ctex("beltStripes", 128, 128, (g) => {
  g.fillStyle = "#3b3d45"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#555863"; g.fillRect(0, 0, 128, 22);
  g.fillStyle = "#2b2c32"; g.fillRect(0, 22, 128, 5);
});

// ---------------- the snail (fx card 360 x 240, drawn facing screen-left, mirrored to face screen-right) ----------------
const drawSnail = (p: Pen, ph: number, speed: number) => {
  const g = p.g, w = Math.sin(ph * Math.PI * 2) * 6;
  g.translate(360, 0); g.scale(-1, 1);
  if (speed > 0.3) for (let i = 0; i < 3; i++) p.stroke([[300 + i * 10, 150 + i * 22], [350, 150 + i * 22]], 7);
  p.poly([[40, 200], [60, 165 + w * 0.3], [120, 160], [250, 170], [300, 205], [40, 212]], "#d8e6a8", 10);
  p.line([[66, 168], [44 - w, 92]], "#d8e6a8", 10); p.line([[84, 166], [86 - w * 0.5, 96]], "#d8e6a8", 10);
  p.ell(44 - w, 88, 16, 16, "#ffffff", 8); p.ell(86 - w * 0.5, 92, 16, 16, "#ffffff", 8);
  p.dot(38 - w, 88, 7); p.dot(80 - w * 0.5, 92, 7);
  p.arc(66, 186, 20, 10, 20, 160, 7);
  p.ell(190, 128, 82, 76, "#f0a03a", 11);
  g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = "round"; g.beginPath();
  for (let a = 0; a < 15; a += 0.2) { const r = 66 - a * 4.2; g.lineTo(190 + r * Math.cos(a), 128 + r * 0.93 * Math.sin(a)); }
  g.stroke();
};

// ---------------- the queue of hero poses ----------------
type PoseA = Partial<Act> & { air?: number; roll?: number };
const HAND = 1.82 * HS;  // head-top height of a pose card: a handstand lifts the (flipped) card by this
const POSES: ((t: number) => PoseA)[] = [
  (t) => ({ mode: "fall", air: 0.5 + 0.15 * Math.sin(t * 5), expr: "laugh" }),                                  // star jump in the air
  () => ({ mode: "sit", expr: "smile", look: 1 }),                                                               // sitting
  (t) => ({ mode: "march", lift: 90, phase: (t * 1.6) % 1, roll: -0.75, expr: "grin" }),                         // sprinting, leaning far forward
  (t) => ({ prop: ["sword", 0], air: 0.08 * Math.abs(Math.sin(t * 4)), expr: "stern" }),                         // sword high
  (t) => ({ roll: Math.PI + 0.08 * Math.sin(t * 3), air: HAND, expr: "grin" }),                                   // handstand
  (t) => ({ wave: Math.sin(t * 12), roll: 0.6, expr: "laugh" }),                                                 // leaning back, waving
  (t) => ({ mode: "march", lift: 90, phase: (t * 2) % 1, expr: "whistle" }),                                     // big knee lifts
  () => ({ roll: Math.PI / 2, air: 0.14, expr: "dazed" }),                                                       // lying flat
  (t) => ({ prop: ["sword", 1], roll: -0.5 + 0.05 * Math.sin(t * 6), expr: "stern" }),                           // sword struck, lunging
  (t) => ({ mode: "fall", air: 0.35 + 0.2 * Math.abs(Math.sin(t * 4)), roll: 0.45, expr: "shock" }),              // tumbling in the air
  () => ({ mode: "sit", expr: "nervous", roll: -0.35 }),                                                          // sitting, toppling
  (t) => ({ mode: "fall", roll: 0.95 + 0.05 * Math.sin(t * 5), air: 0.1, expr: "shock" }),                         // falling backwards
  (t) => ({ mode: "march", phase: (t * 1.8) % 1, dir: [0, -1], expr: "grin" }),                                  // running (side)
  (t) => ({ roll: Math.PI - 0.1 * Math.sin(t * 3), air: HAND, wave: Math.sin(t * 9), expr: "laugh" }),            // handstand, waving
  (t) => ({ prop: ["sword", 0.5 + 0.5 * Math.sin(t * 8)], air: 0.3 * Math.abs(Math.sin(t * 4)), roll: 0.3, expr: "grin" }), // jump slash
  () => ({ roll: -Math.PI / 2, air: 0.14, expr: "laugh" }),                                                       // lying the other way
];
/** z of the front pose on the belt, spacing of the queue (it bunches up behind the slow drive) */
const frontZ = (f: number) => lerp(-9.35, -10.45, clamp01((f - 1163) / (F_YANK - 1163)));
const spacing = (f: number) => lerp(0.68, 0.4, ramp(f, 1222, 1272));

// ---------------- toss path of the drive ----------------
const DRIVE_C: [number, number, number] = [0, 0.75, -11.45];
const driveAt = (f: number) => {
  if (f < F_YANK) return { p: DRIVE_C, rx: 0, rz: 0, s: 1 };
  const jerk = ramp(f, F_YANK, F_YANK + 5);
  const p0: [number, number, number] = [DRIVE_C[0] + 0.45 * jerk, DRIVE_C[1] + 0.12 * jerk, DRIVE_C[2]];
  if (f < F_YANK + 5) return { p: p0, rx: 0, rz: -0.12 * jerk, s: 1 };
  const u = clamp01((f - (F_YANK + 5)) / (F_LAND - F_YANK - 5));
  const end: [number, number, number] = [DUMP[0] + 0.1, 1.55, DUMP[1]];
  const x = lerp(p0[0], end[0], u), z = lerp(p0[2], end[2], u), y = lerp(p0[1], end[1], u) + 4.6 * 4 * u * (1 - u);
  if (u < 1) return { p: [x, y, z] as [number, number, number], rx: 0.4 * u, rz: -0.12 - u * (Math.PI * 2 - 0.6), s: 1 };
  const sq = pop(f, F_LAND, 8);
  return { p: end, rx: 0.4, rz: -0.12 - (Math.PI * 2 - 0.6), s: 0.85 + 0.15 * sq };
};

export const drive: Scene = (() => {
  let driveG: THREE.Group, platter: THREE.Mesh, lampMat: THREE.MeshBasicMaterial, con: THREE.Group;
  let beltMap: THREE.Texture, lid: THREE.Mesh;
  const flaps: THREE.Mesh[] = [];
  const halves: THREE.Group[] = [];
  const pages: THREE.Group[] = [];
  const N_PAGE = 12;

  const cams: Scene["cams"] = {
    8: [
      // 8a: close-up of the blueprint on the pin board
      { f: S8.a - 8, s: (f) => dolly([WALL_X + 3.5, 1.6, PIN_Z + 0.05], [WALL_X, 1.62, PIN_Z], pushK(f, S8.a - 8, 0.0022, f > F_RIP - 2 ? 0.006 : 0, 30)) },
      // 8b: truck along the queue of hero poses
      { f: 1163, cut: true, s: (f) => { const u = clamp01((f - 1163) / 56); return { pos: [lerp(1.15, 1.0, u), lerp(1.25, 1.15, u), lerp(5.2, 2.3, u)], look: [0.25, 0.85, lerp(-2.5, -6.5, u)], fov: 40 }; } },
      // 8c: the drive at the head of the queue
      { f: 1217, cut: true, s: (f) => dolly([3.7, 2.2, -1.4], [0.5, 1.2, -10.2], pushK(f, 1217, 0.0022)) },
      // 8d: follow the toss up and over to the dumpster
      { f: F_YANK + 2, dur: 22, s: (f) => dolly([4.6, 2.6, -0.6], [2.2, 2.6, -10.9], pushK(f, F_YANK, 0.0015)) },
      { f: F_LAND - 14, dur: 22, s: (f) => dolly([6.6, 2.7, 1.2], [3.1, 1.5, -10.8], pushK(f, F_LAND - 6, 0.002)) },
      // 8e: the wall calendar, pages fly past the lens
      { f: 1323, cut: true, s: (f) => dolly([WALL_X + 3.4, 1.6, CAL_Z - 0.05], [WALL_X, 1.62, CAL_Z], pushK(f, 1323, 0.0025)) },
    ] as Key[],
  };
  const dof: Dof[] = [
    { f: 1120, cInf: 13, focus: () => [WALL_X, 1.55, PIN_Z] },
    { f: 1163, cInf: 0 },
    { f: 1217, cInf: 10, focus: () => [0.3, 1.0, -9.8] },
    { f: F_YANK, cInf: 0 },
    { f: 1323, cInf: 13, focus: () => [WALL_X, 1.55, CAL_Z] },
  ];
  const cues: [number, string, string?][] = [
    [1132, "strain", "paper creaks"], [F_RIP, "rip", "blueprint tears in half"],
    [1163, "conveyor", "belt hum"], [1181, "flurry", "hero poses loop"],
    [1220, "whirr", "slow disk spin-up"],
  ];
  for (let f = 1226; f < F_YANK; f += 30) cues.push([f, "tick", "lazy lamp blink"]);
  cues.push([F_SNAIL, "zip", "snail overtakes"], [1262, "bump", "queue bunches"], [1270, "foot_tap", "producer taps"],
    [F_YANK, "whoosh", "drive yanked out"], [1297, "thud", "console drops"], [F_LAND, "clang", "drive into dumpster"],
    [1336, "pages", "calendar pages fly"], [1358, "flutter", "last page drifts"]);

  return {
    name: "drive",
    cams, dof, cues,
    kicks: [[F_RIP, 1.0], [1297, 0.4], [F_LAND, 1.2]],
    sun: { 8: { az: 150, el: 50 } },
    build(root) {
      const b = new Batch();
      const gnd = new THREE.PlaneGeometry(16, 34); gnd.rotateX(-Math.PI / 2);
      const uv = gnd.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 13);
      b.add(gnd, lam("cobbleHD", () => ({ map: cobbleHD() })), new THREE.Matrix4().makeTranslation(3.5, 0.012, -6));
      b.add(boxGeo(V(WALL_X - 0.3, 0, -22), V(WALL_X, 2.45, 10), 0.9), lam("brickWallMuted", () => ({ map: brick(), color: "#c9b5aa" })));
      b.add(boxGeo(V(WALL_X - 0.38, 2.45, -22), V(WALL_X + 0.08, 2.58, 10)), lam("coping", () => ({ color: "#cdbfa6" })));
      house(b, -9.5, -12, Math.PI / 2, 7, 6, 4.6, 1);
      house(b, -9.5, -3, Math.PI / 2, 7, 6, 5.2, 4);
      house(b, -9.5, 6, Math.PI / 2, 7, 6, 4.4, 6);
      house(b, 0.5, -21.5, 0, 9, 6, 5.0, 0);
      house(b, 13.5, -14, -Math.PI / 2, 7, 6, 4.8, 3);
      house(b, 13.5, -4, -Math.PI / 2, 7, 6, 5.2, 5);
      addVeg(b, "round", -6.5, 0, -8, 5.5, 11);
      addVeg(b, "round", -6.8, 0, 1.5, 6, 23);
      addVeg(b, "fat", 9.0, 0, -17, 5, 37);
      const fenceM = lam("fenceWood", () => ({ color: "#b98a58" }));
      for (let z = -18; z <= 6; z += 0.5) b.add(boxGeo(V(7.4, 0, z - 0.09), V(7.5, 1.3, z + 0.09)), fenceM);
      b.add(boxGeo(V(7.36, 0.9, -18), V(7.54, 1.0, 6)), fenceM);
      const crate = lam("crate", () => ({ map: planksHD(), color: "#e0b880" }));
      for (const [x, z, s, y] of [[-2.6, -6.5, 0.8, 0], [-2.55, -7.4, 0.7, 0], [-2.6, -6.9, 0.6, 0.8]] as const)
        b.add(boxGeo(V(x - s / 2, y, z - s / 2), V(x + s / 2, y + s, z + s / 2), 0.6), crate);
      const steel = lam("convSteel", () => ({ color: "#7d8796" })), dark = lam("convDark", () => ({ color: "#3a3c46" }));
      const z0 = 3.4, z1 = ZF + 0.02;
      b.add(boxGeo(V(-0.5, BELT_Y - 0.12, z1), V(0.5, BELT_Y - 0.01, z0)), dark);
      for (const s of [-1, 1]) {
        b.add(boxGeo(V(s * 0.5 - 0.04, BELT_Y - 0.14, z1), V(s * 0.5 + 0.04, BELT_Y + 0.1, z0)), steel);
        for (let z = z0 - 0.3; z > z1; z -= 1.6) b.add(boxGeo(V(s * 0.46 - 0.04, 0, z - 0.04), V(s * 0.46 + 0.04, BELT_Y - 0.12, z + 0.04)), steel);
      }
      const roll = new THREE.CylinderGeometry(0.11, 0.11, 1.0, 16); roll.rotateZ(Math.PI / 2);
      b.add(roll, steel, new THREE.Matrix4().makeTranslation(0, BELT_Y - 0.1, z0));
      const green = lam("dumpGreen", () => ({ color: "#3f7a58" }));
      const [dx, dz] = DUMP, dw = 1.5, dd = 1.1, dh = 1.25;
      b.add(boxGeo(V(dx - dw, 0.12, dz - dd), V(dx + dw, 0.22, dz + dd)), green);
      b.add(boxGeo(V(dx - dw, 0.12, dz + dd - 0.08), V(dx + dw, dh, dz + dd)), green);
      b.add(boxGeo(V(dx - dw, 0.12, dz - dd), V(dx + dw, dh, dz - dd + 0.08)), green);
      for (const s of [-1, 1]) b.add(boxGeo(V(dx + s * dw - 0.04, 0.12, dz - dd), V(dx + s * dw + 0.04, dh, dz + dd)), green);
      b.add(boxGeo(V(dx - dw - 0.04, dh - 0.08, dz + dd - 0.02), V(dx + dw + 0.04, dh + 0.04, dz + dd + 0.06)), lam("dumpRim", () => ({ color: "#2f5a42" })));
      for (const s of [-1, 1]) for (const t of [-1, 1]) b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12).rotateZ(Math.PI / 2), dark, new THREE.Matrix4().makeTranslation(dx + s * (dw - 0.3), 0.1, dz + t * (dd - 0.25)));
      b.add(boxGeo(V(WALL_X, 1.05, PIN_Z - 0.62), V(WALL_X + 0.05, 2.05, PIN_Z + 0.62)), lam("pinFrame", () => ({ color: "#8a5f3c" })));
      b.add(boxGeo(V(WALL_X, 1.12, CAL_Z - 0.4), V(WALL_X + 0.03, 2.25, CAL_Z + 0.4)), lam("calBack", () => ({ color: "#7a5a44" })));
      b.add(boxGeo(V(WALL_X + 0.03, 2.08, CAL_Z - 0.37), V(WALL_X + 0.1, 2.2, CAL_Z + 0.37)), lam("calBind", () => ({ color: "#c8402e" })));
      b.build(root);

      const cork = unlit(corkTex(), 1.14, 0.9); cork.rotation.y = Math.PI / 2; cork.position.set(WALL_X + 0.052, 1.55, PIN_Z); root.add(cork);
      for (const [k, dzn, y, r] of [[0, 0.44, 1.86, 0.12], [1, -0.45, 1.24, -0.1], [2, 0.42, 1.22, 0.06]] as const) {
        const n = unlit(noteTex(k), 0.18, 0.18); n.rotation.set(0, Math.PI / 2, 0); n.rotateZ(r); n.position.set(WALL_X + 0.056, y, PIN_Z - dzn); root.add(n);
      }
      const bw = 0.8, bh = 0.6;
      for (const side of [-1, 1]) {
        const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2; holder.position.set(WALL_X + 0.062 + (side > 0 ? 0.004 : 0), 1.55, PIN_Z); root.add(holder);
        const pivot = new THREE.Group(); pivot.position.set(side * (bw / 2 - 0.05), bh / 2 - 0.05, 0); holder.add(pivot);
        const m = unlit(bpHalf(side), bw, bh, true); m.position.set(-side * (bw / 2 - 0.05), -(bh / 2 - 0.05), 0); pivot.add(m);
        pivot.add(propMesh(new THREE.SphereGeometry(0.025, 12, 8), flatMat("#d2453c"), 0, 0, 0.02));
        halves.push(pivot);
      }
      for (let k = 0; k <= N_PAGE; k++) {
        const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2; root.add(holder);
        const pivot = new THREE.Group(); holder.add(pivot);
        const m = unlit(pageTex(k), 0.66, 0.82); m.position.set(0, -0.41, 0); pivot.add(m);
        pages.push(holder);
      }
      beltMap = rep(beltTex(), 1, 26);
      const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 13.4), lam("beltSurf", () => ({ map: beltMap })));
      belt.rotation.x = -Math.PI / 2; belt.position.set(0, BELT_Y, (3.4 + ZF) / 2); belt.receiveShadow = true; root.add(belt);

      // ---- the disk drive (moves as one group) ----
      driveG = new THREE.Group(); root.add(driveG);
      const body = "#4b4e59", trim = "#3a3c46", hole = "#1c1d22";
      const L = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string) => {
        const m = box(x0, y0, z0, x1, y1, z1, c); m.position.sub(new THREE.Vector3(...DRIVE_C)); driveG.add(m); return m;
      };
      L(-1.3, 0, -12.9, 1.3, 0.3, ZF, body);
      L(-1.3, 0.3, -12.9, -0.64, 1.24, ZF, body);
      L(0.64, 0.3, -12.9, 1.3, 1.24, ZF, body);
      L(-1.3, 1.24, -12.9, 1.3, 1.5, ZF, body);
      L(-0.64, 0.3, -12.85, 0.64, 1.24, -12.6, hole);
      L(-0.68, 1.22, ZF, 0.68, 1.27, ZF + 0.04, trim);
      for (const s of [-1, 1]) L(s * 0.68 - 0.04, 0.3, ZF, s * 0.68 + 0.04, 1.27, ZF + 0.04, trim);
      L(0.22, 1.5, -10.42, 1.28, 1.53, -10.28, hole);
      L(0.3, 1.5 - 0.46, -10.38, 1.2, 1.5 + 0.46, -10.31, "#9ea2ad");
      platter = new THREE.Mesh(new THREE.CircleGeometry(0.19, 40), new THREE.MeshBasicMaterial({ map: platterTex(), color: 0xe0e0e0 }));
      platter.layers.set(NOINK); platter.position.set(0.75, 1.5 + 0.235 - DRIVE_C[1], -10.305 - DRIVE_C[2]); driveG.add(platter);
      lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 0.2) });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), lampMat); lamp.position.set(0.97 - DRIVE_C[0], 0.78 - DRIVE_C[1], ZF + 0.03 - DRIVE_C[2]); driveG.add(lamp);
      driveG.add(propMesh(new THREE.TorusGeometry(0.09, 0.022, 8, 20), flatMat(trim), lamp.position.x, lamp.position.y, lamp.position.z));
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.BoxGeometry(0.2, 0.9, 0.012); geo.translate(0, -0.45, 0);
        const fl = propMesh(geo, flatMat("#2e3038"), -0.525 + i * 0.21 - DRIVE_C[0], 1.22 - DRIVE_C[1], ZF + 0.02 - DRIVE_C[2]);
        flaps.push(fl); driveG.add(fl);
      }
      driveG.position.set(...DRIVE_C);
      con = makeConsole(); con.scale.setScalar(4); con.position.set(0, 1.5, -11.95); root.add(con);
      const lg = new THREE.BoxGeometry(3.1, 0.06, 2.3); lg.translate(0, 0, -1.15);
      lid = propMesh(lg, flatMat("#35694b"), dx, dh + 0.04, dz - dd); root.add(lid);
    },
    update(u) {
      const f = u.f, t = u.t, out = u.out;
      // ---- 8a blueprint: trembles, then rips; the halves swing from their pins ----
      halves.forEach((pv, i) => {
        const side = i ? 1 : -1, k = f - F_RIP;
        const trem = f > 1130 && f < F_RIP ? 0.012 * Math.sin(f * 2.7 + i) : 0;
        pv.rotation.z = k < 0 ? trem : side * (0.75 - 0.75 * Math.exp(-k / 9) * Math.cos(k * 0.45));
        pv.position.x = side * 0.35 + (k > 0 ? side * 0.02 * clamp01(k / 4) : 0);
      });
      if (f >= F_RIP - 1 && f < F_RIP + 12) {
        const k = (f - F_RIP + 1) / 12;
        out.fx.push({ key: `rip|${q(k, 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, k, "#fff3b0", 9, 40, 150), x: WALL_X + 0.25, y: 1.62, z: PIN_Z, w: 0.6, h: 0.6 });
        for (let j = 0; j < 5; j++) {
          const a = hh(j, 3) * 6.28, d = 0.2 + 0.5 * k;
          out.fx.push({ key: `bit|${j % 2}`, cw: 64, ch: 64, draw: (p) => p.poly([[8, 8], [56, 18], [30, 58]], j % 2 ? "#2f62ad" : "#f4f0e6", 6),
            x: WALL_X + 0.2 + 0.2 * k, y: 1.62 + Math.sin(a) * d - 0.6 * k * k, z: PIN_Z + Math.cos(a) * d, w: 0.07, h: 0.07, rot: k * 6 + j });
        }
      }
      // ---- belt + drive mechanics ----
      beltMap.offset.y = -0.012 * f * 26 / 13.4;
      platter.rotation.z = -f * 0.035;
      const blinkOn = f >= 1200 && ((f - 1226) % 30 + 30) % 30 < 11;
      lampMat.color.setRGB(blinkOn ? 6 : 0.55, blinkOn ? 3.4 : 0.3, blinkOn ? 0.9 : 0.12);
      const dv = driveAt(f);
      driveG.position.set(...dv.p); driveG.rotation.set(dv.rx, 0, dv.rz); driveG.scale.set(1, dv.s, 1);
      // the console hangs in the air, then drops and squashes
      const cf = f - (F_YANK + 4);
      if (cf <= 0) { con.position.y = 1.5; con.scale.set(4, 4, 4); }
      else {
        const drop = Math.min(1, (cf / 9) ** 2);
        con.position.y = 1.5 * (1 - drop);
        const sq = drop >= 1 ? 1 - 0.25 * Math.sin(clamp01((f - F_YANK - 13) / 8) * Math.PI) : 1;
        con.scale.set(4 * Math.sqrt(2 - sq), 4 * sq, 4 * Math.sqrt(2 - sq));
      }
      if (f >= F_YANK + 13 && f < F_YANK + 28) {
        const k = (f - F_YANK - 13) / 15;
        for (const s of [-1, 1]) out.fx.push({ key: `cpuff|${q(k, 15)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: s * 1.3, y: 0.35, z: -11.0, w: 1.4, h: 1.4, soft: true });
      }
      const lk = f - F_LAND;
      lid.rotation.x = -1.9 + (lk > 0 ? 0.35 * Math.exp(-lk / 6) * Math.abs(Math.sin(lk * 0.7)) : 0);
      if (lk >= 0 && lk < 12) {
        const k = lk / 12;
        out.fx.push({ key: `land|${q(k, 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, k, "#fff3b0", 11), x: DUMP[0], y: 1.9, z: DUMP[1] + 1.2, w: 2.6, h: 2.6 });
      }
      const fz = frontZ(f), push = clamp01((ZF + 0.15 - fz) / 0.3);
      flaps.forEach((fl, i) => { const near = Math.max(0, 1 - Math.abs(-0.525 + i * 0.21) / 0.45); fl.rotation.x = -0.5 * push * near + 0.03 * Math.sin(t * 3 + i); });

      // ---- the queue of hero poses (all the same hero) ----
      if (f < 1323) {
        const gap = spacing(f), bunch = ramp(f, 1222, 1272);
        for (let i = 0; i < N_HERO; i++) {
          let z = fz + gap * i;
          if (f >= F_YANK && i === 0) z = Math.max(fz, -10.0);
          const ti = t + i * 0.37, pz = POSES[i % POSES.length](ti);
          const air = pz.air ?? 0;
          const jost = i > 0 && bunch > 0 ? (bunch < 1 ? 6 : 3) * Math.sin(t * 9 + i * 1.3) * bunch : 0;
          let roll = pz.roll ?? 0;
          const a: Act = { ...pz, x: 0.02 * Math.sin(i * 2.1) + (Math.abs(Math.abs(roll) - Math.PI / 2) < 0.1 ? 0.36 * Math.sign(roll) : 0), z, y: BELT_Y + air, groundY: BELT_Y, scale: HS, tilt: (pz.tilt ?? 0) + jost };
          delete (a as PoseA).air; delete (a as PoseA).roll;
          if (i === 0 && f >= 1217) { a.expr = f >= F_YANK + 6 ? "shock" : "nervous"; a.mode = "stand"; a.prop = null; a.dir = undefined; a.y = BELT_Y; a.look = f >= F_YANK + 6 ? -1 : 0; a.tilt = 0; roll = 0; }
          if (i > 0 && i < 5 && f >= F_YANK + 4) { a.look = 1; a.expr = "shock"; }
          act(out, u.cam, ti, WHO.hero, a);
          if (roll) { const pl = out.places[out.places.length - 1]; pl.roll = roll; }
        }
      }
      // ---- the snail overtakes ----
      if (f >= 1228 && f < 1300) {
        const sz = lerp(-6.2, -10.6, clamp01((f - 1228) / 44)), moving = sz > -10.55;
        out.fx.push({ key: `snail|${q((f % 8) / 8, 8)}|${moving ? 1 : 0}`, cw: 360, ch: 240, draw: (p) => drawSnail(p, (f % 8) / 8, moving ? 1 : 0),
          x: 0.6, y: BELT_Y + 0.1 + 0.19, z: sz, w: 0.62, h: 0.41 });
        blob(out, 0.6, BELT_Y + 0.1, sz, 0.5);
      }
      // ---- the producer ----
      const P: [number, number] = [1.85, -9.1];
      if (f < F_YANK - 4) {
        const tap = f >= 1240 ? Math.max(0, Math.sin((f * 2 * Math.PI) / 12)) : 0;
        act(out, u.cam, t, WHO.producer, { x: P[0], z: P[1], mode: "march", lift: 30, phase: 0.25 * tap, expr: f > F_SNAIL + 4 ? "stern" : "neutral",
          look: -1, headTilt: f > 1262 ? -6 : 0 });
      } else if (f < F_YANK + 6) {
        act(out, u.cam, t, WHO.producer, { x: P[0] - 0.25, z: P[1] - 0.6, face: "side", mirror: true, sideMode: "push", pose: f < F_YANK ? 1 : 0.4, expr: "stern" });
      } else {
        const done = f >= F_LAND + 2;
        act(out, u.cam, t, WHO.producer, { x: P[0], z: P[1], expr: done ? "grin" : "whistle", look: done ? 0.3 : clamp01((f - F_YANK - 6) / 12) * 2 - 1,
          wave: done ? Math.sin(t * 14) : undefined, headTilt: done ? 4 : -4 });
      }

      // ---- 8e calendar pages fly past the lens ----
      pages.forEach((h, k) => {
        const bx = WALL_X + 0.035 + 0.004 * (N_PAGE - k), by = 2.06, bz = CAL_Z;
        const pv = h.children[0] as THREE.Group;
        const f0 = 1336 + 2 * k;
        h.visible = true;
        if (k === N_PAGE || f < f0) { h.position.set(bx, by, bz); pv.rotation.set(0, 0, 0); return; }
        const s = (f - f0) / (k === N_PAGE - 1 ? 40 : 13);
        if (k < N_PAGE - 1) {
          if (s > 1) { h.visible = false; return; }
          const side = k % 2 ? 1 : -1, up = (k % 3) - 1;
          h.position.set(bx + 2.9 * s ** 1.3, by + up * 0.5 * s - 0.2 * s, bz - side * (0.15 + 1.1 * s ** 1.6));
          pv.rotation.set(-1.4 * s * side, 0.9 * s, 2.2 * s * side);
        } else {
          const ss = clamp01(s);
          h.position.set(bx + 0.25 + 0.6 * ss, by - 1.7 * ss * ss + 0.05, bz + 0.18 * Math.sin(ss * 7));
          pv.rotation.set(0.5 * Math.sin(ss * 8), 0.4, 0.35 * Math.sin(ss * 6 + 1));
        }
      });
    },
  };
})();
