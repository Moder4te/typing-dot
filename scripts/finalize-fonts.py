#!/usr/bin/env python3
"""Reconcile emotion-fonts.json with the converted woff2 set.

After subset-fonts.py:
  - point every JSON entry at its .woff2,
  - drop entries whose conversion failed (no .woff2 — invalid/malformed source),
  - drop entries whose subset has no Hangul (would render blank when picked),
  - delete leftover original .ttf/.otf and any pruned woff2.

Run: python scripts/finalize-fonts.py
"""
import glob
import json
import os

from fontTools.ttLib import TTFont

HERE = os.path.dirname(__file__)
FONTS_DIR = os.path.join(HERE, "..", "public", "fonts")
JSON_PATH = os.path.join(HERE, "..", "src", "data", "emotion-fonts.json")

HANGUL_SAMPLE = [ord(c) for c in "가나다라마바사아자차카타파하한글사랑"]


def has_hangul(path: str) -> bool:
    try:
        cmap = TTFont(path).getBestCmap()
    except Exception:
        return False
    return any(cp in cmap for cp in HANGUL_SAMPLE)


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> int:
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    dropped_failed, dropped_empty, kept = [], [], 0
    for emotion, entry in data.items():
        new_fonts = []
        for v in entry["fonts"]:
            base = os.path.splitext(os.path.basename(v["file"]))[0]
            woff2 = os.path.join(FONTS_DIR, base + ".woff2")
            if not os.path.exists(woff2):
                dropped_failed.append(base)          # conversion failed
                continue
            if not has_hangul(woff2):
                dropped_empty.append(base)           # subset has no Korean glyphs
                continue
            v["file"] = f"fonts/{base}.woff2"
            new_fonts.append(v)
            kept += 1
        entry["fonts"] = new_fonts

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Delete leftover originals + pruned woff2.
    removed_bytes = 0
    drop_bases = set(dropped_failed) | set(dropped_empty)
    for path in glob.glob(os.path.join(FONTS_DIR, "*")):
        ext = os.path.splitext(path)[1].lower()
        base = os.path.splitext(os.path.basename(path))[0]
        if ext in (".ttf", ".otf"):                  # any surviving original
            removed_bytes += os.path.getsize(path)
            os.remove(path)
        elif ext == ".woff2" and base in dropped_empty:
            removed_bytes += os.path.getsize(path)
            os.remove(path)

    total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(FONTS_DIR, "*.woff2")))
    files = len(glob.glob(os.path.join(FONTS_DIR, "*.woff2")))
    print(f"kept {kept} fonts ({files} woff2 files, {human(total)})")
    print(f"dropped (failed conversion): {len(dropped_failed)} -> {sorted(set(dropped_failed))}")
    print(f"dropped (no hangul): {len(dropped_empty)} -> {sorted(set(dropped_empty))}")
    print(f"reclaimed from removed files: {human(removed_bytes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
