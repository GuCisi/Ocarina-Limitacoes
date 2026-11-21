// Dumps every scene's sound cues (frame, name, note, scene) plus kicks to out/ocarina/cues.json, by bundling
// src/videos/ocarina/story.ts for node (canvas/document are stubbed: nothing is drawn at import time).
// usage: node scripts/dump_cues.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entry = path.resolve("out/ocarina/_cues_entry.ts");
fs.mkdirSync(path.dirname(entry), { recursive: true });
fs.writeFileSync(entry, `import { CUES, SHOTS, XFADE, FLASH_AT, TOTAL } from "../../src/videos/ocarina/story";
import { SCENES } from "../../src/videos/ocarina/scenes";
export const data = { total: TOTAL, flash: FLASH_AT, xfade: XFADE, shots: SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, scene: s.scene, light: s.light })),
  kicks: SCENES.flatMap((s) => (s.kicks ?? []).map(([f, g]) => ({ f, g, scene: s.name }))).sort((a, b) => a.f - b.f), cues: CUES };
`);
const outfile = path.resolve("out/ocarina/_cues.mjs");
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile, logLevel: "error",
  banner: { js: "const __c = () => ({ width: 2, height: 2, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }), style: {} });\nglobalThis.document = globalThis.document ?? { createElement: __c, createElementNS: __c };\nglobalThis.window = globalThis.window ?? globalThis;" } });
const { data } = await import(pathToFileURL(outfile).href + "?t=" + Date.now());
fs.writeFileSync("out/ocarina/cues.json", JSON.stringify(data, null, 1));
console.log(data.cues.length, "cues,", data.kicks.length, "kicks");
for (const c of data.cues) console.log(String(c.f).padStart(5), c.name.padEnd(14), c.scene.padEnd(8), c.note);
