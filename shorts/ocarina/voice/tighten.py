# Aperta as pausas da narração: raw.mp3 + raw_words.json -> voice.wav (48 kHz mono) + words.json (tempos novos, linha de cada palavra).
# As pausas de 0,8 s entre frases da síntese viram ~0,27 s (0,42 s entre falas; algumas pausas de piada ficam maiores).
import json, os, re, subprocess, sys, wave
import numpy as np
from script_lines import LINES
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.path.expanduser("~/Video_youtube/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
SR = 48000
SENT, BEAT, LEAD, TAIL = 0.25, 0.40, 0.10, 1.2
# pausas sob medida: (linha 1-based, palavra antes da pausa) -> segundos
CUSTOM = {(1, "celular"): 0.55, (3, "foto"): 0.50, (3, "uma#end"): 0.45, (6, "fada#last"): 0.42, (7, "quebrou"): 0.32, (8, "atraso"): 0.50,
          (9, "cartucho"): 0.50, (11, "nove"): 0.34, (12, "quadro"): 0.60}

subprocess.run([FF, "-y", "-loglevel", "error", "-i", os.path.join(HERE, "raw.mp3"), "-ar", str(SR), "-ac", "1", os.path.join(HERE, "raw.wav")], check=True)
w = wave.open(os.path.join(HERE, "raw.wav")); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
words = json.load(open(os.path.join(HERE, "raw_words.json"), encoding="utf-8"))
norm = lambda s: re.sub(r"[^\wáàâãéêíóôõúç]", "", s.lower())
# linha de cada palavra
li, toks = [], [[norm(t) for t in re.split(r"[\s]+", L) if norm(t)] for L in LINES]
k = 0
for n, tk in enumerate(toks):
    for t in tk:
        assert norm(words[k]["w"]) == t, (n + 1, t, words[k]["w"])
        li.append(n + 1); k += 1
assert k == len(words), (k, len(words))

hop = int(0.005 * SR)
rms = np.sqrt(np.convolve(x**2, np.ones(hop * 2) / (hop * 2), "same"))
thr = max(1e-4, 0.02 * np.percentile(rms, 95))
cuts = []  # (start_sample, end_sample) removed
def target(i):
    n, wd = li[i], norm(words[i]["w"])
    last_in_line = i + 1 == len(words) or li[i + 1] != n
    for (ln, key), v in CUSTOM.items():
        if ln != n: continue
        kw, _, flag = key.partition("#")
        if kw != wd: continue
        if flag == "end" and not last_in_line: continue
        if flag == "last" and not (norm(words[i + 1]["w"]) == "návi"): continue
        return v
    return BEAT if last_in_line else SENT
for i in range(len(words) - 1):
    g0, g1 = words[i]["t1"], words[i + 1]["t0"]
    if g1 - g0 < 0.45: continue
    a, b = int((g0 - 0.03) * SR), int((g1 + 0.03) * SR)
    sil = rms[a:b] < thr
    # maior trecho silencioso
    best, cur, bs = (0, 0), 0, 0
    for j, s in enumerate(sil):
        if s:
            if cur == 0: bs = j
            cur += 1
            if cur > best[1] - best[0]: best = (bs, bs + cur)
        else: cur = 0
    s0, s1 = a + best[0], a + best[1]
    remove = min((g1 - g0) - target(i), (s1 - s0) / SR - 0.06)
    if remove <= 0.02: continue
    mid = (s0 + s1) // 2; r = int(remove * SR)
    cuts.append((mid - r // 2, mid - r // 2 + r))
# início: silêncio até a 1a palavra -> LEAD
lead0 = int(max(0, words[0]["t0"] - LEAD) * SR)
out, pos, removed, shifts = [], lead0, lead0 / SR, []
F = int(0.006 * SR)
for c0, c1 in cuts:
    seg = x[pos:c0].copy(); seg[-F:] *= np.linspace(1, 0, F); out.append(seg)
    removed += (c1 - c0) / SR; shifts.append((c1 / SR, removed)); pos = c1
    x[pos:pos + F] *= np.linspace(0, 1, F)
end = int((words[-1]["t1"] + 0.25) * SR)
out.append(x[pos:end]); out.append(np.zeros(int(TAIL * SR)))
y = np.concatenate(out)
y[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
def sh(t):
    d = lead0 / SR
    for tc, rm in shifts:
        if t >= tc - 1e-6: d = rm
    return round(t - d, 3)
res = [{"w": wd["w"], "t0": sh(wd["t0"]), "t1": sh(wd["t1"]), "line": li[i]} for i, wd in enumerate(words)]
ww = wave.open(os.path.join(HERE, "voice.wav"), "wb"); ww.setnchannels(1); ww.setsampwidth(2); ww.setframerate(SR)
ww.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); ww.close()
json.dump(res, open(os.path.join(HERE, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("cuts", len(cuts), "voice.wav", round(len(y) / SR, 2), "s; last word ends", res[-1]["t1"])
for n in range(1, len(LINES) + 1):
    ws = [r for r in res if r["line"] == n]
    print(f"{n:2d} {ws[0]['t0']:6.2f}-{ws[-1]['t1']:6.2f} f{round(ws[0]['t0']*30):4d}-{round(ws[-1]['t1']*30):4d}  {LINES[n-1][:60]}")
