# PnP Community Pets — Feature Backlog

Ideas, planned features, and community suggestions. Open a GitHub Discussion to propose additions or pick up an item.

---

## MVP — v0.1 (Get Something Moving)

- [ ] Basic animated mascot panel — sprite walking/idle loop on canvas
- [ ] Parker the Porcupine (parker-ms.svg from pnp/media) — first mascot, moving across panel
- [ ] `Spawn a Pet` and `Remove All Pets` commands
- [ ] Speed and pet-count settings
- [ ] Default (VS Code editor background) theme
- [ ] Publish to VS Code Marketplace

---

## Core Polish — v0.2

- [ ] Multiple pets on screen at once (configured via `pnpPets.petCount`)
- [ ] Mascot picker quick-pick (choose without opening settings)
- [ ] Pets avoid walking through each other
- [ ] Status bar item showing active pet name + count
- [ ] "Celebrate" reaction (brief animation on test pass / build success)
- [ ] Webview persists open between editor tab changes (`retainContextWhenHidden` already set)

---

## Themes & Seasons — v0.3

- [ ] Winter theme — dark blue gradient + snowflake overlay sprite
- [ ] Halloween theme — dark purple/orange gradient + bat overlay sprite
- [ ] Spring theme — soft green pastel gradient
- [ ] Microsoft Ignite theme — branded gradient
- [ ] Microsoft Build theme — branded gradient
- [ ] European Collaboration Summit theme
- [ ] Community Days theme — PnP purple
- [ ] `auto` theme setting — activates based on date (already implemented in ThemeManager)
- [ ] Theme override command (change theme without editing settings)
- [ ] Seasonal mascot variants — e.g. PnP Bee in a Santa hat for Winter

---

## Mascots Roadmap

> **All mascots must be real, confirmed community characters — no invented ones.**
> Suggest additions via GitHub Discussion with a link to the official asset source.

- [ ] Parker the Porcupine — official PnP mascot (parker-ms.svg, pnp/media repo) — **MVP**
- [ ] Animated walk-cycle frames for Parker (currently single SVG, all states)
- [ ] Additional confirmed community mascots — TBD with community input
- [ ] Community contributor mascot (unlocked by specific Credly badge)
- [ ] "Surprise" mascot unlocked by Easter egg command

> Supports PNG sprite sheets, SVG frame sequences, and animated GIFs.
> See CONTRIBUTING.md for full details and the AI generation prompt template.

---

## Credly Badge Integration — v0.4

- [ ] User enters Credly username in settings or via `Show My Credly Badges` command
- [ ] Extension fetches public badge list from Credly API (Node `https` — no browser CORS issue)
- [ ] Badge icons rendered in a scrollable strip at the bottom of the pet panel
- [ ] Clicking a badge opens the badge page in the default browser
- [ ] Certain Credly badges unlock exclusive mascots (badge ID → mascot ID mapping in registry)
- [ ] Badge count shown in status bar tooltip
- [ ] "Share Badges" command — copies a markdown snippet of your earned badges
- [ ] Cache badge fetch results (TTL: 1 hour) to avoid hammering the API

---

## Dedicated Activity Bar + Pop-Out Window — v0.6

- [ ] Add a custom Activity Bar view container (Parker icon in the icon strip)
- [ ] Multiple stacked panels under the icon:
  - **Parker & Friends** — the walking canvas
  - **Mascot Picker** — click a card to add one, see who's currently on screen
  - **Themes** — one-click theme switcher with preview swatches
  - **My Badges** — Credly badge gallery with earned date and issuer
- [ ] `PnP Pets: Pop Out` command — opens a full `WebviewPanel` in the editor area
  - Same canvas, fresh independent pet spawn
  - Configuration toolbar inside the pop-out (no need to open settings)
  - Move to a second monitor via VS Code's "Move into New Window" (right-click tab)
- [ ] `pnpPets.position` setting already supports `explorer` vs `panel` placement
- [ ] Activity Bar option added as a third position option

---

## Community Extensibility — v0.5

- [ ] `pnpPets.registerMascot` API — lets other extensions or theme packs register mascots
- [ ] Mascot pack extension point — install additional mascot packs as separate VS Code extensions
- [ ] Scaffold command: `PnP Pets: Add New Mascot` — generates the correct file structure and registry entry stub
- [ ] Sprite sheet validator — warns at startup if a registered mascot's PNG dimensions don't match its config
- [ ] Community theme packs — same pattern as mascot packs

---

## Stretch / Future Ideas

- [ ] Mascot reacts to VS Code events:
  - Build error → sad animation
  - Tests pass → celebrate animation
  - Long idle (no typing) → sleepy/yawn animation
  - File saved → tail wag / buzz
- [ ] Pet naming — user names their mascot, name appears on hover
- [ ] Mascot "levels up" based on cumulative coding time (tracked locally)
- [ ] Sound effects — optional, off by default, community-contributed audio clips
- [ ] Animated badge-earned notification — brief fanfare when Credly detects a new badge
- [ ] GitHub Actions integration — mascot celebrates on successful CI run (via webhook or polling)
- [ ] Leaderboard panel — PnP community gamification tied to contribution activity
- [ ] Sticker/emoji mode — minimal footprint mode that shows a small floating mascot over the editor
