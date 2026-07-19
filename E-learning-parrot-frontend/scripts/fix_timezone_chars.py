#!/usr/bin/env python3
"""Replace mojibake / fancy dashes in timezone labels with ASCII ' - '."""
from __future__ import annotations

import re
from pathlib import Path

BASE = Path(r"C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-frontend\src")

FILES = [
    BASE / "pages/dashboard/AvailableSchedules.tsx",
    BASE / "lib/commonTimezones.ts",
    BASE / "pages/dashboard/MeetingRegistrations.tsx",
    BASE / "pages/MeetingRegistration.tsx",
]


def fix_text(text: str) -> str:
    # Unicode dashes / ellipsis / times
    text = text.replace("\u2013", " - ")  # en dash
    text = text.replace("\u2014", " - ")  # em dash
    text = text.replace("\u2212", "-")  # minus
    text = text.replace("\u00d7", "x")
    text = text.replace("\u2026", "...")

    # Common UTF-8-as-Latin1 mojibake sequences (as Unicode codepoints in the source file)
    # â€“  = U+00E2 U+20AC U+201C is wrong; actual stored often U+00E2 U+20AC U+2013-range
    # Build from bytes of typical corrupted "–" and "—"
    for seq, repl in (
        ("\u00e2\u20ac\u201c", " - "),
        ("\u00e2\u20ac\u201d", " - "),
        ("\u00e2\u20ac\u2013", " - "),
        ("\u00e2\u20ac\u2014", " - "),
        ("\u00e2\u20ac\u2122", "'"),
        ("\u00e2\u20ac\u00a6", "..."),
        ("\u00e2\u02c6\u2019", "-"),
        ("\u00d7", "x"),
    ):
        text = text.replace(seq, repl)

    # Labels like: "EAT <junk> East Africa..."
    text = re.sub(
        r'(label:\s*")([A-Z]{2,5})\s+[^A-Za-z0-9\-"\s/]+\s+',
        r"\1\2 - ",
        text,
    )
    # offset: "UTC<junk>6"
    text = re.sub(
        r'(offset:\s*")UTC[^0-9+\-"\']+(\d)',
        r"\1UTC-\2",
        text,
    )
    # Fallbacks like || "—"
    text = re.sub(r'\|\|\s*"[^"]{1,6}"(?=\s*\))', '|| "-"', text)

    # Collapse accidental double spaces around hyphen
    text = re.sub(r" -  - ", " - ", text)
    return text


def main() -> None:
    for path in FILES:
        raw = path.read_bytes()
        # Also replace raw UTF-8 byte sequences for mojibake of en/em dash
        # "â€“" in a UTF-8 file = c3 a2 e2 82 ac e2 80 93  (â + € + – as 3 utf8 chars)
        for old, new in (
            (bytes([0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xE2, 0x80, 0x93]), b" - "),  # â€“
            (bytes([0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xE2, 0x80, 0x94]), b" - "),  # â€”
            (bytes([0xC3, 0xA2, 0xCB, 0x86, 0xE2, 0x80, 0x99]), b"-"),  # âˆ’
            (bytes([0xC3, 0x83, 0xC2, 0x97]), b"x"),  # Ã—
        ):
            raw = raw.replace(old, new)

        text = raw.decode("utf-8")
        fixed = fix_text(text)
        if fixed.encode("utf-8") != path.read_bytes():
            path.write_text(fixed, encoding="utf-8", newline="\n")
            print(f"FIXED {path.name}")
        else:
            # write if text changed from decode-only path
            if fixed != text:
                path.write_text(fixed, encoding="utf-8", newline="\n")
                print(f"FIXED {path.name}")
            else:
                print(f"NO_CHANGE {path.name}")

    sample = (BASE / "pages/dashboard/AvailableSchedules.tsx").read_text(encoding="utf-8")
    for line in sample.splitlines():
        if 'label: "' in line and any(k in line for k in ("EAT", "UTC ", "GMT", "CAT")):
            print(line.strip())


if __name__ == "__main__":
    main()
