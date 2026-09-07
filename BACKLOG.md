# PnP Community Pets: Feature Backlog

Ideas, planned features, and community suggestions. Open a GitHub Discussion to propose additions or pick up an item.

---

## Where things stand (2026-09-07)

Current status: initial preview is functional and close to public-ready. The remaining work before a wider Marketplace push is mostly polish, repo cleanup, and a final smoke test in an installed VSIX.

**Shipped and working:** core animated panel, multiple pets, persistence across restarts, spawn/remove/name/tint pickers, individual pet removal + live speed adjustment, bundled emotes, click reactions, pet-to-pet proximity interactions, and VS Code event reactions for saves, terminals, tasks, and debugging.

**Descoped for initial release:** the badge/sign library and Credly integration are built but disabled (`BADGE_FEATURES_ENABLED = false` in `PetViewProvider.ts`) until they're ready to ship.

**Known pre-public polish:** final icon selection, README/package hygiene, live VSIX smoke test, and deciding whether public GitHub repo comes before or alongside Marketplace publishing.

**Most natural next step:** install the packaged `.vsix` in a clean VS Code window, run through the main user flows, then flip the repo public if screenshots, README, and license all look good.

---

## MVP: v0.1 (Get Something Moving)

- [x] Basic animated mascot panel: sprite walking/idle loop on canvas
- [x] Parker the Porcupine: first mascot, moving across panel
- [x] `Spawn a Pet` and `Remove All Pets` commands
- [x] Speed and pet-count settings
- [x] Default theme
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
- [x] Bit: Power Platform mascot source/reference SVG added under `media/pets/bit-chroma/`
- [ ] Bit static 8-bit pass: render the full uncropped SVG reference first, then create an approved static pixel-art version before adding `mascot.json`
- [ ] Bit animation pass: build a real walk cycle only after the static 8-bit version is approved
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

## Emotes: v0.3 (shipped)

A brief reaction icon shown above a pet's head — deliberately built independent of the sign/badge system (own type, own registry, own renderer, own file) even though it looks structurally similar, so the two can diverge freely.

- [x] Emote library (`media/emotes/<id>/emote.json`, auto-discovered, no-code contribution like badges/mascots), `emote.schema.json` at repo root
- [x] 5 sample icons to test with (`exclamation`, `checkmark`, `x-mark`, `heart`, `star`) — simple SVGs, not final production art
- [x] Per-pet click reaction: picked at spawn time (after badge/sign), stored as `clickEmoteId` separately from `clickEmoteEnabled` so toggling it off later won't lose which one was chosen
- [x] Clicking a pet's body shows its emote for ~1.8s and triggers the bounce; clicking its sign still opens the badge link and does not show the click emote
- [x] Precedence when both a sign and an emote could occupy the above-head slot: interaction emote → click emote → sign, each resumes automatically once whichever's ahead of it expires, no explicit restore logic
- [x] **Pet-to-pet proximity interactions** (this replaces the old "Pet Interactions" plan below — no new mascot art needed): two pets both on the floor that come within ~40px roll a 50/50 chance to pause, bounce, and show a shared heart emote together, then resume walking in a new random direction. Uses one shared `EmoteRenderer` instance (hardcoded to the "heart" sample emote), independent of either pet's personal click emote.
- [ ] `clickEmoteEnabled` toggle isn't exposed in any UI yet — the data model supports "keep the choice, turn it off" but there's no command for it
- [ ] Live emote editing on an already-spawned pet (same stable-ID + `updatePet` pattern as speed adjustment)
- [ ] Interaction emote is hardcoded to "heart" — no setting to change it, and pairing/multi-pet-cluster tracking is a simplification (see comment in `_checkPetInteractions`)
- [ ] Replace the 5 sample icons with real production art when ready

---

## VS Code Event Reactions: v0.4+ (in progress)

- [x] Generic architecture: extension listens for events -> resolves an emote URI -> sends a `showEmote` postMessage with target/bounce metadata -> webview shows a transient event emote without changing click-emote choices
- [x] Master setting: `pnpPets.enableEventReactions`
- [x] Default reaction map lives in `EVENT_REACTION_DEFAULTS`; users can override per-event behavior with Settings UI fields for enabled, emote, target, and bounce
- [x] Manual smoke-test command: `PnP Pets: Test Event Reaction`
- [x] **File saved** -> random pet shows `sparkle`
- [x] **Build/task success** -> random pet shows `checkmark` by default
- [x] **Build/task failure** -> random pet shows `x-mark` by default
- [x] **Terminal opens** -> random pet shows `terminal`
- [x] **Debug starts** -> random pet shows `bug`
- [x] **Debug stops** -> random pet shows `stop`
- [x] First expanded emote pack: event icons plus fun extras such as coffee, party popper, rocket, trophy, warning, fire, lightning, eyes, wave, sleep, crown, and more
- [x] Raster polish pass: generated glossy transparent PNG replacements for the full bundled emote set while keeping the original SVGs as source/reference files
- [ ] Problems panel / diagnostics changed -> warning or clear-state emote
- [ ] Long coding session / idle return -> coffee/sleep/wave style emotes
- [ ] New Credly badge earned -> badge sparkle
- [x] Per-event settings and target preferences (`enabled`, `emoteId`, `target`, `bounce`)
- [x] User-facing Settings UI uses per-event checkboxes/dropdowns instead of a single object editor
- [x] Default target is `random` for all event reactions so the panel stays lively without becoming too chaotic
- [ ] Event throttling/debounce so very noisy save/task loops do not spam the pets

Previous planning notes:

- [ ] **Build success** → show an emote (e.g. checkmark) above one or all active pets
- [ ] **Build failure / errors in Problems panel** → show an emote (e.g. x-mark)
- [ ] **File saved** → quick emote or the existing click-style bounce
- [ ] **Terminal opens**, **long coding session**, **new Credly badge earned** → same pattern, different triggers
- [ ] Hook into `vscode.tasks.onDidEndTaskProcess` (exit code tells success/fail), `vscode.workspace.onDidSaveTextDocument`, `vscode.window.onDidOpenTerminal`
- [ ] Plan: extension listens for the event → resolves an emote URI (same `_resolveEmoteUri` used for click/interaction emotes) → sends a new `showEmote` postMessage with a target (`all` pets or a specific pet ID) → webview calls the same `showEmote`/`showInteractionEmote`-style mechanism already built. No new rendering code needed, just a new trigger source and a message handler.

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

## Pet Interactions: shipped via Emotes (see above), further ideas below

The core proximity-interaction mechanic is done (see the Emotes section). Ideas for building on it:

- [ ] Pets can "notice" each other and actively change direction/pace to approach, rather than only reacting when a walk cycle happens to bring them close
- [ ] Different interaction emotes per mascot pair or per personality, instead of always "heart"
- [ ] Configurable interaction chance/distance (currently hardcoded 50% / 40px in `canvas.js`)
- [ ] More robust multi-pet tracking for 3+ pets clustered together (current `_greetedNeighbor` flag is a simplification, fine for a couple of pets passing by, not precise with a crowd)

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
