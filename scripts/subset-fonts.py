#!/usr/bin/env python3
"""Subset + woff2-compress every emotion font in public/fonts.

Why: the raw .ttf/.otf set was ~389MB (some single files >20MB), served
statically and picked at random per block — unusable on mobile data and a
bandwidth sink on Vercel. We keep Korean (full Hangul syllable block) + Latin
coverage so any KR/EN text still renders, drop everything else, strip hinting,
and emit woff2 (brotli) which compresses outlines dramatically.

Run: python scripts/subset-fonts.py
Requires: pip install fonttools brotli
"""
import glob
import os
import subprocess
import sys

FONTS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "fonts")

# Unicode ranges to keep:
#   0000-00FF  Basic Latin + Latin-1 (ASCII, common punctuation, symbols)
#   1100-11FF  Hangul Jamo
#   2000-206F  General Punctuation (curly quotes, dashes, ellipsis)
#   20A0-20CF  Currency symbols (₩ etc.)
#   3000-303F  CJK Symbols and Punctuation (Korean quote marks, middle dot)
#   3130-318F  Hangul Compatibility Jamo
#   AC00-D7A3  Hangul Syllables (all 11,172)
#   FF00-FFEF  Halfwidth/Fullwidth Forms
UNICODES = "U+0000-00FF,U+1100-11FF,U+2000-206F,U+20A0-20CF,U+3000-303F,U+3130-318F,U+AC00-D7A3,U+FF00-FFEF"


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> int:
    srcs = sorted(
        glob.glob(os.path.join(FONTS_DIR, "*.ttf"))
        + glob.glob(os.path.join(FONTS_DIR, "*.otf"))
    )
    if not srcs:
        print("No .ttf/.otf fonts found — already converted?")
        return 0

    before = after = 0
    failures = []
    for i, src in enumerate(srcs, 1):
        base = os.path.splitext(os.path.basename(src))[0]
        out = os.path.join(FONTS_DIR, base + ".woff2")
        src_size = os.path.getsize(src)
        before += src_size
        print(f"[{i}/{len(srcs)}] {os.path.basename(src)} ({human(src_size)}) …", flush=True)
        cmd = [
            sys.executable, "-m", "fontTools.subset", src,
            f"--unicodes={UNICODES}",
            "--flavor=woff2",
            f"--output-file={out}",
            "--layout-features=*",   # keep ligatures/kerning the display fonts rely on
            "--no-hinting",          # screen rendering doesn't need TT/PS hints — big savings
            "--desubroutinize",
            "--drop-tables+=DSIG",
            "--name-IDs=*",
            "--ignore-missing-glyphs",
            "--ignore-missing-unicodes",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0 or not os.path.exists(out):
            print(f"   FAILED: {res.stderr.strip()[:300]}")
            failures.append(os.path.basename(src))
            continue
        out_size = os.path.getsize(out)
        after += out_size
        print(f"   -> {os.path.basename(out)} ({human(out_size)}, {100 - out_size * 100 // src_size}% smaller)")
        os.remove(src)  # drop the original so it isn't served/committed

    print("\n=== done ===")
    print(f"before: {human(before)}  after: {human(after)}  saved: {human(before - after)}")
    if failures:
        print(f"FAILURES ({len(failures)}): {failures}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
