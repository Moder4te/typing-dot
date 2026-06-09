#!/usr/bin/env python3
"""Check that each woff2 in public/fonts actually covers Korean + Latin.

After subsetting, a font that mapped its glyphs through the Private Use Area or
was a Latin/symbol-only face comes out near-empty (no Hangul). Such variants
would render as blank / fallback when the canvas picks them at random, so we
report them and (with --prune) drop them from public/fonts and emotion-fonts.json.

Run:  python scripts/validate-fonts.py [--prune]
"""
import glob
import json
import os
import sys

from fontTools.ttLib import TTFont

HERE = os.path.dirname(__file__)
FONTS_DIR = os.path.join(HERE, "..", "public", "fonts")
JSON_PATH = os.path.join(HERE, "..", "src", "data", "emotion-fonts.json")

# Common Hangul syllables a usable Korean font must have.
HANGUL_SAMPLE = [ord(c) for c in "가나다라마바사아자차카타파하한글사랑"]
LATIN_SAMPLE = [ord(c) for c in "AaZz09"]


def covers(font: TTFont, codepoints) -> int:
    cmap = font.getBestCmap()
    return sum(1 for cp in codepoints if cp in cmap)


def main() -> int:
    prune = "--prune" in sys.argv
    files = sorted(glob.glob(os.path.join(FONTS_DIR, "*.woff2")))
    bad = []  # basenames (without extension) lacking Hangul
    for path in files:
        try:
            font = TTFont(path)
            hangul = covers(font, HANGUL_SAMPLE)
            latin = covers(font, LATIN_SAMPLE)
        except Exception as e:
            print(f"  ! {os.path.basename(path)}: load error {e}")
            bad.append(os.path.splitext(os.path.basename(path))[0])
            continue
        if hangul == 0:
            print(f"  drop {os.path.basename(path)} (hangul={hangul}/{len(HANGUL_SAMPLE)}, latin={latin})")
            bad.append(os.path.splitext(os.path.basename(path))[0])

    print(f"\n{len(bad)} unusable / {len(files)} total")
    if not prune or not bad:
        return 0

    # Remove unusable files from disk and from emotion-fonts.json.
    bad_set = set(bad)
    for b in bad:
        for ext in (".woff2",):
            p = os.path.join(FONTS_DIR, b + ext)
            if os.path.exists(p):
                os.remove(p)

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    removed = 0
    for emotion, entry in data.items():
        kept = []
        for v in entry["fonts"]:
            base = os.path.splitext(os.path.basename(v["file"]))[0]
            if base in bad_set:
                removed += 1
            else:
                kept.append(v)
        entry["fonts"] = kept
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"pruned {removed} entries from emotion-fonts.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
