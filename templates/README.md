# Sprite Sheet Template

Everything you need to start a new PNG sprite sheet mascot lives in this folder.

| File | Purpose |
|---|---|
| `sprite-sheet-guide-4x2.png` | Transparent grid template. Draw your mascot directly on top of it and export with the lines still in, no layer cleanup needed |
| `reference-parker-sprite.png` | A real, working sprite sheet built the same way, guide lines baked in. Study its layout and margins, or attach it to an AI tool as a style/format reference |

<!-- SCREENSHOT NEEDED: docs/screenshots/sprite-sheet-template.png - Side-by-side preview of sprite-sheet-guide-4x2.png and reference-parker-sprite.png -->
![Sprite sheet template](../docs/screenshots/sprite-sheet-template.png)

## How to use it

1. Open `sprite-sheet-guide-4x2.png` (384×256, 4 columns × 2 rows, 96×128 per cell) in any image editor: Photoshop, GIMP, Krita, or the free browser-based [Photopea](https://www.photopea.com), no install required
2. Draw your mascot directly on top, one pose per cell:
   - Row 1 (**IDLE**): four idle-pose frames, columns F1–F4
   - Row 2 (**WALK RIGHT**): four walk-cycle frames, columns F1–F4
   - Walking left is generated automatically by mirroring row 2, so you don't need to draw it
3. **Keep your mascot inside the gridlines, with a little breathing room.** The extension crops a few pixels in from each cell edge to remove the guide lines automatically, so anything drawn right up against a line risks getting clipped. A few pixels of clearance on every side is enough.
4. Export the whole thing as a transparent PNG, guide lines and all. No layer deletion, no flattening tricks.
5. In your `mascot.json`, set `"framePadding": 3` alongside your `png-sheet` config. This tells the extension how many pixels to crop in from each cell edge.

<!-- SCREENSHOT NEEDED: docs/screenshots/sprite-sheet-in-editor.png - Sprite sheet opened in an image editor with the 4x2 grid visible and mascot frames placed inside each cell -->
![Sprite sheet in an image editor](../docs/screenshots/sprite-sheet-in-editor.png)

```json
{
  "type": "png-sheet",
  "src": "sprite-sheet.png",
  "framesPerRow": 4,
  "frameWidth": 64,
  "frameHeight": 85,
  "framePadding": 3
}
```

`framePadding: 3` is the value we've tested and confirmed reliably hides these grid lines without noticeably shrinking your usable art space. If you still see a sliver of a line after testing, bump it up by 1 and try again; if your mascot looks clipped at the edges, give it a bit more margin from the gridlines instead of lowering the padding.

## AI prompt template

A copy-paste starting point for image-generation tools (Copilot, DALL-E, Midjourney, Firefly, etc.):

> *"Pixel-art-style sprite sheet of [mascot description], transparent background, 384×256 pixels total, arranged in a 4-column × 2-row grid, each cell 96×128 pixels. Row 1 = four idle pose frames. Row 2 = four walk-cycle frames facing right. Keep the character within each cell with a small margin from the edges. Consistent character proportions and color palette across all frames."*

**If your tool accepts a reference image** (GPT-4o, Midjourney's image prompts, Firefly's reference feature), attach `reference-parker-sprite.png` from this same folder alongside the prompt. It shows the expected grid layout, frame proportions, and transparency handling, and helps the model match the format instead of guessing.

AI-generated sprite sheets are frequently misaligned by a few pixels, so plan on opening the result in an image editor and nudging frames to line up exactly with the grid before shipping it.

## Adding a tintable area

If you want part of your mascot to be user-colorable (like Parker's shirt), paint that area with flat, hard-edged pure magenta (`#FF00FF`) instead of its real color. See the "Make it color-tintable" section in [CONTRIBUTING.md](../CONTRIBUTING.md) for the full explanation, design guidance, and a look at the #FF00FF chroma-key region on a real mascot.
