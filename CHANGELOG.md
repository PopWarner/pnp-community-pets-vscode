# Change Log

All notable changes to the "PnP Community Pets" extension will be documented in this file.

## [0.0.1] - Unreleased

### Added

- Initial preview release
- Animated Parker the Porcupine mascot with a tintable, user-colorable shirt
- Bit, the Power Platform mascot, as a tintable PNG sprite-sheet mascot
- Walking, idle, and full surface traversal (floor, walls, ceiling)
- No-code mascot contribution model via `mascot.json` manifests
- PNG sprite sheet, SVG frame, and animated GIF sprite format support
- Spawn / remove / name / color picker via the panel's `+` and trash icons
- Pets persist across VS Code restarts (`pnpPets.persistPets`)
- Per-pet management commands for targeted removal and live speed adjustment
- Pet-to-pet proximity interactions with shared emotes
- Seasonal background themes with automatic date-based selection
- No-code emote library (`media/emotes/<id>/emote.json`) with bundled PNG emotes
- Event reaction emotes for file saves, terminal opens, task success/failure, and debug start/stop
- Per-event reaction settings for enabled state, emote choice, random/all targeting, and bounce behavior
- `hidden` mascot manifest field, for staging a mascot before it's shown in the spawn picker
- `framePadding` mascot manifest field: lets contributors leave sprite-sheet grid guide lines baked into their art, automatically cropped out at render time
- No-code contribution templates (`templates/`): a grid guide image, a working reference sprite sheet, and an AI prompt template
- Clicking a pet triggers a small reaction bounce
- `PnP Pets: Remove a Pet` command: remove one specific pet without affecting the others
- `PnP Pets: Adjust Pet Speed` command: speed up or slow down one specific pet live, no respawn needed
- Marketplace packaging: extension icon, `preview` flag, corrected repository links
- First-ever activation spawns a named welcome duo, PnP Parker (purple) and Bit (orange), instead of a single unnamed default pet

### Fixed

- Removed a webview reload that fired on every panel visibility change, which fought `retainContextWhenHidden` and needlessly re-ran the chroma-tint pixel pass for every tintable pet each time the panel was shown again
