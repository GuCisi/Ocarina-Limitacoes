# Original light adventure score for "Nada mal para oito fotos", composed and synthesized here (F major, 111-116 bpm;
# storybook clarinet / flute / pizzicato / glockenspiel / music box / soft pad with a sound-chip colour: pulse-wave lead,
# triangle arps, sample-and-hold noise hats). Own melody and harmony; no quotation of any existing game music.
# Sections follow the picture (anchors in timeline.MUSIC):
#   hook (0-3.6, chip lead + pizz, tutti hit on the white flash) | curious build (3.6-37.4: koto flourish, clarinet
#   theme, flute, chip arps, chip lead counter-theme, rising bar) | comic stumble + halt on "Ai o plano quebrou" |
#   ticking ostinato | limping, sagging slow section while the disk is slow | droopy line on "atrasou um ano" |
#   party polka -> RECORD STOP at 48.07 (varispeed of the score itself), near silence | tiptoe in D minor for the
#   theatre (accents on the three backdrop clacks) | warm triumphant fanfare + theme at golden hour | question pizz |
#   hall organ -> dark-comic gallop sting, hit on the landing 66.97 | hook motif returns, final F chord on "oito fotos".
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, make_ir, convolve_st, integrated, hp, lp
import instruments as I
import timeline as T

N = ns(T.DUR)
M = T.MT
F = I.m2f

# chords: (bass midi, mid-register tones)
CH = {
    "F": (41, [60, 65, 69]), "Am": (45, [60, 64, 69]), "Bb": (46, [62, 65, 70]), "C": (48, [60, 64, 67]),
    "Dm": (50, [62, 65, 69]), "G7": (43, [59, 65, 67]), "C7": (48, [58, 64, 67]), "A7": (45, [61, 64, 67]),
    "F7": (41, [60, 63, 69]), "Gm7": (43, [62, 65, 70]),
}

# curious theme (bar, beat, beats, midi) - clarinet
THEME_A = [
    (0, 0, 1, 72), (0, 1, .5, 74), (0, 1.5, .5, 72), (0, 2, 1, 69), (0, 3, 1, 65),
    (1, 0, .5, 64), (1, .5, .5, 65), (1, 1, 1, 69), (1, 2, 1.5, 72), (1, 3.5, .5, 69),
    (2, 0, 1, 70), (2, 1, .5, 74), (2, 1.5, .5, 72), (2, 2, 1, 70), (2, 3, 1, 67),
    (3, 0, 1.5, 72), (3, 1.5, .5, 70), (3, 2, 2, 67),
    (4, 0, 1, 69), (4, 1, .5, 74), (4, 1.5, .5, 76), (4, 2, 1, 77), (4, 3, 1, 74),
    (5, 0, 1, 74), (5, 1, .5, 72), (5, 1.5, .5, 70), (5, 2, 1, 72), (5, 3, 1, 74),
    (6, 0, 1.5, 71), (6, 1.5, .5, 72), (6, 2, 1, 74), (6, 3, 1, 77),
    (7, 0, 2, 76), (7, 2, 1, 74), (7, 3, 1, 70),
]
# counter-theme (chip lead), 5 bars
THEME_B = [
    (0, 0, .5, 72), (0, .5, .5, 77), (0, 1, 1, 81), (0, 2, .5, 79), (0, 2.5, .5, 77), (0, 3, 1, 72),
    (1, 0, 1, 73), (1, 1, .5, 76), (1, 1.5, .5, 79), (1, 2, 1.5, 81), (1, 3.5, .5, 79),
    (2, 0, 1, 77), (2, 1, .5, 76), (2, 1.5, .5, 74), (2, 2, 1, 69), (2, 3, 1, 74),
    (3, 0, 1, 75), (3, 1, .5, 74), (3, 1.5, .5, 72), (3, 2, 2, 69),
    (4, 0, .5, 70), (4, .5, .5, 74), (4, 1, .5, 77), (4, 1.5, .5, 82), (4, 2, 1.5, 81), (4, 3.5, .5, 79),
]
# hook motif (beat, beats, midi) - chip lead + glock
HOOK = [(0, .5, 72), (.5, .5, 77), (1, 1, 81), (2, .5, 79), (2.5, .5, 77), (3, .5, 74), (3.5, .5, 76),
        (4, .5, 77), (4.5, .5, 79), (5, .5, 81), (5.5, .5, 84), (6, .5, 82), (6.5, .5, 79)]

SECTIONS = [  # (name, start, end) for the cue sheet and the mix's level automation
    ("hook", 0.0, 3.75), ("build1", 3.75, 18.6), ("build2", 18.6, M["build_end"]), ("broken", M["build_end"], 45.55),
    ("party", 45.55, M["stop"] + 0.6), ("silence", M["stop"] + 0.6, M["tiptoe"] - 0.05), ("tiptoe", M["tiptoe"] - 0.05, M["triumph"]),
    ("triumph", M["triumph"], 63.4), ("castle", 63.4, M["sting_end"] - 0.1), ("final", M["sting_end"] - 0.1, M["word_end"] + 0.04),
    ("bloom", M["word_end"] + 0.04, T.DUR),
]

R = rng(2068)
LAST_CUES = []


def _r():
    return rng(int(R.integers(1 << 30)))


class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)


SENDS = {"lead": 0.14, "clar": 0.2, "flute": 0.22, "pizz": 0.16, "bass": 0.08, "glock": 0.25, "mbox": 0.28, "pad": 0.25,
         "arp": 0.15, "hat": 0.05, "csnare": 0.08, "kick": 0.04, "koto": 0.25, "brass": 0.2, "timp": 0.2, "cym": 0.15,
         "organ": 0.35, "low": 0.12}
TARGET = {  # balance inside the score (LU, each track on its own active span)
    "lead": -1.5, "clar": -1.0, "flute": -4.0, "pizz": -4.0, "bass": -5.0, "glock": -8.0, "mbox": -4.0, "pad": -9.0,
    "arp": -10.0, "hat": -16.0, "csnare": -12.0, "kick": -9.0, "koto": -2.0, "brass": -2.0, "timp": -5.0, "cym": -13.0,
    "organ": -4.0, "low": -4.0,
}


def grid(t0, bpm):
    q = 60.0 / bpm
    return (lambda beat: t0 + beat * q), q


def oompah(b, tb, q, chord, vel=0.55, beats=(0, 1, 2, 3), stacc=0.22):
    bass, tones = CH[chord]
    for k in beats:
        t = tb + k * q
        if k % 2 == 0:
            m = bass if k == 0 else (bass + 7 if bass + 7 <= 52 else bass - 5)
            b.add("bass", I.pluck(F(m), vel, _r(), dur=0.6, bright=0.4), t, -0.05)
        else:
            for j, m in enumerate(tones):
                b.add("pizz", I.pluck(F(m), vel * 0.55, _r(), dur=stacc, bright=0.6), t + 0.004 * j, 0.3 - 0.25 * j)


def hats(b, tb, q, beats=4, vel=0.3, every=0.5, offset=0.5):
    k = offset
    while k < beats:
        b.add("hat", I.chipnoise(vel * R.uniform(0.85, 1.05), _r(), "hat"), tb + k * q, 0.35)
        k += every


def arp(b, tb, q, chord, vel=0.3, beats=4, up=12, step=0.5):
    tones = [m + up for m in CH[chord][1]]
    seq = tones + [tones[1]]
    k, i = 0.0, 0
    while k < beats - 1e-6:
        b.add("arp", I.chipbass(F(seq[i % 4]), q * step * 0.7, vel, _r()), tb + k * q, -0.35 + 0.7 * ((i % 4) / 3))
        k += step
        i += 1


def line(b, name, notes, at, q, fn, vel, p=0.0, tr=0, **kw):
    for (beat, d, m) in notes:
        t, dur, f = at(beat), d * q, F(m + tr)
        v = vel * R.uniform(0.93, 1.04)
        if fn == "clar":
            x = I.clarinet(f, dur * 0.92, v, _r(), **kw)
        elif fn == "chip":
            x = I.chip(f, dur * 0.85, v, _r(), **kw)
        elif fn == "flute":
            x = I.fife(f, dur * 0.9, v, _r())
        elif fn == "glock":
            x = I.glock(f, v, _r(), dur=1.2)
        elif fn == "mbox":
            x = I.musicbox(f, v, _r())
        elif fn == "pizz":
            x = I.pluck(f, v, _r(), dur=max(0.18, dur), bright=0.7)
        elif fn == "brass":
            x = I.brass(f, dur * 0.92, v, _r(), "horn", scoop=-15)
        b.add(name, x, t, p)


def bars(theme, bar0=0):
    return [((bb + bar0) * 4 + beat, d, m) for (bb, beat, d, m) in theme]


def build():
    b = Band()

    # ============ HOOK 0 - 3.6: 7 beats (4/4 + 3/4) so the tutti hit lands ON the white flash
    q_h = M["flash"] / 7
    at_h = lambda beat: beat * q_h
    line(b, "lead", HOOK, at_h, q_h, "chip", 0.5, 0.15, duty=0.25)
    line(b, "glock", [n for n in HOOK if n[0] in (0, 1, 2, 4, 5, 6)], at_h, q_h, "glock", 0.4, -0.35, tr=12)
    for tb, ch, bt in [(0, "F", (0, 1)), (2, "Dm", (0, 1)), (4, "Bb", (0,)), (5, "C7", (0, 1))]:
        oompah(b, at_h(tb), q_h, ch, 0.55, beats=bt)
    hats(b, 0.0, q_h, beats=7, vel=0.3)
    th = M["flash"]
    for m in (53, 57, 60, 65, 69):
        b.add("brass", I.brass(F(m), 0.35, 0.8, _r(), "stab", scoop=-12), th, (m - 60) / 20)
    for m in (77, 81, 84):
        b.add("lead", I.chip(F(m), 0.3, 0.45, _r(), duty=0.5, decay=0.12), th, (m - 81) / 8)
    b.add("glock", I.glock(F(89), 0.6, _r()), th, -0.3)
    b.add("timp", I.timpani(F(41), 0.85, _r()), th, -0.1)
    b.add("kick", I.kick(0.8, _r()), th)
    b.add("cym", I.cymbal(0.4, _r(), dur=1.6), th)
    b.cues.append((0.0, "hook: chip-lead motif (4/4 + 3/4), pizz oom-pah, chip hats, glock"))
    b.cues.append((th, "tutti F hit ON the white flash: brass stab, chip chord, timpani, kick, cymbal"))

    # ============ CURIOUS BUILD 3.6 - 37.4: 16 bars of 4/4 (113.6 bpm)
    t0, t1 = M["flash"], M["build_end"]
    q = (t1 - t0) / 64
    at, _ = grid(t0, 60 / q)
    bar = lambda k: at(4 * k)
    prog = ["F", "Dm", "F", "Am", "Bb", "C", "Dm", "Bb", "G7", "C7", "F", "A7", "Dm", "F7", "Bb", "Gm7"]
    # koto flourish on "Japao, anos noventa"
    tk = M["koto"]
    for j, m in enumerate([62, 65, 67, 69, 72, 74, 77]):
        b.add("koto", I.koto(F(m), 0.45 + 0.05 * j, _r(), dur=1.2), tk + 0.045 * j, -0.5 + 0.15 * j)
    b.add("koto", I.koto(F(74), 0.8, _r(), dur=1.8, bend=2.0, bend_t=0.25), tk + 0.55, 0.2)
    b.add("koto", I.koto(F(69), 0.6, _r(), dur=1.4), tk + 1.35, 0.1)
    b.add("koto", I.koto(F(72), 0.55, _r(), dur=1.4, bend=-0.0), tk + 1.6, 0.1)
    b.add("koto", I.koto(F(65), 0.6, _r(), dur=1.8), tk + 2.05, -0.1)
    b.cues.append((tk, "koto flourish (D-minor pentatonic glissando, a pressed bend) on 'Japao, anos noventa'"))
    for k, ch in enumerate(prog):
        tb = bar(k)
        dur_bar = 4 * q
        b.add("pad", I.pad([F(m) for m in CH[ch][1]], dur_bar, 0.35 + 0.02 * k, _r(), att=0.35, rel=0.5), tb)
        if k < 2:
            b.add("bass", I.pluck(F(CH[ch][0]), 0.45, _r(), dur=1.2, bright=0.3), tb, -0.05)
            continue
        if k < 15:
            oompah(b, tb, q, ch, 0.45 + 0.012 * k)
        if k >= 4:
            hats(b, tb, q, vel=0.22 + 0.01 * k)
        if k >= 6:
            arp(b, tb, q, ch, 0.22 + 0.01 * k)
        if k >= 10:
            b.add("kick", I.kick(0.5, _r()), tb)
            b.add("kick", I.kick(0.4, _r()), tb + 2 * q)
        if k in (2, 6, 10, 14):
            b.add("glock", I.glock(F(CH[ch][1][2] + 12), 0.4, _r()), tb, -0.35)
    line(b, "clar", bars(THEME_A, 2), at, q, "clar", 0.6, -0.15)
    line(b, "flute", bars(THEME_A[24:], 2), at, q, "flute", 0.38, 0.3, tr=12)
    b.cues.append((bar(2), "clarinet states the curious theme (8 bars), pizzicato oom-pah, soft pad"))
    b.cues.append((bar(6), "chip triangle arps join; flute doubles the second half an octave up"))
    line(b, "lead", bars(THEME_B, 10), at, q, "chip", 0.45, 0.2, duty=0.25)
    for k in range(10, 15):   # clarinet holds chord tones under the chip lead
        b.add("clar", I.clarinet(F(CH[prog[k]][1][1]), 4 * q * 0.95, 0.4, _r()), bar(k), -0.2)
    b.cues.append((bar(10), "chip pulse lead takes the counter-theme, soft kick, everything building"))
    # bar 15: Gm7 -> C7, rising eighths, chip snare 16ths crescendo, all stop at 37.4
    rise = [67, 70, 72, 74, 76, 77, 79, 81]
    for j, m in enumerate(rise):
        b.add("lead", I.chip(F(m), q * 0.4, 0.4 + 0.04 * j, _r(), duty=0.25, vib=0), at(60 + j * 0.5), 0.2)
        b.add("clar", I.clarinet(F(m - 12), q * 0.4, 0.45 + 0.03 * j, _r(), stacc=True), at(60 + j * 0.5), -0.2)
    oompah(b, bar(15), q, "Gm7", 0.6, beats=(0, 1))
    oompah(b, bar(15) + 2 * q, q, "C7", 0.62, beats=(0, 1))
    for j in range(16):
        b.add("csnare", I.chipnoise(0.2 + 0.03 * j, _r(), "snare"), at(60 + j * 0.25), 0.05)
    b.cues.append((bar(15), "rising bar (Gm7 - C7), chip snare crescendo into the stumble"))

    # ============ STUMBLE 37.4 - 38.5 + halt
    ts = t1
    b.add("lead", I.chip(F(84), 0.09, 0.6, _r(), duty=0.25, vib=0), ts)
    b.add("lead", I.chip(F(84), 0.07, 0.5, _r(), duty=0.25, vib=0), ts + 0.13)
    for j, m in enumerate([83, 82, 81, 80, 79, 78, 77, 76]):
        b.add("lead", I.chip(F(m), 0.05, 0.5 - 0.04 * j, _r(), duty=0.25, vib=0), ts + 0.24 + 0.05 * j, 0.2 - 0.05 * j)
        b.add("pizz", I.pluck(F(m - 12), 0.4 - 0.03 * j, _r(), dur=0.12, bright=0.7), ts + 0.26 + 0.06 * j, -0.2)
    trip = M["rip"]
    b.add("low", I.clarinet(F(41), 0.5, 0.8, _r(), bend=-3.0), trip, 0.0)
    b.add("bass", I.pluck(F(29 + 12), 0.8, _r(), dur=0.6, bright=0.3), trip)
    b.add("kick", I.kick(0.7, _r()), trip)
    th_ = M["halt"] - 0.05
    b.add("bass", I.pluck(F(48), 0.5, _r(), dur=0.25), th_, -0.1)
    b.add("pizz", I.pluck(F(54), 0.4, _r(), dur=0.2), th_ + 0.02, 0.2)
    b.cues.append((ts, "comic stumble: stuttered top note, chromatic tumble down"))
    b.cues.append((trip, "lands on the rip: low clarinet 'bwomp' bending down, kick; dry pizz halt (C + F#) at 38.45"))
    # ticking ostinato under "o heroi tinha quinhentas animacoes"
    q2 = 60 / 113.6
    tt0 = M["halt"] + 0.15
    k = 0
    while tt0 + k * q2 / 2 < M["limp"] - 0.1:
        t = tt0 + k * q2 / 2
        b.add("lead", I.chip(F(72 if k % 2 == 0 else 79), 0.06, 0.25, _r(), duty=0.125, vib=0), t, 0.3 if k % 2 else -0.3)
        if k % 4 == 0:
            b.add("bass", I.pluck(F(50), 0.35, _r(), dur=0.4), t)
        k += 1
    b.cues.append((tt0, "quiet ticking chip ostinato (C / G eighths) under the 500 animations"))
    # limp 40.5 - 42.6: decelerating, every note sags
    tl = M["limp"]
    limp = [(0.00, 0.40, 60, -0.6), (0.50, 0.30, 62, -0.7), (1.05, 0.45, 60, -0.9), (1.70, 0.50, 57, -1.0), (2.45, 0.9, 53, -3.0)]
    for (dt, d, m, bd) in limp:
        b.add("clar", I.clarinet(F(m), d, 0.65, _r(), bend=bd, vib=0), tl + dt, -0.1)
        b.add("arp", I.chipbass(F(m - 12), d, 0.5, _r(), bend=bd), tl + dt, 0.1)
    for dt, m, v in [(0.0, 50, 0.6), (0.22, 45, 0.35), (1.05, 50, 0.55), (1.32, 45, 0.3), (2.45, 41, 0.6)]:
        b.add("bass", I.pluck(F(m), v, _r(), dur=0.5, bright=0.3), tl + dt)
    b.cues.append((tl, "limping slow section: clarinet + chip bass fragments slowing down, each note sagging flat"))
    # droopy line on "E o jogo atrasou um ano"
    tdl = 44.15
    for j, (m, d) in enumerate([(69, 0.3), (68, 0.3), (67, 0.3), (66, 0.7)]):
        b.add("clar", I.clarinet(F(m), d, 0.55, _r(), bend=-0.8 if j == 3 else 0.0, vib=12 if j == 3 else 6), tdl + 0.36 * j, 0.0)
        b.add("bass", I.pluck(F(m - 24), 0.35, _r(), dur=0.35), tdl + 0.36 * j)
    b.cues.append((tdl, "droopy chromatic clarinet line down on 'atrasou um ano'"))

    # ============ PARTY 45.6 - 48.07 (116 bpm), then the RECORD STOP (applied in render)
    atp, qp = grid(M["party"] - 0.12, 116)
    pm = [(n[0], n[1], n[2] + 0) for n in HOOK]
    line(b, "lead", pm, atp, qp, "chip", 0.55, 0.15, duty=0.125)
    line(b, "glock", [n for n in pm if n[0] % 1 == 0], atp, qp, "glock", 0.45, -0.3, tr=12)
    for kb, ch in enumerate(["F", "C7", "F", "C7"]):
        oompah(b, atp(2 * kb), qp, ch, 0.6, beats=(0, 1))
        b.add("kick", I.kick(0.6, _r()), atp(2 * kb))
    hats(b, atp(0), qp, beats=8, vel=0.4)
    b.add("cym", I.cymbal(0.3, _r(), dur=1.0), atp(0))
    b.cues.append((atp(0), "party polka on 'Por sorte': chip lead motif, glock, oom-pah, kick, hats"))
    b.cues.append((M["stop"], "RECORD STOP: the whole score slows to a halt over 0.45 s, then near silence under 'Por azar...'"))

    # ============ TIPTOE 51.0 - 57.7 (111 bpm, D minor): beats 10 / 11 / 11.75 = the three backdrop clacks
    qt = M["clack2"] - M["clack1"]          # one beat = clack1 -> clack2
    att = lambda beat: M["clack1"] - 10 * qt + beat * qt
    tip = [(0, 62), (.5, 65), (1, 69), (1.5, 68), (2, 69), (3, 74), (3.5, 72),
           (4, 70), (4.5, 74), (5, 77), (5.5, 76), (6, 77), (7, 70), (7.5, 72),
           (8, 70), (8.5, 69), (9, 67), (9.5, 64)]
    for (bt, m) in tip:
        b.add("pizz", I.pluck(F(m), 0.6, _r(), dur=0.2, bright=0.8), att(bt), 0.25)
        b.add("clar", I.clarinet(F(m - 12), 0.09, 0.45, _r(), stacc=True), att(bt) + 0.005, -0.2)
    for bt in range(10):
        ch = ["Dm", "Bb", "C7"][bt // 4]
        m = CH[ch][0] if bt % 2 == 0 else CH[ch][0] - 5
        b.add("low", I.clarinet(F(m), 0.12, 0.55, _r(), stacc=True, vib=0), att(bt), 0.0)
        b.add("hat", I.chipnoise(0.25, _r(), "hat"), att(bt + 0.5), 0.4)
    for bt, top in [(10, 79), (11, 82), (11.75, 84)]:
        for m in CH["C7"][1]:
            b.add("pizz", I.pluck(F(m), 0.7, _r(), dur=0.2, bright=0.8), att(bt), 0.1)
        b.add("glock", I.glock(F(top), 0.55, _r()), att(bt), -0.3)
        b.add("low", I.clarinet(F(36), 0.14, 0.6, _r(), stacc=True, vib=0), att(bt))
    for j, m in enumerate([72, 74, 76]):
        b.add("lead", I.chip(F(m), 0.08, 0.4 + 0.05 * j, _r(), duty=0.25, vib=0), M["triumph"] - 0.3 + 0.1 * j, 0.15)
    b.cues.append((att(0), "tiptoe: staccato pizzicato + clarinet in D minor, chip hat ticks, 111 bpm"))
    b.cues.append((M["clack1"], "pizz C7 stabs + glock on the three backdrop clacks (56.43 / 56.97 / 57.40), pickup into the release"))

    # ============ TRIUMPH 57.8 - 63.3: swell, fanfare on the cloth whip, warm theme, bar 2 lands on the bell ding
    ta, tf = M["triumph"], M["fanfare"]
    b.add("pad", I.pad([F(m) for m in (53, 60, 65, 69)], tf - ta, 0.45, _r(), att=0.8, rel=0.2), ta)
    for j in range(int((tf - ta) / 0.06)):
        b.add("timp", I.timpani(F(41), 0.15 + 0.5 * j / ((tf - ta) / 0.06), _r(), dur=0.4), ta + j * 0.06, -0.1)
    qf = (M["ding"] - tf) / 4
    atf = lambda beat: tf + beat * qf
    fan = [(0, .75, 77), (.75, .25, 76), (1, .5, 77), (1.5, .5, 81), (2, 2, 84)]
    line(b, "brass", fan, atf, qf, "brass", 0.75, 0.0)
    line(b, "lead", fan, atf, qf, "chip", 0.35, 0.25, duty=0.5, tr=12)
    for m in (41, 53, 57, 60, 65):
        b.add("brass", I.brass(F(m), 3 * qf, 0.6, _r(), "horn" if m > 45 else "tuba", scoop=-10), tf, (m - 55) / 25)
    b.add("timp", I.timpani(F(41), 0.9, _r()), tf, -0.1)
    b.add("cym", I.cymbal(0.5, _r(), dur=2.0), tf)
    b.add("kick", I.kick(0.7, _r()), tf)
    warm = [(4, 1, 79), (5, .5, 77), (5.5, .5, 76), (6, 1, 74), (7, 1, 76), (8, 2.5, 77)]
    line(b, "flute", warm, atf, qf, "flute", 0.55, 0.25)
    line(b, "clar", [(bt, d, m - 12) for bt, d, m in warm], atf, qf, "clar", 0.55, -0.2)
    line(b, "brass", [(4, 4, 64), (8, 2.5, 65)], atf, qf, "brass", 0.4, -0.3)
    for kb, ch in [(0, "F"), (1, "C"), (2, "F")]:
        tb = atf(4 * kb)
        b.add("pad", I.pad([F(m) for m in CH[ch][1]], (4 if kb < 2 else 2.5) * qf, 0.45, _r(), att=0.15, rel=0.5), tb)
        oompah(b, tb, qf, ch, 0.6, beats=(0, 1, 2, 3) if kb < 2 else (0,))
        arp(b, tb, qf, ch, 0.3, beats=4 if kb < 2 else 2, up=24)
        hats(b, tb, qf, beats=4 if kb < 2 else 1, vel=0.3)
        b.add("glock", I.glock(F(CH[ch][1][2] + 12), 0.5, _r()), tb, -0.35)
    b.add("kick", I.kick(0.6, _r()), atf(4))
    b.add("cym", I.cymbal(0.25, _r(), dur=1.4), atf(8))
    b.cues.append((ta, "golden swell: pad + timpani roll"))
    b.cues.append((tf, "FANFARE on the cloth whip: brass + chip, tutti F, timpani, cymbal"))
    b.cues.append((atf(4), "warm theme on flute + clarinet over C (bar lands on the strength-tester ding), cadence to F at 62.9"))

    # ============ CASTLE: question pizz, hall organ, dark-comic gallop sting, hit on the landing
    b.add("pizz", I.pluck(F(60), 0.5, _r(), dur=0.3, bright=0.8), 64.47, -0.1)
    b.add("pizz", I.pluck(F(66), 0.45, _r(), dur=0.4, bright=0.8), 64.62, 0.1)
    to, tsg, thit = M["organ"], M["sting"], M["sting_hit"]
    b.add("organ", I.organ([F(m) for m in (38, 50, 57, 62, 65)], thit - to - 0.05, 0.6, _r(), att=0.12, rel=0.15), to)
    qs = 60 / 132
    k = 0
    while tsg + k * qs < thit - 0.05:
        t = tsg + k * qs
        for j, (dt, v) in enumerate([(0, 1.0), (qs / 3, 0.55), (2 * qs / 3, 0.7)]):
            if t + dt < thit - 0.03:
                b.add("low", I.chipbass(F(38), qs / 3 * 0.7, 0.55 * v, _r()), t + dt)
                b.add("bass", I.pluck(F(38), 0.5 * v, _r(), dur=0.2, bright=0.5), t + dt)
        b.add("lead", I.chip(F(57 + k), qs * 0.9, 0.3 + 0.04 * k, _r(), duty=0.125, vib=20), t, 0.15)
        b.add("timp", I.timpani(F(38), 0.3 + 0.06 * k, _r(), dur=0.6), t, -0.1)
        k += 1
    for m in (50, 53, 56, 59, 62):
        b.add("brass", I.brass(F(m), 0.3, 0.85, _r(), "stab", scoop=-20, fall=-2.0), thit, (m - 56) / 15)
    b.add("brass", I.brass(F(26), 0.4, 0.9, _r(), "tuba", fall=-3.0), thit)
    b.add("timp", I.timpani(F(38), 1.0, _r()), thit)
    b.add("kick", I.kick(0.9, _r()), thit)
    b.add("cym", I.cymbal(0.45, _r(), dur=1.0), thit)
    b.cues.append((64.47, "question pizz C -> F# after 'E o plano do castelo?'"))
    b.cues.append((to, "hall organ, D minor (low D pedal)"))
    b.cues.append((tsg, "dark-comic sting: triplet gallop on low D (chip bass + pizz), chromatic chip climb, timpani"))
    b.cues.append((thit, "HIT on the rider's landing: diminished brass stab with a fall, low tuba, timpani, kick, cymbal"))

    # ============ FINAL: hook motif returns softly under "Nada mal para oito fotos", the F chord blooms right after
    # the last word (69.50 s) and rings out; tail gone by 70.6
    tfc = M["final"]
    qe = 60 / 112
    ate = lambda beat: tfc - 3 * qe + beat * qe
    mot = [(0.5, .5, 72), (1, .5, 77), (1.5, .5, 81), (2, .5, 79), (2.5, .5, 76)]
    line(b, "mbox", mot, ate, qe, "mbox", 0.4, 0.15)
    line(b, "lead", mot, ate, qe, "chip", 0.15, -0.2, duty=0.5, tr=-12)
    b.add("pad", I.pad([F(m) for m in CH["Bb"][1]], 1.5 * qe, 0.35, _r(), att=0.2, rel=0.3), ate(0.5))
    b.add("pad", I.pad([F(m) for m in CH["C7"][1]], 1.0 * qe, 0.35, _r(), att=0.1, rel=0.2), ate(2))
    b.add("bass", I.pluck(F(46), 0.45, _r(), dur=0.7), ate(0.5))
    b.add("bass", I.pluck(F(48), 0.45, _r(), dur=0.5), ate(2))
    for m in (77, 81, 84):
        b.add("mbox", I.musicbox(F(m), 0.6, _r(), dur=1.6), tfc, (m - 81) / 10)
    b.add("glock", I.glock(F(89), 0.5, _r(), dur=1.6), tfc, -0.3)
    b.add("pad", I.pad([F(m) for m in (53, 60, 65, 69, 72)], 0.5, 0.5, _r(), att=0.04, rel=0.5), tfc)
    b.add("bass", I.pluck(F(41), 0.7, _r(), dur=1.4, bright=0.3), tfc)
    b.add("pizz", I.pluck(F(53), 0.5, _r(), dur=1.0), tfc)
    for j, m in enumerate([65, 69, 72, 77, 81, 84]):
        b.add("arp", I.chipbass(F(m + 12), 0.06, 0.3, _r()), tfc + 0.06 + 0.055 * j, -0.5 + 0.2 * j)
    b.add("timp", I.timpani(F(41), 0.5, _r(), dur=1.5), tfc, -0.1)
    b.add("cym", I.cymbal(0.15, _r(), dur=1.4), tfc)
    b.cues.append((ate(0.5), "hook motif returns on music box (Bb - C7)"))
    b.cues.append((T.fr(2068), "picture cue final_chord: the soft run-up continues under 'oito fotos' (held >= 9 dB under the voice)"))
    b.cues.append((tfc, "final F chord blooms right after 'fotos': music box + glock + pad + pizz, chip sparkle arp up, soft timpani"))
    b.cues.append((M["tail_end"], "tail faded to silence"))
    global LAST_CUES
    LAST_CUES = [(float(t), d) for t, d in b.cues]
    return b


def record_stop(x, t0, dur=0.45, t_resume=None):
    """varispeed the score to a halt from t0 (turntable losing power), then silence until t_resume"""
    a = ns(t0)
    L = ns(dur)
    u = np.arange(L) / L
    rate = (1 - u) ** 1.6
    src = a + np.cumsum(rate)
    y = np.stack([np.interp(src, np.arange(x.shape[1]), x[c]) for c in range(2)])
    y = lp(y, 9000, 1) * (1 - u ** 3)[None, :]
    out = x.copy()
    out[:, a:a + L] = y
    z = ns(t_resume) if t_resume else x.shape[1]
    out[:, a + L:z] = 0.0
    return out


def render(b, ref=-20.0):
    hall = make_ir(1.6, 7, pre=0.016, hf=1.4)
    dry = np.zeros((2, N))
    wet = np.zeros(N)
    levels = {}
    # the sting's ring is choked by sting_end (67.4 s); the final motif starts after the gap
    t = np.arange(N) / SR
    s0 = M["sting_end"] - 0.2
    first_final = M["final"] - 2.5 * 60 / 112 - 0.01
    dip = np.interp(t, [s0, M["sting_end"], first_final - 0.01, first_final], [1, 0, 0, 1])[None, :]
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = 10 ** ((ref + TARGET.get(k, -6) - L) / 20)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g * dip
        dry += x
        wet += SENDS.get(k, 0.15) * x.mean(0)
    out = dry + 0.7 * convolve_st(wet, hall)
    out = hp(out, 30, 2) * dip
    out = record_stop(out, M["stop"], 0.45, M["tiptoe"] - 0.1)
    e0, e1 = ns(70.15), ns(M["tail_end"] - 0.05)
    out[:, e0:e1] *= np.linspace(1, 0, e1 - e0)[None, :] ** 1.5
    out[:, e1:] = 0.0
    return out, levels
