# Contributing to PnP Community Pets

Thanks for wanting to contribute! This project is built by and for the M365 and Power Platform community. Whether you're submitting a new mascot sprite, fixing a bug, proposing a theme, or improving docs — all contributions are welcome.

---

## Ways to Contribute

| Contribution type | Where to start |
|---|---|
| New mascot | Add assets to `media/pets/your-mascot/` + register in `MascotRegistry.ts` (see below) |
| New theme | Add a `ThemeDefinition` to `ThemeManager.ts` |
| Bug fix | Open an issue, then submit a PR |
| New feature | Open a GitHub Discussion first so we can align before you build |
| Docs improvement | Submit a PR directly — no issue needed |

---

## Dev Setup

```bash
# 1. Clone the repo
git clone https://github.com/pnp/pnp-community-pets-vscode

# 2. Install dependencies
npm install

# 3. Start the TypeScript compiler in watch mode
npm run watch

# 4. Press F5 in VS Code to launch the Extension Development Host
#    Use "PnP Pets: Show Pet Panel" from the command palette to test
```

---

## Adding a New Mascot

> **Only confirmed, real community characters are accepted.** Open a GitHub Discussion with a link to the official source before creating a PR for a new mascot.

### Step 1 — Create the sprite assets

Each mascot lives in its own subfolder under `media/pets/`. You can use **any of the three supported formats** — pick whichever suits you and your tools.

---

#### Option A — Animated GIF (easiest with AI tools)

One GIF per animation state. The browser handles frame timing internally.

```text
media/pets/my-mascot/
├── idle.gif
├── walk-right.gif
└── walk-left.gif    ← optional; omit to auto-mirror walk-right
```

**Recommended specs:** transparent background, 128×128 px, ~8 fps

**AI generation tip (Copilot, DALL-E, Firefly, etc.):**
> *"Animated GIF, [mascot description], transparent background, 128×128 pixels, ~8 fps, idle looping animation"* — then repeat for walk-right.

---

#### Option B — SVG frames (great for vector/community mascots)

One static SVG per animation frame. The canvas cycles them like a flipbook.

```text
media/pets/my-mascot/
├── idle.svg
├── walk-right-1.svg
└── walk-right-2.svg
```

- No background fill, any viewBox — canvas scales to `frameWidth × frameHeight`
- `walkLeft` frames are optional; omit them and the renderer auto-mirrors `walkRight`

---

#### Option C — PNG sprite sheet (classic pixel art)

All frames in one PNG grid:

```
+--------+--------+--------+--------+
| idle 1 | idle 2 | idle 3 | idle 4 |  ← row 0
+--------+--------+--------+--------+
| walk→1 | walk→2 | walk→3 | walk→4 |  ← row 1
+--------+--------+--------+--------+
| walk←1 | walk←2 | walk←3 | walk←4 |  ← row 2
+--------+--------+--------+--------+
```

**Recommended:** 64×64 px per frame, transparent background, 4 columns × 3 rows.

**AI prompt template:**
> *"Pixel art sprite sheet for [mascot], 64x64 pixels per frame, 4 columns wide, 3 rows tall, transparent background, row 0 = idle, row 1 = walk right, row 2 = walk left"*

---

### Step 2 — Register the mascot

Open [src/mascots/MascotRegistry.ts](src/mascots/MascotRegistry.ts) and add an entry to `builtInMascots`. Use the block that matches the format you chose.

**GIF:**

```typescript
{
    id: 'my-mascot',
    name: 'My Mascot',
    description: 'Short description',
    sprite: {
        type: 'gif',
        frameWidth: 128,
        frameHeight: 128,
        frames: {
            idle:      'my-mascot/idle.gif',
            walkRight: 'my-mascot/walk-right.gif'
            // omit walkLeft to auto-mirror
        }
    },
    tags: ['community']
}
```

**SVG frames:**

```typescript
{
    id: 'my-mascot',
    name: 'My Mascot',
    description: 'Short description',
    sprite: {
        type: 'svg-frames',
        frameWidth: 128,
        frameHeight: 128,
        frames: {
            idle:      ['my-mascot/idle.svg'],
            walkRight: ['my-mascot/walk-right-1.svg', 'my-mascot/walk-right-2.svg'],
            walkLeft:  []  // auto-mirrored
        }
    },
    tags: ['community']
}
```

**PNG sprite sheet:**

```typescript
{
    id: 'my-mascot',
    name: 'My Mascot',
    description: 'Short description',
    sprite: {
        type: 'png-sheet',
        src: 'my-mascot/sprite-sheet.png',
        frameWidth: 64,
        frameHeight: 64,
        framesPerRow: 4,
        rows: { idle: 0, walkRight: 1, walkLeft: 2 }
    },
    tags: ['community']
}
```

### Step 3 — Open a PR

That's it. The CI will validate that the asset files exist and that the registry entry compiles cleanly.

---

## Adding a New Theme

Open [src/themes/ThemeManager.ts](src/themes/ThemeManager.ts) and add to the `themes` array:

```ts
{
    id: 'my-theme',
    name: 'My Theme',
    background: 'linear-gradient(180deg, #123456 0%, #789abc 100%)',
    // optional — overlay sprite in media/themes/
    overlaySprite: 'my-overlay.png',
    // optional — auto-activates on this date range
    autoActivate: { startMonth: 3, startDay: 1, endMonth: 3, endDay: 31 }
}
```

Also add it to the `enum` and `enumDescriptions` in `package.json` under `pnpPets.theme` so it shows up in settings.

---

## Code Style

- TypeScript with `strict: true`
- No comments unless the *why* is non-obvious
- Keep each source file focused on one responsibility
- Run `npm run lint` before submitting a PR

---

## Questions?

Open a [GitHub Discussion](https://github.com/pnp/pnp-community-pets-vscode/discussions) or reach out in the PnP community channels.
