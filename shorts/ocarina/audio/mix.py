# Final mix of "Nada mal para oito fotos": the narration (gain only) + original score (ducked under every word,
# per-section level automation relative to the voice) + synthesized SFX stem. Master gain to -14 LUFS integrated,
# own 4x-oversampled look-ahead limiter for <= -1 dBTP, exactly 70.800 s / 48 kHz / stereo / 24-bit.
# Writes out/mix.wav + out/voice.wav, out/music.wav, out/sfx.wav (stems at mix gain, pre-limiter) and out/cues.md.
# Rendered stems are cached in _cache/ keyed by a hash of the source files, so editing a cue re-renders only what changed.
import os
import time
import json
import hashlib
import subprocess
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, short_term, lra, true_peak, fades)
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(HERE, "_cache")
FFMPEG = os.path.expanduser("~/Video_youtube/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
N = ns(T.DUR)                    # 3,398,400 samples = 70.800 s
TARGET_LUFS = -14.0
CEIL_DBTP = -1.2                 # limiter ceiling (spec: true peak <= -1 dBTP)
DUCK_DB = -5.0                   # music dip under every word (keyed from words.json), 80 ms attack / 150 ms release

# music level per section, LU relative to the voice in that section (after ducking). The user's standard (+3 dB
# music vs the old pipeline default of -13) gives a bed around -10; music-led moments (hook hit, party, fanfare,
# final chord) sit a little higher, the tiptoe and the castle lower.
MUSIC_TARGET = {"hook": -10.5, "build1": -12.0, "build2": -11.5, "broken": -12.0, "party": -11.0, "silence": -30.0,
                "tiptoe": -12.0, "triumph": -11.0, "castle": -11.5, "final": -13.0, "bloom": -7.0}
# "bloom" (after the last word) has no voice: its target is relative to the voice of the section before it.
HARD = [T.MT["stop"] + 0.6, T.MT["tiptoe"] - 0.05, T.MT["word_end"] + 0.04]   # instant switches (silence / word end)
VOICE_MARGIN = 10.0     # adaptive duck: keep voice - (music + sfx) >= this in every 400 ms window centred on a word
MAX_EXTRA_M, MAX_EXTRA_S = -14.0, -6.0     # deepest extra dip for the music / the sfx
END_MARGIN = 11.0       # through the end of the last word (69.45 s) the music alone stays this far under the voice
PICTURE_CUES = os.path.expanduser("~/Video_youtube/out/ocarina/cues.json")
MUSIC_SERVED = {"koto": "koto", "fanfare": "fanfare", "organ": "organ", "final_chord": "final"}


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def src_hash(*names):
    h = hashlib.sha1()
    for n in names:
        h.update(open(os.path.join(HERE, n), "rb").read())
    return h.hexdigest()[:10]


def cached(name, deps, fn):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, f"{name}_{src_hash(*deps)}.npy")
    if os.path.exists(p):
        log("cache hit", os.path.basename(p))
        return np.load(p).astype(np.float64), True
    x = fn()
    for f in os.listdir(CACHE):              # drop stale renders of this stem
        if f.startswith(name + "_"):
            os.remove(os.path.join(CACHE, f))
    np.save(p, np.asarray(x, np.float32))
    return x, False


# ================================================================ voice
def load_voice():
    x, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out), v


def speech_spans(words, merge=0.12):
    sp = []
    for w in words:
        s, e = w["s"], w["e"]
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.06, att=0.03, rel=0.06):
    """sidechain-style gain curve: one-pole follower on the word gate, then a 100 ms smoothing -> ~80-150 ms moves"""
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    env = ndimage.uniform_filter1d(env, 100, mode="nearest")
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


# ================================================================ music level automation
def section_db(m_ducked, v):
    import music
    secs = music.SECTIONS
    gains = {}
    Lv_prev = None
    for name, a, b in secs:
        seg = slice(ns(a), ns(b))
        Lm, Lv = integrated(m_ducked[:, seg]), integrated(v[:, seg])
        if not np.isfinite(Lm):
            gains[name] = 0.0
        elif name == "bloom" and Lv_prev is not None:
            gains[name] = Lv_prev + MUSIC_TARGET[name] - Lm
        elif not np.isfinite(Lv) or name == "silence":
            gains[name] = None
        else:
            gains[name] = Lv + MUSIC_TARGET[name] - Lm
        if np.isfinite(Lv):
            Lv_prev = Lv
    prev = 0.0
    for name, a, b in secs:                     # sections without voice keep the neighbour's gain
        if gains[name] is None:
            gains[name] = prev
        prev = gains[name]
    t = np.arange(N) / SR
    curve = np.zeros(N)
    for name, a, b in secs:
        curve[t >= a] = gains[name]
    sm = ndimage.uniform_filter1d(curve, ns(0.4), mode="nearest")
    hard = np.zeros(N, bool)
    for tb in HARD:
        hard[ns(tb - 0.25): ns(tb + 0.25)] = True
    return np.where(hard, curve, sm), gains


# ================================================================ adaptive (voice-keyed) duck
def _p(db):
    return 10 ** (np.asarray(db) / 10)


def adaptive_duck(v, m, s, words, iters=5):
    """deepen the dip where the fixed duck is not enough: in each 400 ms window centred on a word, find how far
    voice - (music + sfx) falls short of VOICE_MARGIN and take it off the music (then, if music is already out of
    the way, a little off the sfx). Gain curves are min-filtered over the window and smoothed (~100-150 ms moves)."""
    hop = 0.01
    nwin = int(T.DUR / hop) + 1
    tc = np.arange(nwin) * hop + 0.2
    sp = np.zeros(nwin, bool)
    for w in words:
        sp |= (tc >= w["s"] - 0.02) & (tc <= w["e"] + 0.02)
    xm = np.zeros(nwin)
    xs = np.zeros(nwin)
    Mv = momentary(v, hop)[:nwin]
    for it in range(iters):
        gm_ = curve_to_gain(xm)
        gs_ = curve_to_gain(xs)
        Mm = momentary(m * gm_[None, :], hop)[:nwin]
        Ms = momentary(s * gs_[None, :], hop)[:nwin]
        k = len(Mv)
        short = (Mv - VOICE_MARGIN) - 10 * np.log10(_p(Mm[:k]) + _p(Ms[:k]) + 1e-30)
        short = np.where(sp[:k] & (Mv > -70), np.minimum(short, 0.0), 0.0)
        # end of the last word: music alone at least END_MARGIN under
        endw = sp[:k] & (tc[:k] > T.MT["word_end"] - 0.6)
        short_m_end = np.where(endw, np.minimum((Mv - END_MARGIN) - Mm[:k], 0.0), 0.0)
        music_loud = Mm[:k] > Ms[:k] - 6
        add_m = np.where(music_loud, short, short * 0.3)
        add_m = np.minimum(add_m, short_m_end)
        add_s = np.where(music_loud & (xm[:k] > MAX_EXTRA_M + 1), 0.0, short * 0.5)
        xm[:k] = np.maximum(xm[:k] + add_m, MAX_EXTRA_M)
        xs[:k] = np.maximum(xs[:k] + add_s, MAX_EXTRA_S)
    return curve_to_gain(xm), curve_to_gain(xs), xm, xs


def curve_to_gain(x, hop=0.01):
    """window-centred dB curve -> per-sample gain: min over the 400 ms window it was measured on, then 120 ms smoothing"""
    y = ndimage.minimum_filter1d(x, 41, mode="nearest")
    y = ndimage.uniform_filter1d(y, 12, mode="nearest")
    tcs = np.arange(len(x)) * hop + 0.2
    return dbg(np.interp(np.arange(N) / SR, tcs, y))


def picture_check(C, gs, gm):
    """every cue of the locked picture served by a sound within 1 frame; every camera kick lands on an audible hit"""
    if not os.path.exists(PICTURE_CUES):
        return [], [], []
    d = json.load(open(PICTURE_CUES, encoding="utf-8"))
    ev = [(c.t * T.FPS, c.name) for c in C if c.kind == "event"]
    rows, missing = [], []
    for c in d["cues"]:
        f, nm = c["f"], c["name"]
        if nm in MUSIC_SERVED:
            rows.append((f, nm, f"music: {MUSIC_SERVED[nm]} anchor f{T.MUSIC[MUSIC_SERVED[nm]]}"))
            continue
        hit = [e for e in ev if abs(e[0] - f) <= 1.0 and e[1] == nm]
        if hit:
            rows.append((f, nm, f"sfx '{hit[0][1]}' at f{hit[0][0]:.0f}"))
        else:
            near = [e for e in ev if abs(e[0] - f) <= 1.0]
            rows.append((f, nm, "NOT SERVED" + (f" (nearby: {near[0][1]})" if near else "")))
            missing.append((f, nm))
    kicks = []
    env = lambda x, a, b: 20 * np.log10(np.sqrt(np.mean(x[:, max(0, ns(a)): ns(b)] ** 2)) + 1e-12)
    bed = gs + gm
    for k in d["kicks"]:
        t = k["f"] / T.FPS
        # onset: 20 ms energy right at the kick (+-1 frame) vs the 60 ms just before
        best = max(env(gs, t + dt, t + dt + 0.02) - env(gs, t + dt - 0.08, t + dt - 0.02) for dt in np.arange(-1, 1.01, 0.25) / T.FPS)
        lvl = max(env(bed, t + dt, t + dt + 0.03) for dt in np.arange(-1, 1.01, 0.25) / T.FPS)
        kicks.append((k["f"], k["g"], best, lvl))
    return rows, missing, kicks


# ================================================================ limiter
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve"""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3


# ================================================================ report helpers
def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def speech_margin(v, bed, words):
    """momentary (400 ms) voice - bed over windows centred on spoken words"""
    Mv, Mb = momentary(v), momentary(bed)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    sp = np.zeros(len(tc), bool)
    for w in words:
        sp |= (tc >= w["s"] + 0.03) & (tc <= w["e"] - 0.03)
    sp &= (Mv > lufs(v) - 10) & (Mb > -70)
    d = Mv[sp] - Mb[sp]
    worst = sorted(zip(d, tc[sp]))[:6]
    return float(np.median(d)), float(np.percentile(d, 10)), float(d.min()), worst


def rms_db(x, a, b):
    s = x[:, max(0, ns(a)): ns(b)]
    return 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-12), 20 * np.log10(np.abs(s).max() + 1e-12)


def ffmpeg_ebur(path):
    try:
        # this ffmpeg build has no ebur128 filter; loudnorm's analysis pass reports BS.1770 input loudness / true peak
        r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, timeout=300)
        txt = r.stderr
        d = json.loads(txt[txt.rfind("{"): txt.rfind("}") + 1])
        return (f"ffmpeg loudnorm analysis: input_i {d['input_i']} LUFS, input_tp {d['input_tp']} dBTP, "
                f"input_lra {d['input_lra']} LU")
    except Exception as e:  # noqa
        return f"ffmpeg check failed: {e}"


# ================================================================ main
def main():
    t_start = time.time()
    os.makedirs(OUT, exist_ok=True)
    words = T.words(os.path.join(ROOT, "voice", "words.json"))
    spans = speech_spans(words)
    v, v_raw = load_voice()
    v_ref = integrated(v)
    log(f"voice: {v_ref:.2f} LUFS (as stereo), TP {true_peak(v):.2f} dBTP, file {len(v_raw) / SR:.3f} s")

    import music
    mdeps = ["music.py", "instruments.py", "timeline.py", "dsp.py"]
    map_path = os.path.join(CACHE, f"music_map_{src_hash(*mdeps)}.json")

    def _m():
        bb = music.build()
        out, levels = music.render(bb, ref=-20.0)
        log("score track levels (measured, target LUFS):", levels)
        return out
    m_raw, _ = cached("music", mdeps, _m)
    if not os.path.exists(map_path):          # the music map is written by build(); cached with the render
        if not music.LAST_CUES:
            music.build()
        json.dump(music.LAST_CUES, open(map_path, "w"))
    mmap = json.load(open(map_path))
    log("music", f"{lufs(m_raw):.2f} LUFS raw")
    dk = duck_db(spans)
    m_d = m_raw * dbg(dk)[None, :]
    sec_curve, sec_gains = section_db(m_d, v)
    m = m_d * dbg(sec_curve)[None, :]

    import sfx
    holder = {}

    def _s():
        out, C = sfx.render(v_ref)
        holder["C"] = C
        return out
    s_st, hit = cached("sfx", ["sfx.py", "sfx_gen.py", "timeline.py", "dsp.py"], _s)
    if "C" not in holder:
        holder["C"] = sfx.cues()
    C = holder["C"]
    log("sfx", f"{lufs(s_st):.2f} LUFS")

    # ---------------- adaptive duck (voice-keyed, words.json) then master
    g_m, g_s, xm, xs = adaptive_duck(v, m, s_st, words)
    m = m * g_m[None, :]
    s_st = s_st * g_s[None, :]
    log(f"adaptive duck: music extra dip down to {xm.min():.1f} dB ({(xm < -0.5).mean() * 100:.1f} % of windows), "
        f"sfx extra dip down to {xs.min():.1f} dB ({(xs < -0.5).mean() * 100:.1f} %)")
    mix0 = v + m + s_st
    G = TARGET_LUFS - lufs(mix0)
    for it in range(6):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L
    y = fades(y, 0.0, 0.03)
    assert y.shape == (2, N)
    gv, gm, gs = v * dbg(G), m * dbg(G), s_st * dbg(G)
    write_wav(os.path.join(OUT, "mix.wav"), y)
    write_wav(os.path.join(OUT, "voice.wav"), gv)
    write_wav(os.path.join(OUT, "music.wav"), gm)
    write_wav(os.path.join(OUT, "sfx.wav"), gs)
    log("wrote out/mix.wav + stems")

    # ---------------- measure
    I, TP, LRA = lufs(y), true_peak(y), lra(y)
    grdb = -20 * np.log10(g3)
    gr = dict(max=float(grdb.max()), pct01=float((grdb > 0.1).mean() * 100))
    med, p10, mn, worst = speech_margin(gv, gm + gs, words)
    endw = [w for w in words if w["e"] > T.MT["word_end"] - 0.6]
    e_med, e_p10, e_min, _ = speech_margin(gv, gm + gs, endw)
    em_med, em_p10, em_min, _ = speech_margin(gv, gm, endw)
    log(f"last word 'fotos': voice - bed min {e_min:.1f} dB, voice - music min {em_min:.1f} dB")
    rows, missing, kicks = picture_check(C, gs, gm)
    log(f"picture cues: {len(rows)} ({len(rows) - len(missing)} served), missing: {missing}")
    for f, g, rise, lvl in kicks:
        log(f"  kick f{f} g{g}: sfx onset +{rise:.1f} dB within 1 frame, bed {lvl:.1f} dBFS")
    med_m, p10_m, _, _ = speech_margin(gv, gm, words)
    # voice intact: the stem is the file times one gain
    vchk = gv[0, : len(v_raw)] / dbg(G) - v_raw[:N]
    stats = dict(I=I, TP=TP, LRA=LRA, G=G, voice_I=lufs(gv), music_I=lufs(gm), sfx_I=lufs(gs),
                 margin_med=med, margin_p10=p10, margin_min=mn, music_margin_med=med_m, music_margin_p10=p10_m,
                 voice_err=float(np.abs(vchk).max()), gr=gr, end_min=e_min, end_music_min=em_min,
                 worst=[(round(float(a), 1), round(float(b), 2)) for a, b in worst], rows=rows, missing=missing, kicks=kicks)
    log(json.dumps({k: (round(x, 2) if isinstance(x, float) else x) for k, x in stats.items() if k not in ("rows", "kicks", "missing", "worst")}))
    log("worst speech windows (margin dB, t):", [(round(d, 1), round(t, 2)) for d, t in worst])
    log("section gains dB:", {k: round(x, 1) for k, x in sec_gains.items()})
    eb = ffmpeg_ebur(os.path.join(OUT, "mix.wav"))
    print(eb)
    # stem RMS around every cue (window = cue - 0.05 .. cue + 0.4 s)
    probe = []
    for c in sorted(C, key=lambda c: c.t):
        if c.kind != "event":
            continue
        rs, ps = rms_db(gs, c.t - 0.05, c.t + 0.4)
        rm, _ = rms_db(gm, c.t - 0.05, c.t + 0.4)
        rv, _ = rms_db(gv, c.t - 0.05, c.t + 0.4)
        probe.append((c, rs, ps, rm, rv))
    print("cue probe (dBFS RMS in [t-0.05, t+0.4]): sfx / sfx peak / music / voice")
    for c, rs, ps, rm, rv in probe:
        print(f"  {c.t:6.2f} f{c.t * T.FPS:6.1f} {c.name:12s} sfx {rs:6.1f} pk {ps:6.1f} | music {rm:6.1f} | voice {rv:6.1f}")
    mprobe = [(nm, *rms_db(gm, t - 0.05, t + 0.4)) for nm, t in sorted(T.MT.items(), key=lambda kv: kv[1])]
    print("music anchors (dBFS RMS / peak in [t-0.05, t+0.4]):")
    for nm, r_, p_ in mprobe:
        print(f"  {T.MT[nm]:6.2f} {nm:12s} {r_:6.1f} {p_:6.1f}")
    write_cues(C, stats, eb, v_ref + G, sec_gains, mmap)
    log(f"done in {time.time() - t_start:.0f} s")
    return stats


def write_cues(C, s, eb, vI, sec_gains, mmap):
    L = []
    w = L.append
    w("# Nada mal para oito fotos - sound cue sheet")
    w("")
    w("All sound is original: synthesized with numpy/scipy (`sfx_gen.py`, `instruments.py`), placed from the one event table "
      "in `timeline.py` by `sfx.py` / `music.py`, mixed by `mix.py`. Rebuild everything with `python build.py`.")
    w("Voice = `voice/voice.wav`, gain only (no EQ, compression or timing change).")
    w("")
    w("## Files (`out/`)")
    w("| file | content |")
    w("|---|---|")
    w(f"| `mix.wav` | final mix, 48 kHz stereo 24-bit, {N} samples = {N / SR:.3f} s |")
    w("| `voice.wav` / `music.wav` / `sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |")
    w("")
    w("## Loudness (own BS.1770-4 meter)")
    w(f"- Integrated **{s['I']:.1f} LUFS**, true peak **{s['TP']:.1f} dBTP**, LRA {s['LRA']:.1f} LU; stems: voice {s['voice_I']:.1f}, "
      f"music {s['music_I']:.1f}, sfx {s['sfx_I']:.1f} LUFS; master gain {s['G']:+.2f} dB; limiter max GR {s['gr']['max']:.2f} dB "
      f"(active on {s['gr']['pct01']:.2f} % of samples)")
    w(f"- Voice on top: momentary (400 ms) voice - (music + sfx) over spoken words: median **{s['margin_med']:.1f} dB**, "
      f"10th percentile {s['margin_p10']:.1f} dB (voice - music alone: median {s['music_margin_med']:.1f}, p10 {s['music_margin_p10']:.1f})")
    w(f"- Worst windows (margin dB, centre s): {s['worst']}. Last word 'fotos' (ends 69.41 s): voice - bed min {s['end_min']:.1f} dB, "
      f"voice - music min {s['end_music_min']:.1f} dB; the final chord blooms at {T.MT['final']:.2f} s.")
    w(f"- Music: ducked {DUCK_DB:.0f} dB under every word (80-150 ms moves) plus an adaptive voice-keyed dip wherever "
      f"voice - (music + sfx) would fall under {VOICE_MARGIN} dB; section targets (LU vs voice) " +
      ", ".join(f"{k} {x:+.1f}" for k, x in MUSIC_TARGET.items()) + "; SFX events at naive - 6 dB.")
    w("")
    w("ffmpeg cross-check:")
    w("```")
    w(eb)
    w("```")
    w("")
    w("## SFX cues")
    w(f"level = the event's max momentary loudness, LU relative to the voice stem (naive -> applied, applied = naive - 6 for "
      f"events; beds are integrated). 'mix LUFS' = that loudness in the final mix (voice = {vI:.1f} LUFS integrated).")
    w("")
    w("| time s | frame | cue | what it sounds like | level LU (naive -> applied) | mix LUFS | pan |")
    w("|---|---|---|---|---|---|---|")
    for c in sorted(C, key=lambda c: (c.t, c.name)):
        kind = " (bed)" if c.kind == "bed" else ""
        lvl = f"{c.naive:+.0f}" if c.kind == "bed" else f"{c.naive:+.0f} -> {c.applied:+.0f}"
        meas = c.measured if c.measured is not None else c.applied
        w(f"| {c.t:.3f} | {c.t * T.FPS:.1f} | {c.name}{kind} | {c.desc} | {lvl} | {vI + meas:.1f} | {c.p:+.2f} |")
    w("")
    w("## Picture cues (out/ocarina/cues.json) -> sound")
    w("| frame | picture cue | served by |")
    w("|---|---|---|")
    for f, nm, how in s["rows"]:
        w(f"| {f} | {nm} | {how} |")
    w("")
    w("Camera kicks (sfx onset within +-1 frame, dB rise over the 60 ms before; bed level):")
    w("")
    w("| frame | kick | onset rise dB | bed dBFS |")
    w("|---|---|---|---|")
    for f, g, rise, lvl in s["kicks"]:
        w(f"| {f} | {g} | +{rise:.1f} | {lvl:.1f} |")
    w("")
    w("## Music map (original score, F major, 111-116 bpm)")
    w("| time s | frame | music |")
    w("|---|---|---|")
    for t, d in sorted(mmap):
        w(f"| {t:.2f} | {t * T.FPS:.0f} | {d} |")
    w("")
    w("Section gains applied to the score (dB): " + ", ".join(f"{k} {x:+.1f}" for k, x in sec_gains.items()) + ".")
    w("")
    w("## Changing cue times")
    w("Edit the frame in `timeline.py` (EVENTS for SFX, BEDS for ambience, MUSIC for score anchors) and run `python build.py`.")
    open(os.path.join(OUT, "cues.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
