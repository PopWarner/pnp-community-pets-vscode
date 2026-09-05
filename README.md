# PnP Community Pets

Parker the Porcupine, Bit, and more Copilot, Microsoft 365 & Power Platform mascots living in your VS Code Explorer sidebar. They walk, climb, and idle around the panel, and react when you save a file, run a task, or start debugging.

<!-- SCREENSHOT NEEDED: docs/screenshots/hero.png - Wide Explorer sidebar hero showing Parker and Bit walking in the PnP Community Pets panel -->
![Parker walking in the Explorer sidebar](docs/screenshots/hero.png)

## Features

- **Real community mascots**: Parker the Porcupine and Bit, with room for more community mascots
- **Pick your own color**: tintable mascots let you choose a shirt color from a preset palette or any custom hex value
- **Walks every surface**: floor, walls, and ceiling
- **Multiple pets at once**: spawn as many as you like, each with its own name and color
- **Remembers your pets**: they're restored automatically the next time you open VS Code
- **Individually manage each pet**: remove or speed up/slow down one specific pet without touching the rest, from the Command Palette
- **Click a pet to say hi**: gives a little bounce; on walls and ceiling it hops away from the surface, matching its rotation
- **Event reaction emotes**: pets can react when files are saved, terminals open, tasks finish, or debugging starts and stops
- **Pet-to-pet interactions**: pets that meet on the floor can pause, bounce, and share an emote together
- **Seasonal themes**: background themes for holidays and community events
- **No-code contribution model**: add a new mascot or emote with a JSON file and some art, no code required

## Screenshots

<!-- SCREENSHOT NEEDED: docs/screenshots/spawn-picker.png - Spawn picker showing Parker and Bit as selectable mascots -->
<!-- SCREENSHOT NEEDED: docs/screenshots/color-picker.png - Tint color picker for a tintable mascot -->
<!-- SCREENSHOT NEEDED: docs/screenshots/click-emote.png - Pet showing a click emote above its head -->
<!-- SCREENSHOT NEEDED: docs/screenshots/event-reaction.png - Event reaction emote appearing after a file save -->

| Spawn a pet | Pick a color | Click emote | Event reaction |
|---|---|---|---|
| ![Spawn picker](docs/screenshots/spawn-picker.png) | ![Color picker](docs/screenshots/color-picker.png) | ![Click emote](docs/screenshots/click-emote.png) | ![Event reaction](docs/screenshots/event-reaction.png) |

## Getting Started

1. Install the extension
2. Open the Explorer sidebar. The **PnP Community Pets** panel appears at the bottom
3. Click the `+` icon to spawn a pet, give it a name, and (for tintable mascots) pick a color
4. Click the trash icon to remove all pets
5. Open the Command Palette (`Ctrl+Shift+P`) for more: **Remove a Pet** or **Adjust Pet Speed**

## Settings

| Setting | Default | Description |
|---|---|---|
| `pnpPets.mascot` | `parker` | The mascot spawned automatically on startup |
| `pnpPets.theme` | `auto` | Background theme (`auto`, `default`, `winter`, `spring`, `halloween`, `ignite`, `build`) |
| `pnpPets.speed` | `2` | Movement speed (1–10) |
| `pnpPets.petCount` | `1` | Number of pets spawned automatically on startup |
| `pnpPets.persistPets` | `true` | Remember active pets across VS Code restarts |
| `pnpPets.enableEventReactions` | `true` | Enable temporary event emotes for VS Code activity |

### Event Reaction Settings

Each supported event has its own settings group under `pnpPets.eventReactions.<event>`.

Supported events:

- `fileSaved`
- `taskSucceeded`
- `taskFailed`
- `terminalOpened`
- `debugStarted`
- `debugStopped`

Each event supports:

- `enabled`: turn that event reaction on or off
- `emoteId`: choose one of the bundled emotes
- `target`: `random` for one active pet, or `all` for every active pet
- `bounce`: whether the pet bounces when the event emote appears

<!-- SCREENSHOT NEEDED: docs/screenshots/event-reaction-settings.png - VS Code Settings UI showing per-event reaction controls with enabled checkbox, emote dropdown, target dropdown, and bounce checkbox -->
![Event reaction settings](docs/screenshots/event-reaction-settings.png)

## Contributing Assets

Adding a new mascot or emote is a no-code contribution: drop a folder with a JSON manifest and your art under `media/pets/` or `media/emotes/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, supported sprite formats, and asset templates.

Badge signs and Credly profile integrations are planned for a future release.

## Roadmap

See [BACKLOG.md](BACKLOG.md) for planned features and ways to get involved.

## License

MIT
