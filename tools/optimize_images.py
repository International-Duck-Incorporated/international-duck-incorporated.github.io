#!/usr/bin/env python3
"""Generate compressed WebP siblings for the raster assets in assets/.

The site ships every raster asset twice: the original PNG/JPEG (kept as the
compatibility fallback, and as the og:image / favicon source) and a `.webp`
sibling that browsers actually download - either through a <picture><source>
pair in the HTML or through an image-set() pair in the CSS.

Rules of thumb applied below:
  * geometry: never upscale; long edge is capped at the largest size the asset
    is ever displayed at (2x the CSS pixel size is the target for avatars and
    icons, 1x for full-bleed backdrops).
  * quality: 82 for icons/avatars/photos, 78 for full-bleed backdrops, 70 for
    the animated GIF replacement.
  * metadata: stripped (icc profiles and EXIF are not needed for web display).

Requires Pillow:  python3 -m pip install --user pillow
Run from the repo root:  python3 tools/optimize_images.py [--force]

Idempotent: an existing .webp that is already newer than its source is left
alone unless --force is passed.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - tooling convenience
    sys.exit("Pillow is required: python3 -m pip install --user pillow")

# name -> (long-edge cap, quality). Anything not listed is left alone.
PROFILES: dict[str, tuple[int, int]] = {
    # Project icons, rendered at 59-64 CSS px in cards.
    "venomous-icon.png": (256, 82),
    "nulltrace-icon.png": (256, 82),
    "championscode-icon.png": (256, 82),
    "beacon-icon.png": (128, 82),
    "bagley-icon.png": (256, 82),
    "zonedout-icon.png": (128, 82),
    # Organization avatar, rendered at 40 CSS px (footer) and 154 CSS px (panel).
    "org-avatar.png": (192, 85),
    # Member avatars, rendered at 84-108 CSS px.
    "member-0xffshell.png": (256, 82),
    "member-e-vdv-hu.png": (256, 82),
    "member-jojo-8002.png": (256, 82),
    "member-midas735.png": (256, 82),
    "member-xx-superivar-xx.png": (256, 82),
    "contributor-3spress0.png": (256, 82),
    # Full-bleed backdrops.
    "homepage-community-background-v4.jpg": (1920, 78),
    "idi-member-collage.png": (1360, 78),
    "member-e-vdv-hu-bg.jpg": (1400, 72),
    # Animated member-page backdrop: the animated WebP is the whole point here.
    "goofy-ahh.gif": (320, 60),
}


def target_for(name: str) -> tuple[str, tuple[int, int]] | None:
    if name in PROFILES:
        return name.rsplit(".", 1)[0] + ".webp", PROFILES[name]
    return None


def convert(source: Path, destination: Path, long_edge: int, quality: int) -> tuple[int, int]:
    before = source.stat().st_size
    with Image.open(source) as image:
        animated = getattr(image, "n_frames", 1) > 1
        if animated:
            frames = []
            durations = []
            for frame in range(image.n_frames):
                image.seek(frame)
                durations.append(image.info.get("duration", 70))
                frames.append(image.convert("RGBA").copy())
            frames[0].save(
                destination,
                format="WEBP",
                quality=quality,
                method=5,
                save_all=True,
                append_images=frames[1:],
                duration=durations,
                loop=image.info.get("loop", 0),
                allow_mixed=True,
            )
        else:
            image.thumbnail((long_edge, long_edge), Image.LANCZOS)
            flattened = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
            flattened.save(destination, format="WEBP", quality=quality, method=6)
    return before, destination.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="rebuild every .webp sibling")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    assets = root / "assets"

    before_total = after_total = 0
    rows = []
    for source in sorted(assets.iterdir()):
        target = target_for(source.name)
        if not target or not source.is_file():
            continue
        destination, (long_edge, quality) = target
        destination_path = assets / destination
        if (
            not args.force
            and destination_path.exists()
            and destination_path.stat().st_mtime >= source.stat().st_mtime
        ):
            before_total += source.stat().st_size
            after_total += destination_path.stat().st_size
            rows.append((source.name, destination, source.stat().st_size, destination_path.stat().st_size, "cached"))
            continue
        before, after = convert(source, assets / destination, long_edge, quality)
        before_total += before
        after_total += after
        rows.append((source.name, destination, before, after, ""))

    width = max(len(row[0]) for row in rows)
    for source, destination, before, after, note in rows:
        saved = 100 - (after / before * 100) if before else 0
        print(
            f"{source:<{width}} -> {destination:<{width}} "
            f"{before / 1024:8.1f} KiB -> {after / 1024:8.1f} KiB  (-{saved:4.1f}%) {note}".rstrip()
        )
    if before_total:
        print(
            f"\ntotal: {before_total / 1024:8.1f} KiB -> {after_total / 1024:8.1f} KiB "
            f"(-{100 - after_total / before_total * 100:.1f}%)"
        )


if __name__ == "__main__":
    main()
