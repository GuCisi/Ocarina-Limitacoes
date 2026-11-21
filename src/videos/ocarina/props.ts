// Shared 3D props of the ocarina short (generic designs, no brand marks, no text): the grey console, the game
// cartridge, phone photos, a wooden table and the fairy (a glowing ball with wings). Each maker returns a THREE.Group
// with its origin at the base centre, front toward +z, sized in metres; scale the group for giant versions.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lam } from "./build";
import { ctex, beam } from "./paint";
import { NOINK } from "./ink";
import { twoTone } from "./shade";

const flat = (color: string) => lam("flat" + color, () => ({ color }));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};
/** unlit painted face (pictures, labels): stays readable in any light; sits 2 mm proud of its backing */
const painted = (tex: THREE.Texture, w: number, h: number) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xe9e9e9 }));
  m.layers.set(NOINK);
  return m;
};

/** the console: charcoal slab 0.62 wide x 0.15 high x 0.46 deep, cartridge slot on top, four ports in front.
 *  userData.slot = top of the slot (local y) where a cartridge base sits. */
export const makeConsole = () => {
  const g = new THREE.Group(), body = flat("#4b4e59"), dark = flat("#26272e"), mid = flat("#3a3c46");
  g.add(mesh(new RoundedBoxGeometry(0.62, 0.13, 0.46, 4, 0.035), body, 0, 0.085, 0));
  g.add(mesh(new RoundedBoxGeometry(0.44, 0.05, 0.3, 3, 0.02), mid, 0, 0.165, -0.04)); // raised deck
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.07), dark, 0, 0.192, -0.06)); // cartridge slot
  // power slider (red) and reset key (grey): flat rectangular keys, not round knobs
  for (const [x, c, w] of [[-0.21, "#d2453c", 0.07], [0.21, "#8d949c", 0.05]] as const) g.add(mesh(new RoundedBoxGeometry(w, 0.022, 0.04, 2, 0.008), flat(c), x, 0.158, 0.11));
  // four controller sockets: small rectangular openings with a lighter rim (round ports read as stove knobs)
  for (let i = 0; i < 4; i++) { const x = -0.165 + i * 0.11; g.add(mesh(new THREE.BoxGeometry(0.066, 0.034, 0.008), flat("#6d717d"), x, 0.06, 0.231)); g.add(mesh(new THREE.BoxGeometry(0.05, 0.02, 0.012), dark, x, 0.06, 0.232)); }
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.012, 0.006), flat("#aeb3bf"), 0, 0.118, 0.231)); // light accent stripe
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.012, 0.006, 0.1), dark, -0.16 + i * 0.03, 0.192, 0.05)); // vents
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), dark, sx * 0.24, 0.01, sz * 0.17));
  g.userData.slot = 0.19;
  return g;
};

const labelTex = () => ctex("cartLabel2", 512, 256, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, "#3f7fd2"); sky.addColorStop(1, "#bfe0f2");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(410, 66, 34, 0, 7); g.fill();
  g.fillStyle = "#4f9a4a"; g.beginPath(); g.moveTo(0, 256); g.quadraticCurveTo(140, 100, 300, 210); g.quadraticCurveTo(420, 150, 512, 205); g.lineTo(512, 256); g.fill();
  g.fillStyle = "#6fbf55"; g.beginPath(); g.moveTo(0, 256); g.quadraticCurveTo(200, 175, 512, 240); g.lineTo(512, 256); g.fill();
  // a small castle on the hill
  g.fillStyle = "#e9e2d2"; g.strokeStyle = "#241726"; g.lineWidth = 5; g.lineJoin = "round";
  for (const [x, y, w, h] of [[150, 104, 26, 66], [208, 104, 26, 66], [170, 126, 44, 44]]) { g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); }
  g.fillStyle = "#b5483a";
  for (const x of [163, 221]) { g.beginPath(); g.moveTo(x - 20, 106); g.lineTo(x, 68); g.lineTo(x + 20, 106); g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = "#f6f1e4"; g.lineWidth = 16; g.strokeRect(8, 8, 496, 240); // cream sticker edge
});
/** game cartridge: grey shell 0.42 wide x 0.3 high x 0.07 thick: a painted sticker (no text) on the upper half, a
 *  ribbed grip band below it, side notches and the dark connector edge at the bottom. */
export const makeCartridge = () => {
  const g = new THREE.Group(), shell = flat("#9ea2ad"), dark = flat("#5d616c"), mid = flat("#868a96");
  g.add(mesh(new RoundedBoxGeometry(0.42, 0.27, 0.07, 4, 0.025), shell, 0, 0.165, 0));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), dark, 0, 0.025, 0)); // connector edge
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.3, 0.009, 0.078), mid, 0, 0.062 + i * 0.019, 0)); // ribbed grip band
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.074, 3), dark); arrow.rotation.set(Math.PI / 2, 0, 0); arrow.position.set(0, 0.283, 0); arrow.castShadow = true; g.add(arrow);
  const l = painted(labelTex(), 0.31, 0.125); l.position.set(0, 0.205, 0.0365); g.add(l);
  return g;
};

type Painter = (g: CanvasRenderingContext2D) => void;
const PHOTOS: Painter[] = [
  (g) => { // beach sunset
    const s = g.createLinearGradient(0, 0, 0, 300); s.addColorStop(0, "#ff9a5a"); s.addColorStop(0.6, "#ffd28a"); g.fillStyle = s; g.fillRect(0, 0, 400, 300);
    g.fillStyle = "#fff1b8"; g.beginPath(); g.arc(200, 170, 50, 0, 7); g.fill(); g.fillStyle = "#2f7fb5"; g.fillRect(0, 180, 400, 60); g.fillStyle = "#e8cf9a"; g.fillRect(0, 240, 400, 60);
  },
  (g) => { // mountain
    g.fillStyle = "#8ec9f2"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#6f7f9a"; g.beginPath(); g.moveTo(40, 300); g.lineTo(190, 70); g.lineTo(340, 300); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(150, 130); g.lineTo(190, 70); g.lineTo(230, 130); g.lineTo(200, 118); g.lineTo(180, 138); g.fill(); g.fillStyle = "#5aa84a"; g.fillRect(0, 250, 400, 50);
  },
  (g) => { // cat
    g.fillStyle = "#f2d9b8"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#e8943a"; g.beginPath(); g.arc(200, 170, 95, 0, 7); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(200 + s * 95, 130); g.lineTo(200 + s * 80, 40); g.lineTo(200 + s * 30, 95); g.fill(); }
    g.fillStyle = "#241726"; for (const s of [-1, 1]) { g.beginPath(); g.arc(200 + s * 36, 160, 11, 0, 7); g.fill(); } g.fillStyle = "#f08a9a"; g.beginPath(); g.arc(200, 195, 9, 0, 7); g.fill();
  },
  (g) => { // pizza
    g.fillStyle = "#7a5a44"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#e8b25a"; g.beginPath(); g.arc(200, 150, 120, 0, 7); g.fill(); g.fillStyle = "#e8d27a"; g.beginPath(); g.arc(200, 150, 100, 0, 7); g.fill();
    g.fillStyle = "#c8402e"; for (const [x, y] of [[160, 110], [240, 120], [200, 180], [150, 190], [250, 190]]) { g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); }
  },
  (g) => { // dog
    g.fillStyle = "#bfe0a8"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#f4f0e6"; g.beginPath(); g.arc(200, 165, 90, 0, 7); g.fill();
    g.fillStyle = "#8a5a3a"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(200 + s * 92, 150, 30, 62, s * 0.3, 0, 7); g.fill(); }
    g.fillStyle = "#241726"; for (const s of [-1, 1]) { g.beginPath(); g.arc(200 + s * 34, 150, 10, 0, 7); g.fill(); } g.beginPath(); g.ellipse(200, 190, 18, 13, 0, 0, 7); g.fill();
  },
  (g) => { // flower
    g.fillStyle = "#9ad0f2"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#4f9a4a"; g.fillRect(190, 150, 20, 150);
    g.fillStyle = "#f2709a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(200 + 55 * Math.cos(i * 1.047), 120 + 55 * Math.sin(i * 1.047), 36, 0, 7); g.fill(); } g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(200, 120, 32, 0, 7); g.fill();
  },
  (g) => { // city at night
    g.fillStyle = "#2a2f5a"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#f4f0c8"; g.beginPath(); g.arc(310, 70, 30, 0, 7); g.fill();
    g.fillStyle = "#14182f"; for (const [x, h] of [[20, 150], [100, 210], [180, 120], [260, 180], [330, 140]]) g.fillRect(x, 300 - h, 62, h);
    g.fillStyle = "#ffd75e"; for (let i = 0; i < 26; i++) g.fillRect(30 + ((i * 71) % 340), 120 + ((i * 47) % 160), 10, 12);
  },
  (g) => { // selfie
    g.fillStyle = "#7fc4b0"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#4a7fd2"; g.beginPath(); g.ellipse(200, 330, 130, 110, 0, 0, 7); g.fill();
    g.fillStyle = "#ffe2c2"; g.beginPath(); g.ellipse(200, 150, 82, 78, 0, 0, 7); g.fill(); g.fillStyle = "#5a3b2a"; g.beginPath(); g.ellipse(200, 95, 86, 44, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#241726"; for (const s of [-1, 1]) { g.beginPath(); g.arc(200 + s * 28, 150, 8, 0, 7); g.fill(); } g.lineWidth = 7; g.strokeStyle = "#241726"; g.beginPath(); g.arc(200, 172, 28, 0.3, 2.84); g.stroke();
  },
];
/** a printed phone photo i = 0..7: white card 0.4 x 0.32 (picture 0.34 x 0.255), 1.5 cm thick. Picture faces +z. */
export const makePhoto = (i: number) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.32, 0.015), flat("#f6f2e8"), 0, 0.16, 0));
  const pic = painted(ctex("photo" + (i % 8), 400, 300, (c) => PHOTOS[i % 8](c)), 0.34, 0.255); pic.position.set(0, 0.172, 0.0085); g.add(pic);
  return g;
};

/** plain wooden table: top w x d at height h */
export const makeTable = (w = 2.2, d = 1.0, h = 0.82) => {
  const g = new THREE.Group(), wood = lam("tableWood", () => ({ map: beam(), color: "#d9b88a" })), leg = flat("#8a5f3c");
  g.add(mesh(new THREE.BoxGeometry(w, 0.07, d), wood, 0, h - 0.035, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08, h - 0.07, 0.08), leg, sx * (w / 2 - 0.1), (h - 0.07) / 2, sz * (d / 2 - 0.1)));
  return g;
};

const glowTex = () => ctex("fairyGlow2", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.22, "rgba(255,255,255,0.7)");
  gr.addColorStop(0.5, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** one small rounded wing pointing to +x (root at the left edge), soft white with a thin plum outline */
const wingTex = () => ctex("fairyWing2", 192, 128, (g) => {
  g.fillStyle = "rgba(255,255,255,0.96)"; g.strokeStyle = "#241726"; g.lineWidth = 7; g.lineJoin = "round";
  g.beginPath(); g.moveTo(8, 70); g.bezierCurveTo(40, 6, 150, 0, 182, 40); g.bezierCurveTo(190, 78, 110, 100, 8, 70); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(10, 78); g.bezierCurveTo(60, 92, 120, 96, 128, 112); g.bezierCurveTo(90, 126, 30, 112, 10, 78); g.closePath(); g.fill(); g.stroke();
});
const ringTex = () => ctex("fairyRing", 128, 128, (g) => {
  g.strokeStyle = "#241726"; g.lineWidth = 9; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
});
/** The fairy: a ball of light (our own design: warm gold-white core with an amber halo and a thin ink ring) with two
 *  small wings spread sideways, fluttering. Not outlined by the world ink; the HDR core blooms. Create once in
 *  Scene.build, call pose() every frame from Scene.update (hide with hide()). */
export class Fairy {
  group = new THREE.Group();
  private core: THREE.Mesh; private halo: THREE.Mesh; private wings: THREE.Mesh[] = [];
  constructor(parent: THREE.Object3D, public seed = 0, tint: [number, number, number] = [1, 0.8, 0.36]) {
    this.core = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 3.9, 2.9), fog: false }));
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.235), new THREE.MeshBasicMaterial({ map: ringTex(), alphaTest: 0.5, fog: false }));
    ring.position.z = -0.002;
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(1.5 * tint[0], 1.5 * tint[1], 1.5 * tint[2]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.halo.position.z = -0.006;
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.21, 0.14); geo.translate(0.105 + 0.07, 0.035, 0);
      const w = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: wingTex(), color: new THREE.Color(1.1, 1.1, 1.16), alphaTest: 0.45, side: THREE.DoubleSide, fog: false }));
      w.scale.x = s; w.userData.s = s; w.position.z = -0.004; this.wings.push(w); this.group.add(w);
    }
    this.group.add(this.halo, ring, this.core);
    this.group.traverse((o) => o.layers.set(NOINK));
    this.group.visible = false;
    parent.add(this.group);
  }
  /** show at (x, y, z) at time t seconds, facing the lens; size 1 = 20 cm ball; glow scales the halo */
  pose(x: number, y: number, z: number, t: number, camera: THREE.Camera, size = 1, glow = 1) {
    const g = this.group;
    g.visible = size > 0.01;
    g.position.set(x, y + 0.035 * size * Math.sin(t * 5.3 + this.seed * 1.7), z);
    g.quaternion.copy(camera.quaternion);
    g.scale.setScalar(size);
    const flap = Math.sin(t * Math.PI * 7.5 + this.seed); // 4-frame wing beat at 30 fps
    for (const w of this.wings) { w.rotation.set(0, 0, w.userData.s * (0.32 + 0.42 * flap)); w.scale.y = 0.8 + 0.2 * Math.abs(flap); }
    this.halo.scale.setScalar(glow * (1 + 0.08 * Math.sin(t * 9 + this.seed)));
  }
  hide() { this.group.visible = false; }
}
export { flat as flatMat, mesh as propMesh, painted as paintedFace, twoTone };
