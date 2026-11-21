# "Nada mal para oito fotos" — production spec (scene modules)

A 70.8 s vertical cartoon short (1080x1920, 30 fps, 2124 frames) about how the Nintendo 64's limits shaped the
first 3D Zelda. Style: flat 2D bean-head characters (cards) in a colourful 3D toon world with black ink lines,
gliding cameras, depth of field. Narration is Brazilian Portuguese (already recorded; word frames in `words.gen.ts`).
No captions, labels, letters or digits anywhere in the picture. Every design is OUR OWN: generic hero, generic grey
console, glowing-ball fairy. Never draw Nintendo characters, logos or art.

Project root: `<project root>` (Remotion 4 + three.js + R3F). Skill notes worth reading before you
start: `the claude-animated-shorts SKILL.md` (sections "Look targets", "Camera", "Readability traps").

## How the film is built

- `timeline.ts`: frame clock, `SHOTS` (id, a, b, light, scene), `wf(line, "word", nth)` = first frame of a narration
  word, `wfEnd`, eases (`smooth`, `ramp(f,a,b)`, `pop(f,f0,n)`, `lin`, `glide`), camera helpers (`dolly`, `zoom`,
  `pushK`, `rolled`), types `Key`, `Dof`, `V3`.
- `scenes/types.ts`: the `Scene` contract (build / update / cams / dof / kicks / sun / cues). READ IT.
- `scenes/_placeholder.ts`: a minimal working scene. Start from it.
- `world.ts`: sky, sun, fog, endless lawn at y = 0, far hills, then one group per scene (only the active scene's group
  is visible). It calls `scene.update(u)` every frame and draws the cast you push to `u.out`.
- `chars.ts`: the cast (`WHO.hero`, `WHO.producer`, `WHO.designer`, `WHO.dev(k)`, `WHO.villager(k)`, `WHO.crowd(k)`)
  and `act(u.out, u.cam, u.t, who, {...})` to stage one character per frame (see the `Act` type for every option).
- `props.ts`: `makeConsole()`, `makeCartridge()`, `makePhoto(i)`, `makeTable(w,d,h)`, `class Fairy` (pose every
  frame), helpers `flatMat(color)`, `propMesh(geo, mat, x, y, z)`, `paintedFace(texture, w, h)`.
- `toon.ts`: the 2D drawing kit. `Pen` (poly, ell, line, stroke, arc, dot, band, shadedFill, gradFill, inkRing, clip),
  `bodyFront` / `bodySide` (what `act` draws), effect drawings `fxBurst(p,t)` 500x500, `fxPuff(p,t)` 300x300,
  `fxStars(p,t)` 420x210, `fxCreak(p,t)` 300x300, `fxNote(p,kind)`. `INK = "#241726"` is the character outline colour.
- `cast.ts`: `Stage = { places, fx }`. Push your own drawn cards with
  `u.out.fx.push({ key, cw, ch, draw: (p: Pen) => ..., x, y, z, w, h, rot?, flat?, soft?, glow?, add?, yaw? })`:
  `key` must be unique per distinct drawing (the canvas is cached by key; quantise animated parameters, e.g.
  `q(u, 30)`), `cw x ch` = canvas pixels, `w x h` = metres, card centred at (x, y, z) facing the lens (or `yaw` = fixed
  world yaw, or `flat` = lying on the ground). `soft` = see-through, `add` = additive, `glow > 1` blooms.
  A big custom character (monster, rider) is also an fx card; add a ground shadow with `blob(u.out, x, y, z, scale)`.
- `build.ts`: `Batch` (merge static geometry: `b.add(geo, mat, matrix?)`, `b.build(root)`), `lam(key, () => params)` =
  cached two-tone Lambert material (ALWAYS use `lam` / `flatMat` for world meshes so they get the toon shading),
  `boxGeo(V(min), V(max), tile)`, `house(b, x, z, yaw, w, d, h, styleIndex, y)` = a gabled painted house (front faces
  local +z; it is left out automatically if it blocks one of your lenses), `addVeg(b, kind, x, y, z, h, seed, q)` with
  kind "round" | "fat" | "tall" | "cone" | "bush" | "hedge" = storybook trees and bushes.
- `paint.ts`: painted textures `cobbleHD()`, `grassHD()`, `stoneHD(key, cols, mortar)`, `planksHD()`, `beam()`,
  `roofHD(col)`, `brick()`, `facadeHD(...)`, and `ctex(key, w, h, (g, rnd) => draw)` for your own canvas textures.
- `ink.ts`: `NOINK` layer. Solid 3D meshes are outlined by the ink pass automatically. Anything that is a flat
  see-through card or a glow must be put on `NOINK` (`mesh.layers.set(NOINK)`), or it gets a box outline.
- Unlit faces (pictures, anything that must stay readable): `paintedFace()` / `MeshBasicMaterial`.

Scenes may import from `../timeline`, `../chars`, `../props`, `../cast`, `../toon`, `../build`, `../paint`, `../ink`,
`../shade`, `three`. NEVER import `../story` or `../world` (circular).

## Rules

1. `update(u)` is a PURE function of `u.f` (frames render in any order, in parallel). No state carried between frames,
   no `Math.random()` (use `hh(i, s)` from cast.ts or your own hash).
2. Frame is 9:16. At fov 40 the frame is only `0.41 x distance` wide and `0.73 x distance` tall. Adults are 1.9 m
   tall, kids 1.37 m. Keep every important thing inside the middle 80 % of the width.
3. Camera grammar: hard cuts (`cut: true`) on big reframes; otherwise symmetric glides (`dur` 18-40 f); every hold
   creeps in (`pushK(f, f0, 0.0015-0.003)`), never a static hold of 4+ frames; rolls of at most 0.08 rad on emphasis.
   A shot's first key must start at `shot.a - 8` or earlier (crossfades show a shot a few frames before its start).
   Lens height for people: 1.2-1.8 m, 4-9 m away for medium shots, 2.5-4 m for close-ups.
4. Depth of field (`dof` entries, global frames): close-ups cInf 12-16, medium 10-12, wides 0. Give `focus` = the
   eyes of the main character when the look point is not the subject.
5. Every visual reaction lands 0-3 frames BEFORE its word (`wf(...) - 2`).
6. Props closer than ~2 m to the lens become cut-off blobs: keep the lens path clear. Check every still for objects
   cut by the frame edge, lenses inside geometry, characters floating or sunk, cards intersecting props.
7. Characters are cards facing the lens: never show one from behind (there is no back view). For someone walking
   across use `dir: [dx, dz]` so the side drawing is picked.
8. Colour: muted storybook albedos (cream, ochre, terracotta, warm grey stone, saturated grass and sky). Never pure
   black or pure white world surfaces. Golden-light shots: backlit low sun, peach haze, violet-blue shadows.
9. Sound: list every audible event in `cues` as `[frame, name, note]` using the names from this spec where given.
10. Performance: static geometry through `Batch`; no more than ~40 character cards and ~60 fx cards in view.

## Workflow for a scene agent

You work in your OWN sandbox copy `src/videos/ocarina_<box>/` (a full copy of `src/videos/ocarina/`) and edit ONLY
your scene file(s) `scenes/<name>.ts` there. Do not edit any other file (if you need a helper, write it inside your
scene file; if you find a bug in a shared file, work around it locally and report it). Other scenes in your sandbox
stay as stand-ins.

Render stills of your shots (GPU, ~5 s each after a ~10 s bundle):

    cd <project root>
    ENTRY=src/sandboxes/<box>/index.tsx node scripts/stills.mjs out/ocarina/<box>/s_ 120,200,260 0.5

then LOOK at every still (Read the jpg) and fix what is wrong. Check at least one still per beat plus the frames
right after every cut. Type-check with `npx tsc --noEmit 2>&1 | grep ocarina_<box>` (no output = clean).
Finish with a final message of at most 150 words: files written, frames you checked, what is still weak, core bugs.

## Shot list, beats and cues (frames are global; `wf(line, word)` gives the exact word frames)

Narration lines:
1. O jogo com a maior nota da história cabe em oito fotos do seu celular.
2. Japão, anos noventa. A Nintendo quer o primeiro Zelda em três dimensões: um reino inteiro para explorar.
3. Mas a memória do Nintendo sessenta e quatro equivale a uma foto. Uma.
4. Miyamoto, o produtor, já aceitava o pior: o jogo inteiro dentro de um castelo, sem nunca sair.
5. O console não dava conta de uma vila cheia de gente. Então cada morador ganhou uma fada. De longe, só a luz aparece. O dono, só de perto.
6. A mira das lutas era um triângulo. O designer queria uma fada. Uma menina com asas era demais para o console. Ficou uma bola de luz. Nome técnico: Sistema de Navegação por Fada. Návi.
7. Aí o plano quebrou. O herói tinha quinhentas animações, e o disco novo da Nintendo era lento demais. Adeus, disco. E o jogo atrasou um ano.
8. Por sorte, a equipe comemorou o atraso.
9. Por azar, tudo agora tinha que caber num cartucho.
10. O truque: um teatro de palco pequeno. O herói nunca sai de cena. O cenário é trocado atrás da cortina, pedaço por pedaço.
11. Em noventa e oito, saiu Ocarina of Time. Nota noventa e nove. Até hoje, ninguém passou.
12. E o plano do castelo? Sobrou uma sala: um vilão a cavalo saindo de um quadro.
13. Nada mal para oito fotos.

### Scene `plaza` — shots 1 (0-108, day), 11 (1733-1900, golden), 14 (2036-2124, golden)
Set: a cobbled town square ringed by gabled houses (`house()`), a few trees, bunting; in the middle a stone pedestal
(1.2 m) carrying a GIANT game cartridge (`makeCartridge()` scaled so it stands ~2.4 m tall). Townsfolk crowd.
- Shot 1 (hook). 0-50 "O jogo com a maior nota da história": low 3/4 wide of the giant cartridge, push in; a ring of
  sparkles bursts around it at f24 (cue `sparkle`). 50-95 "cabe em oito fotos do seu celular": a townsperson in the
  foreground (lower left, medium size) holds up a phone (small dark rounded slab, glowing screen); eight printed
  photos (`makePhoto(0..7)`, scaled ~2x) stream out of the phone in an arc and dive one by one into the top of the
  cartridge: photo k enters at f = 59 + 5k (cue `pop` x8 at those frames). f96: the cartridge squashes and bounces
  once, satisfied (cue `thump`, kick 0.8). The shot ends under a white flash at f108 (the shell draws the flash).
- Shot 11 (release). 1733-1805 "Em noventa e oito, saiu Ocarina of Time": golden hour; the cartridge is under a cloth
  that is whipped away at `wf(11,"saiu") - 2` = 1762 (cue `whoosh`, then `fanfare`); crowd of ~14 cheers (waves, hops),
  confetti. 1805-1845 "Nota noventa e nove": a fairground strength-tester tower next to the pedestal: the puck
  shoots up from f1805 and stops a hair BELOW the bell at f1823 (cue `rise` 1805, `ding` 1823, kick 0.6); the bell
  quivers. 1845-1900 "Até hoje, ninguém passou": three other generic game boxes (plain coloured boxes with simple
  shapes, no text) try in turn on the same tower: pucks stop much lower (f1853, f1868, cue `thunk` x2); crane up
  to the cartridge's mark near the top.
- Shot 14 (end). 2036-2124 "Nada mal para oito fotos": backlit cartridge on the pedestal; the eight photos pop back
  out of its top and fan into a slow orbit around it (f2062 + 2.5k, cue `pop` flurry, `final_chord` at 2068); the hero,
  the fairy (`Fairy`) and the producer stand beside the pedestal looking up at it, content. Slow crane out, hold to 2124.

### Scene `studio` — shots 2 (108-470), 9 (1368-1525), 12 (1900-1938), all day
Set: a quiet street in 1990s Kyoto, storybook version: the studio is a cream townhouse with big windows; a pink
cherry tree (use `addVeg` round canopies recoloured pink, or your own sphere clusters), a stone lantern, a low
fence. Out front: a long table (`makeTable`) with the KINGDOM MODEL on it: a 1.8 x 0.9 m diorama (green field, a
blue river strip, a village of 5 tiny huts, tiny trees, and at one end a little dark castle on a mound: grey-violet
stone keep with one tall round tower and dark teal cone roofs; the castle is a SEPARATE object that can be lifted).
A second small table carries the console (`makeConsole()`, use it at 1.6x scale so it reads).
Cast: `WHO.producer`, `WHO.designer`, `WHO.dev(0..2)`.
- Shot 2a 108-158 "Japão, anos noventa": establishing wide of the street and the studio, team small at the table
  (cue `koto` 112). 2b 158-227 "A Nintendo quer o primeiro Zelda em três dimensões": medium shot of the team around
  the table; on the table lies a flat paper map; the producer raises an arm with the idea; at `wf(2,"três") - 2` = 195 the
  flat map POPS UP into the 3D kingdom model (scale-y pop, cue `pop_up`, kick 0.5); the team is delighted.
  2c 227-271 "um reino inteiro para explorar": close glide over the miniature kingdom, faces of the team behind.
- Shot 2 continues, line 3. 271-352 "Mas a memória do Nintendo sessenta e quatro equivale a uma foto": cut to the
  console on its table; `WHO.dev(0)` holds a tall stack of printed photos (the whole game) and tries to feed them in;
  at `wf(3,"foto.") - 2` = 342 exactly ONE photo slides into the cartridge slot (cue `click`) and the rest of the stack
  bounces off and scatters on the ground at f348 (cue `scatter`). 352-389 "Uma." (f370): close-up of the console
  with the single photo sticking out, the dev's deadpan face behind it; punch push-in, kick 0.5 at 368 (cue `bonk`).
- Shot 2 continues, line 4a. 389-470 "Miyamoto, o produtor, já aceitava o pior": medium shot of the producer at the
  model table, resigned and calm; from f437 he lifts the little castle off the model and holds it up alone while the
  rest of the diorama slides away off the table edge (f443-465, cue `slide`). (The film then cuts to the castle scene.)
- Shot 9a 1368-1441 "Por sorte, a equipe comemorou o atraso": the five of them cheer: hops, waving arms, laughing,
  thrown paper and confetti (cue `cheer` 1401, `party_horn` 1415). 9b 1441-1525 "Por azar, tudo agora tinha que caber
  num cartucho": hard cut at 1442: everyone frozen mid-cheer staring down at the table, where a single small
  cartridge (`makeCartridge()`, real size 1x) sits next to the big kingdom model; slow push in on the cartridge until
  `wf(9,"cartucho")` = 1499; one last piece of confetti lands on it at f1505 (cue `stop` 1442, `tiny_ding` 1505).
- Shot 12 1900-1938 "E o plano do castelo?": close-up of the producer still holding the little castle in his raised
  hand, looking at it with a raised brow, then at the lens (cue `hm` 1903).

### Scene `easel` — shot 6 (850-1013, day)
Set: a corner beside the studio wall (cream wall, window, a bush): a wooden easel with a big drawing board, a stool
carrying the console (1.6x), a jar of pencils. Cast: `WHO.designer`.
- 6a 850-899 "O designer queria uma fada": the designer draws at the board (cue `scribble` 853); the sheet shows a
  yellow triangle; at `wf(6,"fada") - 6` = 877 he flips the sheet (cue `page`) to a cute fairy girl doodle (round head,
  simple dress, wings, tiny wand; your own drawing, child-like line art). He grins.
- 6b 899-972 "Uma menina com asas era demais para o console": he shows the drawing to the console; the console
  shakes, puffs smoke from f928 (cue `sputter`), and at `wf(6,"demais") - 2` = 933 blows a big smoke puff with sparks,
  red light on (cue `poof`, kick 0.7). His face: nervous, then stern.
- 6c 972-1013 "Ficou uma bola de luz": sheet flips at 972 (cue `page`) to a plain circle with two little wings; from
  f988 the drawn ball starts to glow and lifts off the paper as the real `Fairy` (pose it; cue `twinkle` 996). He shrugs
  and smiles; the console gives a calm green blink.

### Scene `castle` — shots 3 (470-557, day) and 13 (1938-2036, golden)
Set A (exterior): a lone storybook VILLAIN castle on a low hill in an empty meadow: grey-violet stone (`stoneHD`
with violet-grey colours), a square keep, one tall round tower with a balcony, dark teal cone roofs, purple banners,
an arched gate with a portcullis that can drop. The same look as the little castle of the studio diorama.
Set B (interior hall, far away from set A, e.g. at x = 300): ONE big room: checkered stone floor, red carpet, tall
warm stone walls on three sides (no ceiling needed; keep lenses below the wall tops), a row of identical gold-framed
paintings on the back wall; each painting shows a dark forest road (your own canvas painting).
- Shot 3 470-525 "o jogo inteiro dentro de um castelo": wide of the lonely castle, push in; the hero is a tiny figure
  on the tower balcony. 525-557 "sem nunca sair": medium shot of the hero on the balcony behind the parapet, glum
  (expr "stern", looks down); the portcullis slams shut at `wf(4,"nunca")` = 531 (cut-in or visible below; cue
  `gate_slam`, kick 1.0).
- Shot 13a 1938-1971 "Sobrou uma sala": wide of the hall, hero small in the middle with a raised sword
  (`prop: ["sword", 0.3]`) and the `Fairy` at his shoulder (cue `organ` 1941). 13b 1971-2036 "um vilão a cavalo
  saindo de um quadro": inside the centre painting a tiny dark rider grows as it gallops toward us (f1975-1996, cue
  `gallop` 1975), then LEAPS OUT of the frame as a full-size dark knight on a horse (your own drawing: horned helmet
  silhouette, cape, glowing eyes, dark horse; an fx card ~3 m tall) landing in the hall at `wf(12,"quadro") - 3` = 2009
  (cue `burst` 1996, `land` 2009, kick 1.2); the hero recoils in shock, the fairy darts behind him.

### Scene `village` — shot 4 (557-799, day)
Set: a forest village: 6 round huts with cone roofs (cream walls, mossy green / terracotta roofs, little doors),
tall trees around, a stump in the lower corner carrying the console (1.6x). Cast: `WHO.villager(k)`, `WHO.hero`.
- 4a 557-637 "O console não dava conta de uma vila cheia de gente": wide; 16 villagers crowd the green, waving and
  strolling; the console on the stump shakes and smokes more and more (puffs from f579, sparks 607-631; cue
  `sputter` 585, `strain` 619). From f595 the villagers move in visible low-frame-rate jumps (quantise their
  animation time to every 5th frame) as if the game were lagging.
- 4b 637-694 "Então cada morador ganhou uma fada": medium shot of three villagers; a `Fairy` pops in over each
  one's shoulder in turn at f652, f663, f675 (cue `twinkle` x3); each looks at its fairy and smiles.
- 4c 694-751 "De longe, só a luz aparece": back to the wide framing: the villagers vanish one by one in little puffs
  (f699-722, `fxPuff`), leaving about 16 fairy lights bobbing between the huts; the console stops smoking and gives
  a calm green blink (cue `puffs` 699, `relief` 727).
- 4d 751-799 "O dono, só de perto": the hero walks in from the left (side view) toward one light by a hut; when he is
  within ~2 m, at `wf(5,"perto") - 2` = 777, its villager pops into existence beside the light, waving; the hero jolts
  (shock) (cue `pop` 777, kick 0.5).

### Scene `field` — shots 5 (799-850) and 7 (1013-1120), day
Set: an open meadow with a few rocks, flowers and two or three trees in the distance. Cast: `WHO.hero` with the
sword (`prop: ["sword", k]`), and a monster of your own design as an fx card: a round grumpy purple blob with small
horns and stubby legs, ~1.6 m tall (several expression / squash variants keyed by parameters).
- Shot 5 799-850 "A mira das lutas era um triângulo": hero and monster face off, circling slightly; at
  `wf(6,"um") - 2` = 828 a yellow INVERTED TRIANGLE (a 3D prism, ~0.35 m, slowly spinning, bobbing, unlit bright
  yellow) pops in above the monster's head (cue `blip`); push toward it.
- Shot 7a 1013-1044 "Nome técnico:": same face-off; the triangle drops to the grass with a clunk at f1016 (cue
  `clunk`) and the `Fairy` takes its place above the monster. 7b 1044-1099 "Sistema de Navegação por Fada": the
  fairy flies a loop from the monster to the hero and back, leaving a dotted trail that points at the monster; the hero
  strikes at `wf(6,"Fada",1) - 2` = 1075 (sword swing; cue `swish` 1073, `bonk` 1078, kick 0.7); the monster squashes
  flat and sees stars (`fxStars`). 7c 1099-1120 "Návi.": close-up of the fairy beside the hero's face; he glances at
  it and smiles; the fairy gives a tiny bow on f1099 (cue `chime`).

### Scene `drive` — shot 8 (1120-1368, day)
Set: the studio's back yard: a brick wall, crates, a pin board with a blueprint (a paper drawing of the kingdom, no
text), a wall calendar (blank ruled pages, red binding, no digits). The star prop: the console at 4x scale standing
on its DISK DRIVE (our own generic design: a matching charcoal slab under the console with a wide front slot and a big
square grey disk half out of it), and a conveyor belt leading to the slot. A trash bin.
Cast: `WHO.hero` (many copies), `WHO.producer`, a snail (your own small fx drawing).
- 8a 1120-1163 "Aí o plano quebrou": close-up of the blueprint on the pin board; it rips in half at
  `wf(7,"quebrou") - 2` = 1141 (cue `rip`, kick 1.0).
- 8b 1163-1217 "O herói tinha quinhentas animações": a long queue of 14+ hero copies, each frozen or looping in a
  different pose (run, jump in the air, sword up, falling, sitting, waving...) receding in depth along the conveyor
  toward the drive; the lens trucks along the line (cue `flurry` 1181).
- 8c 1217-1284 "e o disco novo da Nintendo era lento demais": the head of the queue at the drive: the disk turns
  very slowly, a lamp blinks slowly, one hero pose is pulled in at snail pace while the queue behind bunches up; the
  producer taps his foot; at `wf(7,"lento") - 2` = 1252 a snail overtakes the conveyor (cue `whirr` 1220, `tick` loop).
- 8d 1284-1323 "Adeus, disco": the producer yanks the drive unit out (f1284, cue `whoosh`) and tosses it in an arc into
  the trash bin, landing at `wf(7,"disco",1)` = 1304 (cue `clang`, kick 1.2).
- 8e 1323-1368 "E o jogo atrasou um ano": the wall calendar: its pages fly off in a stream past the lens
  (f1336-1359, cue `pages`), the last one drifts down.

### Scene `theatre` — shot 10 (1525-1733, day)
Set: a tiny street-theatre stage (3 m wide, 2.2 m tall opening) of painted wood with red curtains, on a small
cobbled square with houses behind. Painted backdrop flats (your own canvas paintings, no text): forest, desert,
snowy mountain, castle. Cast: `WHO.hero` on stage; two stagehands `WHO.dev(0)`, `WHO.dev(2)`.
- 10a 1525-1592 "O truque: um teatro de palco pequeno": establishing shot of the little stage; the curtains open at
  `wf(10,"teatro") - 2` = 1549 (cue `curtain`); a few hat silhouettes of an audience along the bottom edge (cards).
- 10b 1592-1639 "O herói nunca sai de cena": the hero walks on the spot at centre stage (march cycle) while the forest
  backdrop scrolls sideways behind him.
- 10c 1639-1693 "O cenário é trocado atrás da cortina": the lens glides to a 3/4 side angle that shows backstage: the
  two stagehands carry the next flat in and pull the old one out (cue `slide` 1654, `thunk` 1675).
- 10d 1693-1733 "pedaço por pedaço": front view again: the backdrop swaps on the words: forest -> desert at 1693,
  desert -> snowy mountain at 1709, mountain -> castle at 1722 (cue `clack` x3, kick 0.5 each); the hero keeps
  walking and never leaves.
