# Picture timeline of "Nada mal para oito fotos" (src/videos/ocarina/timeline.ts + SPEC.md), mirrored read-only for the
# sound pass. EVERYTHING that is timed to the picture lives here, in frames (30 fps):
#   SHOTS   - shot list (hard cuts; the shell draws a white flash at f108)
#   EVENTS  - every SFX cue: (frame, cue, note, naive level LU vs voice, pan, params)
#   BEDS    - ambience beds per place: (frame_from, frame_to, bed kind, level LU, params)
#   MUSIC   - the score's anchor frames (sections / hits are composed relative to these)
# If the picture moves a cue by a few frames, edit the frame here and re-run `python build.py`.
import json

FPS = 30
TOTAL = 2124
DUR = TOTAL / FPS            # 70.8 s exactly
fr = lambda f: f / FPS

# id: (first frame, end frame, scene, light)
SHOTS = {
    1: (0, 108, "plaza", "day"), 2: (108, 470, "studio", "day"), 3: (470, 557, "castle", "day"),
    4: (557, 799, "village", "day"), 5: (799, 850, "field", "day"), 6: (850, 1013, "easel", "day"),
    7: (1013, 1120, "field", "day"), 8: (1120, 1368, "drive", "day"), 9: (1368, 1525, "studio", "day"),
    10: (1525, 1733, "theatre", "day"), 11: (1733, 1900, "plaza", "golden"), 12: (1900, 1938, "studio", "day"),
    13: (1938, 2036, "hall", "golden"), 14: (2036, TOTAL, "plaza", "golden"),
}
FLASH = 108
STOP = 1442                  # hard cut "Por azar": record stop, then near silence


def shot_at_frame(f):
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 14


# ------------------------------------------------------------------------------------------------ SFX event table
# (frame, cue, note, naive LU, pan, params). naive = the event's max momentary loudness relative to the voice stem
# before the standard -6 dB SFX rule (sfx.py applies it). pan: -1 left .. +1 right (screen position when obvious).
# params: generator options (see sfx.GEN) - e.g. k = step on the pop ladder, kind = variant, dur = length.
E = []
ev = lambda f, cue, note, lvl, p=0.0, **kw: E.append((f, cue, note, lvl, p, kw))
# Cue names follow the locked picture's cue list (out/ocarina/cues.json); `gen=` picks the synth when one cue name
# covers different sounds (e.g. 'thunk' = a flat set down / a weak strength-tester try).

# shot 1 - plaza hook
ev(24, "sparkle", "ring of sparkles bursts around the giant cartridge", -9, 0.0)
for k in range(8):
    ev(59 + 5 * k, "pop", f"photo {k + 1}/8 dives into the cartridge (8-bit pop, ladder step {k})", -10 + 0.4 * k, -0.45 + 0.06 * k, k=k)
ev(96, "thump", "cartridge squashes and bounces once, satisfied", -6, 0.05)
ev(FLASH, "flash_hit", "white flash: reverse-air swell into a soft whoomp-hit", -6, 0.0)
# shot 2 - studio street (koto 112 = music)
ev(195, "pop_up", "flat map pops up into the 3D kingdom model", -8, 0.0)
ev(271, "whoosh_cut", "cut to the console", -16, 0.0)
ev(342, "click", "ONE photo slides into the cartridge slot: latch click", -10, 0.1)
ev(348, "scatter", "rest of the photo stack bounces off and scatters on the ground", -9, 0.0)
ev(368, "bonk", "deadpan punch-in: hollow temple-block bonk", -8, 0.0, kind="wood")
ev(443, "slide", "the diorama slides off the table edge (443-465)", -10, 0.3, dur=0.75, kind="table")
# shot 3 - castle
ev(470, "wind", "lonely meadow wind gust + a distant crow caws twice", -13, 0.0)
ev(527, "chain_rattle", "portcullis chains start to run", -11, 0.0)
ev(531, "gate_slam", "portcullis rattles down and SLAMS shut", -3, 0.0)
# shot 4 - village
ev(585, "sputter", "console on the stump struggles: chuffs, buzz, glitch blips", -12, 0.55, dur=1.1)
ev(595, "lag_stutter", "game drops frames: dry digital tick every 5th frame (595-637)", -20, 0.0, dur=1.4)
ev(619, "strain", "console at its limit: rising whine + spark crackle", -11, 0.55)
for k, f in enumerate((652, 663, 675)):
    ev(f, "twinkle", f"a fairy pops in over villager {k + 1}'s shoulder", -10, -0.4 + 0.4 * k, k=k)
for k in range(8):
    ev(699 + 3 * k, "puffs", f"villager {k + 1} vanishes in a little puff (699-720)", -17,
       (-0.7, 0.5, -0.2, 0.75, -0.5, 0.2, 0.6, -0.1)[k], gen="puff", size=0.6 + 0.05 * k)
ev(727, "relief", "console stops smoking: calm green blink (two soft chip notes)", -12, 0.55)
ev(740, "relief", "second calm green blink", -16, 0.55)
ev(777, "pop", "the villager pops into existence beside the light", -8, 0.15, k=5)
# shot 5 - field
ev(828, "blip", "yellow targeting triangle pops in above the monster", -9, 0.2)
# shot 6 - easel
ev(853, "scribble", "pencil on the drawing board", -15, -0.2, dur=0.75)
ev(877, "page", "sheet flipped to the fairy-girl doodle", -11, -0.15)
ev(905, "rattle", "console starts to rattle on its stool", -14, 0.45)
ev(928, "sputter", "console puffs smoke", -13, 0.45, dur=0.55)
ev(933, "poof", "console blows a big smoke puff with sparks", -4, 0.45)
ev(972, "page", "sheet flipped to the ball of light", -11, -0.15)
ev(996, "twinkle", "the drawn ball lifts off the paper as the real fairy", -8, -0.1, k=3)
ev(1000, "blip_ok", "console: calm two-note OK blip", -14, 0.45, gen="relief")
# shot 7 - field
ev(1016, "clunk", "triangle drops on the grass", -9, 0.2)
ev(1019, "twinkle", "the fairy takes the triangle's place", -12, 0.2, k=4)
ev(1046, "zip", "fairy zips a loop monster -> hero -> monster, dotted bell trail", -13, 0.0, kind="fairy")
ev(1073, "swish", "sword swing", -10, -0.1)
ev(1078, "bonk", "sword hits the rubbery monster: squash bonk, then a wobbly seeing-stars whistle", -6, 0.25, gen="bonk_stars")
ev(1099, "chime", "fairy's tiny bow", -10, 0.1)
# shot 8 - drive
ev(1132, "strain", "blueprint paper pulled taut: fibrous creak", -14, 0.0, gen="paper_strain")
ev(1141, "rip", "blueprint ripped in half (the final snap lands on the frame)", -4, 0.0)
ev(1163, "conveyor", "belt conveyor hum + roller clicks (1163-1284)", -20, 0.1, dur=4.05)
ev(1181, "flurry", "500 animation poses flick by along the queue", -12, 0.0)
ev(1220, "whirr", "very slow disk drive: wobbling motor, scrape per revolution", -14, 0.1, dur=2.1)
ev(1226, "tick", "lazy lamp blink", -18, 0.3, hi=True)
ev(1252, "zip", "the snail overtakes the conveyor: comic slide-whistle zip", -12, -0.2, kind="snail")
ev(1256, "tick", "lazy lamp blink", -18, 0.3, hi=False)
ev(1262, "bump", "the queue bunches up", -14, -0.2)
ev(1270, "foot_tap", "producer taps his foot", -14, 0.35)
ev(1284, "whoosh", "producer yanks the drive unit out: whoosh + unplug", -9, 0.0, gen="yank")
ev(1297, "thud", "console drops back down", -8, 0.0)
ev(1304, "clang", "drive lands in the metal dumpster", -3, 0.35)
ev(1336, "pages", "calendar pages fly off past the lens (1336-1359)", -9, 0.0)
ev(1358, "flutter", "the last page see-saws down", -16, 0.2, gen="paper_drift")
# shot 9 - studio
ev(1401, "cheer", "the five of them cheer: hops, laughs, a few claps, paper thrown", -10, 0.0, gen="cheer_team")
ev(1415, "party_horn", "party blower", -9, 0.3)
ev(STOP, "stop", "record-stop garnish (the score itself is varispeed-stopped)", -12, 0.0)
ev(1505, "tiny_ding", "one last piece of confetti lands on the cartridge in dead silence", -12, 0.05)
# shot 10 - theatre
ev(1528, "crowd_murmur", "small audience murmuring before the show", -16, 0.0, dur=3.0, voices=6)
ev(1549, "curtain", "little stage curtains drawn open", -8, 0.0)
ev(1566, "applause", "a few claps", -13, 0.0)
ev(1594, "footsteps", "hero marches on the spot on the hollow stage boards (loop 1594-1733)", -20, 0.0, dur=4.6, every=13 / 30)
ev(1641, "carry", "stagehand drags a flat: wood scrape + creak", -14, 0.4, gen="slide", dur=0.5, kind="flat")
ev(1654, "slide", "stagehands slide the next flat in", -12, 0.35, dur=0.75, kind="flat")
ev(1675, "thunk", "desert flat set in place", -10, 0.4, gen="thunk_wood")
ev(1682, "tug", "stagehand grips and tugs the forest flat", -14, 0.4)
for f, what in ((1693, "forest -> desert"), (1709, "desert -> snowy mountain"), (1722, "mountain -> castle")):
    ev(f, "clack", f"backdrop swap {what}", -8, 0.0)
# shot 11 - plaza golden (fanfare 1764 = music)
ev(1762, "whoosh", "cloth whipped off the cartridge", -7, 0.0, gen="cloth_whip")
ev(1765, "cheer", "crowd of ~14 cheers, confetti raining", -9, 0.0, gen="cheer_crowd", dur=3.2)
ev(1805, "rise", "strength-tester puck shoots up (stepped chip run)", -9, 0.45)
ev(1823, "ding", "puck stops a hair below the bell; the bell quivers", -6, 0.45)
for f, what in ((1853, "box 1: puck stops low"), (1868, "box 2: puck stops low"), (1881, "box 3: puck stops lowest")):
    ev(f, "thunk", f"{what} (short rise, dull thunk, sad droop)", -10, 0.4, gen="puck")
# shot 12 - studio close-up
ev(1903, "hm", "producer's raised brow: wordless 'hm?'", -12, 0.0)
# shot 13 - hall (hall reverb; organ 1941 = music)
ev(1975, "gallop", "hoofbeats growing louder inside the painting (1975-1996)", -9, 0.0, dur=0.7)
ev(1996, "burst", "the painting bursts", -6, 0.0)
ev(2009, "land", "horse + armoured rider land in the hall, then a whinny", -2, 0.0)
# shot 14 - plaza end (final_chord = music)
for k, f in enumerate((2062, 2065, 2067, 2070, 2072, 2075, 2077, 2080)):
    ev(f, "pop", f"photo {k + 1}/8 pops back out and joins the orbit (soft, under 'oito fotos')", -21 + 0.3 * k, -0.6 + 0.17 * k, k=7 - k)

# hard-cut whooshes (subtle air on every HARD scene change; f108 = flash, f1442 = record stop; the crossfaded shot
# changes 4, 8, 10, 11, 14 get no whoosh - a dissolve should not swish)
XFADE = {4: 6, 8: 6, 10: 8, 11: 8, 14: 8}
for f in (470, 799, 850, 1013, 1368, 1900, 1938):
    ev(f, "whoosh_cut", f"hard cut to shot {shot_at_frame(f)} ({SHOTS[shot_at_frame(f)][2]})", -17, 0.0)

EVENTS = sorted(E, key=lambda e: (e[0], e[1]))

# ------------------------------------------------------------------------------------------------ ambience beds
# (from frame, to frame, kind, integrated LU vs voice, params). Beds switch on the cuts (short fades).
BEDS = [
    (0, 108, "plaza", -27, dict(crowd=10)),
    (108, 470, "street", -30, {}),
    (470, 557, "meadow", -29, {}),
    (557, 799, "village", -28, dict(crowd=14, crowd_end=24.1)),
    (799, 850, "meadow", -29, {}),
    (850, 1013, "street", -31, {}),
    (1013, 1120, "meadow", -29, {}),
    (1120, 1368, "yard", -31, {}),
    (1368, 1442, "street", -31, {}),
    (1525, 1733, "square", -29, {}),            # the audience murmur is its own cue (crowd_murmur 1528)
    (1733, 1900, "plaza", -27, dict(crowd=14, golden=True)),
    (1900, 1938, "street", -31, {}),
    (1938, 2036, "hall", -31, {}),
    (2036, TOTAL, "plaza", -29, dict(crowd=8, golden=True)),
]
HALL_SHOTS = (13,)           # SFX in these shots go to the big stone-hall reverb

# ------------------------------------------------------------------------------------------------ score anchors
MUSIC = dict(
    flash=FLASH,             # hook ends with a hit on the white flash (3.6 s)
    koto=112,                # "Japao, anos noventa": koto flourish
    build_end=1122,          # curious / building section ends; comic stumble on "Ai o plano quebrou" (37.4 s)
    rip=1141,                # stumble lands on the rip
    halt=1155,               # halt (38.5 s)
    limp=1215,               # limping slow section while the disk is slow (40.5 - 42.5 s)
    limp_end=1275,
    clang=1304,
    late=1323,               # "E o jogo atrasou um ano": droopy line
    party=1371,              # "Por sorte": party polka
    stop=STOP,               # record stop (48.07 s)
    tiptoe=1527,             # clever tiptoe in the theatre (50.9 - 57.7 s)
    clack1=1693, clack2=1709, clack3=1722,
    triumph=1734,            # golden hour release (57.8 s)
    fanfare=1764,            # fanfare (picture cue f1764, 2 frames after the cloth whip)
    ding=1823,
    triumph_end=1899,        # 63.3 s
    hm=1903,
    organ=1941,              # hall organ
    sting=1959,              # dark-comic sting (65.3 s)
    sting_hit=2009,          # rider lands (66.97 s)
    sting_end=2022,          # 67.4 s
    final=2085,              # final chord blooms right AFTER "fotos" (ends 69.41 s): 69.50 s; picture cue final_chord f2068 = run-up
    word_end=2083,           # last word ends (69.41 s): music held >= 9 dB under the voice until 69.45 s
    tail_end=2118,           # music silent by 70.6 s
)
MT = {k: fr(v) for k, v in MUSIC.items()}


def words(path):
    """words.json -> [{'w', 's', 'e', 'line'}]"""
    w = json.load(open(path, encoding="utf-8"))
    return [dict(w=x["w"], s=float(x["t0"]), e=float(x["t1"]), line=x["line"]) for x in w]
