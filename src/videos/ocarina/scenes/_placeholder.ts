// Stand-in scene (pipeline test + template for a real scene module): a paved disc, a table with the console, a
// cartridge and a photo, the hero and the producer, a fairy, one slow push-in. Each real scene replaces its stand-in.
import * as THREE from "three";
import { Batch, lam } from "../build";
import { cobbleHD } from "../paint";
import { SHOTS, dolly, pushK, wf } from "../timeline";
import { act, WHO } from "../chars";
import { makeConsole, makeCartridge, makePhoto, makeTable, Fairy } from "../props";
import type { Scene } from "./types";

export const placeholder = (name: string, shots: number[]): Scene => {
  let fairy: Fairy;
  const cams: Scene["cams"] = {};
  for (const id of shots) {
    const s = SHOTS[id - 1];
    cams[id] = [{ f: s.a - 8, s: (f) => dolly([2.6, 1.7, 6.5], [0, 1.15, 0], pushK(f, s.a, 0.0025), { fov: 40 }) }];
  }
  return {
    name,
    build(root) {
      const b = new Batch();
      const disc = new THREE.CircleGeometry(7, 48); disc.rotateX(-Math.PI / 2);
      const uv = disc.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.5, uv.getY(i) * 3.5);
      b.add(disc, lam("cobbleHD", () => ({ map: cobbleHD() })), new THREE.Matrix4().makeTranslation(0, 0.012, 0));
      b.build(root);
      const table = makeTable(); table.position.set(0, 0, 0); root.add(table);
      const con = makeConsole(); con.position.set(-0.5, 0.82, 0); root.add(con);
      const cart = makeCartridge(); cart.position.set(0.3, 0.82, 0.1); cart.rotation.y = -0.3; root.add(cart);
      const ph = makePhoto(2); ph.position.set(0.85, 0.82, 0.0); ph.rotation.set(-0.25, 0.2, 0); root.add(ph);
      fairy = new Fairy(root, 1);
    },
    update(u) {
      act(u.out, u.cam, u.t, WHO.hero, { x: -0.75, z: 1.3, expr: "grin", wave: Math.sin(u.t * 8) });
      act(u.out, u.cam, u.t, WHO.producer, { x: 0.7, z: 1.5, expr: "neutral", dir: [-1, 0] });
      fairy.pose(-0.1, 1.75, 1.4, u.t, u.camera);
    },
    cams,
    dof: [],
    cues: [[wf(1, "jogo"), "test", "placeholder cue"]],
  };
};
