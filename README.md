# PnP Community Pets

Parker the Porcupine, Bit, and more Copilot, Microsoft 365 & Power Platform mascots living in your VS Code Explorer sidebar. They walk, climb, and idle around the panel, and react when you save a file, run a task, or start debugging.

![Parker walking in the Explorer sidebar](docs/screenshots/hero.png)

## Features

- **Real community mascots**: starting with Parker the Porcupine, the official PnP mascot
- **Pick your own color**: tintable mascots let you choose a shirt color from a preset palette or any custom hex value
- **Walks every surface**: floor, walls, and ceiling
- **Multiple pets at once**: spawn as many as you like, each with its own name and color
- **Remembers your pets**: they're restored automatically the next time you open VS Code
- **Individually manage each pet**: remove or speed up/slow down one specific pet without touching the rest, from the Command Palette
- **Click a pet to say hi**: gives a little bounce; on walls and ceiling it hops away from the surface, matching its rotation
- **Hold up a badge or logo**: attach a badge from the community badge library to any pet at spawn time. Click the badge to open its link
- **Credly badge strip**: show off your earned community badges right in the panel
- **Seasonal themes**: background themes for holidays and community events
- **No-code contribution model**: add a new mascot, badge, or logo with a JSON file and some art, no code required

## Screenshots

| Spawn a pet | Pick a color | Badge strip |
|---|---|---|
| ![Spawn picker](docs/screenshots/spawn-picker.png) | ![Color picker](docs/screenshots/color-picker.png) | ![Badge strip](docs/screenshots/badge-strip.png) |

## Getting Started

1. Install the extension
2. Open the Explorer sidebar. The **PnP Community Pets** panel appears at the bottom
3. Click the `+` icon to spawn a pet, give it a name, and (for tintable mascots) pick a color and a badge/sign
4. Click the trash icon to remove all pets
5. Open the Command Palette (`Ctrl+Shift+P`) for more: **Remove a Pet**, **Adjust Pet Speed**, or **Show My Credly Badges**

## Settings

| Setting | Default | Description |
|---|---|---|
| `pnpPets.mascot` | `parker` | The mascot spawned automatically on startup |
| `pnpPets.theme` | `auto` | Background theme (`auto`, `default`, `winter`, `spring`, `halloween`, `ignite`, `build`) |
| `pnpPets.speed` | `2` | Movement speed (1–10) |
| `pnpPets.petCount` | `1` | Number of pets spawned automatically on startup |
| `pnpPets.persistPets` | `true` | Remember active pets across VS Code restarts |
| `pnpPets.credlyUsername` | `""` | Your Credly username, to show your badges in the panel |
| `pnpPets.showBadgeStrip` | `true` | Show the Credly badge strip |

## Contributing a Mascot or Badge

Adding a new mascot, badge, or logo is a no-code contribution: drop a folder with a JSON manifest and your art under `media/pets/` or `media/badges/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, supported sprite formats, and an AI-art prompt template to help you generate one.

## Roadmap

See [BACKLOG.md](BACKLOG.md) for planned features and ways to get involved.

## License

MIT
