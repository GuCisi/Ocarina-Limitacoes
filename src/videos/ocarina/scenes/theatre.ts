// Scene `theatre` (shot 10, 1525-1733, day): a tiny street-theatre stage on a cobbled square. Red curtains open, the
// hero walks on the spot while the painted backdrop scrolls; stagehands swap the flats backstage; forest -> desert ->
// snowy mountain -> castle on the words. Audience hat silhouettes along the bottom edge.
import * as THREE from "three";
import { Batch, lam, boxGeo, V, house, addVeg } from "../build";
import { cobbleHD, planksHD, ctex } from "../paint";
import { SHOTS, dolly, pushK, ramp, pop, clamp01, lerp, Key, Dof } from "../timeline";
import { act, WHO } from "../chars";
import { flatMat, propMesh } from "../props";
import { q } from "../cast";
import { NOINK } from "../ink";
import { INK } from "../toon";
import type { Scene } from "./types";

const S10 = SHOTS[9];
const DECK = 0.8; // stage floor height
const OPEN_TOP = 3.0; // opening 3 m wide (x -1.5..1.5)
const FRONT_Z = 0.3;              // proscenium front wall
const FLAT_W = 3.8, FLAT_H = 2.7;
const LANES = [-0.9, -1.05, -1.2, -1.35];
const HERO_Z = -0.2;
const F_CURTAIN = 1549, F_SWAP = [1693, 1709, 1722];

// ---------------- painted backdrops (seamless panoramas 2048 x 1024) ----------------
type Ctx = CanvasRenderingContext2D;
const W = 2048, H = 1024;
const wrap = (g: Ctx, fn: () => void) => { for (const dx of [-W, 0, W]) { g.save(); g.translate(dx, 0); fn(); g.restore(); } };
const sky = (g: Ctx, a: string, b: string) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(0.75, b); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
const inked = (g: Ctx, fill: string, path: () => void, lw = 10) => { g.beginPath(); path(); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); };
const hills = (g: Ctx, y: number, amp: number, n: number, col: string, ph = 0) => inked(g, col, () => {
  g.moveTo(-20, H + 20); for (let x = -20; x <= W + 20; x += 16) g.lineTo(x, y - amp * Math.sin((x / W) * Math.PI * 2 * n + ph)); g.lineTo(W + 20, H + 20); g.closePath();
});
const PAINT: ((g: Ctx) => void)[] = [
  (g) => { // forest
    sky(g, "#6fa8e6", "#cfe6f4");
    g.fillStyle = "#fffdf2"; for (const [x, y] of [[300, 180], [1200, 140], [1750, 220]]) { g.beginPath(); g.ellipse(x, y, 120, 46, 0, 0, 7); g.fill(); }
    hills(g, 640, 60, 2, "#7cc25c");
    for (let i = 0; i < 9; i++) { const x = 60 + i * 228, y = 560 + (i % 3) * 30; wrap(g, () => {
      inked(g, "#8a5a3c", () => g.rect(x - 22, y, 44, 220), 8);
      inked(g, ["#3f9a46", "#56b04a", "#2f8a4a"][i % 3], () => { g.arc(x, y - 40, 120, 0, 7); }, 10);
      inked(g, ["#56b04a", "#6cc45a", "#3f9a46"][i % 3], () => { g.arc(x - 60, y + 10, 70, 0, 7); }, 8);
    }); }
    hills(g, 880, 30, 3, "#5aa84a", 1);
    g.fillStyle = "#d9b26a"; g.beginPath(); g.moveTo(0, 990); g.quadraticCurveTo(W / 2, 900, W, 990); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < 14; i++) { const x = 70 + i * 146; wrap(g, () => { g.fillStyle = i % 2 ? "#f2709a" : "#ffd75e"; g.beginPath(); g.arc(x, 930 + (i % 3) * 22, 12, 0, 7); g.fill(); }); }
  },
  (g) => { // desert
    sky(g, "#f2a65a", "#ffe2a8");
    g.fillStyle = "#fff1b8"; g.beginPath(); g.arc(1500, 260, 110, 0, 7); g.fill();
    hills(g, 650, 70, 2, "#e8b46a");
    hills(g, 800, 50, 3, "#f0c47a", 2);
    for (let i = 0; i < 5; i++) { const x = 180 + i * 410, y = 820 - (i % 2) * 80; wrap(g, () => {
      inked(g, "#5aa84a", () => { g.roundRect(x - 30, y - 220, 60, 240, 30); }, 9);
      inked(g, "#5aa84a", () => { g.roundRect(x - 100, y - 160, 50, 110, 25); g.rect(x - 100, y - 80, 80, 36); }, 9);
      inked(g, "#5aa84a", () => { g.roundRect(x + 50, y - 190, 50, 100, 25); g.rect(x + 20, y - 120, 80, 36); }, 9);
    }); }
    for (let i = 0; i < 6; i++) { const x = 100 + i * 340; wrap(g, () => inked(g, "#b8865a", () => g.ellipse(x, 950, 70, 34, 0, Math.PI, 0), 8)); }
    g.fillStyle = "#f6d08a"; g.fillRect(0, 960, W, 64);
  },
  (g) => { // snowy mountains
    sky(g, "#8fb6e8", "#e4eefa");
    for (let i = 0; i < 4; i++) { const x = 250 + i * 512, h = 520 + (i % 2) * 140; wrap(g, () => {
      inked(g, "#7d86b0", () => { g.moveTo(x - 360, 860); g.lineTo(x, 860 - h); g.lineTo(x + 360, 860); g.closePath(); }, 10);
      inked(g, "#ffffff", () => { g.moveTo(x - 120, 860 - h + 170); g.lineTo(x, 860 - h); g.lineTo(x + 120, 860 - h + 170); g.lineTo(x + 50, 860 - h + 140); g.lineTo(x, 860 - h + 190); g.lineTo(x - 50, 860 - h + 140); g.closePath(); }, 8);
    }); }
    hills(g, 880, 30, 2, "#f4f8ff");
    for (let i = 0; i < 10; i++) { const x = 90 + i * 205, y = 900 + (i % 2) * 30; wrap(g, () => {
      inked(g, "#2f7a4f", () => { g.moveTo(x - 60, y); g.lineTo(x, y - 190); g.lineTo(x + 60, y); g.closePath(); }, 8);
      inked(g, "#ffffff", () => { g.moveTo(x - 26, y - 110); g.lineTo(x, y - 190); g.lineTo(x + 26, y - 110); g.closePath(); }, 6);
    }); }
    g.fillStyle = "#ffffff"; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc((i * 337) % W, (i * 151) % 800, 7, 0, 7); g.fill(); }
  },
  (g) => { // castle (our own generic storybook castle)
    sky(g, "#7a6ac2", "#f2b8a0");
    hills(g, 760, 50, 2, "#5a9a5a");
    for (let i = 0; i < 2; i++) { const cx = 512 + i * 1024; wrap(g, () => {
      inked(g, "#c9c2d6", () => g.rect(cx - 220, 420, 440, 360), 10);
      for (const s of [-1, 1]) {
        inked(g, "#b5aecb", () => g.rect(cx + s * 230 - 60, 300, 120, 480), 10);
        inked(g, "#c8574a", () => { g.moveTo(cx + s * 230 - 80, 300); g.lineTo(cx + s * 230, 170); g.lineTo(cx + s * 230 + 80, 300); g.closePath(); }, 9);
        inked(g, "#ffd75e", () => g.rect(cx + s * 230 - 3, 110, 60, 34), 6);
      }
      for (let k = 0; k < 5; k++) inked(g, "#c9c2d6", () => g.rect(cx - 210 + k * 92, 386, 50, 40), 8);
      inked(g, "#5a3b2a", () => { g.moveTo(cx - 60, 780); g.lineTo(cx - 60, 660); g.arc(cx, 660, 60, Math.PI, 0); g.lineTo(cx + 60, 780); g.closePath(); }, 9);
      for (const s of [-1, 1]) inked(g, "#ffe08a", () => g.rect(cx + s * 230 - 18, 400, 36, 54), 6);
    }); }
    hills(g, 900, 30, 3, "#4f8a4a", 1);
  },
];
const flatTex = (k: number) => {
  const t = ctex("flat" + k, W, H, (g) => PAINT[k](g)).clone();
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(0.5, 1); t.needsUpdate = true; return t;
};
const crestTex = () => ctex("crest", 1024, 256, (g) => {
  g.fillStyle = "#2f6a7a"; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#e8c45a"; g.lineWidth = 14; g.strokeRect(14, 14, 996, 228);
  g.fillStyle = "#e8c45a"; g.strokeStyle = INK; g.lineWidth = 8;
  g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5, r = k % 2 ? 34 : 80; g.lineTo(512 + r * Math.sin(a), 128 - r * Math.cos(a)); } g.closePath(); g.fill(); g.stroke();
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(512 + s * (130 + i * 70), 128, 30, 16, s * 0.5, 0, 7); g.fill(); g.stroke(); }
});
const hatTex = (k: number) => (p: import("../toon").Pen) => {
  const c = "#3a2a44";
  p.ell(150, 330, 140, 90, c, 0);                   // shoulders
  p.ell(150, 200, 70, 78, c, 0);                    // head
  if (k % 4 === 0) { p.poly([[90, 150], [210, 150], [200, 30], [100, 30]], c, 0); p.ell(150, 150, 100, 16, c, 0); }  // top hat
  else if (k % 4 === 1) { p.ell(150, 150, 85, 60, c, 0, 180, 360); p.ell(150, 150, 110, 18, c, 0); }                 // bowler
  else if (k % 4 === 2) { p.ell(150, 170, 92, 70, c, 0, 190, 350); p.ell(210, 120, 26, 26, c, 0); }                  // bonnet with bow
  else { p.ell(150, 150, 78, 46, c, 0, 180, 360); p.poly([[150, 140], [250, 160], [150, 165]], c, 0); }               // cap
};
const poolTex = (p: import("../toon").Pen) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,236,180,0.85)"); gr.addColorStop(0.55, "rgba(255,226,160,0.45)"); gr.addColorStop(1, "rgba(255,220,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};

// flat k: position (x along its lane) per frame. 0 forest, 1 desert, 2 mountain, 3 castle
const flatX = (k: number, f: number) => {
  if (k === 0) return -0.3 * ramp(f, 1660, 1688) - 4.1 * ramp(f, F_SWAP[0] - 1, F_SWAP[0] + 5);
  if (k === 1) return -1.9 + 1.0 * ramp(f, 1648, 1675) + 0.9 * ramp(f, F_SWAP[0] - 1, F_SWAP[0] + 4) + 4.4 * ramp(f, F_SWAP[1] - 1, F_SWAP[1] + 5);
  if (k === 2) return -4.4 * ramp(f, F_SWAP[2] - 1, F_SWAP[2] + 5);
  return 0;
};
const scroll = (f: number) => 0.0034 * Math.max(0, f - 1580);

export const theatre: Scene = (() => {
  const flats: { g: THREE.Group; tex: THREE.Texture }[] = [];
  const curtains: THREE.Mesh[] = [];
  const cams: Scene["cams"] = {
    10: [
      { f: S10.a - 8, s: (f) => dolly([0, 1.75, 11.8], [0, 2.35, -0.5], pushK(f, S10.a - 8, 0.0018)) },
      { f: 1592, cut: true, s: (f) => dolly([0.3, 1.85, 7.4], [0, 1.95, -0.4], pushK(f, 1592, 0.0022)) },
      { f: 1639, dur: 24, s: (f) => dolly([-7.5, 2.5, 0.45], [-1.0, 1.75, -0.75], pushK(f, 1651, 0.0018), { fov: 56 }) },
      { f: F_SWAP[0], cut: true, s: (f) => dolly([-0.2, 1.75, 6.6], [0, 1.85, -0.4], pushK(f, F_SWAP[0], 0.0025)) },
    ] as Key[],
  };
  const dof: Dof[] = [
    { f: S10.a, cInf: 0 },
    { f: 1592, cInf: 10, focus: () => [0, DECK + 1.6, HERO_Z] },
    { f: 1639, cInf: 0 },
    { f: F_SWAP[0], cInf: 10, focus: () => [0, DECK + 1.6, HERO_Z] },
  ];
  const cues: [number, string, string?][] = [
    [1528, "crowd_murmur", "small audience"], [F_CURTAIN, "curtain", "curtains swish open"], [1566, "applause", "a few claps"],
    [1594, "footsteps", "hero marches on the spot (loop)"], [1641, "carry", "stagehand drags a flat"], [1654, "slide"], [1675, "thunk", "desert flat set in place"],
    [1682, "tug", "stagehand grips the forest flat"],
    ...F_SWAP.map((f) => [f, "clack", "backdrop swap"] as [number, string, string]),
  ];
  return {
    name: "theatre",
    cams, dof, cues,
    kicks: F_SWAP.map((f) => [f, 0.5] as [number, number]),
    sun: { 10: { az: 140, el: 48 } },
    build(root) {
      const b = new Batch();
      const gnd = new THREE.PlaneGeometry(34, 34); gnd.rotateX(-Math.PI / 2);
      const uv = gnd.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 14);
      b.add(gnd, lam("cobbleHD", () => ({ map: cobbleHD() })), new THREE.Matrix4().makeTranslation(0, 0.012, 2));
      house(b, -5.6, -7.5, 0, 6, 5, 4.6, 1);
      house(b, 1.0, -8.5, 0, 6.5, 5, 5.4, 3);
      house(b, 7.4, -7.5, 0, 6, 5, 4.4, 6);
      house(b, -10.5, 1, Math.PI / 2, 7, 6, 4.8, 4);
      house(b, 11.5, 2.5, -Math.PI / 2, 7, 6, 5.0, 2);
      addVeg(b, "round", -3.4, 0, -4.8, 5.2, 7);
      addVeg(b, "round", 4.6, 0, -4.6, 5.6, 19);
      // stage deck (extends to the right as the backstage wing)
      const wood = lam("stageWood", () => ({ map: planksHD(), color: "#d9b07a" })), red = lam("stageRed", () => ({ color: "#b8343a" }));
      const paintW = lam("stagePaint", () => ({ color: "#cf9f55" })), teal = lam("stageTeal", () => ({ color: "#2f6a7a" }));
      b.add(boxGeo(V(-4.9, 0, -1.8), V(5.6, DECK, 0.45), 1.2), wood);
      b.add(boxGeo(V(-2.72, 0.08, 0.45), V(2.72, DECK - 0.08, 0.5)), red);
      // proscenium front wall: posts + header
      for (const s of [-1, 1]) {
        b.add(boxGeo(V(s > 0 ? 1.5 : -2.15, DECK, FRONT_Z), V(s > 0 ? 2.15 : -1.5, OPEN_TOP, FRONT_Z + 0.14)), paintW);
        b.add(boxGeo(V(s > 0 ? 1.62 : -2.03, DECK + 0.15, FRONT_Z + 0.14), V(s > 0 ? 2.03 : -1.62, OPEN_TOP - 0.15, FRONT_Z + 0.17)), teal);
      }
      b.add(boxGeo(V(-2.3, OPEN_TOP, FRONT_Z), V(2.3, OPEN_TOP + 0.75, FRONT_Z + 0.16)), paintW);
      b.add(boxGeo(V(-2.4, OPEN_TOP + 0.75, FRONT_Z - 0.02), V(2.4, OPEN_TOP + 0.85, FRONT_Z + 0.2)), red);
      // valance
      b.add(boxGeo(V(-1.52, OPEN_TOP - 0.36, FRONT_Z - 0.06), V(1.52, OPEN_TOP, FRONT_Z)), red);
      b.add(boxGeo(V(-1.52, OPEN_TOP - 0.42, FRONT_Z - 0.065), V(1.52, OPEN_TOP - 0.36, FRONT_Z - 0.005)), lam("fringe", () => ({ color: "#e8c45a" })));
      // dark back cloth behind the flats
      b.add(boxGeo(V(-2.7, DECK, -1.75), V(2.7, DECK + 3.0, -1.6)), lam("backCloth", () => ({ color: "#3a2a44" })));
      // a few stacked props in the right wing
      b.add(boxGeo(V(4.3, DECK, -1.7), V(5.1, DECK + 0.6, -1.0), 0.6), lam("crateT", () => ({ map: planksHD(), color: "#e0b880" })));
      b.build(root);
      const crest = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshBasicMaterial({ map: crestTex(), color: 0xe0e0e0 }));
      crest.layers.set(NOINK); crest.position.set(0, OPEN_TOP + 0.38, FRONT_Z + 0.165); root.add(crest);
      // footlights
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.2) }));
        m.position.set(-1.35 + i * 0.45, DECK + 0.04, 0.4); root.add(m);
      }
      // curtains: folded red cloth, origin at the outer edge
      for (const s of [-1, 1]) {
        const geo = new THREE.PlaneGeometry(1.62, OPEN_TOP - DECK - 0.05, 40, 1);
        const p = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.81; p.setX(i, x); p.setZ(i, 0.05 * Math.sin((x / 0.27) * Math.PI * 2)); }
        geo.translate(0, (OPEN_TOP + DECK) / 2 - 0.02, 0); geo.computeVertexNormals();
        const m = propMesh(geo, lam("curtain", () => ({ color: "#c0303a", side: THREE.DoubleSide })), s * 1.52, 0, FRONT_Z - 0.12);
        m.scale.x = -s; curtains.push(m); root.add(m);
      }
      // backdrop flats: thin wooden boards with a painted face
      for (let k = 0; k < 4; k++) {
        const g = new THREE.Group();
        g.add(propMesh(new THREE.BoxGeometry(FLAT_W + 0.06, FLAT_H + 0.06, 0.05), flatMat("#9a6a42"), 0, FLAT_H / 2, -0.03));
        const tex = flatTex(k);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(FLAT_W, FLAT_H), new THREE.MeshBasicMaterial({ map: tex, color: 0xdedede }));
        face.layers.set(NOINK); face.position.set(0, FLAT_H / 2, 0.0); g.add(face);
        g.add(propMesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), flatMat("#7a5236"), FLAT_W / 2 - 0.3, 0.25, -0.3)); // brace foot
        g.position.set(0, DECK, LANES[k]);
        root.add(g); flats.push({ g, tex });
      }
    },
    update(u) {
      const f = u.f, t = u.t, out = u.out;
      // curtains open (slide + bunch at the sides)
      const o = ramp(f, F_CURTAIN, F_CURTAIN + 16), ov = pop(f, F_CURTAIN, 18);
      curtains.forEach((c, i) => { const s = i ? 1 : -1; const k = lerp(1, 0.2, Math.min(1.05, ov) * o + (ov > 1 ? 0 : 0)); c.scale.set(-s * k, 1, 1 + 1.6 * (1 - k)); });
      // flats: scroll + swaps
      const sc = scroll(f);
      flats.forEach((fl, k) => {
        fl.tex.offset.x = sc + k * 0.13;
        const x = flatX(k, f), lift = 0;
        fl.g.position.x = x; fl.g.position.y = DECK + lift;
        const thunk = k === 1 ? pop(f, 1675, 6) : 1;
        fl.g.scale.set(1, f >= 1675 && f < 1683 ? 0.97 + 0.03 * thunk : 1, 1);
        fl.g.visible = Math.abs(x) < 7;
      });
      // the hero marches on the spot (side view, facing screen right)
      const front = u.cam.pos.x < 3;
      const swapHit = F_SWAP.some((s) => f >= s && f < s + 10);
      act(out, u.cam, t, WHO.hero, { x: 0, y: DECK, z: HERO_Z, face: "side", mirror: false, sideMode: f > 1575 ? "march" : "stand", mode: "march", phase: (t * 1.7) % 1,
        expr: f < 1590 ? "smile" : swapHit ? "grin" : f > 1693 ? "smile" : "neutral", stride: front ? 1 : 0.6 });
      out.fx.push({ key: "pool", cw: 256, ch: 256, draw: poolTex, x: 0, y: DECK + 0.015, z: HERO_Z + 0.05, w: 2.2, h: 1.5, flat: true, soft: true, add: true });
      // stagehands, both in the left wing: dev(2) pushes the desert in (back lane), dev(0) pulls the forest out (front lane)
      if (f >= 1630 && f < F_SWAP[0] + 6) {
        const pushing = f >= 1648 && f < 1675, pulling = f >= 1660 && f < 1688;
        act(out, u.cam, t, WHO.dev(2), { x: flatX(1, f) - FLAT_W / 2 - 0.26, y: DECK, z: -1.3, face: "side", mirror: false, sideMode: pushing ? "push" : "stand",
          pose: f >= 1644 ? 1 : 0, phase: pushing ? (t * 1.6) % 1 : 0, stride: 0.6, expr: f >= 1677 ? "grin" : "stern" });
        act(out, u.cam, t, WHO.dev(0), { x: flatX(0, f) - FLAT_W / 2 - 0.26, y: DECK, z: -0.82, face: "side", mirror: false, sideMode: pulling ? "push" : "stand",
          pose: f >= 1644 ? 1 : 0, phase: pulling ? 1 - ((t * 1.3) % 1) : 0, stride: 0.5, expr: pulling ? "stern" : "neutral" });
      }
      // swap whoosh streaks
      for (const s of F_SWAP) if (f >= s && f < s + 6) {
        const k = (f - s) / 6, dir = s === F_SWAP[1] ? 1 : -1;
        out.fx.push({ key: `streak|${q(k, 6)}`, cw: 400, ch: 200, draw: (p) => { for (let i = 0; i < 4; i++) p.stroke([[40 + 60 * k, 40 + i * 40], [360 - 80 * k, 40 + i * 40]], 10 * (1 - k) + 3, "#fff6d8"); },
          x: dir * (1.0 + 1.5 * k), y: DECK + 1.6, z: -0.6, w: 1.6, h: 0.8 });
      }
      // audience: hat silhouettes along the bottom edge
      for (let i = 0; i < 7; i++) {
        const x = -2.5 + i * 0.83 + (i > 2 ? 0.2 : 0), z = 3.4 + (i % 2) * 0.7, bob = 0.03 * Math.sin(t * 3 + i * 1.7) + (f > 1566 && f < 1590 ? 0.06 * Math.abs(Math.sin(t * 12 + i)) : 0);
        out.fx.push({ key: `hat|${i % 4}`, cw: 300, ch: 400, draw: hatTex(i), x, y: 1.05 + (i % 3) * 0.08 + bob, z, w: 0.75, h: 1.0 });
      }
      void clamp01;
    },
  };
})();
