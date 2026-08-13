#!/usr/bin/env python3
"""Fetch per-line plain-language translations for the 384 Zhouyi line texts.

Source: k366.com 64-hexagram pages (公开网页，仅供白话参考).
The resulting data file is used by build_data.py; runtime pages never fetch it.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "line_plain.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
    )
}
LABEL_PATTERN = re.compile(
    r"\n(初[九六]|九[一二三四五]|六[一二三四五]|上[九六])\s*爻\s*(?:详解)?\n"
)


def page_text(order: int) -> str:
    url = f"https://www.k366.com/gua/{order}.htm"
    req = urllib.request.Request(url, headers=HEADERS)
    raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    body = re.sub(r"<script.*?</script>", "", raw, flags=re.S | re.I)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", "\n", body)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text


def extract(order: int) -> dict[str, str]:
    text = page_text(order)
    matches = list(LABEL_PATTERN.finditer(text))
    unique: list[tuple[str, re.Match]] = []
    for match in matches:
        label = match.group(1)
        if label not in [item[0] for item in unique]:
            unique.append((label, match))

    result: dict[str, str] = {}
    for index, (label, match) in enumerate(unique):
        end = unique[index + 1][1].start() if index + 1 < len(unique) else len(text)
        segment = text[match.end():end]
        plain_match = re.search(
            r"【白话文解释】\s*\n(.+?)(?:\n《象辞》说：|\n【|\Z)",
            segment,
            re.S,
        )
        if plain_match:
            result[label] = re.sub(r"\s+", " ", plain_match.group(1)).strip()
    return result


def main() -> None:
    data: dict[str, str] = {}
    for order in range(1, 65):
        lines = extract(order)
        if len(lines) != 6:
            raise SystemExit(f"hexagram {order}: expected 6 lines, got {len(lines)}")
        for label, plain in lines.items():
            data[f"{order}:{label}"] = plain
        time.sleep(0.03)

    OUT.write_text(
        json.dumps(data, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} ({len(data)} lines)")


if __name__ == "__main__":
    main()
