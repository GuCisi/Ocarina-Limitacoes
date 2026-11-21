// The recurring cast of the ocarina short (all our own designs, generic bean-head people) and one helper, act(), that
// stages a character: picks front / side view, blinks, pushes the lit card and its ground shadow.
import { Outfit, FrontOpts, SideOpts, Expr, Prop, SKINS, townsfolk } from "./toon";
import { person, blob, lidAt, viewOf, Stage, CamInfo, Who } from "./cast";

// ---- outfits (toon.ts Outfit: jacket / pants / boots / hat "hair" | "cap" | "tophat" | "bonnet" | null, dress, build) ----
/** the game's hero: our own generic adventurer (rust-red tunic, dark hair, sword at the hip). NOT a Nintendo character. */
export const HERO: Outfit = { jacket: "#cf5a2e", pants: "#efe4cc", boots: "#6a4630", hat: "hair", hair: "#3b2a22", belt: "#f1e7c9", buttons: "#e8c45a", sword: true, skin: SKINS[1] };
/** the producer: navy blazer, black mop of hair */
export const PRODUCER: Outfit = { jacket: "#34466e", pants: "#2f3340", boots: "#3a2a22", hat: "hair", hair: "#1f1a1c", buttons: "#c9ccd2", skin: SKINS[0] };
/** the designer: mustard sweater, blue cap */
export const DESIGNER: Outfit = { jacket: "#e0a030", pants: "#3b4f7a", boots: "#f4f1ea", hat: "cap", cap: "#3f6fb5", skin: SKINS[2] };
/** three more of the team */
export const DEVS: Outfit[] = [
  { jacket: "#5d8a4a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#6a4a2e", skin: SKINS[1] },
  { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a2226", dress: "#c25a7a", skin: SKINS[0] },
  { jacket: "#7b5ac9", pants: "#40444f", boots: "#3a2a22", hat: "cap", cap: "#d9a441", skin: SKINS[3], build: "stout" },
];
/** forest villagers: ochre, terracotta, cream and blue clothes (they must stand out from the green forest); every third one is a kid */
export const villager = (v: number): Outfit => {
  const coats = ["#d9a441", "#c8642e", "#efe0bf", "#3f6fb5", "#b5483a", "#e0b85a"], caps = ["#b5483a", "#3f6fb5", "#e6b441", "#8a4a6a"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#5a4632", boots: "#4a3426", hat: "cap", cap: caps[v % 4], skin: SKINS[v % 4] };
  if (v % 3 === 2) o.build = "kid";
  if (v % 4 === 1) return { ...o, hat: "hair", hair: ["#6a4a2e", "#c8842e", "#2a2226"][v % 3], dress: coats[(v + 2) % 6] };
  return o;
};
/** town crowd (top hats and bonnets) */
export const crowd = (v: number): Outfit => townsfolk(v);

// ---- ids: who.i seeds the head shape and the blink rhythm; who.okey must be unique per outfit ----
export const WHO = {
  hero: { i: 1, o: HERO, okey: "hero" } as Who,
  producer: { i: 2, o: PRODUCER, okey: "producer" } as Who,
  designer: { i: 3, o: DESIGNER, okey: "designer" } as Who,
  dev: (k: number): Who => ({ i: 4 + (k % 3), o: DEVS[k % 3], okey: `dev${k % 3}` }),
  villager: (k: number): Who => ({ i: 20 + k, o: villager(k), okey: `vil${k % 12}` }),
  crowd: (k: number): Who => ({ i: 60 + k, o: crowd(k), okey: `crowd${k % 6}` }),
};

export type Act = {
  x: number; z: number; /** feet height (default 0) */ y?: number;
  expr?: Expr;
  /** front view body: stand (default) | march (in step, knees up) | stroll | sit (on the ground) | fall (arms + legs flung) */
  mode?: FrontOpts["mode"];
  /** walk cycle phase 0..1 (footfalls at 0 and 0.5) */ phase?: number;
  /** direction the character faces / walks (x, z): picks the front or the side drawing from where the lens is */
  dir?: [number, number];
  /** force a view (overrides dir) */ face?: "front" | "side"; /** side view only: true = facing screen-left */ mirror?: boolean;
  /** front view: raised right arm, -1..1 swings the hand (animate with Math.sin) */ wave?: number;
  /** held prop: ["sword", k] / ["hammer", k] with k 0 raised .. 1 struck; "icecream" */ prop?: Prop;
  /** eyes -1 left .. 1 right; body tilt + head tilt in degrees; knee lift 0-90 for march */ look?: number; tilt?: number; headTilt?: number; lift?: number;
  /** front view: -1 / 1 slides the face to a 3/4 view */ facing?: -1 | 0 | 1;
  /** side view: stand | march | push (arms forward by `pose` 0..1) */ sideMode?: SideOpts["mode"]; pose?: number; stride?: number; stomp?: number;
  scale?: number; /** no ground shadow (in the air, on a table...) */ shadow?: boolean; /** ground height for the shadow when y is airborne */ groundY?: number;
  blink?: number;
};

/** Stage one character this frame. Call once per character from Scene.update(u): act(u.out, u.cam, u.t, WHO.hero, {...}) */
export const act = (out: Stage, cam: CamInfo, t: number, who: Who, a: Act) => {
  const y = a.y ?? 0, sc = a.scale ?? (who.o.build === "kid" ? 0.72 : 1);
  const v = a.dir ? viewOf(cam, a.x, a.z, a.dir[0], a.dir[1]) : { side: false, mirror: false, fs: 1 };
  const view = { side: a.face ? a.face === "side" : v.side, mirror: a.mirror ?? v.mirror };
  const blink = a.blink ?? lidAt(t, who.i);
  const moving = a.mode === "march" || a.mode === "stroll";
  const fo: FrontOpts = { mode: a.mode ?? "stand", phase: a.phase ?? 0, expr: a.expr ?? "neutral", look: a.look ?? 0, blink, lift: a.lift ?? 60, prop: a.prop ?? null,
    tilt: a.tilt ?? 0, headTilt: a.headTilt ?? 0, wave: a.wave, facing: a.facing ?? 0 };
  const so: SideOpts = { mode: a.sideMode ?? (moving ? "march" : "stand"), phase: a.phase ?? 0, expr: a.expr ?? "neutral", blink, stomp: a.stomp ?? 0.6,
    stride: (a.stride ?? 1) * v.fs, pose: a.pose ?? 0 };
  out.places.push(person(cam, who, a.x, y, a.z, view, fo, so, sc));
  if (a.shadow !== false) blob(out, a.x, a.groundY ?? y, a.z, sc);
};
