// Timeline core of "Nada mal para oito fotos" (N64 x Ocarina short): frame clock, the narration's word frames, the shot
// list, and the camera grammar helpers (same grammar as the bridge short: symmetric smootherstep glides, hard cuts on big
// reframes, creeping push-ins on every hold, 7-frame impact kicks). No scene imports here (scenes import this file).
import { WORDS } from "./words.gen";
export const FPS = 30;
export const TOTAL = 2124; // 70.8 s (voice ends at f2082)
export const D0 = 0; // ground level of every set (m)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** piecewise-linear through [x, y] points */
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
/** 0 -> 1 between frames a and b (smoothstep) */
export const ramp = (f: number, a: number, b: number) => smooth((f - a) / Math.max(1e-6, b - a));
/** overshoot pop 0 -> 1 over n frames starting at f0 (things appearing / landing) */
export const pop = (f: number, f0: number, n = 8) => {
  const u = clamp01((f - f0) / n);
  return u <= 0 ? 0 : 1 + 0.35 * Math.sin(u * Math.PI) * (1 - u) - (1 - u) ** 3;
};

// ---------------- narration ----------------
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const find = (line: number, word: string, nth: number) => {
  const hit = WORDS.filter((w) => w[3] === line && norm(w[0]) === norm(word))[nth];
  if (!hit) throw new Error(`word not found: line ${line} "${word}" #${nth}`);
  return hit;
};
/** first frame of a narration word: wf(line, "word", nth = 0); line = script line 1..13. Accents / case ignored. */
export const wf = (line: number, word: string, nth = 0) => find(line, word, nth)[1];
/** last frame of a narration word */
export const wfEnd = (line: number, word: string, nth = 0) => find(line, word, nth)[2];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type SceneName = "plaza" | "studio" | "easel" | "castle" | "village" | "field" | "drive" | "theatre";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: SceneName; note: string };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 108, light: "day", scene: "plaza", note: "hook: the cartridge and the eight photos" },
  { id: 2, a: 108, b: 470, light: "day", scene: "studio", note: "lines 2-3 + 'Miyamoto, o produtor, ja aceitava o pior'" },
  { id: 3, a: 470, b: 557, light: "day", scene: "castle", note: "'o jogo inteiro dentro de um castelo, sem nunca sair'" },
  { id: 4, a: 557, b: 799, light: "day", scene: "village", note: "line 5: crowded village -> fairies" },
  { id: 5, a: 799, b: 850, light: "day", scene: "field", note: "'A mira das lutas era um triangulo'" },
  { id: 6, a: 850, b: 1013, light: "day", scene: "easel", note: "designer: fairy girl -> ball of light" },
  { id: 7, a: 1013, b: 1120, light: "day", scene: "field", note: "'Nome tecnico: Sistema de Navegacao por Fada. Navi.'" },
  { id: 8, a: 1120, b: 1368, light: "day", scene: "drive", note: "line 7: 500 animations vs the slow disk drive" },
  { id: 9, a: 1368, b: 1525, light: "day", scene: "studio", note: "lines 8-9: team cheers / everything into one cartridge" },
  { id: 10, a: 1525, b: 1733, light: "day", scene: "theatre", note: "line 10: the small stage" },
  { id: 11, a: 1733, b: 1900, light: "golden", scene: "plaza", note: "line 11: release, score 99" },
  { id: 12, a: 1900, b: 1938, light: "day", scene: "studio", note: "'E o plano do castelo?'" },
  { id: 13, a: 1938, b: 2036, light: "golden", scene: "castle", note: "hall: the dark rider leaves the painting" },
  { id: 14, a: 2036, b: TOTAL, light: "golden", scene: "plaza", note: "'Nada mal para oito fotos' + end hold" },
];
/** crossfades (frames) centred on the shot's first frame, at place/time changes; a 4-frame white flash after the hook */
// (crossfades are OFF: a fade stacks a second 2K WebGL canvas and the integrated GPU lost its context mid-render)
export const XFADE: Record<number, number> = {};
export const FLASH_AT = 108;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera grammar ----------------
// Every move is a symmetric smootherstep glide of 18-40 f; a reframe bigger than about half a frame width or 40 % zoom
// is a hard cut on its key frame. Glides are centred on the old key frame (so a glide key starts dur/2 earlier). Holds
// push in 0.15-0.35 %/f (dolly toward the look point, or a fov zoom next to walls), ~0.6 %/f for ~35 f on punch words.
// Rolls of 4-5 deg (0.07-0.09 rad) over >= 18 f on emphasis beats. No hand-held float.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
export const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (8 f soft edges) for the first n frames */
export const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put, for lenses next to walls): tan(fov/2) shrinks by k */
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** a roll-only move on top of an existing framing */
export const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

/** Lens blur entry (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides 0. An entry applies from frame f until the next entry (by f); with dur it ramps from the
 *  previous value. focus = world point (else the camera look point). Keep DOF on ~1/3 of screen time. */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
