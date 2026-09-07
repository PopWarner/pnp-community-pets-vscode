# media/pets/

Each mascot lives in its own subfolder. Contributors can use PNG sprite sheets, SVG frames, or animated GIFs; the format is configured per-mascot in the registry, not enforced by folder structure.

```text
media/pets/
├── parker-chroma/
│   └── parker-wd-sprite-chroma.png   ← PNG sprite sheet, tintable
├── bit-chroma/
│   └── bit-sprite-chroma.png         ← PNG sprite sheet, tintable
├── your-mascot/
│   ├── idle.gif                      ← option A: animated GIF per state
│   ├── walk.gif
│   ├── idle-1.svg                    ← option B: SVG frames
│   ├── walk-right-1.svg
│   ├── walk-right-2.svg
│   └── sprite-sheet.png              ← option C: PNG sprite sheet
└── README.md
```

---

## Current mascots

| Folder | Mascot | Format | Notes |
|---|---|---|---|
| `parker-chroma/` | Parker the Porcupine | PNG sprite sheet | Official PnP community mascot, tintable |
| `bit-chroma/` | Bit | PNG sprite sheet | Power Platform mascot, tintable |
| `parker/` | Parker (legacy) | SVG, single static frame | Hidden from the spawn picker; kept as the reference example for the SVG format, see [CONTRIBUTING.md](../../CONTRIBUTING.md) |

See the [Screenshots section](../../README.md#screenshots) in the root README for the mascot picker in action.

---

## PNG sprite sheet format

All frames in one PNG, laid out in a grid:

![Sprite sheet example](../../docs/screenshots/sprite-sheet-example.png)

```text
+----------+----------+----------+----------+
| idle  1  | idle  2  | idle  3  | idle  4  |  ← row 0
+----------+----------+----------+----------+
| walk→ 1  | walk→ 2  | walk→ 3  | walk→ 4  |  ← row 1
+----------+----------+----------+----------+
| walk← 1  | walk← 2  | walk← 3  | walk← 4  |  ← row 2
+----------+----------+----------+----------+
```

- Transparent background (PNG with alpha)
- Any consistent frame size (64×64 is a good default)
- Row count and frame count are configurable per-mascot in the registry

**AI generation prompt:**

```text
Pixel art sprite sheet, [mascot description], transparent background,
64x64 pixels per frame, 4 columns wide, 3 rows tall:
row 0 = 4-frame idle animation,
row 1 = 4-frame walk-right animation,
row 2 = 4-frame walk-left animation.
Flat colors, clean outlines, no background fill.
```

---

## SVG frames format

One static SVG file per animation frame. The canvas cycles through them like a flipbook.

<!-- SCREENSHOT NEEDED: docs/screenshots/svg-frame-example.png - Example SVG-frame mascot folder and rendered static mascot preview -->

- No background fill
- Any viewBox: the canvas scales to `frameWidth × frameHeight` automatically
- `walkLeft` frames are optional; set `walkLeft: []` in the registry and the renderer auto-mirrors `walkRight`

**Minimum setup (one SVG, all states share it):**

```text
your-mascot/
└── your-mascot.svg
```

**Full animated setup:**

```text
your-mascot/
├── idle-1.svg
├── idle-2.svg
├── walk-right-1.svg
└── walk-right-2.svg
```

---

## GIF format

One animated GIF per animation state. The browser handles frame timing internally, so no frame math is required.

<!-- SCREENSHOT NEEDED: docs/screenshots/gif-format-example.png - Example GIF mascot folder and rendered animated mascot preview -->

```text
your-mascot/
├── idle.gif
├── walk-right.gif
└── walk-left.gif    ← optional; omit to auto-mirror walk-right
```

- Recommended: 8 fps, transparent background, 128×128 px
- Keep file size small; GIFs loop continuously inside the webview
- `walkLeft` is optional. Set `frames.walkLeft` in the registry to omit it; the renderer flips `walkRight` automatically

**Registry entry:**

```typescript
{
    id: 'your-mascot',
    name: 'Your Mascot',
    description: '...',
    sprite: {
        type: 'gif',
        frameWidth: 128,
        frameHeight: 128,
        frames: {
            idle:      'your-mascot/idle.gif',
            walkRight: 'your-mascot/walk-right.gif'
            // walkLeft omitted → auto-mirrored
        }
    },
    tags: ['community']
}
```

---

## Registering your mascot

After adding your folder here, add an entry in [src/mascots/MascotRegistry.ts](../../src/mascots/MascotRegistry.ts).
See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full walkthrough.
