"""Render one App Store screenshot set (one language) with a shared verb size.

Usage (from this folder, raw captures from an iPhone in the order of sets.json):
  python make_set.py tr out/tr shot1.png shot2.png shot3.png shot4.png shot5.png
  python make_set.py en out/en shot1.png ...
A "-" in place of a shot skips that slot (the verb size still counts all rows).
Output: 1320x2868 PNGs (iPhone 6.9"), background palette.primary #7C4DFF.
"""
import os, subprocess, sys, json, pathlib
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE)); import compose as C
SETS = json.loads((HERE / "sets.json").read_text(encoding="utf-8"))
def run(lang, shots, out_dir, bg="#7C4DFF"):
    rows = SETS[lang]
    d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    size = min(C.fit_font(v, C.MAX_VERB_W, C.VERB_SIZE_MAX, C.VERB_SIZE_MIN).size for v, _ in rows)
    out_dir = pathlib.Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, ASO_VERB_SIZE=str(size))
    files = []
    for i, ((v, desc), shot) in enumerate(zip(rows, shots), 1):
        if shot == "-":  # capture not taken yet: skip this slot, keep numbering
            continue
        out = out_dir / f"{i:02d}-{lang}.png"
        subprocess.run([sys.executable, str(HERE / "compose.py"), "--bg", bg, "--verb", v, "--desc", desc,
                        "--screenshot", shot, "--output", str(out)], check=True, env=env, capture_output=True)
        files.append(out)
    return size, files
if __name__ == "__main__":
    lang, out_dir, *shots = sys.argv[1:]
    print(run(lang, shots, out_dir))
