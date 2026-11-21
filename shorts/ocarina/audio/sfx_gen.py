# Procedural sound effects for "Nada mal para oito fotos" (own numpy synthesis, no samples):
# toolbox kept from the bridge short (stick-slip creaks, clinks, rattles, whooshes, formant crowd voices, applause,
# birds, crickets, breeze) + this film's kit: an 8-bit voice (band-limited pulse / triangle) for the "game" events
# (pop, blip, relief, rise, tick), bell-like fairy sparkles of our own (twinkle, chime, sparkle, ding), and cartoon
# foley for the physical events (thump, gate slam, clang, rip, scatter, pages, curtain, slide, clack, poof ...).
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, ramp, fades, shape,
                 phase, modal, impulse_train, pan, st, widen, place)


def _place_mono(buf, x, t):
    i = ns(t)
    a, b = max(0, i), min(len(buf), i + len(x))
    if b > a:
        buf[a:b] += x[a - i: b - i]


# ================================================================ creak engine (stick-slip friction)
def stick_slip(dur, rate, r, jitter=0.12, amp=None, accel_noise=0.0):
    """impulse train whose instantaneous rate follows `rate` (array or float, Hz); returns (impulses, times)"""
    n = ns(dur)
    rt = np.full(n, rate, float) if np.isscalar(rate) else np.interp(np.arange(n), np.linspace(0, n - 1, len(rate)), rate)
    x = np.zeros(n)
    t = r.uniform(0, 1.0 / max(rt[0], 1))
    while t < dur:
        k = ns(t)
        if k >= n:
            break
        a = 1.0 if amp is None else amp[min(k, len(amp) - 1)]
        x[k] += a * r.uniform(0.55, 1.0)
        t += (1.0 / max(rt[k], 1.0)) * (1 + r.normal(0, jitter))
    return x


WOOD = [(230, 9, 1.0), (520, 12, 0.8), (940, 14, 0.55), (1650, 16, 0.35), (2800, 18, 0.18)]
TIMBER = [(95, 7, 1.0), (180, 9, 0.9), (330, 11, 0.7), (560, 12, 0.5), (930, 14, 0.3), (1500, 15, 0.15)]
CHAIN = [(190, 28, 0.9), (430, 34, 1.0), (760, 38, 0.8), (1180, 42, 0.6), (1720, 45, 0.45), (2500, 50, 0.3), (3400, 55, 0.18)]
SMALLMETAL = [(1850, 40, 1.0), (3100, 45, 0.8), (4600, 50, 0.6), (6900, 55, 0.35)]


def creak(dur, r, rate0=110, rate1=180, modes=WOOD, shape_pts=None, rough=0.12, noise=0.05, scale=1.0):
    """wooden/metal creak: friction impulses exciting a resonator bank; rate glides rate0 -> rate1 (with a bend)"""
    n = ns(dur)
    u = np.linspace(0, 1, 64)
    rate = rate0 + (rate1 - rate0) * u + 0.15 * (rate0 + rate1) / 2 * np.sin(np.pi * u) * r.uniform(-1, 1)
    env_pts = shape_pts or [(0, 0), (0.15, 1), (0.7, 0.85), (1.0, 0)]
    env = np.interp(np.linspace(0, 1, n), [p[0] for p in env_pts], [p[1] for p in env_pts])
    x = stick_slip(dur, rate, r, rough, env)
    md = [(f * scale * r.uniform(0.94, 1.06), q, g) for f, q, g in modes]
    y = resbank(x, md)
    y += noise * bp(r.standard_normal(n), 400, 4000, 1) * env
    return fades(y, 0.004, 0.03)


def clink(r, f0=None, dur=0.12, bright=1.0):
    """one small metal-on-metal clink (chain link, buckle, canteen)"""
    f0 = f0 or np.exp(r.uniform(np.log(1800), np.log(5200)))
    modes = [(f0, 1.0, r.uniform(0.012, 0.03)), (f0 * r.uniform(2.3, 2.9), 0.5 * bright, 0.01), (f0 * r.uniform(3.9, 5.1), 0.25 * bright, 0.006)]
    y = modal(dur, modes, r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0008) * 0.4
    return y


def rattle(dur, r, density=30.0, env=None, heavy=False):
    """chain / kit rattle: a cloud of clinks"""
    n = ns(dur)
    y = np.zeros(n)
    cnt = int(density * dur) + 1
    times = np.sort(r.uniform(0, dur, cnt))
    for tm in times:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        if a < 0.02:
            continue
        c = clink(r, np.exp(r.uniform(np.log(700 if heavy else 1600), np.log(2600 if heavy else 5500))), 0.1)
        _place_mono(y, c * a * r.uniform(0.4, 1.0), tm)
    return y


# ================================================================ air
def whoosh(dur, r, peak=0.3, f_lo=350, f_hi=2200, width=0.8, tail=0.25, air=0.15):
    """noise whoosh: band centre and level rise to `peak` then fall (ease-out burst when peak is early)"""
    n = ns(dur)
    nz = colored(n, r, 0.6)
    t = np.arange(n) / SR
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / tail))
    fc = lambda T: f_lo + (f_hi - f_lo) * np.interp(T, t, np.where(t < peak, t / peak, np.exp(-(t - peak) / (tail * 1.3))))
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / width) ** 2), 1024, 256)
    y = y * env + air * hp(nz, 4000) * env ** 2
    return fades(y, 0.005, 0.04)


# ================================================================ bubbles
def bubbles(dur, r, rate, f_lo=300, f_hi=2500, tau=(0.008, 0.035), env=None, rise=(4, 12)):
    """Minnaert-style bubble 'plinks': damped sines gliding up"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        rr = rate if np.isscalar(rate) else rate[min(k, n - 1)]
        if a > 0.01:
            f0 = np.exp(r.uniform(np.log(f_lo), np.log(f_hi)))
            ta = r.uniform(*tau)
            L = min(int(ta * 6 * SR), n - k)
            if L > 8:
                tl = np.arange(L) / SR
                b = np.exp(-tl / ta) * np.sin(phase(f0 * (1 + r.uniform(*rise) * tl)))
                y[k:k + L] += b * a * r.uniform(0.2, 1.0) * (600 / f0) ** 0.3
        tm += r.exponential(1.0 / max(rr, 0.1))
    return y


# ================================================================ formant voices
VOW = {"a": (730, 1090, 2440, 3400), "o": (570, 840, 2410, 3400), "u": (300, 870, 2240, 3300), "U": (440, 1020, 2240, 3300),
       "A": (640, 1190, 2390, 3400), "e": (530, 1840, 2480, 3500), "i": (270, 2290, 3010, 3600), "ae": (660, 1720, 2410, 3400),
       "er": (490, 1350, 1690, 3300), "E": (580, 1700, 2500, 3500), "ei": (400, 2000, 2550, 3500)}
BWS = np.array([85.0, 110.0, 160.0, 220.0])


def vox(f0, forms, amp, r, scale=1.0, tilt=1.15, breath=0.12, fmax=5500.0, jitter=0.012):
    """additive source-filter voice: f0 (n,), forms (n, 4) formant tracks, amp (n,) -> mono"""
    n = len(f0)
    jit = 1 + jitter * smooth_noise(n, r, 18.0)
    ph = phase(f0 * jit)
    y = np.zeros(n)
    K = int(fmax / max(f0.min(), 60))
    Fm = forms * scale
    for k in range(1, K + 1):
        fk = k * f0
        H = np.ones(n)
        for i in range(4):
            Fi = Fm[:, i]
            H *= Fi ** 2 / np.sqrt((Fi ** 2 - fk ** 2) ** 2 + (fk * BWS[i] * (1 + 0.3 * (scale - 1))) ** 2)
        y += H * k ** (-tilt) * np.sin(k * ph + r.uniform(0, TAU)) * (fk < fmax)
    asp = peq(bp(r.standard_normal(n), 500, 5000, 1), float(np.mean(Fm[:, 1])), 8, 1.5)
    y = y / (np.std(y) + 1e-9) + breath * asp / (np.std(asp) + 1e-9)
    return y * amp


def _track(n, pts, t_rel):
    """pts = [(time_s, value)] -> per-sample curve"""
    return np.interp(t_rel, [p[0] for p in pts], [p[1] for p in pts])


def vowel_track(n, segs):
    """segs = [(time_s, vowel)] -> (n, 4) formant tracks with smooth transitions"""
    t = np.arange(n) / SR
    out = np.zeros((n, 4))
    for i in range(4):
        out[:, i] = np.interp(t, [s[0] for s in segs], [VOW[s[1]][i] for s in segs])
    return out


def babble(dur, r, base, scale, rate=4.2, active=0.75, fmax=3600):
    """one person talking far away: random syllables, consonant puffs, pauses"""
    n = ns(dur)
    t = np.arange(n) / SR
    segs, fp, ap = [], [], []
    tm = r.uniform(0, 0.4)
    vs = list(VOW)
    while tm < dur:
        if r.uniform() > active:
            tm += r.uniform(0.25, 0.8)
            ap += [(tm - 0.01, 0.0)]
            continue
        L = r.uniform(0.6, 1.4) / rate
        v = vs[r.integers(len(vs))]
        segs.append((tm + L * 0.5, v))
        fp += [(tm, r.uniform(0.9, 1.2)), (tm + L, r.uniform(0.8, 1.1))]
        ap += [(tm, 0.05), (tm + L * 0.25, r.uniform(0.6, 1.0)), (tm + L * 0.8, r.uniform(0.4, 0.8)), (tm + L, 0.05)]
        tm += L
    if len(segs) < 2:
        return np.zeros(n)
    forms = vowel_track(n, [(0, segs[0][1])] + segs)
    f0 = base * _track(n, [(0, 1.0)] + sorted(fp), t) * (1 - 0.08 * t / dur)
    amp = _track(n, [(0, 0.0)] + sorted(ap) + [(dur, 0.0)], t)
    y = vox(f0, forms, amp, r, scale, tilt=1.25, breath=0.2, fmax=fmax)
    cons = hp(r.standard_normal(n), 2500) * np.clip(np.abs(np.gradient(amp)) * SR * 0.02, 0, 1) * 0.3
    return y + cons


def hurrah(r, base, scale, kid=False):
    """one 'hurrah!' / 'hooray!' / 'hey!'"""
    kind = r.integers(3)
    if kind == 0:   # hur-RAH
        d = r.uniform(0.6, 0.85)
        segs = [(0, "er"), (0.08, "er"), (0.16, "a"), (d, "A")]
        fpts = [(0, 1.15), (0.12, 1.2), (0.2, 1.6), (d * 0.7, 1.5), (d, 1.15)]
    elif kind == 1:  # hoo-RAY
        d = r.uniform(0.55, 0.8)
        segs = [(0, "u"), (0.1, "U"), (0.2, "e"), (d * 0.6, "ei"), (d, "i")]
        fpts = [(0, 1.2), (0.15, 1.25), (0.25, 1.65), (d, 1.3)]
    else:           # HEY!
        d = r.uniform(0.3, 0.45)
        segs = [(0, "E"), (d * 0.7, "ei"), (d, "i")]
        fpts = [(0, 1.5), (0.08, 1.7), (d, 1.35)]
    n = ns(d)
    t = np.arange(n) / SR
    f0 = base * _track(n, fpts, t)
    forms = vowel_track(n, segs)
    amp = np.clip(t / 0.04, 0, 1) * np.clip((d - t) / 0.1, 0, 1) * (0.7 + 0.3 * np.clip((t - 0.15) / 0.1, 0, 1))
    h = hp(r.standard_normal(n), 800) * np.clip(1 - t / 0.06, 0, 1) * 0.4
    return vox(f0, forms, amp, r, scale, tilt=0.9 if not kid else 0.95, breath=0.3) + h


def applause(dur, r, people=36, env=None):
    n = ns(dur)
    out = np.zeros((2, n))
    for p in range(people):
        rate = r.uniform(3.6, 5.6)
        fc = r.uniform(900, 2600)
        cup = r.uniform(0.0, 0.6)
        tm = r.uniform(0, 1 / rate)
        y = np.zeros(n)
        while tm < dur:
            k = ns(tm)
            L = ns(0.05)
            if k + L >= n:
                break
            tl = np.arange(L) / SR
            c = reson(r.standard_normal(L), fc * r.uniform(0.9, 1.1), 1.4) * np.exp(-tl / r.uniform(0.005, 0.009))
            c += cup * reson(r.standard_normal(L), r.uniform(400, 700), 4) * np.exp(-tl / 0.012)
            y[k:k + L] += c * r.uniform(0.6, 1.0)
            tm += (1 / rate) * r.uniform(0.9, 1.1)
        out += pan(y, r.uniform(-0.9, 0.9))
    if env is not None:
        out *= env[None, :]
    return out


# ================================================================ nature
def bird_chirps(dur, r, density=0.5, kind="sparrow"):
    """sparse distant birds: sparrow chips or a blackbird-like fluting phrase"""
    n = ns(dur)
    y = np.zeros(n)
    tm = r.uniform(0.2, 1.5)
    while tm < dur - 1.0:
        if kind == "sparrow":
            for j in range(r.integers(2, 6)):
                L = r.uniform(0.04, 0.08)
                tl = tt(L)
                f = r.uniform(3800, 5600) * (1 - 0.35 * tl / L) if r.uniform() < 0.6 else r.uniform(3000, 4200) * (1 + 0.4 * tl / L)
                c = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 2
                _place_mono(y, c * r.uniform(0.5, 1.0), tm + j * r.uniform(0.09, 0.16))
            tm += r.exponential(1 / density) + 0.6
        else:
            for j in range(r.integers(3, 7)):
                L = r.uniform(0.09, 0.22)
                tl = tt(L)
                f0 = r.uniform(1500, 2900)
                f = f0 * (1 + r.uniform(-0.25, 0.3) * np.sin(np.pi * tl / L * r.uniform(0.5, 1.5)))
                c = (np.sin(phase(f)) + 0.15 * np.sin(2 * phase(f))) * np.sin(np.pi * tl / L) ** 1.5
                _place_mono(y, c * r.uniform(0.4, 1.0), tm)
                tm += L + r.uniform(0.03, 0.12)
            tm += r.exponential(1 / density) + 1.0
    return y


def crickets(dur, r, voices=3):
    n = ns(dur)
    y = np.zeros(n)
    t = np.arange(n) / SR
    for v in range(voices):
        f = r.uniform(4200, 4900)
        pulse = (np.sin(TAU * r.uniform(28, 34) * t) > 0.2).astype(float)
        chirp = (np.sin(TAU * r.uniform(1.6, 2.4) * t + r.uniform(0, TAU)) > 0.55).astype(float)
        e = lp(pulse * chirp, 200, 1)
        y += np.sin(TAU * f * t) * e * r.uniform(0.4, 1.0)
    return y


def breeze(dur, r, level=1.0, gust=0.18, bright=900):
    n = ns(dur)
    out = np.zeros((2, n))
    g = 0.6 + 0.4 * smooth_noise(n, r, gust)
    for ch in range(2):
        w = lp(colored(n, r, 1.0), bright, 2) * g
        w += 0.25 * bp(colored(n, r, 0.5), 1200, 4000, 1) * g ** 2
        out[ch] = w * level
    return out


def flag_flutter(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 5.5 + 1.5 * smooth_noise(n, r, 0.3)
    m = 0.5 + 0.5 * np.sin(phase(rate))
    return bp(r.standard_normal(n), 300, 3000, 1) * m ** 3 * (0.5 + 0.5 * smooth_noise(n, r, 0.2))


# ================================================================ footsteps
def stroll_step(r, scuff=0.5):
    d = 0.3
    t = tt(d)
    heel = np.exp(-t / 0.03) * np.sin(phase(r.uniform(90, 130) * (1 + 0.15 * np.exp(-t / 0.01))))
    plank = modal(d, [(r.uniform(180, 280), 0.5, 0.025), (r.uniform(420, 700), 0.35, 0.015)], r)
    nz = r.standard_normal(len(t))
    tap = bp(nz, 700, 4000, 1) * np.exp(-t / 0.005) * 0.4
    sc = bp(nz, 400, 3000, 1) * np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.07) * 0.25 * scuff
    return (heel * 0.7 + plank + tap + sc)


def step_grass(r):
    d = 0.22
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = bp(nz, 500, 4500, 1) * (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.045) * 0.6
    y += np.sin(phase(r.uniform(75, 95) * (1 + 0.2 * np.exp(-t / 0.01)))) * np.exp(-t / 0.03) * 0.8
    return y


def step_stage(r):
    """a soft boot on the hollow boards of the little stage"""
    y = stroll_step(r, 0.3)
    y += modal(0.3, [(r.uniform(135, 160), 0.9, 0.06), (r.uniform(290, 330), 0.4, 0.035)], r)
    return y


# ================================================================ 8-bit voice (band-limited, like an old sound chip)
def cst(f, dur):
    return np.full(ns(dur), float(f))


def fit(x, n):
    return x[:n] if len(x) >= n else np.pad(x, (0, n - len(x)))


def sqw(f, duty=0.5, soft=6000.0, kmax=48):
    """band-limited pulse wave; f = instantaneous frequency per sample (Hz)"""
    f = np.asarray(f, float)
    ph = phase(f)
    fm = float(np.max(f))
    K = max(1, int(min(kmax, 0.45 * SR / fm)))
    y = np.zeros(len(f))
    for k in range(1, K + 1):
        a = np.sin(np.pi * k * duty) / k
        if abs(a) > 1e-5:
            y += a / (1 + (k * fm / soft) ** 2) * np.cos(k * ph)
    return y * (2 / np.pi) / max(np.sin(np.pi * duty), 0.35)


def triw(f, kmax=15):
    """band-limited triangle wave"""
    f = np.asarray(f, float)
    ph = phase(f)
    fm = float(np.max(f))
    y = np.zeros(len(f))
    for k in range(1, kmax + 1, 2):
        if k * fm < 0.45 * SR:
            y += (-1) ** ((k - 1) // 2) / k ** 2 * np.sin(k * ph)
    return y * 8 / np.pi ** 2


def bell(f, dur, r, tau=0.3, bright=1.0):
    """small glassy bell of our own (partials 1 : 2.41 : 3.93 : 5.62)"""
    y = modal(dur, [(f, 1.0, tau), (f * 2.41, 0.28 * bright, tau * 0.35), (f * 3.93, 0.11 * bright, tau * 0.15),
                    (f * 5.62, 0.05 * bright, tau * 0.08)], r)
    return y * (1 - np.exp(-tt(dur) / 0.0012))


def pop(r, k=0, base=349.23):
    """8-bit bubble pop; k = step on a rising F-pentatonic ladder (the eight photos count up)"""
    steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
    f0 = base * 2 ** (steps[int(k) % len(steps)] / 12)
    d = 0.13
    t = tt(d)
    f = f0 * (1 + 1.5 * (1 - np.exp(-t / 0.016)))
    y = sqw(f, 0.5, 4500) * np.exp(-t / 0.028) * (1 - np.exp(-t / 0.0012))
    y += 0.6 * np.sin(phase(f * 0.5)) * np.exp(-t / 0.02)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0015) * 0.2
    return fades(y, 0.0005, 0.03)


def blip(r, notes=(1318.5, 1760.0), each=0.05, duty=0.25):
    """two-note square-wave blip (a target marker popping in)"""
    parts = []
    for i, f in enumerate(notes):
        last = i == len(notes) - 1
        L = each + (0.12 if last else 0.0)
        tl = tt(L)
        e = np.exp(-np.maximum(tl - each, 0) / 0.03) if last else np.ones(len(tl))
        parts.append(fades(sqw(cst(f, L), duty, 6000) * e, 0.001, 0.004))
    return np.concatenate(parts)


def relief(r):
    """calm 'all good' blink: two soft triangle-wave notes, a fifth apart"""
    a = fades(triw(cst(784.0, 0.075)), 0.003, 0.008)
    tl = tt(0.32)
    b = triw(cst(1174.7, 0.32)) * np.exp(-tl / 0.09) * (1 - np.exp(-tl / 0.003))
    b += 0.2 * np.sin(TAU * 2349.3 * tl) * np.exp(-tl / 0.12)
    return np.concatenate([a, b])


def tick(r, hi=True):
    d = 0.12
    t = tt(d)
    y = sqw(cst(880.0 if hi else 660.0, d), 0.5, 4000) * (t < 0.03) * 0.5
    y += modal(d, [(2600, 0.8, 0.006), (1400, 0.5, 0.01)], r) + hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.001) * 0.4
    return fades(y, 0.0005, 0.02)


def rise(r, dur=0.6, steps=22):
    """the puck shooting up the strength tester: a stepped pentatonic run on a pulse wave (F major)"""
    scale = [0, 2, 4, 7, 9]
    edges = (np.arange(steps + 1) / steps) ** (1 / 0.85) * dur
    parts = []
    for i in range(steps):
        L = edges[i + 1] - edges[i]
        f = 174.61 * 2 ** ((scale[i % 5] + 12 * (i // 5)) / 12.0)
        parts.append(fades(sqw(cst(f, L), 0.25, 7000), 0.001, 0.002) * (0.5 + 0.5 * i / steps))
    return np.concatenate(parts)


# ================================================================ fairy sparkles + bells (our own, soft and bell-like)
def twinkle(r, k=0, dur=1.0):
    """a fairy appearing: four quick glassy glints climbing a chord, with a wing-flutter shimmer; k picks the root"""
    roots = [1396.9, 1568.0, 1760.0, 2093.0, 2349.3]      # F6 G6 A6 C7 D7 (F pentatonic, the score's key)
    f0 = roots[int(k) % len(roots)]
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for j, (ratio, a) in enumerate([(1.0, 0.7), (1.5, 0.8), (2.0, 1.0), (3.0, 0.45)]):
        tm = j * 0.042 + (r.uniform(0, 0.008) if j else 0.0)
        g = bell(f0 * ratio, dur - tm - 0.002, r, 0.26 - 0.04 * j)
        _place_mono(g, fades(triw(cst(f0 * ratio, 0.035)), 0.002, 0.012) * 0.15, 0.0)     # a pinch of chip colour
        _place_mono(y, g * a, tm)
    y *= 1 + 0.3 * np.sin(TAU * 13 * t) * np.exp(-t / 0.35)
    air = reson(r.standard_normal(n), 9000, 3) * np.exp(-t / 0.1) * 0.02
    return fades(y + air, 0.0008, 0.15)


def chime(r):
    """the fairy's little bow: two soft bell notes a fourth apart, long ring"""
    dur = 1.3
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for tm, f, a in [(0.0, 1568.0, 0.8), (0.1, 2093.0, 1.0)]:
        g = bell(f, dur - tm - 0.002, r, 0.42, 0.7) + 0.3 * bell(f * 2, dur - tm - 0.002, r, 0.2, 0.4)
        _place_mono(g, fades(sqw(cst(f, 0.05), 0.5, 5000), 0.002, 0.02) * 0.1, 0.0)
        _place_mono(y, g * a, tm)
    y *= 1 + 0.2 * np.sin(TAU * 11 * t) * np.exp(-t / 0.5)
    return fades(y, 0.001, 0.2)


def sparkle(r, n_glints=11, dur=0.55):
    """a ring of sparkles bursting around something: a quick scatter of tiny bells, climbing (stereo)"""
    out = np.zeros((2, ns(dur + 0.6)))
    scale = [1396.9, 1568.0, 1760.0, 2093.0, 2349.3, 2793.8, 3136.0, 3520.0]
    for i in range(n_glints):
        tm = dur * i / n_glints + r.uniform(0, 0.02)
        f = scale[min(len(scale) - 1, int(i * len(scale) / n_glints + r.integers(0, 2)))]
        g = bell(f, 0.45, r, r.uniform(0.1, 0.2))
        _place_mono(g, fades(triw(cst(f, 0.04)), 0.002, 0.01) * 0.15, 0.0)
        place(out, pan(g * r.uniform(0.5, 1.0), np.sin(i * 2.4) * 0.7), tm)
    return out


def ding(r, f=1568.0, dur=1.6, tiny=False):
    """desk-bell ding (the fairground bell); tiny = one speck of confetti landing in a dead-silent room"""
    modes = [(f, 1.0, 0.6), (f * 2.756, 0.45, 0.28), (f * 5.404, 0.25, 0.12), (f * 8.933, 0.1, 0.05)]
    if tiny:
        modes, dur = [(f, 1.0, 0.16), (f * 2.756, 0.2, 0.05)], 0.6
    y = modal(dur, modes, r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 3500) * np.exp(-t / 0.0012) * (0.1 if tiny else 0.5)
    y += sqw(cst(f, dur), 0.5, 5000) * np.exp(-t / 0.06) * 0.1
    return fades(y, 0.0003, 0.1)


def flutter(r, dur=0.85):
    """the fairy flying a loop: a dotted trail of tiny bell motes + papery wing flutter"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, tm in enumerate(np.arange(0.0, dur - 0.2, 0.085)):
        f = [2349.3, 2793.8, 3136.0, 2793.8, 3520.0, 3136.0][k % 6]
        _place_mono(y, bell(f, 0.25, r, 0.07, 0.5) * (0.5 + 0.5 * np.sin(np.pi * tm / dur)), tm)
    wing = bp(r.standard_normal(n), 3000, 9000, 1) * (0.5 + 0.5 * np.sin(TAU * 26 * t)) ** 2 * np.sin(np.pi * t / dur) * 0.05
    return fades(y + wing, 0.01, 0.1)


def dizzy(r, dur=0.6):
    """seeing stars: a wobbling little whistle"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 1500 * (1 + 0.22 * np.sin(TAU * 6.5 * t)) * (1 + 0.15 * t / dur)
    y = np.sin(phase(f)) * (0.5 + 0.5 * np.sin(TAU * 13 * t + 1)) * np.exp(-t / 0.35)
    return fades(y * 0.6 + 0.15 * triw(f), 0.01, 0.1)


# ================================================================ cartoon foley
def thump(r):
    """the giant cartridge squashing and bouncing once: soft low thump, plastic shell, a rubbery wobble"""
    d = 0.55
    t = tt(d)
    body = np.sin(phase(58 * (1 + 0.9 * np.exp(-t / 0.022)))) * np.exp(-t / 0.1) * 1.6
    slap = lp(r.standard_normal(len(t)), 1500, 2) * np.exp(-t / 0.01) * 1.6
    shell = modal(d, [(310, 0.5, 0.05), (535, 0.35, 0.035), (905, 0.2, 0.02)], r)
    u = np.clip(t - 0.05, 0, None)
    boing = np.sin(phase(150 * (1 + 0.35 * np.exp(-u / 0.12) * np.sin(TAU * 9 * u)))) * np.exp(-u / 0.16) * (t > 0.05) * 0.35
    return fades(body + slap + shell + boing, 0.0, 0.05)


def pop_up(r):
    """a flat map popping up into a 3D model: quick rising 'bwoop', paper flap, a glint on top"""
    d, up = 0.75, 0.12
    t = tt(d)
    u = np.clip(t / up, 0, 1)
    f = 196 * 2 ** (2.6 * u ** 0.8)
    y = triw(f) * np.where(t < up, 0.9, np.exp(-(t - up) / 0.025)) * (1 - np.exp(-t / 0.003))
    y += 0.35 * sqw(f, 0.25, 4000) * np.where(t < up, u, np.exp(-(t - up) / 0.02))
    y += bp(r.standard_normal(len(t)), 700, 6000, 1) * np.exp(-((t - 0.06) / 0.035) ** 2) * 0.35
    g = bell(1568.0, d - up - 0.002, r, 0.3) * 0.6 + bell(2349.3, d - up - 0.002, r, 0.2) * 0.35
    _place_mono(y, g, up)
    return fades(y, 0.001, 0.08)


def click_in(r):
    """one photo sliding into the cartridge slot: short slide, plastic latch click. Returns (y, anchor of the click)"""
    d, c = 0.3, 0.075
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.clip(t / c, 0, 1) ** 2 * (t < c) * 0.35
    ck = modal(d - c - 0.002, [(2350, 1.0, 0.007), (4100, 0.6, 0.004), (930, 0.6, 0.012), (610, 0.4, 0.02)], r)
    ck += hp(r.standard_normal(len(ck)), 2500) * np.exp(-np.arange(len(ck)) / SR / 0.0012) * 0.6
    _place_mono(y, ck * 1.2, c)
    return fades(y, 0.002, 0.03), c


def paper_slap(r, bright=1.0):
    d = 0.09
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = bp(nz, r.uniform(700, 1400), r.uniform(4500, 8000) * bright, 1) * np.exp(-t / r.uniform(0.008, 0.02))
    y += lp(nz, 400, 1) * np.exp(-t / 0.012) * 0.5
    return y * (1 - np.exp(-t / 0.0008))


def scatter(r, count=16, dur=0.75):
    """a stack of photos bouncing off and scattering on the ground (stereo)"""
    out = np.zeros((2, ns(dur + 0.12)))
    for i in range(count):
        tm = dur * (i / count) ** 1.5 * r.uniform(0.8, 1.1) if i else 0.0
        a = (1.0 if i < 3 else r.uniform(0.25, 0.8)) * (1 - 0.5 * i / count)
        place(out, pan(paper_slap(r) * a, r.uniform(-0.7, 0.7)), min(tm, dur))
    return out


def bonk(r, kind="wood"):
    """cartoon bonk: 'wood' = hollow temple-block tok (a deadpan punch-in); 'squash' = sword on a rubbery monster"""
    d = 0.4
    t = tt(d)
    nz = r.standard_normal(len(t))
    if kind == "wood":
        y = modal(d, [(540, 1.0, 0.055), (1210, 0.45, 0.028), (1890, 0.22, 0.014), (2950, 0.1, 0.008)], r, glide=0.1, glide_tau=0.012)
        y += bp(nz, 500, 5000, 1) * np.exp(-t / 0.003) * 0.7
        y += np.sin(phase(150 * (1 + 0.5 * np.exp(-t / 0.01)))) * np.exp(-t / 0.035) * 0.5
    else:
        f = 190 * (1 + 0.9 * np.exp(-t / 0.025)) * (1 + 0.1 * np.sin(TAU * 21 * t) * np.exp(-t / 0.12))
        y = np.sin(phase(f)) * np.exp(-t / 0.11) * 1.2 + 0.3 * sqw(f, 0.5, 1500) * np.exp(-t / 0.06)
        y += bp(nz, 300, 3500, 1) * np.exp(-t / 0.012) * 0.9
        y += modal(d, [(330, 0.6, 0.04), (760, 0.3, 0.02)], r)
    return fades(y, 0.0, 0.05)


def slide(r, dur=0.7, kind="table"):
    """something dragged off: 'table' = a diorama sliding off a table edge, 'flat' = a painted scenery flat"""
    n = ns(dur)
    u = np.arange(n) / n
    env = np.sin(np.pi * u ** 0.7) ** 1.2
    sh = bp(colored(n, r, 0.5), 400, 4500, 1) * env * (0.7 + 0.3 * smooth_noise(n, r, 9.0))
    cr = fit(creak(dur, r, 45, 80, WOOD, [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)], rough=0.3, noise=0.0,
                   scale=0.8 if kind == "flat" else 1.1), n)
    return fades(sh * 0.8 + cr * (0.8 if kind == "flat" else 0.5), 0.01, 0.06)


def gate_slam(r, pre=0.3):
    """portcullis: rattles down its grooves for `pre` s, then the iron slam. Returns (y, anchor of the slam)"""
    d = 1.6
    n = ns(d)
    k = ns(pre)
    y = np.zeros(n)
    env = (np.arange(k) / k) ** 1.5
    y[:k] += fit(rattle(pre, r, 110, env, heavy=True), k) * 0.7
    ticks = fit(stick_slip(pre, np.linspace(18, 60, 32), r, 0.1, env), k)
    y[:k] += resbank(ticks, [(f, q, g) for f, q, g in CHAIN[:5]]) * 0.5
    m = n - k
    u = np.arange(m) / SR
    boom = np.sin(phase(46 * (1 + 0.7 * np.exp(-u / 0.03)))) * np.exp(-u / 0.26) * 2.6
    iron = fit(modal(m / SR, [(141, 1.0, 0.45), (233, 0.8, 0.38), (367, 0.7, 0.3), (541, 0.55, 0.24), (812, 0.45, 0.17),
                              (1190, 0.35, 0.12), (1733, 0.22, 0.08), (2480, 0.13, 0.05)], r), m)
    hit = bp(r.standard_normal(m), 200, 7000, 1) * np.exp(-u / 0.018) * 1.8
    y[k:] += boom + iron * 1.1 + hit
    _place_mono(y, rattle(0.5, r, 60, np.exp(-np.linspace(0, 1, ns(0.5)) * 3.5), heavy=True) * 0.5, pre + 0.03)
    return fades(y, 0.01, 0.2), pre


def sputter(r, dur=1.1):
    """the little grey console struggling: irregular chuffs, a mains buzz, 8-bit glitch blips"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur - 0.08:
        L = r.uniform(0.04, 0.09)
        tl = tt(L)
        nz = r.standard_normal(len(tl))
        p = bp(nz, r.uniform(200, 400), r.uniform(1600, 2800), 1) * np.exp(-tl / r.uniform(0.012, 0.03)) * (1 - np.exp(-tl / 0.002))
        p += lp(nz, 180, 2) * np.exp(-tl / 0.02) * 1.2
        if r.uniform() < 0.55:
            fq = float(r.choice([330, 392, 523, 659, 784, 1047])) * float(r.choice([1, 1, 2]))
            p += sqw(cst(fq, L), 0.125, 5000)[: len(tl)] * (tl < 0.03) * 0.3
        _place_mono(y, p * (0.45 + 0.55 * tm / dur) * r.uniform(0.6, 1.0), tm)
        tm += L + r.uniform(0.02, 0.16) * (1.2 - 0.6 * tm / dur)
    buzz = sqw(cst(100, dur), 0.08, 2500) * (0.5 + 0.5 * smooth_noise(n, r, 6.0)) * 0.08 * np.linspace(0.3, 1, n)
    return fades(y + buzz, 0.005, 0.04)


def strain(r, dur=0.8):
    """the console at its limit: a rising two-oscillator whine with tremolo + spark crackle"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 210 * 2 ** (1.25 * u ** 1.3)
    w = (sqw(f, 0.3, 3000) + sqw(f * 1.012, 0.3, 3000)) * (0.75 + 0.25 * np.sin(TAU * 17 * t))
    env = u ** 1.3 * np.clip((dur - t) / 0.05, 0, 1)
    crack = np.zeros(n)
    tm = 0.1
    while tm < dur:
        k = ns(tm)
        L = min(ns(0.012), n - k)
        if L > 32:
            crack[k:k + L] += hp(r.standard_normal(L), 3500) * np.exp(-np.arange(L) / SR / 0.002) * r.uniform(0.3, 1.0) * (tm / dur)
        tm += r.exponential(1 / (15 + 60 * tm / dur))
    return fades(w * env * 0.5 + crack * 0.8, 0.01, 0.03)


def puff(r, size=1.0):
    """a little 'pff' (someone vanishing in a puff) with a faint falling blip"""
    d = 0.16 + 0.1 * size
    t = tt(d)
    y = lp(colored(len(t), r, 0.7), 1400 + 800 * r.uniform(), 2) * np.exp(-t / (0.035 + 0.03 * size)) * (1 - np.exp(-t / 0.004))
    f = r.uniform(700, 1100) * 2 ** (-1.2 * t / d)
    y += 0.12 * sqw(f, 0.5, 3000) * np.exp(-t / 0.03)
    return fades(y, 0.001, 0.03)


def poof(r):
    """the console blows a big smoke puff with sparks: soft 'poomf', band sweeping down, crackle, low thump"""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    fc = lambda T: 350 + 3200 * np.exp(-np.maximum(T, 0) / 0.11)
    body = shape(colored(n, r, 0.5), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / 1.1) ** 2), 1024, 256)
    body = body / (np.std(body) + 1e-9) * (1 - np.exp(-t / 0.004)) * (0.7 * np.exp(-t / 0.09) + 0.3 * np.exp(-t / 0.3))
    th = np.sin(phase(70 * (1 + 0.8 * np.exp(-t / 0.02)))) * np.exp(-t / 0.09) * 1.3
    sp = np.zeros(n)
    L = ns(0.02)
    for i in range(14):
        k = ns(abs(r.normal(0.06, 0.12)))
        if k + L < n:
            sp[k:k + L] += hp(r.standard_normal(L), 4000) * np.exp(-np.arange(L) / SR / 0.003) * r.uniform(0.3, 1)
    return fades(body * 1.2 + th + sp * 0.5, 0.0, 0.2)


def scribble(r, dur=0.75):
    """pencil strokes on a drawing board"""
    n = ns(dur)
    rate = 7.5 * (1 + 0.25 * smooth_noise(n, r, 2.0))
    env = np.abs(np.sin(phase(rate) / 2)) ** 0.7 * (0.6 + 0.4 * smooth_noise(n, r, 5.0))
    nz = colored(n, r, 0.2)
    return fades(bp(nz, 1800, 8000, 1) * env + reson(nz, 650, 2.5) * env * 0.15, 0.01, 0.04)


def page(r, big=1.0):
    """a sheet flipped over: swish, then the flap"""
    d = 0.32
    n = ns(d)
    t = np.arange(n) / SR
    fc = lambda T: 900 + 3500 * np.clip(T / 0.2, 0, 1)
    sw = shape(colored(n, r, 0.3), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / 0.9) ** 2), 512, 128)
    sw = sw / (np.std(sw) + 1e-9) * np.exp(-((t - 0.11) / 0.07) ** 2)
    late = (t >= 0.2) * np.exp(-np.maximum(t - 0.2, 0) / 0.02)
    flap = bp(r.standard_normal(n), 500, 6000, 1) * late * 1.4
    flop = lp(r.standard_normal(n), 350, 2) * (t >= 0.2) * np.exp(-np.maximum(t - 0.2, 0) / 0.03) * 1.5
    return fades(sw * 0.6 + flap + flop * big, 0.004, 0.04)


def pages(r, dur=0.77, count=12, drift=True):
    """calendar pages flying off past the lens, then (drift) the last one drifting down (stereo)"""
    out = np.zeros((2, ns(dur + 1.3)))
    for i in range(count):
        tm = max(0.0, dur * i / count + r.uniform(-0.01, 0.01))
        L = r.uniform(0.09, 0.14)
        tl = tt(L)
        nz = r.standard_normal(len(tl))
        fl = bp(nz, r.uniform(600, 1200), r.uniform(5000, 9000), 1) * np.sin(np.pi * tl / L) ** 1.5
        fl += bp(nz, 500, 5000, 1) * np.exp(-np.maximum(tl - L * 0.6, 0) / 0.012) * (tl > L * 0.6) * 0.8
        place(out, pan(fl * r.uniform(0.6, 1.0), -0.7 + 1.4 * ((i * 0.37) % 1)), tm)
    if drift:
        place(out, pan(paper_drift(r) * 0.25, 0.2), dur + 0.15)
    return out


def paper_drift(r, dur=0.9):
    """one sheet see-sawing down through the air"""
    tl = tt(dur)
    return bp(colored(len(tl), r, 0.5), 700, 4000, 1) * (0.5 + 0.5 * np.sin(TAU * 3.2 * tl)) ** 2 * np.exp(-tl / 0.5)


def clunk(r):
    """a small solid prism dropping on grass: dull thud, a plasticky 'tonk', one tiny bounce"""
    d = 0.45
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = np.sin(phase(92 * (1 + 0.5 * np.exp(-t / 0.012)))) * np.exp(-t / 0.055) * 1.4
    y += lp(nz, 500, 2) * np.exp(-t / 0.02)
    y += modal(d, [(640, 0.55, 0.035), (1015, 0.3, 0.022), (1730, 0.12, 0.012)], r)
    y += bp(nz, 2000, 7000, 1) * np.exp(-t / 0.06) * 0.1 * (1 - np.exp(-t / 0.01))
    b2 = np.sin(phase(cst(110, 0.15))) * np.exp(-tt(0.15) / 0.03) * 0.5 + modal(0.15, [(700, 0.3, 0.02)], r)
    _place_mono(y, b2 * 0.5, 0.17)
    return fades(y, 0.0, 0.05)


def rip(r, dur=0.42):
    """a paper blueprint ripped in half: accelerating tear crackle + hiss + final snap"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    env = np.clip(u / 0.08, 0, 1) * (0.55 + 0.45 * u) * np.clip((dur - t) / 0.015, 0, 1)
    imp = fit(stick_slip(dur, np.linspace(140, 620, 48), r, 0.35, env), n)
    grain = np.exp(-tt(0.006) / 0.0012) * r.standard_normal(ns(0.006))
    tear = bp(signal.fftconvolve(imp, grain)[:n], 1400, 11000, 1)
    hiss = bp(colored(n, r, 0.2), 2200, 9500, 1) * env * (0.6 + 0.4 * smooth_noise(n, r, 30.0))
    snap = bp(r.standard_normal(n), 800, 9000, 1) * (t >= dur - 0.03) * np.exp(-np.maximum(t - (dur - 0.03), 0) / 0.012) * 3.5
    return fades(tear / (np.std(tear) + 1e-9) * 0.9 + hiss * 0.7 + snap, 0.002, 0.02)


def flurry(r, n_ev=14, dur=0.6):
    """hundreds of poses flicking by: tiny paper flicks + random chip blips, sweeping left to right (stereo)"""
    out = np.zeros((2, ns(dur + 0.2)))
    scale = [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0]
    L = 0.05
    tl = tt(L)
    for i in range(n_ev):
        w = bp(r.standard_normal(len(tl)), 1800, 7000, 1) * np.sin(np.pi * tl / L) ** 2 * 0.6
        b = sqw(cst(scale[int(r.integers(len(scale)))], L), 0.125, 6000) * (tl < 0.022) * 0.5
        place(out, pan(fades(w + b, 0.002, 0.005) * r.uniform(0.6, 1.0), -0.6 + 1.2 * i / n_ev), dur * (i / n_ev) ** 0.85)
    return out


def whirr(r, dur=2.1, rev=1.25):
    """a very slow disk drive: wobbling motor hum + whine, one scrape per revolution, a lazy ratchet"""
    n = ns(dur)
    t = np.arange(n) / SR
    wob = 1 + 0.035 * np.sin(TAU * t / rev) + 0.01 * smooth_noise(n, r, 3.0)
    hum = lp(sqw(58 * wob, 0.3, 900), 500, 2) * 0.6
    whine = np.sin(phase(318 * wob)) * 0.18 + np.sin(phase(636 * wob * 1.003)) * 0.06
    scrape = bp(colored(n, r, 0.4), 900, 3200, 1) * np.clip(np.sin(TAU * t / rev - 1.0), 0, 1) ** 6 * 0.5
    ratchet = reson(fit(impulse_train(np.arange(0.1, dur, 0.21), dur), n), 1900, 12) * 6.0
    y = (hum + whine) * (0.8 + 0.2 * np.sin(TAU * t / rev + 0.6)) + scrape + ratchet
    return fades(y, 0.15, 0.03)


def cloth_whip(r):
    """a cloth whipped off: whoosh + three soft fabric flaps. Returns (y, anchor)"""
    y = whoosh(0.6, r, 0.13, 280, 2600, 0.9, 0.12, 0.25)
    L = ns(0.07)
    tl = np.arange(L) / SR
    for tm, a in [(0.1, 1.0), (0.19, 0.6), (0.3, 0.35)]:
        _place_mono(y, lp(r.standard_normal(L), 1600, 1) * np.exp(-tl / 0.015) * a * 1.2, tm)
    return y, 0.1


def yank(r):
    """a unit yanked out: short whoosh + unplugging 'thup'. Returns (y, anchor)"""
    y = whoosh(0.4, r, 0.08, 400, 3000, 0.8, 0.08, 0.3)
    t = np.arange(len(y)) / SR
    y += np.sin(phase(120 * (1 + 0.5 * np.exp(-t / 0.02)))) * np.exp(-t / 0.04) * 0.8
    y += fit(modal(0.4, [(900, 0.3, 0.02), (1700, 0.2, 0.012)], r), len(y))
    return y, 0.03


def clang(r):
    """a heavy slab landing in a metal trash bin: hollow inharmonic clang, the bin wobbling, the slab rattling to rest"""
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    bin_modes = [(142, 1.0, 0.55), (318, 0.9, 0.45), (412, 0.6, 0.33), (655, 0.75, 0.3), (893, 0.5, 0.22), (1320, 0.45, 0.16),
                 (1795, 0.32, 0.12), (2610, 0.2, 0.08), (3480, 0.12, 0.05)]
    y = fit(modal(d, bin_modes, r, glide=0.02, glide_tau=0.03), n)
    y *= 1 + 0.25 * np.sin(TAU * 7.5 * t) * np.exp(-t / 0.5)
    y += bp(r.standard_normal(n), 250, 8000, 1) * np.exp(-t / 0.01) * 1.6
    y += np.sin(phase(70 * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.12) * 1.2
    for tm, a in [(0.13, 0.45), (0.23, 0.3), (0.3, 0.18), (0.35, 0.1)]:
        c = modal(0.5, [(f * r.uniform(0.97, 1.03), g, tau * 0.5) for f, g, tau in bin_modes[1:7]], r)
        c += bp(r.standard_normal(len(c)), 400, 6000, 1) * np.exp(-np.arange(len(c)) / SR / 0.006)
        _place_mono(y, c * a, tm)
    return fades(y, 0.0, 0.25)


def party_horn(r, dur=0.55):
    """party blower: reedy buzz that jumps up as the paper tube unrolls"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 300 * (1 + 0.38 * (1 - np.exp(-t / 0.05))) * (1 - 0.25 * np.clip((t - (dur - 0.07)) / 0.07, 0, 1)) * (1 + 0.01 * np.sin(TAU * 31 * t))
    y = peq(peq(sqw(f, 0.18, 6000), 1250, 9, 2.0), 2700, 7, 2.5)
    y *= (1 - np.exp(-t / 0.012)) * np.clip((dur - t) / 0.04, 0, 1) * (0.85 + 0.15 * np.sin(TAU * 47 * t))
    unroll = fit(stick_slip(0.16, np.linspace(40, 160, 16), r, 0.2), ns(0.16))
    _place_mono(y, bp(signal.fftconvolve(unroll, r.standard_normal(ns(0.004)))[: ns(0.16)], 1500, 8000, 1) * 0.25, 0.0)
    return fades(y, 0.002, 0.02)


def stop_zip(r, dur=0.3):
    """record-stop garnish of our own: a pulse wave diving three octaves + a short needle scratch"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    y = lp(sqw(760 * 2 ** (-3.6 * u ** 0.8), 0.2, 3500), 2500, 1) * (1 - u) ** 0.8 * 0.6
    y += bp(colored(n, r, 0.3), 900, 4500, 1) * np.exp(-t / 0.06) * 0.45
    return fades(y, 0.001, 0.02)


def curtain(r, dur=0.95):
    """little stage curtains drawn open: two halves of cloth travelling outward + rings on the rod (stereo)"""
    n = ns(dur)
    u = np.arange(n) / n
    out = np.zeros((2, n))
    fc = lambda T: 400 + 1500 * np.sin(np.pi * np.clip(T / dur, 0, 1)) ** 1.2
    for side in (-1, 1):
        sw = shape(colored(n, r, 0.6), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / 1.0) ** 2), 1024, 256)
        sw = sw / (np.std(sw) + 1e-9) * np.sin(np.pi * u ** 0.8) ** 1.3 * (0.75 + 0.25 * smooth_noise(n, r, 7.0))
        mono = sw * 0.8 + fit(rattle(dur, r, 26, np.sin(np.pi * u ** 0.8) ** 2, heavy=False), n) * 0.12
        th = (side * (0.15 + 0.7 * u) + 1) * np.pi / 4
        out[0] += mono * np.cos(th) * np.sqrt(2)
        out[1] += mono * np.sin(th) * np.sqrt(2)
    return fades(out, 0.02, 0.1)


def thunk(r, kind="wood"):
    """'wood' = a scenery flat set down; 'puck' = a weak try on the strength tester (short rise, dull stop, sad droop).
    Returns (y, anchor of the thunk)"""
    d = 0.4
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = modal(d, [(118, 1.0, 0.085), (243, 0.7, 0.055), (478, 0.4, 0.03), (905, 0.2, 0.018)], r, glide=0.04)
    y += lp(nz, 600, 2) * np.exp(-t / 0.014) * 1.2 + bp(nz, 800, 4000, 1) * np.exp(-t / 0.004) * 0.4
    if kind == "puck":
        up = 0.2
        tu = tt(up)
        pre = sqw(262 * 2 ** (1.3 * (tu / up) ** 0.7), 0.25, 4000) * (tu / up) ** 0.5 * 0.35
        y = y * 0.9 + sqw(520 * 2 ** (-0.9 * t / d), 0.5, 2500) * np.exp(-t / 0.09) * 0.3
        return np.concatenate([fades(pre, 0.003, 0.004), fades(y, 0.0, 0.05)]), up
    return fades(y, 0.0, 0.05), 0.0


def clack(r):
    """a painted backdrop swapped in one go: slapstick clack (two boards, a flam) + a soft canvas flap"""
    d = 0.3
    t = tt(d)
    y = np.zeros(len(t))
    for tm, a in [(0.0, 1.0), (0.013, 0.7)]:
        c = modal(d - tm - 0.002, [(410 * r.uniform(0.95, 1.05), 1.0, 0.03), (985, 0.8, 0.02), (1740, 0.55, 0.012), (2920, 0.35, 0.008),
                                   (4300, 0.2, 0.005)], r)
        c += bp(r.standard_normal(len(c)), 700, 8000, 1) * np.exp(-np.arange(len(c)) / SR / 0.0035) * 1.3
        _place_mono(y, c * a, tm)
    y += lp(r.standard_normal(len(t)), 900, 1) * np.exp(-((t - 0.05) / 0.03) ** 2) * 0.25
    return fades(y, 0.0, 0.04)


def hm(r):
    """a wordless 'hm?': a muted reed that sits, then curls up a fourth"""
    d = 0.42
    n = ns(d)
    t = np.arange(n) / SR
    u = t / d
    f = 185 * 2 ** ((5 / 12) * np.clip((u - 0.35) / 0.5, 0, 1) ** 1.5)
    y = peq(lp(sqw(f, 0.4, 1500) + 0.5 * triw(f), 1100, 2), 280, 6, 2.0)
    return fades(y * (1 - np.exp(-t / 0.03)) * np.clip((d - t) / 0.08, 0, 1) * (0.8 + 0.2 * u), 0.005, 0.03)


def hoof(r, bright=1.0):
    d = 0.12
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = modal(d, [(r.uniform(190, 250), 1.0, 0.03), (r.uniform(480, 680), 0.6, 0.015), (r.uniform(1100, 1500), 0.3 * bright, 0.008)], r)
    return y + bp(nz, 600, 5000, 1) * np.exp(-t / 0.003) * 0.7 * bright + lp(nz, 250, 2) * np.exp(-t / 0.02) * 0.8


def gallop(r, dur=0.7):
    """a rider galloping toward us from deep inside a painting: da-da-DUM groups, far and dull -> near and bright"""
    n = ns(dur + 0.15)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        u = tm / dur
        for dt, a in [(0.0, 0.7), (0.07 * (1 - 0.3 * u), 0.8), (0.14 * (1 - 0.3 * u), 1.0)]:
            if tm + dt < dur + 0.02:
                g = 10 ** ((-20 + 20 * min(1.0, (tm + dt) / dur) ** 0.8) / 20)
                _place_mono(y, lp(hoof(r, 0.3 + 0.7 * u), 700 + 6000 * u ** 1.5, 1) * a * g, tm + dt)
        tm += 0.27 * (1 - 0.3 * u)
    t = np.arange(n) / SR
    return fades(y + lp(colored(n, r, 1.5), 120, 2) * np.clip(t / dur, 0, 1) ** 2 * 0.5, 0.005, 0.05)


def burst(r, dur=0.43):
    """the rider bursting out of the canvas: pop of the canvas, then a whoosh that swells into the landing"""
    y = whoosh(dur + 0.12, r, dur * 0.95, 300, 3800, 1.0, 0.05, 0.3) * 0.9
    t = np.arange(len(y)) / SR
    y += bp(r.standard_normal(len(y)), 300, 5500, 1) * np.exp(-t / 0.03) * 1.3
    y += np.sin(phase(85 * (1 + 0.5 * np.exp(-t / 0.02)))) * np.exp(-t / 0.07) * 0.9
    return y


def land(r):
    """a horse and an armoured rider landing on a stone floor: deep boom, four hooves, armour rattle"""
    d = 1.5
    n = ns(d)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    y = np.sin(phase(44 * (1 + 0.8 * np.exp(-t / 0.03)))) * np.exp(-t / 0.3) * 3.0
    y += lp(nz, 320, 2) * np.exp(-t / 0.05) * 2.0 + bp(nz, 300, 5000, 1) * np.exp(-t / 0.012) * 1.2
    for tm, a in [(0.0, 1.0), (0.045, 0.8), (0.1, 0.7), (0.19, 0.5)]:
        _place_mono(y, hoof(r, 1.0) * a * 1.5, tm)
    _place_mono(y, rattle(0.6, r, 55, np.exp(-np.linspace(0, 1, ns(0.6)) * 3), heavy=True) * 0.45, 0.03)
    return fades(y, 0.0, 0.3)


def room_tone(dur, r):
    """a big stone hall: low air rumble + a faint draught (stereo)"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = lp(colored(n, r, 1.6), 220, 2) + 0.12 * bp(colored(n, r, 1.0), 400, 1400, 1) * (0.7 + 0.3 * smooth_noise(n, r, 0.3))
    return out


# ================================================================ round 2: cues added by the locked picture
def crow(r, caws=2):
    """a distant crow: harsh nasal 'kraa' (buzzy pulse through 'a' formants, pitch falling), caws ~0.4 s apart"""
    out = np.zeros(ns(0.45 * caws + 0.4))
    for k in range(caws):
        d = r.uniform(0.22, 0.3)
        n = ns(d)
        t = np.arange(n) / SR
        f0 = r.uniform(520, 600) * (1 - 0.18 * t / d) * (1 + 0.02 * smooth_noise(n, r, 40.0))
        src = sqw(f0, 0.18, 7000) + 0.5 * r.standard_normal(n) * (0.5 + 0.5 * np.sin(phase(f0)))
        y = resbank(src, [(1150, 6, 1.0), (1650, 7, 0.8), (2700, 8, 0.4)])
        env = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.06, 0, 1) * (1 - 0.3 * t / d)
        _place_mono(out, y * env * (1 - 0.25 * k), k * r.uniform(0.38, 0.46))
    return lp(out, 5000, 1)


def glitch_ticks(r, dur=1.4, every=5 / 30):
    """the game dropping frames: a dry digital tick on every 5th frame, slightly different each time"""
    out = np.zeros(ns(dur + 0.05))
    k = 0
    while k * every < dur:
        L = 0.018
        f = float(r.choice([1046.5, 1568.0, 2093.0]))
        x = sqw(cst(f, L), 0.125, 7000) * np.exp(-tt(L) / 0.006)
        x += hp(r.standard_normal(ns(L)), 4000) * np.exp(-tt(L) / 0.0015) * 0.6
        _place_mono(out, fades(x, 0.0003, 0.003) * r.uniform(0.6, 1.0), k * every)
        k += 1
    return out


def shake_rattle(r, dur=0.8):
    """a small plastic console rattling on its stool: fast knocks + loose-part buzz, growing"""
    n = ns(dur)
    env = np.linspace(0.3, 1.0, n) * np.clip((dur - np.arange(n) / SR) / 0.08, 0, 1)
    knocks = fit(stick_slip(dur, np.linspace(14, 22, 16), r, 0.15, env), n)
    y = resbank(knocks, [(380, 8, 1.0), (720, 10, 0.7), (1300, 12, 0.4), (2400, 14, 0.2)])
    y += fit(rattle(dur, r, 50, env, heavy=False), n) * 0.4
    return fades(y, 0.005, 0.05)


def zip_fx(r, kind="fairy"):
    """'fairy' = a quick glassy zip with a dotted bell trail; 'snail' = a comic slide-whistle zip past the lens"""
    if kind == "snail":
        d = 0.38
        t = tt(d)
        f = 700 * 2 ** (1.6 * (t / d) ** 0.6)
        y = np.sin(phase(f)) * np.sin(np.pi * t / d) ** 0.8 * 0.8 + 0.2 * triw(f)
        y += bp(colored(len(t), r, 0.5), 1200, 6000, 1) * np.sin(np.pi * t / d) ** 2 * 0.3
        return fades(y, 0.005, 0.03)
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    f = 1800 * 2 ** (np.sin(np.pi * t / d * 2) * 0.6)
    y = np.sin(phase(f)) * np.exp(-((t - 0.1) / 0.09) ** 2) * 0.3
    y += bp(colored(n, r, 0.4), 2500, 9000, 1) * np.exp(-((t - 0.1) / 0.08) ** 2) * 0.5
    y += flutter(r, d)[:n] * 0.9
    return fades(y, 0.003, 0.1)


def paper_strain(r, dur=0.3):
    """a sheet pulled taut before it tears: dry fibrous creak"""
    n = ns(dur)
    env = np.linspace(0.2, 1, n)
    imp = fit(stick_slip(dur, np.linspace(60, 140, 16), r, 0.3, env), n)
    y = resbank(imp, [(1800, 5, 1.0), (3200, 6, 0.6), (5200, 7, 0.3)])
    y += bp(colored(n, r, 0.3), 2000, 8000, 1) * env * 0.15
    return fades(y, 0.01, 0.02)


def conveyor(dur, r):
    """a little belt conveyor: motor hum, belt hiss, a roller click every 0.32 s"""
    n = ns(dur)
    t = np.arange(n) / SR
    hum = lp(sqw(cst(90, dur), 0.35, 700), 400, 2) * 0.5 + np.sin(TAU * 180 * t) * 0.08
    hiss = bp(colored(n, r, 0.6), 600, 3000, 1) * 0.12 * (0.85 + 0.15 * smooth_noise(n, r, 2.0))
    clk = reson(fit(impulse_train(np.arange(0.05, dur, 0.32), dur), n), 1400, 10) * 3.0
    return fades(hum + hiss + clk, 0.25, 0.25)


def bump(r):
    """the queue bunching up: three soft cardboard-figure bumps"""
    y = np.zeros(ns(0.55))
    for tm, a in [(0.0, 1.0), (0.12, 0.7), (0.22, 0.5)]:
        x = modal(0.2, [(r.uniform(220, 300), 1.0, 0.03), (r.uniform(600, 800), 0.4, 0.015)], r)
        x += lp(r.standard_normal(len(x)), 900, 1) * np.exp(-tt(0.2) / 0.01) * 0.6
        _place_mono(y, x * a, tm)
    return fades(y, 0.0, 0.05)


def foot_tap(r, taps=3, gap=0.27):
    """impatient shoe taps on a paved yard"""
    y = np.zeros(ns(gap * taps + 0.3))
    for k in range(taps):
        d = 0.12
        t = tt(d)
        x = np.sin(phase(r.uniform(140, 170) * (1 + 0.3 * np.exp(-t / 0.006)))) * np.exp(-t / 0.018)
        x += bp(r.standard_normal(len(t)), 1200, 6000, 1) * np.exp(-t / 0.003) * 0.7
        _place_mono(y, x * r.uniform(0.8, 1.0), k * gap)
    return y


def thud(r):
    """the big console set down hard: dull heavy thud + plastic body knock"""
    d = 0.5
    t = tt(d)
    y = np.sin(phase(62 * (1 + 0.7 * np.exp(-t / 0.02)))) * np.exp(-t / 0.09) * 1.6
    y += lp(r.standard_normal(len(t)), 500, 2) * np.exp(-t / 0.02) * 1.0
    y += modal(d, [(260, 0.5, 0.05), (480, 0.35, 0.03), (900, 0.2, 0.015)], r)
    return fades(y, 0.0, 0.05)


def tug(r):
    """a hand gripping and tugging a wooden flat: short creak + knock"""
    y = fit(creak(0.28, r, 70, 120, WOOD, rough=0.25, noise=0.02), ns(0.4))
    _place_mono(y, modal(0.15, [(320, 0.6, 0.03), (780, 0.3, 0.015)], r), 0.0)
    return fades(y, 0.002, 0.04)


def neigh(r):
    """a cartoon horse whinny: high wobbling voice falling in a trill, then a snort"""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    f0 = 620 * 2 ** (-1.1 * (t / d) ** 1.2) * (1 + 0.09 * np.sin(TAU * 11 * t) * np.clip(t / 0.15, 0, 1))
    forms = np.tile(np.array(VOW["ae"], float), (n, 1))
    amp = np.clip(t / 0.04, 0, 1) * np.clip((d - t) / 0.25, 0, 1)
    y = vox(f0, forms, amp, r, scale=1.25, breath=0.35, fmax=6000)
    sn = bp(r.standard_normal(ns(0.18)), 300, 2500, 1) * np.exp(-tt(0.18) / 0.05) * 0.9
    out = np.zeros(ns(d + 0.3))
    _place_mono(out, y, 0.0)
    _place_mono(out, sn, d + 0.05)
    return out
