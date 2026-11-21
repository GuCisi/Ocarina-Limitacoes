# One command for the whole soundtrack: python build.py
# renders score + SFX (cached by source hash), mixes to out/, then verifies the files with ffprobe.
import os
import subprocess
import mix

if __name__ == "__main__":
    mix.main()
    probe = mix.FFMPEG.replace("ffmpeg.exe", "ffprobe.exe")
    for f in ("mix.wav", "voice.wav", "music.wav", "sfx.wav"):
        r = subprocess.run([probe, "-v", "error", "-show_entries", "stream=sample_rate,channels,duration_ts,duration",
                            "-of", "compact=p=0", os.path.join(mix.OUT, f)], capture_output=True, text=True)
        print(f"ffprobe {f}: {r.stdout.strip()}")
