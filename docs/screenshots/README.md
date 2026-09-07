# Screenshots

Drop PNGs here with these exact filenames. `README.md` and `CONTRIBUTING.md` already link to them.

Every spot that still needs a shot is marked with an HTML comment, invisible when rendered. Search the repo for `SCREENSHOT NEEDED` to find every remaining placeholder; once you drop in the real PNG, the `![...]` line right below the comment will render it automatically. Delete the comment once the shot is in, or leave it — it's inert either way.

| Filename | What to capture |
|---|---|
| `hero.png` | Wide shot of a pet (or a few) walking in the Explorer panel; this is the top banner image |
| `spawn-picker.png` | The QuickPick list after clicking the `+` icon (mascot selection) |
| `color-picker.png` | The QuickPick color list shown for a tintable mascot |
| `click-emote.png` | A pet showing its selected click emote above its head |
| `event-reaction.png` | A pet showing an event reaction emote (trigger one by saving a file, running a task, opening a terminal, or debugging) |
| `event-reaction-settings.png` | VS Code Settings UI showing one event's enabled/emote/target/bounce controls |
| `emote-contact-sheet.png` | Contact sheet of bundled PNG emotes |
| `sprite-sheet-example.png` | A 4x2 mascot sprite sheet showing idle row and walk-right row |
| `tint-source-chroma.png` | A tintable mascot's raw sprite sheet showing the #FF00FF chroma-key source region |

Keep them reasonably small (PNG, ~800px wide is plenty) so the repo doesn't bloat.

`emote-contact-sheet.png` is generated, not hand-captured: run `python scripts/generate-emote-contact-sheet.py` (needs Pillow) any time emotes are added or removed to regenerate it from the current contents of `media/emotes/`.
