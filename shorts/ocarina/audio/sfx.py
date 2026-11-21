# Every sound effect + ambience bed of "Nada mal para oito fotos", rendered from the event table in timeline.py into
# one stereo SFX stem. Level rule (user standard): each EVENT has a "naive" level (LU vs the voice stem, measured as the
# event's max momentary loudness) and is placed SFX_DB = -6 dB under it; ambience BEDS (integrated loudness) are not
# reduced. Outdoor events share a small open-air reverb; events in the stone hall (shot 13) a long hall reverb.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, send=0.12, space="out"):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.send, self.space = kind, p, send, space
        self.applied = naive + (SFX_DB if kind == "event" else 0.0)
        self.measured = None


# ================================================================ composite generators
def _flash(r):
    """reverse-air swell into the white flash + a soft low whoomp and a glint (anchor = the flash)"""
    dur, pk = 0.9, 0.42
    y = G.whoosh(dur, r, pk, 450, 4800, 0.9, 0.12, 0.45)
    t = tt(dur)
    u = np.maximum(t - pk, 0)
    y = y + (t > pk) * np.exp(-u / 0.16) * np.sin(2 * np.pi * 58 * (1 + 0.6 * np.exp(-u / 0.03)) * u) * 0.9
    G._place_mono(y, G.bell(2093.0, dur - pk - 0.01, r, 0.35, 0.5) * 0.12, pk)
    return widen(y, r, 12, 0.9), pk


def _whoosh_cut(r):
    return widen(G.whoosh(0.5, r, 0.3, 300, 2200, 0.8, 0.09, 0.15), r, 9, 0.8), 0.3


def _swish(r):
    return G.whoosh(0.28, r, 0.13, 700, 4200, 0.6, 0.05, 0.35), 0.13


def _toss(r):
    """the drive tumbling through the air toward the bin (pans left -> right)"""
    y = G.whoosh(0.5, r, 0.42, 250, 1500, 0.9, 0.06, 0.1)
    y = y * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * tt(0.5)[: len(y)]) ** 2)
    th = (np.linspace(-0.4, 0.5, len(y)) + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2), 0.0


def _murmur(dur, r, voices):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        kind = r.uniform()
        base, scale = ((r.uniform(95, 140), r.uniform(0.95, 1.05)) if kind < 0.45 else
                       (r.uniform(175, 235), r.uniform(1.12, 1.2)) if kind < 0.85 else (r.uniform(260, 330), r.uniform(1.25, 1.35)))
        y = G.babble(dur, r, base, scale, r.uniform(3.6, 4.8), r.uniform(0.5, 0.75), fmax=3400)
        y = lp(y, r.uniform(2000, 3200), 1) * r.uniform(0.3, 1.0)
        out += pan(y, r.uniform(-0.85, 0.85))
    return out


def _cheer(dur, r, voices=26, claps=40):
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(voices):
        kid = v % 6 == 5
        base = r.uniform(270, 340) if kid else (r.uniform(105, 160) if v % 2 else r.uniform(180, 250))
        scale = 1.3 if kid else (1.0 if v % 2 else 1.15)
        for rep in range(1 + int(r.uniform() < 0.4)):
            h = G.hurrah(r, base * r.uniform(0.97, 1.05), scale, kid)
            tm = r.uniform(0.05, 0.6) + rep * r.uniform(0.6, 0.9)
            place(out, pan(lp(h, 4200, 1) * r.uniform(0.35, 1.0), r.uniform(-0.9, 0.9)), tm)
    env = np.interp(t, [0, 0.25, 0.8, dur * 0.6, dur], [0.0, 0.6, 1.0, 0.6, 0.0])
    out += G.applause(dur, r, claps, env) * 0.8
    return fades(out, 0.02, 0.4)


def _confetti(dur, r):
    """paper bits fluttering down: a soft stereo cloud of tiny paper ticks"""
    out = np.zeros((2, ns(dur)))
    for i in range(int(dur * 38)):
        tm = r.uniform(0, dur - 0.1)
        x = G.paper_slap(r, 1.3) * r.uniform(0.15, 0.6) * (1 - 0.6 * tm / dur)
        place(out, pan(x, r.uniform(-0.9, 0.9)), tm)
    return fades(out, 0.05, 0.3)


def _pad(x, dur):
    n = ns(dur)
    x = np.asarray(x)
    return x[:, :n] if x.shape[1] >= n else np.pad(x, ((0, 0), (0, n - x.shape[1])))


def _wind(r):
    """lonely meadow: a long soft wind gust swelling and falling, a crow cawing twice far off to the right"""
    d = 2.6
    n = ns(d)
    t = np.arange(n) / SR
    g = np.interp(t, [0, 0.8, 1.6, d], [0.2, 1.0, 0.7, 0.0])
    w = G.breeze(d, r, 1.0, 0.4, 600) * g[None, :]
    w += widen(G.whoosh(d, r, 0.9, 250, 900, 1.2, 0.9, 0.05), r, 15, 1.0) * 0.6
    place(w, pan(G.crow(r) * 0.18, 0.55), 0.7)
    return fades(w, 0.05, 0.3)


def _bonk_stars(r):
    out = np.zeros(ns(0.8))
    G._place_mono(out, G.bonk(r, "squash"), 0.0)
    G._place_mono(out, G.dizzy(r) * 0.25, 0.12)
    return out


def _steps(r, dur, every):
    out = np.zeros(ns(dur + 0.3))
    k = 0
    while k * every < dur:
        G._place_mono(out, G.step_stage(r) * r.uniform(0.8, 1.0) * (0.85 if k % 2 else 1.0), k * every)
        k += 1
    return out


def _land_neigh(r):
    out = np.zeros(ns(2.0))
    G._place_mono(out, G.land(r), 0.0)
    G._place_mono(out, G.neigh(r) * 0.12, 0.3)
    return out


# cue name -> generator(r, **params) -> (sound mono/stereo, anchor s = where in the sound the cue frame falls)
GEN = {
    "sparkle": lambda r, n=11: (G.sparkle(r, n), 0.0),
    "pop": lambda r, k=0: (G.pop(r, k), 0.0),
    "thump": lambda r: (G.thump(r), 0.0),
    "flash_hit": _flash,
    "pop_up": lambda r: (G.pop_up(r), 0.0),
    "whoosh_cut": _whoosh_cut,
    "click": lambda r: G.click_in(r),
    "scatter": lambda r: (G.scatter(r), 0.0),
    "bonk": lambda r, kind="wood": (G.bonk(r, kind), 0.0),
    "slide": lambda r, dur=0.7, kind="table": (G.slide(r, dur, kind), 0.0),
    "gate_slam": lambda r: G.gate_slam(r),
    "sputter": lambda r, dur=1.1: (G.sputter(r, dur), 0.0),
    "strain": lambda r: (G.strain(r), 0.0),
    "twinkle": lambda r, k=0: (G.twinkle(r, k), 0.0),
    "puff": lambda r, size=1.0: (G.puff(r, size), 0.0),
    "relief": lambda r: (G.relief(r), 0.0),
    "step_grass": lambda r: (G.step_grass(r) * r.uniform(0.75, 1.0), 0.0),
    "step_stage": lambda r: (G.step_stage(r) * r.uniform(0.8, 1.0), 0.0),
    "blip": lambda r: (G.blip(r), 0.0),
    "scribble": lambda r, dur=0.75: (G.scribble(r, dur), 0.0),
    "page": lambda r: (G.page(r), 0.2),
    "poof": lambda r: (G.poof(r), 0.0),
    "clunk": lambda r: (G.clunk(r), 0.0),
    "flutter": lambda r, dur=0.85: (G.flutter(r, dur), 0.0),
    "swish": _swish,
    "dizzy": lambda r: (G.dizzy(r), 0.0),
    "chime": lambda r: (G.chime(r), 0.0),
    "rip": lambda r: (G.rip(r), 0.395),         # anchor = the final snap (the camera kick)
    "flurry": lambda r: (G.flurry(r), 0.0),
    "whirr": lambda r, dur=2.1: (G.whirr(r, dur), 0.0),
    "tick": lambda r, hi=True: (G.tick(r, hi), 0.0),
    "yank": lambda r: G.yank(r),
    "toss": _toss,
    "clang": lambda r: (G.clang(r), 0.0),
    "pages": lambda r: (G.pages(r, drift=False), 0.0),
    "cheer_team": lambda r: (_cheer(2.0, r, voices=6, claps=5) + _pad(_confetti(1.3, r) * 0.25, 2.0), 0.0),
    "cheer_crowd": lambda r, dur=3.2: (_cheer(dur, r, voices=18, claps=14) + _pad(_confetti(2.0, r) * 0.2, dur), 0.0),
    "confetti": lambda r, dur=1.5: (_confetti(dur, r), 0.0),
    "party_horn": lambda r: (G.party_horn(r), 0.0),
    "stop": lambda r: (G.stop_zip(r), 0.0),
    "tiny_ding": lambda r: (G.ding(r, 3136.0, tiny=True), 0.0),
    "curtain": lambda r: (G.curtain(r), 0.0),
    "thunk_wood": lambda r: G.thunk(r, "wood"),
    "clack": lambda r: (G.clack(r), 0.0),
    "cloth_whip": lambda r: G.cloth_whip(r),
    "rise": lambda r: (G.rise(r), 0.0),
    "ding": lambda r: (G.ding(r), 0.0),
    "puck": lambda r: G.thunk(r, "puck"),
    "hm": lambda r: (G.hm(r), 0.0),
    "gallop": lambda r, dur=0.7: (G.gallop(r, dur), 0.0),
    "burst": lambda r: (G.burst(r), 0.0),
    "land": lambda r: (_land_neigh(r), 0.0),
    "wind": lambda r: (_wind(r), 0.0),
    "chain_rattle": lambda r: (G.rattle(0.45, r, 90, np.linspace(0.3, 1, ns(0.45)), heavy=True), 0.0),
    "lag_stutter": lambda r, dur=1.4: (G.glitch_ticks(r, dur), 0.0),
    "rattle": lambda r: (G.shake_rattle(r), 0.0),
    "zip": lambda r, kind="fairy": (G.zip_fx(r, kind), 0.0),
    "bonk_stars": lambda r: (_bonk_stars(r), 0.0),
    "paper_strain": lambda r: (G.paper_strain(r), 0.3),
    "conveyor": lambda r, dur=4.0: (G.conveyor(dur, r), 0.0),
    "bump": lambda r: (G.bump(r), 0.0),
    "foot_tap": lambda r: (G.foot_tap(r), 0.0),
    "thud": lambda r: (G.thud(r), 0.0),
    "paper_drift": lambda r: (G.paper_drift(r), 0.0),
    "crowd_murmur": lambda r, dur=3.0, voices=6: (fades(_murmur(dur, r, voices), 0.4, 0.8), 0.0),
    "applause": lambda r: (G.applause(1.4, r, 5, np.interp(np.arange(ns(1.4)) / SR, [0, 0.1, 0.6, 1.4], [0, 1, 0.7, 0])), 0.0),
    "footsteps": lambda r, dur=4.6, every=0.43: (_steps(r, dur, every), 0.0),
    "tug": lambda r: (G.tug(r), 0.0),
}


# ================================================================ ambience beds
def bed(kind, dur, r, crowd=0, crowd_end=None, golden=False):
    n = ns(dur)
    if kind == "hall":
        return G.room_tone(dur, r) * 0.5
    lvl = dict(plaza=1.0, street=0.8, meadow=1.1, village=1.0, yard=0.9, square=1.0)[kind]
    x = G.breeze(dur, r, lvl, 0.15, 1000 if kind == "meadow" else 750)
    if kind in ("plaza", "street", "square", "yard"):
        x += pan(G.bird_chirps(dur, r, 0.4, "sparrow") * 0.05, 0.5)
        x += pan(G.bird_chirps(dur, r, 0.3, "sparrow") * 0.035, -0.6)
    if kind in ("meadow", "village"):
        x += pan(G.bird_chirps(dur, r, 0.5, "blackbird") * 0.05, -0.5)
        x += pan(G.bird_chirps(dur, r, 0.4, "sparrow") * 0.04, 0.6)
        x += pan(bp(colored(n, r, 0.4), 2500, 7000, 1) * 0.04 * (0.6 + 0.4 * smooth_noise(n, r, 0.4)), 0.2)   # leaves
    if golden:
        x += widen(G.crickets(dur, r, 2) * 0.006, r, 9, 1.0)
    if crowd:
        m = _murmur(dur, r, crowd) * 0.5
        if crowd_end is not None:
            m *= np.interp(np.arange(n) / SR, [0, crowd_end - 0.8, crowd_end], [1, 1, 0])[None, :]
        x += m
    return x


def cues():
    C = []
    R = rng(2124)
    rr = lambda: rng(int(R.integers(1 << 30)))
    xf = getattr(T, "XFADE", {})
    for (f, a, kind, lvl, kw) in T.BEDS:
        # hard cut: 30 ms switch; crossfaded shot change (timeline.XFADE, frames): beds dissolve over the same frames
        xin = T.fr(xf.get(T.shot_at_frame(f), 0)) if f > 0 else 0.0
        xout = T.fr(xf.get(T.shot_at_frame(a), 0)) if a < T.TOTAL else 0.0
        t0 = T.fr(f) - xin / 2
        d = T.fr(a) + xout / 2 - t0
        if "crowd_end" in kw:
            kw = dict(kw, crowd_end=kw["crowd_end"] - t0)

        def g(kind=kind, d=d, kw=kw, r=rr(), first=f == 0, last=a >= T.TOTAL, xin=xin, xout=xout):
            x = bed(kind, d + (0.04 if not xout else 0.0), r, **kw)
            return fades(x, 0.0 if first else max(xin, 0.03), 0.5 if last else max(xout, 0.04)), 0.0
        C.append(Cue(t0, f"amb_{kind}", f"ambience bed: {kind}" + (f" {kw}" if kw else ""), g, lvl, "bed", send=0.0))
    for (f, name, note, lvl, p, kw) in T.EVENTS:
        hall = T.shot_at_frame(f) in T.HALL_SHOTS
        kw = dict(kw)
        key = kw.pop("gen", name)
        assert key in GEN, key
        C.append(Cue(T.fr(f), name, note, (lambda key=key, kw=kw, r=rr(): GEN[key](r, **kw)), lvl, p=p,
                     send=0.35 if hall else 0.12, space="hall" if hall else "out"))
    return C


# ================================================================ render
def render(v_ref):
    """v_ref = integrated loudness of the voice stem (stereo). Returns (stereo stem, cue list with measured levels)."""
    C = cues()
    out = np.zeros((2, N))
    sends = {"out": np.zeros(N), "hall": np.zeros(N)}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        c.measured = (momentary_max(x) if c.kind == "event" else integrated(x)) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), t0)
    air = make_ir(0.8, 77, pre=0.008, hf=1.8, early=[(0.07, 0.4, -0.5), (0.12, 0.3, 0.6)])
    hall = make_ir(2.4, 78, pre=0.025, hf=1.2, early=[(0.04, 0.5, -0.6), (0.07, 0.45, 0.6), (0.11, 0.3, 0.0)])
    out += 0.5 * convolve_st(sends["out"], air) + 0.8 * convolve_st(sends["hall"], hall)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
