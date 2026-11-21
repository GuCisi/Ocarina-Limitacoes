// Story glue: collects the cameras, lens table, kicks and sound cues of every scene module and answers "where is the
// lens at frame f". Everything timeline-related that has no scene dependency lives in timeline.ts (re-exported here).
export * from "./timeline";
import { FPS, SHOTS, Cam, Key, Dof, V3, run } from "./timeline";
import { SCENES } from "./scenes";
import type { Scene } from "./scenes/types";

const byName = new Map<string, Scene>(SCENES.map((s) => [s.name, s]));
export const sceneOf = (id: number): Scene => {
  const sc = byName.get(SHOTS[id - 1].scene);
  if (!sc) throw new Error(`no scene module for shot ${id} (${SHOTS[id - 1].scene})`);
  return sc;
};
export const sunOverride = (id: number) => sceneOf(id).sun?.[id];

const CAMS: Record<number, Key[]> = {};
for (const sc of SCENES) for (const [id, keys] of Object.entries(sc.cams)) {
  const s = SHOTS[Number(id) - 1];
  if (!s || s.scene !== sc.name) throw new Error(`scene ${sc.name} defines cameras for shot ${id}, which is not its shot`);
  CAMS[Number(id)] = keys;
}
for (const s of SHOTS) if (!CAMS[s.id]?.length) throw new Error(`shot ${s.id} (${s.scene}) has no camera keys`);

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg per unit
const KICKS: [number, number][] = SCENES.flatMap((s) => s.kicks ?? []);
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = Math.round(f - f0);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a; // metres at the look distance for 3 px x a
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
const DOF: Dof[] = [{ f: -1, cInf: 0 }, ...SCENES.flatMap((s) => s.dof)].sort((a, b) => a.f - b.f);
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** every sound cue of the film, sorted (scripts/dump_cues.mjs writes them for the audio pass) */
export const CUES = SCENES.flatMap((s) => (s.cues ?? []).map(([f, name, note]) => ({ f, t: +(f / FPS).toFixed(3), name, note: note ?? "", scene: s.name }))).sort((a, b) => a.f - b.f);
