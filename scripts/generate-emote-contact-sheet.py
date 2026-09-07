"""Regenerates docs/screenshots/emote-contact-sheet.png from media/emotes/.

Run this after adding or removing emotes so the docs contact sheet stays
in sync. Requires Pillow: pip install pillow

    python scripts/generate-emote-contact-sheet.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
EMOTES_DIR = REPO / "media" / "emotes"
OUT_PATH = REPO / "docs" / "screenshots" / "emote-contact-sheet.png"

CELL_IMG = 96       # thumbnail size for each emote
LABEL_H = 20        # space for the id label under each thumbnail
PAD = 12            # padding between cells
COLS = 6

BG_COLOR = (30, 30, 30, 255)        # VS Code dark editor background
LABEL_COLOR = (204, 204, 204, 255)  # light gray text


def load_emotes():
    entries = []
    for folder in sorted(EMOTES_DIR.iterdir()):
        if not folder.is_dir():
            continue
        manifest_path = folder / "emote.json"
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        image_path = folder / manifest["imageFile"]
        if not image_path.exists():
            continue
        entries.append((folder.name, image_path))
    return entries


def main():
    entries = load_emotes()
    n = len(entries)
    cols = COLS
    rows = (n + cols - 1) // cols

    cell_w = CELL_IMG + PAD
    cell_h = CELL_IMG + LABEL_H + PAD

    sheet_w = cols * cell_w + PAD
    sheet_h = rows * cell_h + PAD

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("segoeui.ttf", 13)
    except OSError:
        font = ImageFont.load_default()

    for i, (emote_id, image_path) in enumerate(entries):
        col = i % cols
        row = i // cols

        cell_x = PAD + col * cell_w
        cell_y = PAD + row * cell_h

        img = Image.open(image_path).convert("RGBA")
        img.thumbnail((CELL_IMG, CELL_IMG), Image.LANCZOS)

        img_x = cell_x + (CELL_IMG - img.width) // 2
        img_y = cell_y + (CELL_IMG - img.height) // 2
        sheet.alpha_composite(img, (img_x, img_y))

        text_bbox = draw.textbbox((0, 0), emote_id, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_x = cell_x + (CELL_IMG - text_w) // 2
        text_y = cell_y + CELL_IMG + 2
        draw.text((text_x, text_y), emote_id, fill=LABEL_COLOR, font=font)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_PATH)
    print(f"Wrote {OUT_PATH} ({sheet_w}x{sheet_h}, {n} emotes)")


if __name__ == "__main__":
    main()
