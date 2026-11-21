// Scene `castle`: shots 3 (f470-557, day) and 13 (f1938-2036, golden).
//   Set A (origin): a lone storybook villain castle on a low hill in an empty meadow. A square gatehouse with an arched
//   gate and a portcullis, a slim round tower rising from it (the hero stands on the gatehouse top, in front of the
//   tower, behind the crenellated parapet), a keep with a pyramid roof, a second tower, curtain walls, corner turrets,
//   dark teal cone roofs, purple banners. Lenses look toward -z.
//     3a 470-525  wide of the lonely castle, push in; the hero a tiny figure on the gatehouse balcony
//     3b 525-557  medium: the hero glum behind the parapet, the gate below; the portcullis slams at f531
//   Set B (x = 300): the hall. Checkered floor, red carpet, warm stone walls on three sides, gold-framed paintings of a
//   dark forest road, high glowing windows, torches.
//     13a 1938-1971  wide: the hero small in the middle, sword raised, the fairy at his shoulder
//     13b 1971-1994  insert on the centre painting: a tiny dark rider gallops toward us and grows
//     13c 1994-2036  the rider bursts out (f1996), leaps and lands in the hall (f2009); the hero recoils, the fairy hides
// Everything is a pure function of the frame.
import * as THREE from "three";
import { Batch, V, lam, addVeg } from "../build";
import { ctex, stoneHD, roofHD, grassHD } from "../paint";
import { Key, Dof, V3, dolly, pushK, ramp, smooth, lerp, clamp01, easeOut, wf } from "../timeline";
import { act, WHO } from "../chars";
import { Fairy, paintedFace } from "../props";
import { q, blob } from "../cast";
import { Pen, INK, fxBurst, fxPuff } from "../toon";
import type { Scene, Frame } from "./types";

// ---------------- timing ----------------
const SLAM = wf(4, "nunca");               // 531
const DROP0 = SLAM - 4;                     // portcullis starts to fall
const B3 = 525;
const B13 = 1971, C13 = 1994;
const GAL0 = 1975, BURST = 1996, LAND = wf(12, "quadro") - 3; // 2009

// ---------------- helpers ----------------
type P2 = [number, number];
const M = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(sx, sy, sz));
const suv = <G extends THREE.BufferGeometry>(g: G, su: number, sv = su): G => {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
};
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 4) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  // BoxGeometry uv 0..1 per face: scale by the face size so the stone courses keep their size
  const uv = g.attributes.uv as THREE.BufferAttribute, w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * sizes[f][0]) / tile, (uv.getY(i) * sizes[f][1]) / tile); }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
};
const cyl = (rt: number, rb: number, h: number, n = 32, tile = 4, open = false) =>
  suv(new THREE.CylinderGeometry(rt, rb, h, n, 1, open), (2 * Math.PI * Math.max(rt, rb)) / tile, h / tile);
const cone = (r: number, h: number, n = 32, tile = 2) => suv(new THREE.ConeGeometry(r, h, n, 1, false), (2 * Math.PI * r) / tile, Math.hypot(r, h) / tile);
const arched = (hw: number, hs: number, seg = 10) => {
  const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hs); s.absarc(0, hs, hw, 0, Math.PI, false); s.closePath();
  return new THREE.ShapeGeometry(s, seg);
};
/** swallow-tailed banner hanging down from its top edge (uv 0..1 over the cloth) */
const bannerGeo = (hw: number, h: number) => {
  const bs = new THREE.Shape(); bs.moveTo(-hw, 0); bs.lineTo(hw, 0); bs.lineTo(hw, -h); bs.lineTo(0, -h * 0.84); bs.lineTo(-hw, -h); bs.closePath();
  const bg = new THREE.ShapeGeometry(bs);
  const uv = bg.attributes.uv as THREE.BufferAttribute, p = bg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + hw) / (2 * hw), 1 + p.getY(i) / h);
  return bg;
};

// ---------------- materials ----------------
const STONE_V = () => lam("cstStone", () => ({ map: stoneHD("cstStoneHD", ["#a297ad", "#aba1b6", "#968ca3", "#b3a9bd", "#9d93a8"], "#6f6680") }));
const ROOF = () => lam("cstRoof", () => ({ map: roofHD("#3a6b70", true) }));
const DARK = () => lam("cstDark", () => ({ color: "#2e2638" }));
const IRON = () => lam("cstIron", () => ({ color: "#4b4656" }));
const WOOD = () => lam("cstWood", () => ({ color: "#7a5236" }));
const PURPLE = () => lam("cstBanner", () => ({ map: bannerTex(), side: THREE.DoubleSide }));
const PENNANT = () => lam("cstPennant", () => ({ color: "#7a3f9a", side: THREE.DoubleSide }));

const bannerTex = () => ctex("cstBannerTex", 256, 512, (g) => {
  g.fillStyle = "#6b3790"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#57287a"; g.fillRect(0, 0, 26, 512); g.fillRect(230, 0, 26, 512);
  g.fillStyle = "#e3b649"; g.fillRect(26, 0, 10, 512); g.fillRect(220, 0, 10, 512);
  // emblem: a gold horned crest (our own design)
  g.fillStyle = "#e3b649"; g.strokeStyle = "#3b1d4f"; g.lineWidth = 8; g.lineJoin = "round";
  g.beginPath(); g.moveTo(128, 300); g.lineTo(78, 230); g.quadraticCurveTo(64, 160, 40, 120); g.quadraticCurveTo(96, 150, 104, 200);
  g.lineTo(152, 200); g.quadraticCurveTo(160, 150, 216, 120); g.quadraticCurveTo(192, 160, 178, 230); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#3b1d4f"; g.beginPath(); g.moveTo(104, 232); g.lineTo(122, 240); g.lineTo(106, 248); g.fill(); g.beginPath(); g.moveTo(152, 232); g.lineTo(134, 240); g.lineTo(150, 248); g.fill();
});
const pathTex = () => ctex("cstPathTex", 512, 512, (g, r) => {
  g.fillStyle = "#c9a878"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512, rad = 30 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? "rgba(150,115,80,0.25)" : "rgba(235,210,170,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,95,70,0.45)" : "rgba(240,225,200,0.5)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 7); g.fill(); }
});

// ---------------- set A: the castle on its hill ----------------
const HILL = 1.3, PLAT = 12.5;
const hillY = (x: number, z: number) => HILL * (1 - smooth((Math.hypot(x, z - 1) - PLAT) / 11));
const TOP = HILL - 0.04;                   // castle base level (the terrain mesh sits 4 cm under the shell lawn far out)
const GH = 4.6;                             // gatehouse height above TOP (the hero's floor)
const GZ0 = 3, GZ1 = 7, GW = 3;             // gatehouse z range, half width
const TWZ = 4.4, TWR = 1.6, TWH = 17.6;      // main tower centre z, radius, top of the shaft above TOP
const ARCH_W = 1.2, ARCH_S = 2.1;            // gate half width, height of the straight jambs (arch top = 3.3)
const HERO_A: V3 = [0, TOP + GH, 6.3];

const crenLine = (b: Batch, m: THREE.Material, x0: number, z0: number, x1: number, z1: number, y: number, t = 0.5, skip?: (x: number, z: number) => boolean) => {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.2)), yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, x = lerp(x0, x1, k), z = lerp(z0, z1, k);
    if (skip && skip(x, z)) continue;
    b.add(box(-0.32, 0, -t / 2, 0.32, 0.6, t / 2, 2), m, M(x, y, z, yaw));
  }
};
const crenRing = (b: Batch, m: THREE.Material, cx: number, cz: number, r: number, y: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(box(-0.3, 0, -0.22, 0.3, 0.55, 0.22, 2), m, M(cx + r * Math.sin(a), y, cz + r * Math.cos(a), a));
  }
};
const roundTower = (b: Batch, x: number, z: number, r: number, h: number, roofR: number, roofH: number) => {
  const S = STONE_V();
  b.add(cyl(r, r, h + 0.4, 32), S, M(x, TOP - 0.4 + (h + 0.4) / 2, z));
  b.add(cyl(r + 0.25, r, 0.5, 32), S, M(x, TOP + h - 0.25, z)); // corbel lip
  b.add(cone(roofR, roofH, 32), ROOF(), M(x, TOP + h + roofH / 2, z));
};

const buildCastle = (root: THREE.Group, b: Batch) => {
  const S = STONE_V();
  // ---- terrain: the hill (displaced grid) and a sandy path from the gate down toward the lenses ----
  const terr = new THREE.PlaneGeometry(90, 90, 90, 90); terr.rotateX(-Math.PI / 2);
  { const p = terr.attributes.position as THREE.BufferAttribute, uv = terr.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hillY(x, z) - 0.04); uv.setXY(i, x / 4, z / 4); }
    terr.computeVertexNormals(); }
  b.add(terr, lam("cstGrass", () => ({ map: grassHD() })));
  const path = new THREE.PlaneGeometry(2.6, 44, 2, 88); path.rotateX(-Math.PI / 2); path.translate(0, 0, GZ1 + 22);
  { const p = path.attributes.position as THREE.BufferAttribute, uv = path.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i), x = p.getX(i) * (1 + 0.25 * smooth((z - 10) / 30)) + 0.6 * Math.sin(z * 0.12) * smooth((z - 9) / 4);
      p.setX(i, x); p.setY(i, hillY(x, z) - 0.015); uv.setXY(i, x / 3, z / 3); }
    path.computeVertexNormals(); }
  b.add(path, lam("cstPath", () => ({ map: pathTex() })));

  // ---- gatehouse: a block with an arched tunnel (extruded shape) ----
  const sh = new THREE.Shape();
  sh.moveTo(-GW, -0.4); sh.lineTo(GW, -0.4); sh.lineTo(GW, GH); sh.lineTo(-GW, GH); sh.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-ARCH_W, -0.4); hole.lineTo(ARCH_W, -0.4); hole.lineTo(ARCH_W, ARCH_S); hole.absarc(0, ARCH_S, ARCH_W, 0, Math.PI, false); hole.lineTo(-ARCH_W, -0.4);
  sh.holes.push(hole);
  b.add(suv(new THREE.ExtrudeGeometry(sh, { depth: GZ1 - GZ0, bevelEnabled: false, curveSegments: 20 }), 1 / 4), S, M(0, TOP, GZ0));
  b.add(box(-ARCH_W, TOP - 0.1, GZ0 - 0.1, ARCH_W, TOP + ARCH_S + ARCH_W, GZ0 + 0.25), DARK()); // dark end of the tunnel
  // voussoir ring around the arch (slightly proud, lighter stone)
  const ring = new THREE.Shape(); ring.absarc(0, ARCH_S, ARCH_W + 0.32, 0, Math.PI, false); ring.lineTo(-ARCH_W, ARCH_S); ring.absarc(0, ARCH_S, ARCH_W, Math.PI, 0, true); ring.closePath();
  b.add(suv(new THREE.ExtrudeGeometry(ring, { depth: 0.12, bevelEnabled: false, curveSegments: 20 }), 1 / 2), lam("cstStoneLight", () => ({ map: stoneHD("cstStoneHD", []), color: "#dcd6e6" })), M(0, TOP, GZ1));
  // parapet: front + sides, with a crenel gap centred on the hero
  b.add(box(-GW, TOP + GH, GZ1 - 0.4, GW, TOP + GH + 0.9, GZ1 + 0.06), S);
  for (const s of [-1, 1]) b.add(box(s > 0 ? GW - 0.4 : -GW, TOP + GH, GZ0, s > 0 ? GW : -GW + 0.4, TOP + GH + 0.9, GZ1), S);
  crenLine(b, S, -GW + 0.3, GZ1 - 0.17, GW - 0.3, GZ1 - 0.17, TOP + GH + 0.9, 0.5, (x) => Math.abs(x) < 0.6);
  for (const s of [-1, 1]) crenLine(b, S, s * (GW - 0.2), GZ0 + 0.3, s * (GW - 0.2), GZ1 - 0.7, TOP + GH + 0.9, 0.4);
  // corbels under the parapet, banners on both sides of the gate
  for (let i = 0; i < 9; i++) b.add(box(-0.13, -0.45, -0.1, 0.13, 0, 0.16, 1), S, M(-GW + 0.33 + i * ((2 * GW - 0.66) / 8), TOP + GH + 0.02, GZ1 + 0.05));
  for (const s of [-1, 1]) {
    b.add(bannerGeo(0.42, 2.5), PURPLE(), M(s * 2.05, TOP + GH - 0.3, GZ1 + 0.04));
    b.add(box(-0.5, -0.05, 0, 0.5, 0.05, 0.1, 1), WOOD(), M(s * 2.05, TOP + GH - 0.28, GZ1 + 0.02));
  }
  // ---- the main tower, rising from the back half of the gatehouse ----
  b.add(cyl(TWR, TWR, TWH - GH + 0.2, 36), S, M(0, TOP + GH - 0.2 + (TWH - GH + 0.2) / 2, TWZ));
  b.add(cyl(2.05, TWR, 0.8, 36), S, M(0, TOP + TWH + 0.4, TWZ));        // corbelled cap
  b.add(cyl(2.05, 2.05, 0.6, 36), S, M(0, TOP + TWH + 1.1, TWZ));
  crenRing(b, S, 0, TWZ, 1.85, TOP + TWH + 1.4, 12);
  b.add(cone(2.35, 7.2, 36), ROOF(), M(0, TOP + TWH + 1.45 + 3.6, TWZ));
  // the doorway behind the hero, tower windows (glowing slits)
  b.add(arched(0.5, 1.35, 12), DARK(), M(0, TOP + GH, TWZ + TWR + 0.03));
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.55) });
  for (const [y, a] of [[9.2, 0], [13.2, 0], [16.2, 0], [11.2, -0.6]] as const) {
    const w = new THREE.Mesh(arched(0.17, 0.55, 8), winMat);
    w.position.set((TWR + 0.02) * Math.sin(a), TOP + y, TWZ + (TWR + 0.02) * Math.cos(a)); w.rotation.y = a;
    root.add(w);
  }
  // pennant on the spire
  const spire = TOP + TWH + 1.45 + 7.2;
  b.add(cyl(0.04, 0.04, 1.6, 6), IRON(), M(0, spire + 0.6, TWZ));
  { const ps = new THREE.Shape(); ps.moveTo(0, 0); ps.lineTo(1.3, -0.25); ps.lineTo(0, -0.55); ps.closePath();
    b.add(new THREE.ShapeGeometry(ps), PENNANT(), M(0.03, spire + 1.38, TWZ)); }

  // ---- curtain walls, corner turrets, the keep, a second tower ----
  const WH = 3.6;
  for (const s of [-1, 1]) {
    const xa = s * GW, xb = s * 8;
    b.add(box(Math.min(xa, xb), TOP - 0.4, 5.1, Math.max(xa, xb), TOP + WH, 6.1), S);
    crenLine(b, S, xa + s * 0.4, 5.85, xb - s * 1.2, 5.85, TOP + WH, 0.5);
    b.add(box(s > 0 ? 7.3 : -8.3, TOP - 0.4, -5, s > 0 ? 8.3 : -7.3, TOP + WH, 5.5), S);
    crenLine(b, S, s * 8.05, -4.4, s * 8.05, 4.6, TOP + WH, 0.5);
    roundTower(b, xb, 5.6, 1.25, 5.8, 1.55, 3.2);
  }
  b.add(box(-8, TOP - 0.4, -5.3, 8, TOP + WH, -4.4), S);
  // keep (left back): a tall block with a pyramid roof and a banner
  b.add(box(-7.2, TOP - 0.4, -4.2, -2.4, TOP + 9.6, 1.8), S);
  crenLine(b, S, -7.0, 1.55, -2.6, 1.55, TOP + 9.6, 0.5);
  crenLine(b, S, -2.65, 1.5, -2.65, -3.9, TOP + 9.6, 0.5);
  b.add(new THREE.ConeGeometry(3.55, 4.6, 4, 1).rotateY(Math.PI / 4), ROOF(), M(-4.8, TOP + 9.6 + 2.3, -1.2, 0, 1, 1, 1.25));
  for (const [x, y] of [[-6.1, 6.6], [-3.5, 6.6], [-6.1, 3.6], [-3.5, 3.6]] as const) b.add(arched(0.2, 0.7, 8), DARK(), M(x, TOP + y, 1.83));
  b.add(bannerGeo(0.55, 3.2), PURPLE(), M(-4.8, TOP + 9.1, 1.84));
  // second tower (right back)
  roundTower(b, 4.8, -1.6, 1.3, 12.2, 1.65, 4.6);
  for (const y of [7.5, 10.2]) b.add(arched(0.16, 0.5, 8), DARK(), M(4.8 - 0.55, TOP + y, -1.6 + 1.19, -0.45));

  // ---- the meadow: a few boulders, distant trees for scale ----
  const rockM = lam("cstRock", () => ({ color: "#a39dab" }));
  const rock = new THREE.IcosahedronGeometry(1, 2);
  for (const [x, z, s] of [[-6.5, 15, 0.7], [-5.4, 16.2, 0.4], [5.8, 19, 0.55], [9.5, 12.5, 0.8], [-11, 9, 0.6], [3.6, 30, 0.45]] as const)
    b.add(rock, rockM, new THREE.Matrix4().compose(V(x, hillY(x, z) - 0.04, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, x, 0)), V(s * 1.2, s * 0.7, s)));
  for (const [k, x, z, h] of [["cone", -24, -14, 7], ["cone", -21, -18, 9], ["round", 22, -20, 7], ["cone", 26, -16, 6], ["bush", -14, 18, 1.4], ["bush", 13, 21, 1.2]] as const)
    addVeg(b, k, x, 0, z, h, x * 7.7 + z * 3.1, 1);

  // ---- portcullis (dynamic): iron grid in the tunnel mouth; hidden in the wall above the arch when raised ----
  const pc = new THREE.Group(), iron = IRON();
  for (let i = 0; i < 6; i++) {
    const x = -1.02 + i * 0.408;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.6, 0.1), iron); bar.position.set(x, 1.8, 0); pc.add(bar);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 8), iron); sp.rotation.x = Math.PI; sp.position.set(x, -0.1, 0); pc.add(sp);
  }
  for (const y of [0.55, 1.45, 2.35, 3.2]) { const h = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.12), iron); h.position.set(0, y, 0); pc.add(h); }
  pc.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  pc.position.set(0, TOP, GZ1 - 0.55);
  root.add(pc);
  return pc;
};

/** portcullis bottom height above TOP at frame f (raised = 3.15: only the spikes show under the arch) */
const gateY = (f: number) => {
  if (f < DROP0) return 3.15;
  if (f < SLAM) { const u = (f - DROP0) / (SLAM - DROP0); return 3.15 * (1 - u * u); }
  const k = f - SLAM;
  return k < 8 ? 0.16 * Math.abs(Math.sin((k / 8) * Math.PI)) * (1 - k / 8) : 0;
};

// ---------------- set B: the hall ----------------
const HX = 300, HZB = -8, HW = 5, HWALL = 11;   // hall centre x, back wall inner face, half width, wall height
const PCY = 4.2, PW = 2.3, PH = 3.0;             // painting centre height, canvas size
const RIDER_W = 2.7, RIDER_H = (2.7 * 1600) / 1400;
const LAND_X = HX + 0.75, LAND_Z = 2.5;

const checkerTex = () => ctex("cstChecker", 1024, 1024, (g, r) => {
  const T = 256;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const dark = (i + j) % 2 === 1, x = i * T, y = j * T;
    g.fillStyle = dark ? "#6f5f7c" : "#e7d4ad"; g.fillRect(x, y, T, T);
    for (let k = 0; k < 6; k++) { const cx = x + r() * T, cy = y + r() * T, rad = 30 + r() * 60, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      gr.addColorStop(0, dark ? "rgba(140,120,160,0.18)" : "rgba(190,160,120,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x, y, T, T); }
    g.fillStyle = "rgba(255,250,235,0.18)"; g.fillRect(x + 4, y + 4, T - 8, 6);
    g.fillStyle = "rgba(40,25,40,0.25)"; g.fillRect(x, y, T, 4); g.fillRect(x, y, 4, T);
  }
});
const carpetTex = () => ctex("cstCarpet", 256, 512, (g) => {
  g.fillStyle = "#b52e38"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#e1b04a"; g.fillRect(14, 0, 12, 512); g.fillRect(230, 0, 12, 512);
  g.fillStyle = "#8a1f2c"; g.fillRect(0, 0, 14, 512); g.fillRect(242, 0, 14, 512);
  g.strokeStyle = "#e1b04a"; g.lineWidth = 6;
  for (let y = 128; y < 512; y += 256) { g.beginPath(); g.moveTo(128, y - 60); g.lineTo(188, y); g.lineTo(128, y + 60); g.lineTo(68, y); g.closePath(); g.stroke(); }
});
/** our own painting: a dark forest road at dusk, the road running into a misty glow in the middle */
const VPX = 300, VPY = 300;
const roadTex = () => ctex("cstForestRoad", 600, 780, (g, r) => {
  const W = 600, H = 780;
  const sky = g.createLinearGradient(0, 0, 0, VPY + 40); sky.addColorStop(0, "#2c2346"); sky.addColorStop(0.7, "#6a4a6e"); sky.addColorStop(1, "#d79a74");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(VPX, VPY, 0, VPX, VPY, 180); glow.addColorStop(0, "rgba(255,214,150,0.95)"); glow.addColorStop(1, "rgba(255,190,130,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = "#2f3a3a"; g.fillRect(0, VPY, W, H - VPY);
  const rd = g.createLinearGradient(0, VPY, 0, H); rd.addColorStop(0, "#d2a37a"); rd.addColorStop(1, "#6b5048");
  g.fillStyle = rd; g.beginPath(); g.moveTo(VPX - 8, VPY); g.lineTo(VPX + 8, VPY); g.lineTo(W * 0.82, H); g.lineTo(W * 0.18, H); g.closePath(); g.fill();
  // rows of dark pines on both sides, bigger toward us
  for (let k = 0; k < 9; k++) for (const s of [-1, 1]) {
    const t = k / 8, x = VPX + s * (40 + 250 * t * t + 30 * t) + s * 10 * r(), base = VPY + 10 + 470 * t * t, h = 70 + 520 * t, w = 24 + 120 * t;
    g.fillStyle = k % 2 ? "#1b2230" : "#222a38"; g.beginPath(); g.moveTo(x, base - h);
    for (let i = 1; i <= 5; i++) { const yy = base - h + (h * i) / 5; g.lineTo(x + (w * i) / 5, yy - 6); g.lineTo(x + (w * i) / 9, yy - 2); }
    for (let i = 5; i >= 1; i--) { const yy = base - h + (h * i) / 5; g.lineTo(x - (w * i) / 9, yy - 2); g.lineTo(x - (w * i) / 5, yy - 6); }
    g.closePath(); g.fill();
  }
  g.strokeStyle = "#141824"; g.lineCap = "round";
  for (const s of [-1, 1]) { g.lineWidth = 26; g.beginPath(); g.moveTo(s < 0 ? -10 : W + 10, 120); g.quadraticCurveTo(VPX + s * 120, 60, VPX + s * 40, 140); g.stroke();
    g.lineWidth = 12; g.beginPath(); g.moveTo(VPX + s * 140, 95); g.quadraticCurveTo(VPX + s * 70, 190, VPX + s * 100, 230); g.stroke(); }
  const v = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 520); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,15,20,0.45)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
});
const painting = (b: Batch, root: THREE.Group, x: number, z: number, yaw: number) => {
  const gold = lam("cstGold", () => ({ color: "#d9a845" })), goldDk = lam("cstGoldDk", () => ({ color: "#a8782f" }));
  const t = 0.2, fw = PW / 2 + t, fh = PH / 2 + t;
  const mat = M(x, PCY, z, yaw);
  const put = (g: THREE.BufferGeometry, m: THREE.Material) => { g.applyMatrix4(mat); b.add(g, m); };
  put(box(-fw, -fh, 0, fw, -fh + t, 0.16, 1), gold); put(box(-fw, fh - t, 0, fw, fh, 0.16, 1), gold);
  put(box(-fw, -fh + t, 0, -fw + t, fh - t, 0.16, 1), gold); put(box(fw - t, -fh + t, 0, fw, fh - t, 0.16, 1), gold);
  put(box(-PW / 2 - 0.02, -PH / 2 - 0.02, 0, PW / 2 + 0.02, PH / 2 + 0.02, 0.05, 1), goldDk);
  put(box(-0.22, fh - 0.02, 0.0, 0.22, fh + 0.2, 0.2, 1), gold); // crest on top
  const c = paintedFace(roadTex(), PW, PH); c.position.set(0, 0, 0.065); c.applyMatrix4(mat); root.add(c);
};
const flameTex = (k: number) => (p: Pen) => {
  const s = [0, 1, 2, 3].map((i) => Math.sin(k * 1.7 + i * 2.1));
  p.poly([[100, 290], [40 + 6 * s[0], 220], [30, 160], [70 + 10 * s[1], 110], [95 + 14 * s[2], 20], [130, 100], [165 + 6 * s[3], 150], [165, 230]], "#ff9a2e", 0);
  p.poly([[100, 280], [65, 225], [70, 170], [98 + 8 * s[1], 95], [125, 165], [135, 230]], "#ffd25a", 0);
  p.poly([[100, 270], [85, 235], [100, 190], [115, 235]], "#fff4c4", 0);
};

const buildHall = (root: THREE.Group, b: Batch) => {
  const wall = lam("cstHallStone", () => ({ map: stoneHD("cstHallHD", ["#d1b48d", "#c7a983", "#d9bf9a", "#bea07a", "#ccae88"], "#937a5e") }));
  const trim = lam("cstHallTrim", () => ({ map: stoneHD("cstHallHD", []), color: "#f2e6d2" }));
  // floor + carpet
  const fl = new THREE.PlaneGeometry(2 * HW, 26); fl.rotateX(-Math.PI / 2);
  { const p = fl.attributes.position as THREE.BufferAttribute, uv = fl.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5); }
  b.add(fl, lam("cstFloor", () => ({ map: checkerTex() })), M(HX, 0.012, HZB + 13));
  const cp = new THREE.PlaneGeometry(2.0, 26); cp.rotateX(-Math.PI / 2); suv(cp, 1, 26 / 4);
  b.add(cp, lam("cstCarpetM", () => ({ map: carpetTex() })), M(HX, 0.024, HZB + 13));
  b.add(box(HX - 1.6, 0, HZB, HX + 1.6, 0.22, HZB + 0.9, 2), trim); // low step under the centre painting
  // walls: back + two sides, cornice on top
  b.add(box(HX - HW - 0.7, -0.2, HZB - 0.7, HX + HW + 0.7, HWALL, HZB, 3), wall);
  for (const s of [-1, 1]) b.add(box(s < 0 ? HX - HW - 0.7 : HX + HW, -0.2, HZB, s < 0 ? HX - HW : HX + HW + 0.7, HWALL, 9, 3), wall);
  b.add(box(HX - HW - 0.9, HWALL, HZB - 0.9, HX + HW + 0.9, HWALL + 0.45, HZB + 0.25, 2), trim);
  for (const s of [-1, 1]) b.add(box(s < 0 ? HX - HW - 0.9 : HX + HW - 0.25, HWALL, HZB, s < 0 ? HX - HW + 0.25 : HX + HW + 0.9, HWALL + 0.45, 9, 2), trim);
  b.add(box(HX - HW, 0, HZB, HX + HW, 0.35, HZB + 0.12, 2), trim);
  for (const s of [-1, 1]) b.add(box(s < 0 ? HX - HW : HX + HW - 0.12, 0, HZB, s < 0 ? HX - HW + 0.12 : HX + HW, 0.35, 9, 2), trim);
  // pilasters
  for (const x of [HX - 4.8, HX - 1.6, HX + 1.6, HX + 4.8]) {
    b.add(box(x - 0.24, 0, HZB, x + 0.24, HWALL, HZB + 0.28, 3), wall);
    b.add(box(x - 0.34, 0, HZB, x + 0.34, 0.6, HZB + 0.38, 2), trim);
    b.add(box(x - 0.34, HWALL - 0.6, HZB, x + 0.34, HWALL, HZB + 0.38, 2), trim);
  }
  for (const s of [-1, 1]) for (const z of [-3.0, 0.4, 3.8, 7.2]) {
    const xi = HX + s * HW;
    b.add(box(Math.min(xi, xi - s * 0.28), 0, z - 0.24, Math.max(xi, xi - s * 0.28), HWALL, z + 0.24, 3), wall);
  }
  // the paintings: three on the back wall, three on each side wall (identical)
  for (const x of [HX - 3.2, HX, HX + 3.2]) painting(b, root, x, HZB, 0);
  for (const s of [-1, 1]) for (const z of [-1.3, 2.1, 5.5]) painting(b, root, HX + s * HW, z, s < 0 ? Math.PI / 2 : -Math.PI / 2);
  // high windows (glowing), torch sconces
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.35, 0.75) });
  for (const x of [HX - 3.2, HX, HX + 3.2]) {
    const w = new THREE.Mesh(arched(0.55, 1.6, 12), winMat); w.position.set(x, 7.4, HZB + 0.02); root.add(w);
    b.add(box(-0.08, 0, -0.04, 0.08, 2.15, 0.06, 1), lam("cstMullion", () => ({ color: "#5a4636" })), M(x, 7.4, HZB + 0.02));
    b.add(box(-0.75, -0.18, 0, 0.75, 0, 0.3, 2), trim, M(x, 7.4, HZB));
  }
  for (const x of [HX - 1.6, HX + 1.6]) {
    b.add(box(-0.1, -0.35, 0, 0.1, 0, 0.5, 1), IRON(), M(x, 6.35, HZB + 0.28));
    b.add(cyl(0.16, 0.08, 0.28, 12, 1), IRON(), M(x, 6.45, HZB + 0.7));
  }
  // banners high on the side walls
  for (const s of [-1, 1]) for (const z of [-2.9, 0.4 + 1.7]) b.add(bannerGeo(0.6, 3.0), PURPLE(), M(HX + s * (HW - 0.03), 10.3, z - 1.7, s < 0 ? Math.PI / 2 : -Math.PI / 2));
};

// ---------------- the dark rider (our own design), 1400 x 1600 canvas, horse facing left ----------------
type Pose = "galA" | "galB" | "leap" | "land" | "rear";
const HORSE = "#352c47", HORSE_HI = "#56497a", ARMOR = "#3c3552", ARMOR_HI = "#5d5480", CAPE = "#7d1f42", CAPE_IN = "#b33a5c", HORN = "#efe2c4", EYE = "#ffe75a";
const REAR_PIV: P2 = [930, 1220], REAR_A = 0.36;
const LEGS: Record<Pose, P2[][]> = {
  galA: [[[520, 1160], [470, 1340], [400, 1510]], [[590, 1170], [660, 1320], [585, 1420]], [[900, 1160], [990, 1330], [1080, 1500]], [[860, 1180], [820, 1350], [870, 1510]]],
  galB: [[[520, 1160], [560, 1340], [620, 1500]], [[590, 1170], [460, 1300], [420, 1390]], [[900, 1160], [880, 1340], [960, 1500]], [[860, 1180], [990, 1300], [1120, 1360]]],
  leap: [[[520, 1160], [390, 1250], [330, 1170]], [[590, 1170], [440, 1290], [380, 1230]], [[900, 1160], [1080, 1280], [1240, 1330]], [[860, 1180], [1040, 1320], [1200, 1400]]],
  land: [[[520, 1160], [430, 1330], [380, 1520]], [[590, 1170], [600, 1350], [560, 1520]], [[900, 1160], [960, 1350], [1010, 1520]], [[860, 1180], [840, 1360], [900, 1520]]],
  rear: [[[520, 1160], [420, 1190], [360, 1100]], [[590, 1170], [500, 1250], [450, 1170]], [[900, 1160], [950, 1350], [1010, 1520]], [[860, 1180], [830, 1360], [880, 1520]]],
};
const drawRider = (p: Pen, pose: Pose, k: number) => {
  p.ol = 14;
  const w = Math.sin(k * 1.9), w2 = Math.cos(k * 2.3), rear = pose === "rear", L = LEGS[pose];
  const leg = (pts: P2[], back: boolean) => {
    p.line(pts, back ? "#2a2238" : HORSE, 62);
    const e = pts[2], d = pts[1], a = Math.atan2(e[1] - d[1], e[0] - d[0]);
    p.ell(e[0] + 10 * Math.cos(a), e[1] + 10 * Math.sin(a), 40, 28, "#1c1626", 10, 0, 360, (a * 180) / Math.PI);
  };
  // when rearing, the hind legs stay planted and everything else turns about the hip (front up = negative canvas angle)
  if (rear) { leg(L[3], true); leg(L[2], false); }
  p.rot = rear ? [-REAR_A, REAR_PIV[0], REAR_PIV[1]] : null;
  if (!rear) { leg(L[3], true); leg(L[1], true); } else leg(L[1], true);
  // tail
  p.poly([[1000, 1000], [1150, 930 + 30 * w], [1310, 880 + 40 * w], [1250, 980], [1350, 1060 + 30 * w2], [1210, 1080], [1290, 1210 + 20 * w], [1060, 1110]], "#5b2a78");
  // cape (behind the rider, flowing back)
  p.poly([[800, 600], [960, 590], [1150, 640 + 30 * w], [1330, 720 + 50 * w], [1290, 800 + 30 * w2], [1350, 880 + 40 * w], [1180, 920], [1040, 960], [900, 880], [820, 760]], CAPE);
  p.poly([[960, 640], [1130, 690 + 30 * w], [1260, 760 + 40 * w], [1150, 860], [1010, 900], [930, 820]], CAPE_IN, 0);
  // body
  const body: P2[] = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; body.push([730 + 310 * Math.cos(a), 1070 + 170 * Math.sin(a) - 25 * Math.cos(a)]); }
  p.poly(body, HORSE);
  p.poly([[520, 990], [640, 925], [860, 915], [990, 960], [900, 950], [700, 955], [560, 1010]], HORSE_HI, 0);
  // neck + head
  p.poly([[460, 1060], [430, 880], [360, 700], [300, 600], [400, 560], [500, 720], [600, 900], [640, 1000]], HORSE);
  p.poly([[300, 560], [395, 575], [430, 660], [360, 760], [240, 800], [165, 775], [175, 700], [240, 640]], HORSE);
  p.poly([[330, 575], [350, 470], [395, 590]], HORSE); p.poly([[290, 590], [285, 495], [335, 595]], HORSE);
  p.dot(195, 745, 12, "#1a1422");
  p.ell(300, 640, 26, 18, EYE, 7, 0, 360, -20);
  p.stroke([[262, 610], [330, 632]], 10, INK);
  // mane
  p.poly([[330, 560], [420, 520 - 20 * w], [430, 600], [520, 580 - 20 * w2], [500, 680], [600, 690 - 20 * w], [560, 780], [640, 830 - 10 * w2], [600, 930], [520, 860], [440, 700]], "#6b2f8a");
  // saddle cloth
  p.poly([[640, 940], [900, 935], [930, 1130], [870, 1190], [690, 1190], [620, 1120]], "#9a2d3c");
  p.stroke([[630, 1130], [690, 1185], [870, 1185], [925, 1125]], 14, "#e3b649");
  if (!rear) { leg(L[0], false); leg(L[2], false); } else leg(L[0], false);
  // the rider
  p.line([[760, 900], [700, 1060], [730, 1170]], ARMOR, 70);
  p.ell(745, 1180, 52, 34, "#1c1626", 10);
  p.poly([[630, 930], [890, 930], [920, 720], [830, 610], [690, 610], [610, 720]], ARMOR);
  p.poly([[700, 650], [820, 650], [860, 760], [770, 900], [680, 780]], ARMOR_HI, 0);
  p.stroke([[650, 905], [880, 905]], 20, "#e3b649");
  p.line([[650, 680], [560, 800], [470, 760]], ARMOR, 52);
  p.stroke([[470, 760], [330, 690]], 8, "#a8782f");
  p.dot(470, 760, 34, "#1c1626");
  const sw = pose === "leap" ? -0.25 : rear ? -0.1 : 0.1 * w;
  const hand: P2 = [1010 + 40 * sw, 380];
  p.line([[880, 660], [990, 500], hand], ARMOR, 56);
  const ba = -1.95 + sw, bl = 380, bx = hand[0] + Math.cos(ba) * bl, by = hand[1] + Math.sin(ba) * bl, nx = -Math.sin(ba), ny = Math.cos(ba);
  p.poly([[hand[0] + nx * 30, hand[1] + ny * 30], [bx + nx * 20, by + ny * 20], [bx + Math.cos(ba) * 60, by + Math.sin(ba) * 60], [bx - nx * 20, by - ny * 20], [hand[0] - nx * 30, hand[1] - ny * 30]], "#cfc7dc");
  p.stroke([[hand[0] + nx * 70, hand[1] + ny * 70], [hand[0] - nx * 70, hand[1] - ny * 70]], 26, "#e3b649");
  p.dot(hand[0], hand[1], 40, "#1c1626");
  for (const [cx, s] of [[640, -1], [880, 1]] as const) {
    p.ell(cx, 650, 90, 62, ARMOR, 14);
    for (let i = 0; i < 3; i++) p.poly([[cx + s * (10 + 30 * i), 600], [cx + s * (30 + 34 * i), 520 - 10 * i], [cx + s * (50 + 30 * i), 605]], "#d8d0e4", 9);
  }
  // helmet: oversized dome, horns, visor with glowing eyes and a toothy grin
  for (const s of [-1, 1]) {
    const hx = 760 + s * 120;
    p.poly([[hx, 470], [hx + s * 120, 420], [hx + s * 170, 300], [hx + s * 150, 170], [hx + s * 220, 300], [hx + s * 200, 450], [hx + s * 80, 530]], HORN);
  }
  p.ell(760, 470, 165, 150, ARMOR);
  p.poly([[640, 420], [700, 380], [820, 380], [880, 420], [860, 440], [660, 440]], ARMOR_HI, 0);
  p.poly([[620, 470], [900, 470], [880, 600], [640, 600]], "#1c1626", 12);
  for (const s of [-1, 1]) p.poly([[760 + s * 30, 500], [760 + s * 120, 478], [760 + s * 110, 520]], EYE, 6);
  const teeth: P2[] = []; for (let i = 0; i <= 8; i++) teeth.push([670 + i * 22.5, 560 + (i % 2 ? 26 : 4)]);
  p.poly([...teeth, [850, 545], [670, 545]], "#f4efe2", 6);
  p.stroke([[760, 330], [760, 380]], 18, ARMOR_HI);
  p.rot = null;
};
/** eye centre on the rider canvas for a pose (the glow card goes there) */
const riderEye = (pose: Pose): P2 => {
  const e: P2 = [760, 500];
  if (pose !== "rear") return e;
  const c = Math.cos(-REAR_A), s = Math.sin(-REAR_A), [cx, cy] = REAR_PIV;
  return [cx + (e[0] - cx) * c - (e[1] - cy) * s, cy + (e[0] - cx) * s + (e[1] - cy) * c];
};
const glowDot = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,240,150,1)"); gr.addColorStop(0.3, "rgba(255,210,90,0.5)"); gr.addColorStop(1, "rgba(255,180,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
const crow = (p: Pen, k: number) => {
  const up = [-40, 0, 30][k];
  p.ol = 0;
  p.stroke([[20, 60 + up], [70, 70], [100, 80], [130, 70], [180, 60 + up]], 14, INK);
  p.ell(100, 82, 18, 12, INK, 0);
};
const darkCloud = (p: Pen) => {
  const g = p.g;
  for (const [x, y, r, c] of [[300, 210, 160, "#7f7894"], [470, 180, 140, "#8b84a0"], [640, 220, 150, "#7f7894"], [200, 250, 110, "#8b84a0"], [780, 260, 100, "#8b84a0"], [460, 260, 190, "#958faa"]] as const) {
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2); g.fill();
  }
};

// ---------------- cameras ----------------
const wide3 = (f: number) => dolly([3, 2.4, 47], [0.6, 12.2, 3], pushK(f, 470, 0.0036), { fov: 40 });
const med3 = (f: number) => dolly([0.9, TOP + 4.7, 17.4], [0, TOP + 3.75, 6.5], pushK(f, B3, 0.003, 0.006, 10), { fov: 40 });
const wide13 = (f: number) => dolly([HX, 1.7, 15], [HX, 3.9, -6], pushK(f, 1938, 0.0028), { fov: 40 });
const insert13 = (f: number) => dolly([HX, PCY, -0.4], [HX, PCY, HZB], pushK(f, B13, 0.0035), { fov: 40 });
const final13 = (f: number) => dolly([HX + 0.15, 1.45, 13.6], [HX + 0.05, 2.45, -2], pushK(f, C13, 0.0022, 0.005, 14) * (f > LAND ? pushK(f, LAND, 0.002) : 1), { fov: 40 });
const cams: Record<number, Key[]> = {
  3: [{ f: 462, s: wide3 }, { f: B3, cut: true, s: med3 }],
  13: [{ f: 1930, s: wide13 }, { f: B13, cut: true, s: insert13 }, { f: C13, cut: true, s: final13 }],
};
const dof: Dof[] = [
  { f: 470, cInf: 0 },
  { f: B3, cInf: 9, focus: () => [0, TOP + GH + 1.6, 6.3] },
  { f: 1938, cInf: 0 },
  { f: B13, cInf: 8, focus: () => [HX, PCY, HZB] },
  { f: C13, cInf: 5, focus: () => [HX - 0.2, 1.6, 1.4] },
];

// ---------------- the scene ----------------
let portcullis: THREE.Group;
let fairy: Fairy;
const camUp = new THREE.Vector3(), camRt = new THREE.Vector3(), camBk = new THREE.Vector3();

const updateA = (u: Frame) => {
  const f = u.f, t = u.t;
  // the grid is 3.6 m tall but the wall above the arch is only 1.3 m: keep its top inside the wall (squeeze it while raised)
  const gy = gateY(f);
  portcullis.position.y = TOP + gy;
  portcullis.scale.y = Math.min(1, (GH - 0.25 - gy) / 3.6);
  // hero on the gatehouse top: glum, looking down; flinches at the slam
  const flinch = f >= SLAM && f < SLAM + 9 ? 1 - (f - SLAM) / 9 : 0;
  const sigh = 0.5 + 0.5 * Math.sin(t * 2.2);
  act(u.out, u.cam, t, WHO.hero, { x: HERO_A[0], y: HERO_A[1] + 0.06 * flinch, z: HERO_A[2],
    expr: f >= SLAM - 1 && f < SLAM + 7 ? "shock" : "stern", look: f < B3 ? 0 : -0.4 + 0.2 * Math.sin(t * 0.9), headTilt: f >= SLAM + 7 ? 7 + 2 * sigh : 4, tilt: -3 * flinch });
  // dust from under the slammed portcullis
  if (f >= SLAM && f < SLAM + 16) for (let i = 0; i < 5; i++) {
    const k = (f - SLAM) / 16;
    u.out.fx.push({ key: `cstDust|${q(k, 16)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: -1.0 + i * 0.5 + (i - 2) * 0.25 * k, y: TOP + 0.25 + 0.25 * k, z: GZ1 + 0.3,
      w: 1.0 + 0.6 * k, h: 1.0 + 0.6 * k, soft: true });
  }
  if (f >= SLAM && f < SLAM + 6) { const k = (f - SLAM) / 6;
    u.out.fx.push({ key: `cstSlam|${q(k, 6)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, k, "#fff3b0", 9, 30, 230), x: 0, y: TOP + 0.4, z: GZ1 + 0.3, w: 2.2, h: 2.2, glow: 1.2 }); }
  // two crows circling the tower top, a brooding cloud behind it
  for (let i = 0; i < 2; i++) {
    const a = t * 0.9 + i * 2.6, r = 4.2 + 0.6 * i, k = Math.floor(f / 3 + i) % 3;
    u.out.fx.push({ key: `cstCrow|${k}`, cw: 200, ch: 140, draw: (p) => crow(p, k), x: r * Math.sin(a), y: TOP + 21 + 1.2 * i + 0.4 * Math.sin(t * 2 + i), z: TWZ + r * Math.cos(a), w: 0.9, h: 0.63 });
  }
  u.out.fx.push({ key: "cstCloud", cw: 1000, ch: 420, draw: darkCloud, x: 4 + 0.03 * (f - 470), y: TOP + 29, z: -14, w: 22, h: 9.2, soft: true });
  fairy.hide();
};

const updateB = (u: Frame) => {
  const f = u.f, t = u.t, out = u.out;
  u.camera.matrixWorld.extractBasis(camRt, camUp, camBk);
  // ---- torches ----
  [HX - 1.6, HX + 1.6].forEach((x, i) => {
    const k = Math.floor(f / 3 + i * 2) % 4;
    out.fx.push({ key: `cstFlame|${k}`, cw: 200, ch: 300, draw: flameTex(k), x, y: 6.85, z: HZB + 0.72, w: 0.42, h: 0.63, glow: 1.6 });
  });
  // ---- the hero ----
  let hx = HX - 0.9, hy = 0, tilt = 0, expr: "stern" | "nervous" | "shock" = "stern", look = 0, sword = 0.3, facing: -1 | 0 | 1 = 0;
  const hz = 0.3;
  if (f >= C13) { expr = "nervous"; look = 0.8; sword = 0.55; facing = 1; }
  if (f >= BURST - 1) { expr = "shock"; tilt = -5; }
  if (f >= LAND - 1) {
    const k = easeOut((f - LAND + 1) / 6);
    hx = lerp(HX - 0.9, HX - 1.4, k); hy = 0.22 * Math.sin(clamp01((f - LAND + 1) / 7) * Math.PI); tilt = lerp(-16, -7, ramp(f, LAND + 3, LAND + 14)); sword = 0.85;
    if (f >= LAND + 16) { expr = "nervous"; tilt = -6 + 1.5 * Math.sin(t * 22); }
  }
  act(out, u.cam, t, WHO.hero, { x: hx, y: hy, z: hz, expr, look, prop: ["sword", sword], tilt, facing, groundY: 0 });
  // ---- the fairy: at his shoulder, then darts behind him ----
  const tremble = f >= BURST ? 0.03 * Math.sin(t * 40) : 0;
  let fx = hx + 0.58, fy = 1.82, fz = hz + 0.25;
  if (f >= LAND) {
    const k = smooth((f - LAND) / 5);
    fx = lerp(fx, hx - 0.48, k); fy = lerp(fy, 1.5 + 0.08 * Math.sin(t * 3), k); fz = lerp(fz, hz - 0.3, k);
  }
  fairy.pose(fx + tremble, fy, fz, t, u.camera, 1, 1);
  // ---- the rider ----
  const gal: Pose = Math.floor(f / 3) % 2 ? "galA" : "galB";
  const push = (pose: Pose, cx: number, cy: number, cz: number, s: number, sx = 1, sy = 1, yaw?: number) => {
    const kq = Math.floor(f / 2) % 4;
    const w = RIDER_W * s * sx, h = RIDER_H * s * sy;
    out.fx.push({ key: `cstRider|${pose}|${kq}`, cw: 1400, ch: 1600, draw: (p) => drawRider(p, pose, kq), x: cx, y: cy, z: cz, w, h, yaw });
    // glowing eyes: an additive dot over the visor
    const [ex, ey] = riderEye(pose), ox = (ex / 1400 - 0.5) * w, oy = (0.5 - ey / 1600) * h;
    const R = yaw === undefined ? camRt : new THREE.Vector3(1, 0, 0), U = yaw === undefined ? camUp : new THREE.Vector3(0, 1, 0);
    const B = yaw === undefined ? camBk.clone().multiplyScalar(0.06) : new THREE.Vector3(0, 0, 0.02);
    out.fx.push({ key: "cstEye", cw: 128, ch: 128, draw: glowDot, x: cx + R.x * ox + U.x * oy + B.x, y: cy + R.y * ox + U.y * oy + B.y, z: cz + R.z * ox + U.z * oy + B.z,
      w: 0.36 * s, h: 0.36 * s, soft: true, add: true, glow: 1.6, yaw });
  };
  const feet = 0.0375; // soles at 3.75 % of the card height from its bottom
  if (f >= GAL0 && f < BURST) {
    const k = ((f - GAL0) / (BURST - GAL0)) ** 1.5, s = lerp(0.07, 0.6, k);
    const fy0 = lerp(4.6, 2.84, k) + 0.06 * s * Math.abs(Math.sin(f * 1.05));
    push(gal, HX + 0.05 * Math.sin(f * 0.5) * s, fy0 + RIDER_H * s * (0.5 - feet), HZB + 0.1, s, 1, 1, 0);
  } else if (f >= BURST && f < LAND) {
    const k = (f - BURST) / (LAND - BURST), e = smooth(k), s = lerp(0.62, 1, easeOut(k * 2));
    const footY = lerp(2.8, 0, e) + 2.4 * Math.sin(Math.PI * k), x = lerp(HX, LAND_X, e), z = lerp(HZB + 0.3, LAND_Z, e);
    push("leap", x, footY + RIDER_H * s * (0.5 - feet), z, s);
    if (k > 0.4) blob(out, x, 0, z, 1.6 * k, 0.6 * k);
  } else if (f >= LAND) {
    const k = f - LAND, sq = k < 10 ? Math.sin((k / 10) * Math.PI) * (1 - k / 10) : 0;
    const pose: Pose = k < 6 ? "land" : k < 19 ? "rear" : gal;
    const sy = 1 - 0.2 * sq, sx = 1 + 0.13 * sq;
    const hop = k >= 19 ? 0.05 * Math.abs(Math.sin(f * 0.9)) : 0;
    push(pose, LAND_X, hop + RIDER_H * sy * (0.5 - feet), LAND_Z, 1, sx, sy);
    blob(out, LAND_X + 0.1, 0, LAND_Z, 2.2);
    if (k < 18) for (let i = 0; i < 4; i++) {
      const kk = k / 18, side = i < 2 ? -1 : 1;
      out.fx.push({ key: `cstHoofDust|${q(kk, 18)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, kk), x: LAND_X + side * (0.5 + 0.9 * kk + 0.3 * (i % 2)), y: 0.3 + 0.3 * kk, z: LAND_Z + 0.4 + 0.2 * (i % 2),
        w: 1.2 + 0.8 * kk, h: 1.2 + 0.8 * kk, soft: true });
    }
  }
  // the burst out of the painting
  if (f >= BURST - 1 && f < BURST + 10) {
    const k = (f - BURST + 1) / 11;
    out.fx.push({ key: `cstBurst|${q(k, 11)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, k, "#ffe9a8", 12, 40, 240), x: HX, y: PCY - 0.3, z: HZB + 0.6, w: 4.2, h: 4.2, glow: 1.8 });
    for (let i = 0; i < 4; i++) out.fx.push({ key: `cstBurstPuff|${q(k, 11)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: HX + (i - 1.5) * (0.5 + 1.2 * k), y: PCY - 1.2 + 0.4 * i * k, z: HZB + 0.9, w: 1.4 + k, h: 1.4 + k, soft: true });
  }
};

export const castle: Scene = {
  name: "castle",
  build(root) {
    const b = new Batch();
    portcullis = buildCastle(root, b);
    buildHall(root, b);
    b.build(root);
    fairy = new Fairy(root, 3);
  },
  update(u) {
    if (u.id === 3) updateA(u); else updateB(u);
  },
  cams,
  dof,
  kicks: [[SLAM, 1.0], [BURST, 0.5], [LAND, 1.2]],
  sun: { 3: { az: 135, el: 40 }, 13: { az: 192, el: 20 } },
  cues: [
    [470, "wind", "lonely meadow wind, a crow caws"],
    [DROP0, "chain_rattle", "portcullis starts to fall"],
    [SLAM, "gate_slam", "iron portcullis slams shut"],
    [1941, "organ", "dramatic organ chord in the hall"],
    [GAL0, "gallop", "hoofbeats growing louder"],
    [BURST, "burst", "the painting bursts"],
    [LAND, "land", "heavy hooves land, neigh"],
  ],
};
