#!/usr/bin/env python3
"""Validate the local Zhouyi dataset before shipping."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = (
    "career",
    "people",
    "money",
    "love",
    "study",
    "travel",
    "cooperation",
    "decision",
)


def main() -> None:
    hexagrams = json.loads(
        (ROOT / "data" / "hexagrams.json").read_text(encoding="utf-8")
    )
    line_plain = json.loads(
        (ROOT / "data" / "line_plain.json").read_text(encoding="utf-8")
    )

    assert len(hexagrams) == 64, "expected 64 hexagrams"
    assert len({h["name"] for h in hexagrams}) == 64, "hexagram names must be unique"

    for hexagram in hexagrams:
        assert len(hexagram["lines"]) == 6, f"{hexagram['name']}: expected 6 lines"
        for line in hexagram["lines"]:
            assert line.get("plain"), f"{hexagram['name']} {line['label']}: missing plain"
            key = f"{hexagram['order']}:{line['label']}"
            assert key in line_plain, f"{key}: missing line_plain entry"

        readings = hexagram.get("readings", {})
        assert len(readings) == len(CATEGORIES), f"{hexagram['name']}: missing categories"
        for category in CATEGORIES:
            item = readings.get(category, {})
            for field in ("fortune", "omen", "advice"):
                assert item.get(field), f"{hexagram['name']} {category}: missing {field}"

    print("data ok: 64 hexagrams, 384 lines, 512 direction readings, 384 line plains")


if __name__ == "__main__":
    main()
