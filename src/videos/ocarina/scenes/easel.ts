// Scene `easel`: shot 6 (f850-1013, day). A corner beside the studio wall: cream plaster wall with a window, a bush,
// a stone patio; a wooden easel with a big drawing board (a pad of sheets that flip over the top), a stool carrying
// the console (1.6x), a jar of pencils on the easel tray. Cast: the designer.
//   6a 850-899  he draws a yellow triangle (scribble), flips the sheet at f877 to a child-like fairy-girl doodle, grins
//   6b 899-972  he shows it to the console: it shakes, smokes from f928, blows a big puff with sparks at f933 (red light)
//   6c 972-1013 flip at f972 to a plain ball with two little wings; from f988 the ball glows and lifts off as the Fairy
// Everything is a pure function of the frame. Lenses look toward -z.
import * as THREE from "three";
import { Batch, V, lam, addVeg } from "../build";
import { ctex, cobbleHD } from "../paint";
import { NOINK } from "../ink";
import { Key, Dof, dolly, pushK, smooth, lerp, clamp01, ramp, wf } from "../timeline";
import { act, WHO } from "../chars";
import { makeConsole, Fairy } from "../props";
import { q, hh } from "../cast";
import { Pen, Expr, fxBurst, fxPuff } from "../toon";
import type { Scene } from "./types";

// ---------------- timing ----------------
const DRAW0 = 853, DRAW1 = 871;
const FLIP1 = wf(6, "fada") - 6;     // 877
const B6 = 899, SHAKE0 = 905, SMOKE0 = 928, POOF = wf(6, "demais") - 2; // 933
const FLIP2 = 972, GLOW0 = 988, LIFT = 996;
const FLIP_N = 7;

// ---------------- helpers ----------------
type P2 = [number, number];
const M = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));
const boxG = (w: number, h: number, d: number, tile = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (tile) {
    const uv = g.attributes.uv as THREE.BufferAttribute, sz: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * sz[f][0]) / tile, (uv.getY(i) * sz[f][1]) / tile); }
  }
  return g;
};
const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 10);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
};

// ---------------- textures ----------------
const plasterTex = () => ctex("eslPlaster", 1024, 1024, (g, r) => {
  g.fillStyle = "#efdcb8"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) { const x = r() * 1024, y = r() * 1024, rad = 40 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? "rgba(214,188,150,0.22)" : "rgba(255,246,226,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) { g.save(); g.translate(ox, oy); g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); g.restore(); } }
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "rgba(170,140,100,0.18)" : "rgba(255,255,240,0.25)"; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});
const paperBase = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(190,175,150,0.12)"; g.fillRect(r() * 512, r() * 640, 2, 2); }
  g.strokeStyle = "rgba(160,140,110,0.35)"; g.lineWidth = 3; g.strokeRect(4, 4, 504, 632);
};
/** pencil line with a little wobble (child-like, hand drawn) */
const wob = (g: CanvasRenderingContext2D, pts: P2[], col: string, w: number, seed = 1) => {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  pts.forEach(([x, y], i) => { const jx = 3 * Math.sin(i * 2.7 + seed), jy = 3 * Math.cos(i * 1.9 + seed); if (i) g.lineTo(x + jx, y + jy); else g.moveTo(x + jx, y + jy); });
  g.stroke();
};
const dense = (pts: P2[], n = 6): P2[] => { const o: P2[] = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const t = k / n; o.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); } o.push(pts[pts.length - 1]); return o; };
const circ = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 40): P2[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
const TRI: P2[] = [[96, 170], [416, 170], [256, 470], [96, 170]];
/** the targeting triangle being drawn: progress 0..1 (outline first, then the yellow fill scribbles) */
const triTex = (n: number) => ctex("eslTri" + n, 512, 640, (g, r) => {
  paperBase(g, r);
  const p = n / 6;
  // fill scribbles first (top down), the outline last in one go: a half-drawn outline could read as a digit
  if (p > 0) {
    const k = Math.min(1, p / 0.7); g.save(); g.beginPath(); g.moveTo(96, 170); g.lineTo(416, 170); g.lineTo(256, 470); g.closePath(); g.clip();
    g.strokeStyle = "#f2c531"; g.lineWidth = 34; g.lineCap = "round";
    for (let i = 0; i < 14 * k; i++) { const y = 175 + i * 22; g.beginPath(); g.moveTo(80, y); g.lineTo(430, y + 14); g.stroke(); }
    g.restore();
  }
  if (p >= 0.8) wob(g, dense(TRI, 20), "#c8901a", 10, 3);
});
const girlTex = () => ctex("eslGirl", 512, 640, (g, r) => {
  paperBase(g, r);
  // wings (crayon blue loops)
  g.fillStyle = "rgba(150,205,245,0.55)";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 110, 300, 85, 55, s * -0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(256 + s * 95, 385, 60, 38, s * 0.5, 0, 7); g.fill(); }
  for (const s of [-1, 1]) { wob(g, circ(256 + s * 110, 300, 85, 55), "#4a90cf", 7, s); wob(g, circ(256 + s * 95, 385, 60, 38), "#4a90cf", 7, s + 2); }
  // dress: a pink triangle
  g.fillStyle = "rgba(240,130,170,0.7)"; g.beginPath(); g.moveTo(256, 280); g.lineTo(340, 470); g.lineTo(172, 470); g.closePath(); g.fill();
  wob(g, dense([[256, 280], [340, 470], [172, 470], [256, 280]], 8), "#c8407a", 8, 5);
  // stick legs, arms, wand with a star
  wob(g, [[225, 470], [220, 545], [205, 548]], "#3a3040", 7); wob(g, [[287, 470], [292, 545], [308, 548]], "#3a3040", 7, 2);
  wob(g, [[232, 320], [170, 360], [150, 345]], "#3a3040", 7, 4); wob(g, [[280, 320], [345, 290], [372, 250]], "#3a3040", 7, 6);
  wob(g, [[372, 250], [392, 205]], "#8a5a2a", 6);
  g.fillStyle = "#f6d23a"; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 11 : 26; g.lineTo(395 + rr * Math.cos(a), 192 + rr * Math.sin(a)); } g.closePath(); g.fill();
  g.strokeStyle = "#c8901a"; g.lineWidth = 4; g.stroke();
  // round head, hair, face
  g.fillStyle = "#ffe8cf"; g.beginPath(); g.arc(256, 215, 68, 0, 7); g.fill();
  wob(g, circ(256, 215, 68, 68), "#3a3040", 8, 7);
  g.fillStyle = "rgba(240,180,60,0.85)"; g.beginPath(); g.ellipse(256, 165, 74, 34, 0, Math.PI, 0); g.fill();
  wob(g, [[186, 190], [176, 250], [168, 290]], "#d89a2a", 9); wob(g, [[326, 190], [336, 250], [344, 290]], "#d89a2a", 9, 3);
  g.fillStyle = "#3a3040"; for (const s of [-1, 1]) { g.beginPath(); g.arc(256 + s * 24, 214, 7, 0, 7); g.fill(); }
  wob(g, circ(256, 236, 24, 16, 0.3, Math.PI - 0.3, 10), "#c8405a", 6, 1);
  g.fillStyle = "rgba(245,130,150,0.45)"; for (const s of [-1, 1]) { g.beginPath(); g.arc(256 + s * 42, 238, 10, 0, 7); g.fill(); }
});
const BALL: P2 = [256, 300];
const ballTex = (empty: boolean) => ctex(empty ? "eslBallEmpty" : "eslBall", 512, 640, (g, r) => {
  paperBase(g, r);
  const [bx, by] = BALL, PLUM = "#4a2a4e";
  if (empty) { g.setLineDash([12, 12]); wob(g, circ(bx, by, 56, 56), "rgba(110,70,110,0.45)", 5); g.setLineDash([]); return; }
  const ring = g.createRadialGradient(bx, by, 40, bx, by, 125); ring.addColorStop(0, "rgba(255,196,110,0.7)"); ring.addColorStop(1, "rgba(255,196,110,0)");
  g.fillStyle = ring; g.beginPath(); g.arc(bx, by, 125, 0, 7); g.fill();
  for (const s of [-1, 1]) {
    g.fillStyle = "#f7f3fb"; g.beginPath(); g.ellipse(bx + s * 88, by - 8, 40, 25, s * -0.25, 0, 7); g.fill();
    wob(g, circ(bx + s * 88, by - 8, 40, 25), PLUM, 4, s);
  }
  const core = g.createRadialGradient(bx - 14, by - 16, 4, bx, by, 56); core.addColorStop(0, "#ffffff"); core.addColorStop(1, "#fff1d2");
  g.fillStyle = core; g.beginPath(); g.arc(bx, by, 55, 0, 7); g.fill();
  wob(g, circ(bx, by, 55, 55), PLUM, 4, 2);
});
const pencilCard = (p: Pen) => {
  p.ol = 5;
  p.poly([[20, 46], [190, 46], [190, 74], [20, 74]], "#f2c531");
  p.poly([[190, 46], [240, 60], [190, 74]], "#f1d9b0");
  p.poly([[226, 56], [240, 60], [226, 64]], "#3a3040", 0);
  p.poly([[4, 46], [20, 46], [20, 74], [4, 74]], "#f08a9a");
};
/** opaque cartoon smoke cloud with a plum outline on a 500 x 400 canvas (variant v) */
const inkPuff = (p: Pen, v: number) => {
  const lobes: [number, number, number][] = [[250, 230, 120], [140, 250, 85], [360, 250, 90], [200, 150, 85], [310, 155, 80], [250, 300, 95]]
    .map(([x, y, r], i) => [x + 12 * Math.sin(v * 2.3 + i), y + 10 * Math.cos(v * 1.7 + i), r * (0.9 + 0.12 * Math.sin(v + i * 1.3))] as [number, number, number]);
  p.ol = 12;
  for (const [x, y, r] of lobes) p.ell(x, y, r, r * 0.86, "#dcd7e2", 12, 0, 360, 0);
  for (const [x, y, r] of lobes) p.ell(x, y, r - 7, r * 0.86 - 7, "#dcd7e2", 0, 0, 360, 0);
  for (const [x, y, r] of lobes.slice(0, 3)) p.ell(x - r * 0.25, y - r * 0.3, r * 0.35, r * 0.22, "#f2eff5", 0, 0, 360, -15);
};
const glowDot = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,245,190,1)"); gr.addColorStop(0.35, "rgba(255,220,120,0.55)"); gr.addColorStop(1, "rgba(255,200,90,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

// ---------------- layout ----------------
const WALLZ = -2.6;
const BOARD = { x: 0.05, y: 1.75, z: -0.8, lean: -0.11 };   // board centre and lean (top goes back)
const BW = 1.6, BH = 2.0, SW = 1.46, SH = 1.82;              // board / sheet sizes
const DES = { x: -1.0, z: -0.35 };
const STOOL = { x: 0.4, z: 0.1 }, CON_Y = 0.6, CON_YAW = -0.3;

let boardG: THREE.Group, under: THREE.MeshBasicMaterial, flipF: THREE.MeshBasicMaterial, flipPivot: THREE.Group;
let con: THREE.Group, led: THREE.MeshBasicMaterial, fairy: Fairy;
const ballW = new THREE.Vector3(), ledW = new THREE.Vector3();

/** drawing on the sheet in front (under) and the one flipping away, at frame f */
const sheets = (f: number): { under: THREE.Texture; flip: THREE.Texture | null; ang: number } => {
  const triN = Math.round(6 * clamp01((f - DRAW0) / (DRAW1 - DRAW0)));
  const ang = (f0: number) => -Math.PI * 1.12 * smooth((f - f0) / FLIP_N);
  if (f < FLIP1) return { under: triTex(triN), flip: null, ang: 0 };
  if (f < FLIP1 + FLIP_N) return { under: girlTex(), flip: triTex(6), ang: ang(FLIP1) };
  if (f < FLIP2) return { under: girlTex(), flip: null, ang: 0 };
  if (f < FLIP2 + FLIP_N) return { under: ballTex(false), flip: girlTex(), ang: ang(FLIP2) };
  return { under: ballTex(f >= LIFT), flip: null, ang: 0 };
};

// ---------------- cameras ----------------
const camA = (f: number) => dolly([-0.15, 1.72, 6.3], [-0.12, 1.66, -0.8], pushK(f, 850, 0.0007, 0.0015, 16) * (f > FLIP1 ? pushK(f, FLIP1, 0.0004, 0.002, 12) : 1), { fov: 40 });
const camB = (f: number) => dolly([-0.12, 1.64, 6.5], [-0.1, 1.55, -0.8], pushK(f, B6, 0.0007) * (f > POOF ? pushK(f, POOF, 0.0003, 0.002, 10) : 1), { fov: 40 });
const camC = (f: number) => dolly([-0.2, 1.8, 6.3], [-0.16, 1.78, -0.8], pushK(f, FLIP2, 0.0012), { fov: 40 });
const cams: Record<number, Key[]> = { 6: [{ f: 842, s: camA }, { f: B6 - 4, dur: 26, s: camB }, { f: FLIP2 - 6, dur: 24, s: camC }] };
const dof: Dof[] = [
  { f: 850, cInf: 10, focus: () => [-0.3, 1.7, -0.6] },
  { f: B6, dur: 20, cInf: 8, focus: () => [0.0, 1.5, -0.5] },
  { f: FLIP2, dur: 16, cInf: 10, focus: () => [0.1, 1.85, -0.7] },
];

export const easel: Scene = {
  name: "easel",
  build(root) {
    const b = new Batch();
    // patio + wall with a window, a downpipe, a bush
    const pt = new THREE.PlaneGeometry(10, 7); pt.rotateX(-Math.PI / 2);
    { const p = pt.attributes.position as THREE.BufferAttribute, uv = pt.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); }
    b.add(pt, lam("eslPatio", () => ({ map: cobbleHD() })), M(0, 0.012, WALLZ + 3.5));
    const plaster = lam("eslPlasterM", () => ({ map: plasterTex() }));
    b.add(boxG(10, 4.4, 0.4, 3), plaster, M(0, 2.2, WALLZ - 0.2));
    b.add(boxG(10, 0.45, 0.08, 1), lam("eslPlinth", () => ({ color: "#b98f6a" })), M(0, 0.225, WALLZ + 0.04));
    b.add(boxG(10, 0.25, 0.5, 1), lam("eslEave", () => ({ color: "#8a5f3c" })), M(0, 4.4, WALLZ));
    const frame = lam("eslWinFrame", () => ({ color: "#6f8f6a" })), glass = lam("eslGlass", () => ({ color: "#a9cbe0" }));
    const WX = 2.1, WY = 2.1;
    b.add(boxG(1.0, 1.25, 0.04), glass, M(WX, WY, WALLZ + 0.02));
    for (const [w, h, x, y] of [[1.16, 0.09, 0, 0.66], [1.16, 0.12, 0, -0.66], [0.09, 1.4, -0.54, 0], [0.09, 1.4, 0.54, 0], [0.05, 1.25, 0, 0], [1.0, 0.05, 0, 0.1]] as const)
      b.add(boxG(w, h, 0.1), frame, M(WX + x, WY + y, WALLZ + 0.05));
    b.add(boxG(1.3, 0.08, 0.22), frame, M(WX, WY - 0.72, WALLZ + 0.1));
    for (const s of [-1, 1]) b.add(boxG(0.5, 1.32, 0.05), lam("eslShutter", () => ({ color: "#5d8a6a" })), M(WX + s * 0.84, WY, WALLZ + 0.06));
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 4.3, 10), lam("eslPipe", () => ({ color: "#8d8a90" })), M(-2.0, 2.15, WALLZ + 0.1));
    addVeg(b, "bush", 2.3, 0, WALLZ + 0.8, 1.05, 77, 0);
    addVeg(b, "bush", -2.6, 0, WALLZ + 0.7, 0.9, 41, 0);
    // stool
    const wood = lam("eslWood", () => ({ color: "#b07a4a" })), woodDk = lam("eslWoodDk", () => ({ color: "#7d5233" }));
    b.add(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 24), wood, M(STOOL.x, CON_Y - 0.03, STOOL.z));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; b.add(rod(V(STOOL.x + 0.18 * Math.cos(a), CON_Y - 0.05, STOOL.z + 0.18 * Math.sin(a)), V(STOOL.x + 0.27 * Math.cos(a), 0, STOOL.z + 0.27 * Math.sin(a)), 0.025), woodDk); }
    // easel: two front legs, a back leg, a cross bar, the board with a tray
    const bx = BOARD.x, bz = BOARD.z;
    for (const s of [-1, 1]) b.add(rod(V(bx + s * 0.8, 0, bz + 0.15), V(bx + s * 0.42, 3.15, bz - 0.36), 0.032), woodDk);
    b.add(rod(V(bx, 0, bz - 1.0), V(bx, 3.0, bz - 0.38), 0.03), woodDk);
    b.add(rod(V(bx - 0.5, 3.0, bz - 0.33), V(bx + 0.5, 3.0, bz - 0.33), 0.026), woodDk);
    b.build(root);
    boardG = new THREE.Group(); boardG.position.set(bx, BOARD.y, bz); boardG.rotation.x = BOARD.lean; root.add(boardG);
    const bm = new THREE.Mesh(boxG(BW, BH, 0.04), wood); bm.castShadow = bm.receiveShadow = true; bm.position.z = -0.02; boardG.add(bm);
    const tray = new THREE.Mesh(boxG(BW + 0.2, 0.05, 0.12), woodDk); tray.position.set(0, -BH / 2 - 0.02, 0.04); tray.castShadow = true; boardG.add(tray);
    const clip = new THREE.Mesh(boxG(0.3, 0.06, 0.05), lam("eslClip", () => ({ color: "#8a8d96" }))); clip.position.set(0, SH / 2 - 0.02, 0.035); boardG.add(clip);
    // pencil jar on the tray
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.15, 16), lam("eslJar", () => ({ color: "#9fc6d6" }))); jar.position.set(BW / 2 - 0.02, -BH / 2 + 0.08, 0.06); boardG.add(jar);
    ["#d2453c", "#3f6fb5", "#5d9a4a", "#f2c531"].forEach((c, i) => {
      const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 6), lam("eslPen" + c, () => ({ color: c })));
      pc.position.set(BW / 2 - 0.05 + i * 0.022, -BH / 2 + 0.19, 0.06 + (i % 2) * 0.015); pc.rotation.z = (i - 1.5) * 0.12; boardG.add(pc);
    });
    // sheets: the one under (static) and the flipping one (hinged at the top edge, plain paper on its back)
    under = new THREE.MeshBasicMaterial({ map: triTex(0), color: 0xeeeeee });
    const um = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), under); um.position.set(0, 0, 0.012); um.layers.set(NOINK); boardG.add(um);
    flipPivot = new THREE.Group(); flipPivot.position.set(0, SH / 2, 0.022); boardG.add(flipPivot);
    flipF = new THREE.MeshBasicMaterial({ map: triTex(6), color: 0xeeeeee });
    const pg = new THREE.PlaneGeometry(SW, SH); pg.translate(0, -SH / 2, 0);
    const ff = new THREE.Mesh(pg, flipF), fb = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xe8e0cc, side: THREE.BackSide }));
    for (const m of [ff, fb]) { m.layers.set(NOINK); flipPivot.add(m); }
    boardG.updateMatrixWorld(true);
    ballW.set((BALL[0] / 512 - 0.5) * SW, (0.5 - BALL[1] / 640) * SH, 0.03); boardG.localToWorld(ballW);
    // console on the stool, with a status light on its front
    con = makeConsole(); con.scale.setScalar(1.6); con.position.set(STOOL.x, CON_Y, STOOL.z); con.rotation.y = CON_YAW; root.add(con);
    led = new THREE.MeshBasicMaterial({ color: 0x302830 });
    const lm = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), led); lm.position.set(0.12, 0.11, 0.232); lm.layers.set(NOINK); con.add(lm);
    fairy = new Fairy(root, 5);
  },
  update(u) {
    const f = u.f, t = u.t, out = u.out;
    // ---- the board ----
    const sh = sheets(f);
    under.map = sh.under; flipF.map = sh.flip ?? sh.under;
    flipPivot.visible = !!sh.flip && sh.ang > -Math.PI * 1.04;
    flipPivot.rotation.x = sh.ang;
    // ---- the console ----
    const shake = f >= SHAKE0 && f < FLIP2 ? (f < POOF ? ramp(f, SHAKE0, POOF) : 1 - ramp(f, POOF, POOF + 30)) : 0;
    const hop = f >= POOF && f < POOF + 8 ? 0.09 * Math.sin(((f - POOF) / 8) * Math.PI) : 0;
    con.position.set(STOOL.x + 0.012 * shake * Math.sin(f * 2.9), CON_Y + 0.008 * shake * Math.abs(Math.sin(f * 3.7)) + hop, STOOL.z);
    con.rotation.set(0, CON_YAW + 0.03 * shake * Math.sin(f * 2.3), 0.035 * shake * Math.sin(f * 3.1) + (hop ? -0.06 : 0));
    con.updateMatrixWorld(true);
    let col: [number, number, number] = [0.19, 0.16, 0.19], glow = 0;
    if (f >= POOF && f < FLIP2 + 6) { const on = f < POOF + 14 || Math.floor((f - POOF) / 6) % 2 === 0; if (on) { col = [6, 0.5, 0.35]; glow = 1; } }
    if ((f >= 1000 && f < 1006) || (f >= 1009 && f < 1015)) { col = [0.5, 5, 0.9]; glow = 1; }
    led.color.setRGB(...col);
    ledW.set(0.12, 0.11, 0.26); con.localToWorld(ledW);
    if (glow) out.fx.push({ key: col[0] > 1 ? "eslLedR" : "eslLedG", cw: 128, ch: 128, draw: col[0] > 1 ? (p) => { glowDot(p); p.g.globalCompositeOperation = "source-atop"; p.g.fillStyle = "rgba(255,60,40,0.75)"; p.g.fillRect(0, 0, 128, 128); } : (p) => { glowDot(p); p.g.globalCompositeOperation = "source-atop"; p.g.fillStyle = "rgba(80,255,120,0.7)"; p.g.fillRect(0, 0, 128, 128); },
      x: ledW.x, y: ledW.y, z: ledW.z + 0.02, w: 0.22, h: 0.22, soft: true, add: true, glow: 2.2 });
    const top = V(STOOL.x, CON_Y + 0.34, STOOL.z);
    // smoke wisps from f928, the big poof with sparks at f933, a few lazy wisps after
    for (let i = 0; i < 6; i++) {
      const born = SMOKE0 + i * 3 + (i > 1 ? 8 : 0), life = 22;
      if (f < born || f >= born + life || born > FLIP2 - 6) continue;
      const k = (f - born) / life;
      const sz = (0.3 + 0.25 * k) * Math.min(1, k * 5) * (1 - smooth((k - 0.7) / 0.3)), v = i % 3;
      if (sz > 0.02) out.fx.push({ key: `eslPuff|${v}`, cw: 500, ch: 400, draw: (p) => inkPuff(p, v), x: top.x - 0.1 + 0.08 * Math.sin(i * 2.1) - 0.15 * k, y: top.y + 0.15 + 0.8 * k, z: top.z + 0.2,
        w: sz, h: sz * 0.8 });
    }
    if (f >= POOF && f < POOF + 22) {
      const k = (f - POOF) / 22;
      const grow = Math.min(1, (f - POOF + 1) / 5) * (1 + 0.15 * Math.sin(Math.min(1, (f - POOF) / 8) * Math.PI)), fade = 1 - smooth((k - 0.65) / 0.35);
      ([[0.2, 0.45, 0.9, 0], [0.42, 0.78, 0.7, 1], [-0.02, 0.95, 0.65, 2]] as const).forEach(([dx, dy, sz, v], i) => {
        const w = sz * grow * fade;
        if (w > 0.03) out.fx.push({ key: `eslPuff|${v}`, cw: 500, ch: 400, draw: (p) => inkPuff(p, v), x: top.x - 0.12 + dx * (1 + 0.4 * k), y: top.y + dy + 0.5 * k, z: top.z + 0.35 + 0.05 * i, w, h: w * 0.8 });
      });
      if (k < 0.5) { const kb = k * 2; out.fx.push({ key: `eslSparks|${q(kb, 11)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, kb, "#ffd84a", 10, 30, 230), x: top.x - 0.1, y: top.y + 0.3, z: top.z + 0.6, w: 1.4, h: 1.4, glow: 1.6 }); }
    }
    // ---- the designer ----
    let expr: Expr = "neutral", look = 0.7, wave: number | undefined, headTilt = 0, tilt = 0, facing: -1 | 0 | 1 = 1;
    if (f < DRAW1 + 2) { wave = 0.35 * Math.sin(f * 1.3); expr = "neutral"; }
    else if (f < FLIP1 - 1) { wave = 0.6; expr = "smile_closed"; }
    else if (f < FLIP1 + 4) { wave = 0.9; expr = "smile"; }
    else if (f < B6) { expr = "grin"; headTilt = 5; }
    else if (f < SMOKE0 - 3) { expr = "grin"; wave = 0.2 + 0.15 * Math.sin(f * 0.4); look = 1; }
    else if (f < POOF - 1) { expr = "nervous"; look = 1; tilt = -3; }
    else if (f < POOF + 6) { expr = "shock"; look = 1; tilt = -8; }
    else if (f < FLIP2) { expr = "stern"; look = 0.8; }
    else if (f < GLOW0 - 2) { expr = "neutral"; wave = 0.7; }
    else if (f < LIFT + 2) { expr = "relief_open"; look = 0.6; }
    else { expr = "smile"; headTilt = 9 * smooth((f - LIFT) / 6); look = 1; facing = 1; }
    act(out, u.cam, t, WHO.designer, { x: DES.x, z: DES.z, expr, look, wave, headTilt, tilt, facing });
    // pencil in his raised hand while he draws
    if (f < DRAW1 + 2) {
      const k = clamp01((f - DRAW0) / (DRAW1 - DRAW0)), w = 0.35 * Math.sin(f * 1.3);
      out.fx.push({ key: "eslPencil", cw: 250, ch: 120, draw: pencilCard, x: DES.x + 0.45 + 0.03 * w, y: 1.47 + 0.03 * w - 0.04 * k, z: DES.z + 0.06, w: 0.3, h: 0.144, rot: 0.35 });
    }
    // ---- the drawn ball glows, then lifts off as the real fairy ----
    if (f >= GLOW0 && f < LIFT + 4) {
      const g = smooth((f - GLOW0) / (LIFT - GLOW0));
      out.fx.push({ key: "eslBallGlow", cw: 128, ch: 128, draw: glowDot, x: ballW.x, y: ballW.y, z: ballW.z + 0.04, w: 0.5 + 0.4 * g, h: 0.5 + 0.4 * g, soft: true, add: true, glow: 0.6 + 1.8 * g, yaw: 0 });
    }
    if (f >= LIFT) {
      const k = smooth((f - LIFT) / 14), tw = f < LIFT + 10 ? 1 + 0.25 * Math.sin(((f - LIFT) / 10) * Math.PI) : 1;
      fairy.pose(lerp(ballW.x, 0.93, k), lerp(ballW.y, 2.2, k) + 0.3 * Math.sin(Math.PI * k) + 0.04 * Math.sin(t * 4), lerp(ballW.z + 0.05, -0.6, k), t, u.camera, lerp(0.95, 1.1, k) * tw, 1.2);
      if (f < LIFT + 8) { const kk = (f - LIFT) / 8; out.fx.push({ key: `eslTwinkle|${q(kk, 8)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, kk, "#fff3b0", 8, 20, 200), x: ballW.x, y: ballW.y, z: ballW.z + 0.08, w: 0.9, h: 0.9, glow: 1.5 }); }
    } else fairy.hide();
    // a little dust from the stool legs when the console hops
    if (f >= POOF + 6 && f < POOF + 18) { const k = (f - POOF - 6) / 12;
      out.fx.push({ key: `eslHopDust|${q(k, 12)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: STOOL.x, y: CON_Y + 0.05, z: STOOL.z + 0.3, w: 0.6, h: 0.6, soft: true }); }
    void hh;
  },
  cams,
  dof,
  kicks: [[POOF, 0.7]],
  sun: { 6: { az: 140, el: 45 } },
  cues: [
    [DRAW0, "scribble", "pencil on paper"],
    [FLIP1, "page", "sheet flips over"],
    [SHAKE0, "rattle", "console starts to rattle"],
    [SMOKE0, "sputter", "console sputters, smoke"],
    [POOF, "poof", "big smoke puff with sparks, alarm beep"],
    [FLIP2, "page", "sheet flips over"],
    [LIFT, "twinkle", "the ball of light lifts off the paper"],
    [1000, "blip_ok", "calm green blink"],
  ],
};
