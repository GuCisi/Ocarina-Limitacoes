# Narração do short "Nada mal para oito fotos": edge-tts (voz neural pt-BR) -> voice.mp3 + words.json (tempos por palavra).
# uso: python tts.py [voz] [rate]   ex.: python tts.py pt-BR-AntonioNeural +8%
import asyncio, json, sys, os
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "pt-BR-AntonioNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "+20%"
TAG = sys.argv[3] if len(sys.argv) > 3 else ""

from script_lines import LINES


async def main():
    text = "\n".join(LINES)
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words, audio = [], bytearray()
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio.extend(ch["data"])
        elif ch["type"] == "WordBoundary":
            t0 = ch["offset"] / 1e7
            words.append({"w": ch["text"], "t0": round(t0, 3), "t1": round(t0 + ch["duration"] / 1e7, 3)})
    with open(os.path.join(HERE, f"raw{TAG}.mp3"), "wb") as f:
        f.write(audio)
    with open(os.path.join(HERE, f"raw_words{TAG}.json"), "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=0)
    print(VOICE, RATE, "words:", len(words), "last word ends:", words[-1]["t1"], "s")


asyncio.run(main())
