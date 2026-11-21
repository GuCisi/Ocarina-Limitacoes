# Nada mal para oito fotos - sound cue sheet

All sound is original: synthesized with numpy/scipy (`sfx_gen.py`, `instruments.py`), placed from the one event table in `timeline.py` by `sfx.py` / `music.py`, mixed by `mix.py`. Rebuild everything with `python build.py`.
Voice = `voice/voice.wav`, gain only (no EQ, compression or timing change).

## Files (`out/`)
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz stereo 24-bit, 3398400 samples = 70.800 s |
| `voice.wav` / `music.wav` / `sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Loudness (own BS.1770-4 meter)
- Integrated **-14.0 LUFS**, true peak **-1.2 dBTP**, LRA 1.7 LU; stems: voice -14.1, music -28.5, sfx -31.0 LUFS; master gain +3.73 dB; limiter max GR 1.78 dB (active on 7.23 % of samples)
- Voice on top: momentary (400 ms) voice - (music + sfx) over spoken words: median **13.4 dB**, 10th percentile 10.9 dB (voice - music alone: median 15.4, p10 12.6)
- Worst windows (margin dB, centre s): [(9.6, 2.3), (9.6, 2.31), (9.7, 32.44), (9.7, 2.29), (9.7, 32.45), (9.7, 2.32)]. Last word 'fotos' (ends 69.41 s): voice - bed min 11.8 dB, voice - music min 12.9 dB; the final chord blooms at 69.50 s.
- Music: ducked -5 dB under every word (80-150 ms moves) plus an adaptive voice-keyed dip wherever voice - (music + sfx) would fall under 10.0 dB; section targets (LU vs voice) hook -10.5, build1 -12.0, build2 -11.5, broken -12.0, party -11.0, silence -30.0, tiptoe -12.0, triumph -11.0, castle -11.5, final -13.0, bloom -7.0; SFX events at naive - 6 dB.

ffmpeg cross-check:
```
ffmpeg loudnorm analysis: input_i -14.05 LUFS, input_tp -1.20 dBTP, input_lra 1.80 LU
```

## SFX cues
level = the event's max momentary loudness, LU relative to the voice stem (naive -> applied, applied = naive - 6 for events; beds are integrated). 'mix LUFS' = that loudness in the final mix (voice = -14.1 LUFS integrated).

| time s | frame | cue | what it sounds like | level LU (naive -> applied) | mix LUFS | pan |
|---|---|---|---|---|---|---|
| 0.000 | 0.0 | amb_plaza (bed) | ambience bed: plaza {'crowd': 10} | -27 | -41.1 | +0.00 |
| 0.800 | 24.0 | sparkle | ring of sparkles bursts around the giant cartridge | -9 -> -15 | -29.1 | +0.00 |
| 1.967 | 59.0 | pop | photo 1/8 dives into the cartridge (8-bit pop, ladder step 0) | -10 -> -16 | -30.1 | -0.45 |
| 2.133 | 64.0 | pop | photo 2/8 dives into the cartridge (8-bit pop, ladder step 1) | -10 -> -16 | -29.7 | -0.39 |
| 2.300 | 69.0 | pop | photo 3/8 dives into the cartridge (8-bit pop, ladder step 2) | -9 -> -15 | -29.3 | -0.33 |
| 2.467 | 74.0 | pop | photo 4/8 dives into the cartridge (8-bit pop, ladder step 3) | -9 -> -15 | -28.9 | -0.27 |
| 2.633 | 79.0 | pop | photo 5/8 dives into the cartridge (8-bit pop, ladder step 4) | -8 -> -14 | -28.5 | -0.21 |
| 2.800 | 84.0 | pop | photo 6/8 dives into the cartridge (8-bit pop, ladder step 5) | -8 -> -14 | -28.1 | -0.15 |
| 2.967 | 89.0 | pop | photo 7/8 dives into the cartridge (8-bit pop, ladder step 6) | -8 -> -14 | -27.7 | -0.09 |
| 3.133 | 94.0 | pop | photo 8/8 dives into the cartridge (8-bit pop, ladder step 7) | -7 -> -13 | -27.3 | -0.03 |
| 3.200 | 96.0 | thump | cartridge squashes and bounces once, satisfied | -6 -> -12 | -26.1 | +0.05 |
| 3.600 | 108.0 | amb_street (bed) | ambience bed: street | -30 | -44.1 | +0.00 |
| 3.600 | 108.0 | flash_hit | white flash: reverse-air swell into a soft whoomp-hit | -6 -> -12 | -26.1 | +0.00 |
| 6.500 | 195.0 | pop_up | flat map pops up into the 3D kingdom model | -8 -> -14 | -28.1 | +0.00 |
| 9.033 | 271.0 | whoosh_cut | cut to the console | -16 -> -22 | -36.1 | +0.00 |
| 11.400 | 342.0 | click | ONE photo slides into the cartridge slot: latch click | -10 -> -16 | -30.1 | +0.10 |
| 11.600 | 348.0 | scatter | rest of the photo stack bounces off and scatters on the ground | -9 -> -15 | -29.1 | +0.00 |
| 12.267 | 368.0 | bonk | deadpan punch-in: hollow temple-block bonk | -8 -> -14 | -28.1 | +0.00 |
| 14.767 | 443.0 | slide | the diorama slides off the table edge (443-465) | -10 -> -16 | -30.1 | +0.30 |
| 15.667 | 470.0 | amb_meadow (bed) | ambience bed: meadow | -29 | -43.1 | +0.00 |
| 15.667 | 470.0 | whoosh_cut | hard cut to shot 3 (castle) | -17 -> -23 | -37.1 | +0.00 |
| 15.667 | 470.0 | wind | lonely meadow wind gust + a distant crow caws twice | -13 -> -19 | -33.1 | +0.00 |
| 17.567 | 527.0 | chain_rattle | portcullis chains start to run | -11 -> -17 | -31.1 | +0.00 |
| 17.700 | 531.0 | gate_slam | portcullis rattles down and SLAMS shut | -3 -> -9 | -23.1 | +0.00 |
| 18.467 | 554.0 | amb_village (bed) | ambience bed: village {'crowd': 14, 'crowd_end': 5.633333333333336} | -28 | -42.1 | +0.00 |
| 19.500 | 585.0 | sputter | console on the stump struggles: chuffs, buzz, glitch blips | -12 -> -18 | -32.1 | +0.55 |
| 19.833 | 595.0 | lag_stutter | game drops frames: dry digital tick every 5th frame (595-637) | -20 -> -26 | -40.1 | +0.00 |
| 20.633 | 619.0 | strain | console at its limit: rising whine + spark crackle | -11 -> -17 | -31.1 | +0.55 |
| 21.733 | 652.0 | twinkle | a fairy pops in over villager 1's shoulder | -10 -> -16 | -30.1 | -0.40 |
| 22.100 | 663.0 | twinkle | a fairy pops in over villager 2's shoulder | -10 -> -16 | -30.1 | +0.00 |
| 22.500 | 675.0 | twinkle | a fairy pops in over villager 3's shoulder | -10 -> -16 | -30.1 | +0.40 |
| 23.300 | 699.0 | puffs | villager 1 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | -0.70 |
| 23.400 | 702.0 | puffs | villager 2 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | +0.50 |
| 23.500 | 705.0 | puffs | villager 3 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | -0.20 |
| 23.600 | 708.0 | puffs | villager 4 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | +0.75 |
| 23.700 | 711.0 | puffs | villager 5 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | -0.50 |
| 23.800 | 714.0 | puffs | villager 6 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | +0.20 |
| 23.900 | 717.0 | puffs | villager 7 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | +0.60 |
| 24.000 | 720.0 | puffs | villager 8 vanishes in a little puff (699-720) | -17 -> -23 | -37.1 | -0.10 |
| 24.233 | 727.0 | relief | console stops smoking: calm green blink (two soft chip notes) | -12 -> -18 | -32.1 | +0.55 |
| 24.667 | 740.0 | relief | second calm green blink | -16 -> -22 | -36.1 | +0.55 |
| 25.900 | 777.0 | pop | the villager pops into existence beside the light | -8 -> -14 | -28.1 | +0.15 |
| 26.633 | 799.0 | amb_meadow (bed) | ambience bed: meadow | -29 | -43.1 | +0.00 |
| 26.633 | 799.0 | whoosh_cut | hard cut to shot 5 (field) | -17 -> -23 | -37.1 | +0.00 |
| 27.600 | 828.0 | blip | yellow targeting triangle pops in above the monster | -9 -> -15 | -29.1 | +0.20 |
| 28.333 | 850.0 | amb_street (bed) | ambience bed: street | -31 | -45.1 | +0.00 |
| 28.333 | 850.0 | whoosh_cut | hard cut to shot 6 (easel) | -17 -> -23 | -37.1 | +0.00 |
| 28.433 | 853.0 | scribble | pencil on the drawing board | -15 -> -21 | -35.1 | -0.20 |
| 29.233 | 877.0 | page | sheet flipped to the fairy-girl doodle | -11 -> -17 | -31.1 | -0.15 |
| 30.167 | 905.0 | rattle | console starts to rattle on its stool | -14 -> -20 | -34.1 | +0.45 |
| 30.933 | 928.0 | sputter | console puffs smoke | -13 -> -19 | -33.1 | +0.45 |
| 31.100 | 933.0 | poof | console blows a big smoke puff with sparks | -4 -> -10 | -24.1 | +0.45 |
| 32.400 | 972.0 | page | sheet flipped to the ball of light | -11 -> -17 | -31.1 | -0.15 |
| 33.200 | 996.0 | twinkle | the drawn ball lifts off the paper as the real fairy | -8 -> -14 | -28.1 | -0.10 |
| 33.333 | 1000.0 | blip_ok | console: calm two-note OK blip | -14 -> -20 | -34.1 | +0.45 |
| 33.767 | 1013.0 | amb_meadow (bed) | ambience bed: meadow | -29 | -43.1 | +0.00 |
| 33.767 | 1013.0 | whoosh_cut | hard cut to shot 7 (field) | -17 -> -23 | -37.1 | +0.00 |
| 33.867 | 1016.0 | clunk | triangle drops on the grass | -9 -> -15 | -29.1 | +0.20 |
| 33.967 | 1019.0 | twinkle | the fairy takes the triangle's place | -12 -> -18 | -32.1 | +0.20 |
| 34.867 | 1046.0 | zip | fairy zips a loop monster -> hero -> monster, dotted bell trail | -13 -> -19 | -33.1 | +0.00 |
| 35.767 | 1073.0 | swish | sword swing | -10 -> -16 | -30.1 | -0.10 |
| 35.933 | 1078.0 | bonk | sword hits the rubbery monster: squash bonk, then a wobbly seeing-stars whistle | -6 -> -12 | -26.1 | +0.25 |
| 36.633 | 1099.0 | chime | fairy's tiny bow | -10 -> -16 | -30.1 | +0.10 |
| 37.233 | 1117.0 | amb_yard (bed) | ambience bed: yard | -31 | -45.1 | +0.00 |
| 37.733 | 1132.0 | strain | blueprint paper pulled taut: fibrous creak | -14 -> -20 | -34.1 | +0.00 |
| 38.033 | 1141.0 | rip | blueprint ripped in half (the final snap lands on the frame) | -4 -> -10 | -24.1 | +0.00 |
| 38.767 | 1163.0 | conveyor | belt conveyor hum + roller clicks (1163-1284) | -20 -> -26 | -40.1 | +0.10 |
| 39.367 | 1181.0 | flurry | 500 animation poses flick by along the queue | -12 -> -18 | -32.1 | +0.00 |
| 40.667 | 1220.0 | whirr | very slow disk drive: wobbling motor, scrape per revolution | -14 -> -20 | -34.1 | +0.10 |
| 40.867 | 1226.0 | tick | lazy lamp blink | -18 -> -24 | -38.1 | +0.30 |
| 41.733 | 1252.0 | zip | the snail overtakes the conveyor: comic slide-whistle zip | -12 -> -18 | -32.1 | -0.20 |
| 41.867 | 1256.0 | tick | lazy lamp blink | -18 -> -24 | -38.1 | +0.30 |
| 42.067 | 1262.0 | bump | the queue bunches up | -14 -> -20 | -34.1 | -0.20 |
| 42.333 | 1270.0 | foot_tap | producer taps his foot | -14 -> -20 | -34.1 | +0.35 |
| 42.800 | 1284.0 | whoosh | producer yanks the drive unit out: whoosh + unplug | -9 -> -15 | -29.1 | +0.00 |
| 43.233 | 1297.0 | thud | console drops back down | -8 -> -14 | -28.1 | +0.00 |
| 43.467 | 1304.0 | clang | drive lands in the metal dumpster | -3 -> -9 | -23.1 | +0.35 |
| 44.533 | 1336.0 | pages | calendar pages fly off past the lens (1336-1359) | -9 -> -15 | -29.1 | +0.00 |
| 45.267 | 1358.0 | flutter | the last page see-saws down | -16 -> -22 | -36.1 | +0.20 |
| 45.600 | 1368.0 | amb_street (bed) | ambience bed: street | -31 | -45.1 | +0.00 |
| 45.600 | 1368.0 | whoosh_cut | hard cut to shot 9 (studio) | -17 -> -23 | -37.1 | +0.00 |
| 46.700 | 1401.0 | cheer | the five of them cheer: hops, laughs, a few claps, paper thrown | -10 -> -16 | -30.1 | +0.00 |
| 47.167 | 1415.0 | party_horn | party blower | -9 -> -15 | -29.1 | +0.30 |
| 48.067 | 1442.0 | stop | record-stop garnish (the score itself is varispeed-stopped) | -12 -> -18 | -32.1 | +0.00 |
| 50.167 | 1505.0 | tiny_ding | one last piece of confetti lands on the cartridge in dead silence | -12 -> -18 | -32.1 | +0.05 |
| 50.700 | 1521.0 | amb_square (bed) | ambience bed: square | -29 | -43.1 | +0.00 |
| 50.933 | 1528.0 | crowd_murmur | small audience murmuring before the show | -16 -> -22 | -36.1 | +0.00 |
| 51.633 | 1549.0 | curtain | little stage curtains drawn open | -8 -> -14 | -28.1 | +0.00 |
| 52.200 | 1566.0 | applause | a few claps | -13 -> -19 | -33.1 | +0.00 |
| 53.133 | 1594.0 | footsteps | hero marches on the spot on the hollow stage boards (loop 1594-1733) | -20 -> -26 | -40.1 | +0.00 |
| 54.700 | 1641.0 | carry | stagehand drags a flat: wood scrape + creak | -14 -> -20 | -34.1 | +0.40 |
| 55.133 | 1654.0 | slide | stagehands slide the next flat in | -12 -> -18 | -32.1 | +0.35 |
| 55.833 | 1675.0 | thunk | desert flat set in place | -10 -> -16 | -30.1 | +0.40 |
| 56.067 | 1682.0 | tug | stagehand grips and tugs the forest flat | -14 -> -20 | -34.1 | +0.40 |
| 56.433 | 1693.0 | clack | backdrop swap forest -> desert | -8 -> -14 | -28.1 | +0.00 |
| 56.967 | 1709.0 | clack | backdrop swap desert -> snowy mountain | -8 -> -14 | -28.1 | +0.00 |
| 57.400 | 1722.0 | clack | backdrop swap mountain -> castle | -8 -> -14 | -28.1 | +0.00 |
| 57.633 | 1729.0 | amb_plaza (bed) | ambience bed: plaza {'crowd': 14, 'golden': True} | -27 | -41.1 | +0.00 |
| 58.733 | 1762.0 | whoosh | cloth whipped off the cartridge | -7 -> -13 | -27.1 | +0.00 |
| 58.833 | 1765.0 | cheer | crowd of ~14 cheers, confetti raining | -9 -> -15 | -29.1 | +0.00 |
| 60.167 | 1805.0 | rise | strength-tester puck shoots up (stepped chip run) | -9 -> -15 | -29.1 | +0.45 |
| 60.767 | 1823.0 | ding | puck stops a hair below the bell; the bell quivers | -6 -> -12 | -26.1 | +0.45 |
| 61.767 | 1853.0 | thunk | box 1: puck stops low (short rise, dull thunk, sad droop) | -10 -> -16 | -30.1 | +0.40 |
| 62.267 | 1868.0 | thunk | box 2: puck stops low (short rise, dull thunk, sad droop) | -10 -> -16 | -30.1 | +0.40 |
| 62.700 | 1881.0 | thunk | box 3: puck stops lowest (short rise, dull thunk, sad droop) | -10 -> -16 | -30.1 | +0.40 |
| 63.333 | 1900.0 | amb_street (bed) | ambience bed: street | -31 | -45.1 | +0.00 |
| 63.333 | 1900.0 | whoosh_cut | hard cut to shot 12 (studio) | -17 -> -23 | -37.1 | +0.00 |
| 63.433 | 1903.0 | hm | producer's raised brow: wordless 'hm?' | -12 -> -18 | -32.1 | +0.00 |
| 64.600 | 1938.0 | amb_hall (bed) | ambience bed: hall | -31 | -45.1 | +0.00 |
| 64.600 | 1938.0 | whoosh_cut | hard cut to shot 13 (hall) | -17 -> -23 | -37.1 | +0.00 |
| 65.833 | 1975.0 | gallop | hoofbeats growing louder inside the painting (1975-1996) | -9 -> -15 | -29.1 | +0.00 |
| 66.533 | 1996.0 | burst | the painting bursts | -6 -> -12 | -26.1 | +0.00 |
| 66.967 | 2009.0 | land | horse + armoured rider land in the hall, then a whinny | -2 -> -8 | -22.1 | +0.00 |
| 67.733 | 2032.0 | amb_plaza (bed) | ambience bed: plaza {'crowd': 8, 'golden': True} | -29 | -43.1 | +0.00 |
| 68.733 | 2062.0 | pop | photo 1/8 pops back out and joins the orbit (soft, under 'oito fotos') | -21 -> -27 | -41.1 | -0.60 |
| 68.833 | 2065.0 | pop | photo 2/8 pops back out and joins the orbit (soft, under 'oito fotos') | -21 -> -27 | -40.8 | -0.43 |
| 68.900 | 2067.0 | pop | photo 3/8 pops back out and joins the orbit (soft, under 'oito fotos') | -20 -> -26 | -40.5 | -0.26 |
| 69.000 | 2070.0 | pop | photo 4/8 pops back out and joins the orbit (soft, under 'oito fotos') | -20 -> -26 | -40.2 | -0.09 |
| 69.067 | 2072.0 | pop | photo 5/8 pops back out and joins the orbit (soft, under 'oito fotos') | -20 -> -26 | -39.9 | +0.08 |
| 69.167 | 2075.0 | pop | photo 6/8 pops back out and joins the orbit (soft, under 'oito fotos') | -20 -> -26 | -39.6 | +0.25 |
| 69.233 | 2077.0 | pop | photo 7/8 pops back out and joins the orbit (soft, under 'oito fotos') | -19 -> -25 | -39.3 | +0.42 |
| 69.333 | 2080.0 | pop | photo 8/8 pops back out and joins the orbit (soft, under 'oito fotos') | -19 -> -25 | -39.0 | +0.59 |

## Picture cues (out/ocarina/cues.json) -> sound
| frame | picture cue | served by |
|---|---|---|
| 24 | sparkle | sfx 'sparkle' at f24 |
| 59 | pop | sfx 'pop' at f59 |
| 64 | pop | sfx 'pop' at f64 |
| 69 | pop | sfx 'pop' at f69 |
| 74 | pop | sfx 'pop' at f74 |
| 79 | pop | sfx 'pop' at f79 |
| 84 | pop | sfx 'pop' at f84 |
| 89 | pop | sfx 'pop' at f89 |
| 94 | pop | sfx 'pop' at f94 |
| 96 | thump | sfx 'thump' at f96 |
| 112 | koto | music: koto anchor f112 |
| 195 | pop_up | sfx 'pop_up' at f195 |
| 342 | click | sfx 'click' at f342 |
| 348 | scatter | sfx 'scatter' at f348 |
| 368 | bonk | sfx 'bonk' at f368 |
| 443 | slide | sfx 'slide' at f443 |
| 470 | wind | sfx 'wind' at f470 |
| 527 | chain_rattle | sfx 'chain_rattle' at f527 |
| 531 | gate_slam | sfx 'gate_slam' at f531 |
| 585 | sputter | sfx 'sputter' at f585 |
| 595 | lag_stutter | sfx 'lag_stutter' at f595 |
| 619 | strain | sfx 'strain' at f619 |
| 652 | twinkle | sfx 'twinkle' at f652 |
| 663 | twinkle | sfx 'twinkle' at f663 |
| 675 | twinkle | sfx 'twinkle' at f675 |
| 699 | puffs | sfx 'puffs' at f699 |
| 727 | relief | sfx 'relief' at f727 |
| 777 | pop | sfx 'pop' at f777 |
| 828 | blip | sfx 'blip' at f828 |
| 853 | scribble | sfx 'scribble' at f853 |
| 877 | page | sfx 'page' at f877 |
| 905 | rattle | sfx 'rattle' at f905 |
| 928 | sputter | sfx 'sputter' at f928 |
| 933 | poof | sfx 'poof' at f933 |
| 972 | page | sfx 'page' at f972 |
| 996 | twinkle | sfx 'twinkle' at f996 |
| 1000 | blip_ok | sfx 'blip_ok' at f1000 |
| 1016 | clunk | sfx 'clunk' at f1016 |
| 1019 | twinkle | sfx 'twinkle' at f1019 |
| 1046 | zip | sfx 'zip' at f1046 |
| 1073 | swish | sfx 'swish' at f1073 |
| 1078 | bonk | sfx 'bonk' at f1078 |
| 1099 | chime | sfx 'chime' at f1099 |
| 1132 | strain | sfx 'strain' at f1132 |
| 1141 | rip | sfx 'rip' at f1141 |
| 1163 | conveyor | sfx 'conveyor' at f1163 |
| 1181 | flurry | sfx 'flurry' at f1181 |
| 1220 | whirr | sfx 'whirr' at f1220 |
| 1226 | tick | sfx 'tick' at f1226 |
| 1252 | zip | sfx 'zip' at f1252 |
| 1256 | tick | sfx 'tick' at f1256 |
| 1262 | bump | sfx 'bump' at f1262 |
| 1270 | foot_tap | sfx 'foot_tap' at f1270 |
| 1284 | whoosh | sfx 'whoosh' at f1284 |
| 1297 | thud | sfx 'thud' at f1297 |
| 1304 | clang | sfx 'clang' at f1304 |
| 1336 | pages | sfx 'pages' at f1336 |
| 1358 | flutter | sfx 'flutter' at f1358 |
| 1401 | cheer | sfx 'cheer' at f1401 |
| 1415 | party_horn | sfx 'party_horn' at f1415 |
| 1442 | stop | sfx 'stop' at f1442 |
| 1505 | tiny_ding | sfx 'tiny_ding' at f1505 |
| 1528 | crowd_murmur | sfx 'crowd_murmur' at f1528 |
| 1549 | curtain | sfx 'curtain' at f1549 |
| 1566 | applause | sfx 'applause' at f1566 |
| 1594 | footsteps | sfx 'footsteps' at f1594 |
| 1641 | carry | sfx 'carry' at f1641 |
| 1654 | slide | sfx 'slide' at f1654 |
| 1675 | thunk | sfx 'thunk' at f1675 |
| 1682 | tug | sfx 'tug' at f1682 |
| 1693 | clack | sfx 'clack' at f1693 |
| 1709 | clack | sfx 'clack' at f1709 |
| 1722 | clack | sfx 'clack' at f1722 |
| 1762 | whoosh | sfx 'whoosh' at f1762 |
| 1764 | fanfare | music: fanfare anchor f1764 |
| 1765 | cheer | sfx 'cheer' at f1765 |
| 1805 | rise | sfx 'rise' at f1805 |
| 1823 | ding | sfx 'ding' at f1823 |
| 1853 | thunk | sfx 'thunk' at f1853 |
| 1868 | thunk | sfx 'thunk' at f1868 |
| 1881 | thunk | sfx 'thunk' at f1881 |
| 1903 | hm | sfx 'hm' at f1903 |
| 1941 | organ | music: organ anchor f1941 |
| 1975 | gallop | sfx 'gallop' at f1975 |
| 1996 | burst | sfx 'burst' at f1996 |
| 2009 | land | sfx 'land' at f2009 |
| 2062 | pop | sfx 'pop' at f2062 |
| 2065 | pop | sfx 'pop' at f2065 |
| 2067 | pop | sfx 'pop' at f2067 |
| 2068 | final_chord | music: final anchor f2085 |
| 2070 | pop | sfx 'pop' at f2070 |
| 2072 | pop | sfx 'pop' at f2072 |
| 2075 | pop | sfx 'pop' at f2075 |
| 2077 | pop | sfx 'pop' at f2077 |
| 2080 | pop | sfx 'pop' at f2080 |

Camera kicks (sfx onset within +-1 frame, dB rise over the 60 ms before; bed level):

| frame | kick | onset rise dB | bed dBFS |
|---|---|---|---|
| 96 | 0.8 | +3.9 | -21.4 |
| 195 | 0.5 | +16.1 | -29.0 |
| 368 | 0.5 | +19.8 | -20.0 |
| 531 | 1 | +13.4 | -22.7 |
| 777 | 0.5 | +33.3 | -20.2 |
| 933 | 0.7 | +23.3 | -21.4 |
| 1016 | 0.4 | +19.9 | -20.6 |
| 1078 | 0.7 | +16.4 | -22.6 |
| 1141 | 1 | +3.5 | -26.0 |
| 1297 | 0.4 | +24.2 | -23.3 |
| 1304 | 1.2 | +18.2 | -25.2 |
| 1693 | 0.5 | +25.8 | -22.2 |
| 1709 | 0.5 | +24.8 | -19.5 |
| 1722 | 0.5 | +24.2 | -26.1 |
| 1823 | 0.6 | +5.5 | -25.4 |
| 1996 | 0.5 | +4.2 | -21.8 |
| 2009 | 1.2 | +10.6 | -21.8 |

## Music map (original score, F major, 111-116 bpm)
| time s | frame | music |
|---|---|---|
| 0.00 | 0 | hook: chip-lead motif (4/4 + 3/4), pizz oom-pah, chip hats, glock |
| 3.60 | 108 | tutti F hit ON the white flash: brass stab, chip chord, timpani, kick, cymbal |
| 3.73 | 112 | koto flourish (D-minor pentatonic glissando, a pressed bend) on 'Japao, anos noventa' |
| 7.82 | 235 | clarinet states the curious theme (8 bars), pizzicato oom-pah, soft pad |
| 16.27 | 488 | chip triangle arps join; flute doubles the second half an octave up |
| 24.73 | 742 | chip pulse lead takes the counter-theme, soft kick, everything building |
| 35.29 | 1059 | rising bar (Gm7 - C7), chip snare crescendo into the stumble |
| 37.40 | 1122 | comic stumble: stuttered top note, chromatic tumble down |
| 38.03 | 1141 | lands on the rip: low clarinet 'bwomp' bending down, kick; dry pizz halt (C + F#) at 38.45 |
| 38.65 | 1160 | quiet ticking chip ostinato (C / G eighths) under the 500 animations |
| 40.50 | 1215 | limping slow section: clarinet + chip bass fragments slowing down, each note sagging flat |
| 44.15 | 1324 | droopy chromatic clarinet line down on 'atrasou um ano' |
| 45.58 | 1367 | party polka on 'Por sorte': chip lead motif, glock, oom-pah, kick, hats |
| 48.07 | 1442 | RECORD STOP: the whole score slows to a halt over 0.45 s, then near silence under 'Por azar...' |
| 51.10 | 1533 | tiptoe: staccato pizzicato + clarinet in D minor, chip hat ticks, 111 bpm |
| 56.43 | 1693 | pizz C7 stabs + glock on the three backdrop clacks (56.43 / 56.97 / 57.40), pickup into the release |
| 57.80 | 1734 | golden swell: pad + timpani roll |
| 58.80 | 1764 | FANFARE on the cloth whip: brass + chip, tutti F, timpani, cymbal |
| 60.77 | 1823 | warm theme on flute + clarinet over C (bar lands on the strength-tester ding), cadence to F at 62.9 |
| 64.47 | 1934 | question pizz C -> F# after 'E o plano do castelo?' |
| 64.70 | 1941 | hall organ, D minor (low D pedal) |
| 65.30 | 1959 | dark-comic sting: triplet gallop on low D (chip bass + pizz), chromatic chip climb, timpani |
| 66.97 | 2009 | HIT on the rider's landing: diminished brass stab with a fall, low tuba, timpani, kick, cymbal |
| 68.16 | 2045 | hook motif returns on music box (Bb - C7) |
| 68.93 | 2068 | picture cue final_chord: the soft run-up continues under 'oito fotos' (held >= 9 dB under the voice) |
| 69.50 | 2085 | final F chord blooms right after 'fotos': music box + glock + pad + pizz, chip sparkle arp up, soft timpani |
| 70.60 | 2118 | tail faded to silence |

Section gains applied to the score (dB): hook -4.1, build1 -7.4, build2 -7.8, broken -6.4, party -8.5, silence +0.0, tiptoe -5.5, triumph -8.9, castle -7.2, final -2.9, bloom -4.1.

## Changing cue times
Edit the frame in `timeline.py` (EVENTS for SFX, BEDS for ambience, MUSIC for score anchors) and run `python build.py`.