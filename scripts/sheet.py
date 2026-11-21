# Contact sheets from stills: python scripts/sheet.py <prefix> <outPrefix> [cols=5] [rows=3] [cellW=270]
# Takes every <prefix><frame>.jpg, sorts by frame, burns the frame number in (reviewer only), writes <outPrefix>NN.jpg.
import glob, os, re, sys
from PIL import Image, ImageDraw

prefix, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 3
cw = int(sys.argv[5]) if len(sys.argv) > 5 else 270
ch = cw * 16 // 9
files = sorted(((int(re.search(r"(\d+)\.jpg$", f).group(1)), f) for f in glob.glob(prefix + "*.jpg") if re.search(re.escape(os.path.basename(prefix)) + r"\d+\.jpg$", os.path.basename(f))))
per = cols * rows
for k in range(0, len(files), per):
    S = Image.new("RGB", (cw * cols, ch * rows), "black"); d = ImageDraw.Draw(S)
    for j, (n, f) in enumerate(files[k:k + per]):
        x, y = (j % cols) * cw, (j // cols) * ch
        S.paste(Image.open(f).convert("RGB").resize((cw, ch)), (x, y))
        d.rectangle([x, y, x + 40, y + 13], fill="black"); d.text((x + 3, y + 1), str(n), fill="yellow")
    name = f"{out}{k // per:02d}.jpg"; S.save(name, quality=86); print(name, [n for n, _ in files[k:k + per]])
