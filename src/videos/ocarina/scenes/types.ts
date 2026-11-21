// Contract between the world shell (world.ts / story.ts) and one scene module (a set + its props + its cast + its cameras).
import * as THREE from "three";
import type { Kit } from "../build";
import type { Stage, CamInfo } from "../cast";
import type { Key, Dof, Light } from "../timeline";

export type Frame = {
  /** shot id (timeline.ts SHOTS) */ id: number;
  /** global frame, seconds */ f: number; t: number;
  /** lens position + its right vector (for billboards, view picking, the painted light side) */ cam: CamInfo;
  camera: THREE.PerspectiveCamera;
  /** push characters (out.places) and effect cards (out.fx) here; the shell draws them */ out: Stage;
  light: Light;
};
export interface Scene {
  name: string;
  /** Build static scenery and the dynamic props into `root`, once. The shell shows `root` only during this scene's shots.
   *  Ground is an endless grass plane at y = 0 (the shell's); add your own paving on top (y = 0.012). */
  build(root: THREE.Group, kit: Kit): void;
  /** Pose the props for frame u.f and stage the cast. MUST be a pure function of u.f (frames render in any order). */
  update(u: Frame): void;
  /** camera keys per shot id; key frames are GLOBAL frames; the first key of a shot must start at or before shot.a - 8 */
  cams: Record<number, Key[]>;
  /** lens blur entries (global frames) */
  dof: Dof[];
  /** impact kicks [global frame, gain 0.5-1.6] */
  kicks?: [number, number][];
  /** per-shot sun override: az = degrees from the lens axis toward screen right (0 = backlight, 180 = behind the lens), el = elevation */
  sun?: Record<number, { az?: number; el?: number }>;
  /** sound cues for the audio pass: [global frame, cue name, free note] */
  cues?: [number, string, string?][];
}
