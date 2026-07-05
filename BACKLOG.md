# PnP Community Pets: Feature Backlog

Ideas, planned features, and community suggestions. Open a GitHub Discussion to propose additions or pick up an item.

---

## MVP: v0.1 (Get Something Moving)

- [ ] Basic animated mascot panel: sprite walking/idle loop on canvas
- [ ] Parker the Porcupine (parker-ms.svg from pnp/media): first mascot, moving across panel
- [ ] `Spawn a Pet` and `Remove All Pets` commands
- [ ] Speed and pet-count settings
- [ ] Default (VS Code editor background) theme
- [ ] Publish to VS Code Marketplace

---

## Core Polish: v0.2

- [ ] Multiple pets on screen at once (configured via `pnpPets.petCount`)
- [ ] Mascot picker quick-pick (choose without opening settings)
- [ ] Pets avoid walking through each other
- [ ] Status bar item showing active pet name + count
- [ ] "Celebrate" reaction (brief animation on test pass / build success)
- [ ] Webview persists open between editor tab changes (`retainContextWhenHidden` already set)

---

## Themes & Seasons: v0.3

- [ ] Winter theme: dark blue gradient + snowflake overlay sprite
- [ ] Halloween theme: dark purple/orange gradient + bat overlay sprite
- [ ] Spring theme: soft green pastel gradient
- [ ] Microsoft Ignite theme: branded gradient
- [ ] Microsoft Build theme: branded gradient
- [ ] European Collaboration Summit theme
- [ ] Community Days theme. **Needs confirmation:** which specific PnP-affiliated conference/event series is this, and what's its real brand color? (Removed a placeholder gradient from `ThemeManager.ts`; re-add once confirmed, same "no invented branding" rule as mascots)
- [ ] `auto` theme setting: activates based on date (already implemented in ThemeManager)
- [ ] Theme override command (change theme without editing settings)
- [ ] Seasonal mascot variants, e.g. PnP Bee in a Santa hat for Winter

---

## Mascots Roadmap

> **Original community mascots are welcome.** If a mascot is presented as an official character tied to a specific brand or program, link the official asset source so it can be verified. Questions or feedback before you build? Open a GitHub Discussion.

- [ ] Parker the Porcupine: official PnP mascot (parker-ms.svg, pnp/media repo). **MVP**
- [ ] Animated walk-cycle frames for Parker (currently single SVG, all states)
- [ ] Additional community-submitted mascots: open to submissions
- [ ] Community contributor mascot (unlocked by specific Credly badge)
- [ ] "Surprise" mascot unlocked by Easter egg command

> Supports PNG sprite sheets, SVG frame sequences, and animated GIFs.
> See CONTRIBUTING.md for full details and the AI generation prompt template.

---

## Credly Badge Integration: v0.4

- [ ] User enters Credly username in settings or via `Show My Credly Badges` command
- [ ] Extension fetches public badge list from Credly API (Node `https`, no browser CORS issue)
- [ ] Badge icons rendered in a scrollable strip at the bottom of the pet panel
- [ ] Clicking a badge opens the badge page in the default browser
- [ ] Certain Credly badges unlock exclusive mascots (badge ID to mascot ID mapping in registry)
- [ ] Badge count shown in status bar tooltip
- [ ] "Share Badges" command: copies a markdown snippet of your earned badges
- [ ] Cache badge fetch results (TTL: 1 hour) to avoid hammering the API

---

## Signs & Badges: v0.3 (shipped, refinement pending)

- [x] Badge/logo library (`media/badges/<id>/badge.json`, auto-discovered, no-code contribution like mascots)
- [x] Generic speech-bubble sign template, shared across all badges
- [x] Sign attached per-pet at spawn time (QuickPick after mascot/color selection), persists across restarts
- [x] Sign rotates with the mascot on walls/ceiling (matches a physically held object)
- [x] Clicking a sign opens the badge's `linkUrl` (if set) in the browser
- [ ] **Tighten the gap between the sign and the mascot's actual head.** Current offset is a fixed 12px from the frame's bounding-box edge, not from where the character's visible art actually ends, so mascots with transparent headroom in their sprite will show a bigger gap than intended, most noticeable on walls/ceiling where there's no name label nearby to anchor against. Needs either a per-mascot offset or actual content-bounds detection within the frame.
- [ ] Live sign editing on an already-spawned pet — stable per-pet IDs now exist (see Individual Pet Management below), so this is mostly a QuickPick + `updatePet` message away
- [ ] Support multiple sign template shapes (square sign, heart-shaped bubble, etc.) — picked "whatever renders cleanly as SVG" for v1

---

## Individual Pet Management: v0.3 (shipped)

- [x] Stable per-pet ID assigned at spawn time (`crypto.randomUUID()`), tracked through persistence and restore
- [x] `PnP Pets: Remove a Pet` command: QuickPick your active pets by name, remove just that one
- [x] `PnP Pets: Adjust Pet Speed` command: QuickPick a pet, pick a new speed (Very Slow → Very Fast), applies live without respawning
- [x] Speed changes persist across restarts
- [x] Click a pet for a quick "noticed" reaction bounce, correctly rotated away from whatever surface it's on
- [ ] Click a pet to bring up a shortcut context menu (Rename / Adjust Speed / Remove) instead of going through Command Palette first

---

## Dedicated Activity Bar + Pop-Out Window: v0.6

- [ ] Add a custom Activity Bar view container (Parker icon in the icon strip)
- [ ] Multiple stacked panels under the icon:
  - **Parker & Friends**: the walking canvas
  - **Mascot Picker**: click a card to add one, see who's currently on screen
  - **Themes**: one-click theme switcher with preview swatches
  - **My Badges**: Credly badge gallery with earned date and issuer
- [ ] `PnP Pets: Pop Out` command: opens a full `WebviewPanel` in the editor area
  - Same canvas, fresh independent pet spawn
  - Configuration toolbar inside the pop-out (no need to open settings)
  - Move to a second monitor via VS Code's "Move into New Window" (right-click tab)
- [ ] `pnpPets.position` setting already supports `explorer` vs `panel` placement
- [ ] Activity Bar option added as a third position option

---

## Community Extensibility: v0.5

- [ ] `pnpPets.registerMascot` API: lets other extensions or theme packs register mascots
- [ ] Mascot pack extension point: install additional mascot packs as separate VS Code extensions
- [ ] Scaffold command: `PnP Pets: Add New Mascot`, generates the correct file structure and registry entry stub
- [ ] Sprite sheet validator: warns at startup if a registered mascot's PNG dimensions don't match its config
- [ ] Community theme packs: same pattern as mascot packs

---

## Session Persistence: v0.3+

- [ ] **Persist pets across sessions**: save active pets (mascot ID, name, tint color) to `globalState` on change, restore on panel load so the same crew comes back every time VS Code opens
- [ ] Restore pets in the same surface position they were in when VS Code closed
- [ ] Setting to disable persistence (always start fresh)

---

## Pet Interactions: v0.4+

- [ ] **Proximity interactions**: when two pets come within range on the floor, trigger a brief interaction animation (wave, bow, high-five) before continuing on their way
- [ ] Interaction animation frame support in mascot.json (`rows.interact` for PNG sheets, `frames.interact` for SVG/GIF)
- [ ] Pets can "notice" each other and change direction to approach
- [ ] Different interaction types per mascot pair (friendly / playful / shy)

---

## VS Code Event Reactions: v0.4+

- [ ] **Build success** → celebrate animation (arms up, spin)
- [ ] **Build failure / errors in Problems panel** → sad/worried animation
- [ ] **Long coding session (no breaks)** → yawn/stretch idle variant
- [ ] **Terminal opens** → pets scatter or look startled
- [ ] **File saved** → quick tail wag or thumbs-up
- [ ] **New badge earned (Credly)** → fanfare animation + notification
- [ ] Hook into `vscode.tasks.onDidEndTask`, `vscode.languages.onDidChangeDiagnostics`

---

## Tinting & Customization: v0.3+

- [ ] **Multiple tint regions**: support a second chroma color (e.g. `#00FFFF` for pants) so contributors can expose two independently colorable areas per mascot
- [ ] **Per-mascot speed**: `speed` multiplier in `mascot.json` (e.g. `0.5` for a sleepy sloth, `2.0` for a hyper squirrel)
- [ ] **Pet size setting**: scale pets up/down via settings or per-spawn
- [ ] **Transparent/auto background**: option to use VS Code's actual sidebar background color instead of a custom theme

---

## Screensaver Mode: v0.5+

- [ ] Pets hide when the user is actively typing/coding
- [ ] Pets appear (or multiply) after X minutes of VS Code being idle
- [ ] Configurable idle threshold in settings
- [ ] "Peek" animation: pets slowly creep up from the bottom when idle

---

## Community Gallery: v0.6+

- [ ] Web page (or VS Code walkthrough) showcasing all community-submitted mascots
- [ ] One-click install of community mascot packs as separate VS Code extensions
- [ ] Voting / favourites so popular mascots surface to the top

---

## Stretch / Future Ideas

- [ ] Pet naming: user names their mascot, name appears on hover (partially done, name passed at spawn)
- [ ] Mascot "levels up" based on cumulative coding time (tracked locally)
- [ ] Sound effects: optional, off by default, community-contributed audio clips
- [ ] GitHub Actions / CI webhook: mascot celebrates on successful pipeline run
- [ ] Leaderboard panel: PnP community gamification tied to contribution activity
- [ ] Sticker/emoji mode: minimal footprint floating mascot overlay on the editor
- [ ] Activity bar badge showing active pet count
- [ ] "Share your pet": generate a shareable card image of your named, tinted pet
