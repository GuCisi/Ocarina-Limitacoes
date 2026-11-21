// The scene modules of the film, one per set. Each owns its shots (timeline.ts SHOTS[].scene).
import type { Scene } from "./types";
import { plaza } from "./plaza";
import { studio } from "./studio";
import { easel } from "./easel";
import { castle } from "./castle";
import { village } from "./village";
import { field } from "./field";
import { drive } from "./drive";
import { theatre } from "./theatre";

export const SCENES: Scene[] = [plaza, studio, easel, castle, village, field, drive, theatre];
