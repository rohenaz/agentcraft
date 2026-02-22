# Pack Format Reference

## Audio File Requirements

Supported formats: `.mp3`, `.wav`, `.ogg`, `.m4a`

Recommended: `.mp3` at 128–192kbps for compatibility and small file size.

File names become the display name in the sound browser (dashes/underscores become spaces, title-cased). Keep names descriptive:
- `scv-ready.mp3` → "Scv Ready"
- `marine-salute-00.mp3` → "Marine Salute 00"

## Directory Structure

No required structure. The dashboard reads depth dynamically:

- Top-level directories → **Group tabs** (e.g. `sc2`, `halo`, `classic-os`)
- Second-level directories → **Sub-tabs** (e.g. `sc2/terran`, `halo/unsc`)
- Third-level directories → **Subcategories** within a sub-tab (e.g. `sc2/terran/session-start`)
- Files at any depth → Sound cards

Example layouts that all work:

**Game-organized:**
```
sc2/terran/session-start/scv-ready.mp3
sc2/terran/task-complete/marine-salute.mp3
sc2/protoss/session-start/probe-ready.mp3
```

**Flat:**
```
sounds/click.mp3
sounds/beep.mp3
```

**Mood-organized:**
```
ambient/forest/birds.mp3
action/alert/warning.mp3
```

## pack.json Schema

All fields are optional. Used for display in the PACKS tab and the community registry.

```json
{
  "name": "string",           // Display name (defaults to directory name)
  "publisher": "string",      // GitHub username (defaults to directory publisher)
  "version": "string",        // Semantic version, e.g. "1.0.0"
  "description": "string",    // One-line description shown in dashboard
  "types": ["sounds", "ui"]   // Content types: "sounds", "ui", or both
}
```

## UI Theme Sounds

Include a `ui/` directory at the pack root for dashboard UI sounds. Subdirectories are theme names. Each theme can define any subset of these event sounds:

| Filename | Trigger |
|----------|---------|
| `click.mp3` | Button click |
| `hover.mp3` | Element hover |
| `confirm.mp3` | Save / success action |
| `error.mp3` | Error / failure |
| `pageChange.mp3` | Tab / page switch |
| `drag.mp3` | Drag start |
| `drop.mp3` | Drop onto slot |
| `open.mp3` | Panel/modal open |
| `close.mp3` | Panel/modal close |

Missing files are silently skipped. Themes with no `ui/` directory are sound-only packs.

Example:
```
ui/
  sc2/
    click.mp3
    hover.mp3
    confirm.mp3
    error.mp3
  wc3/
    click.mp3
    hover.mp3
```

## Assignment Path Format

When a sound is assigned to a hook, it's stored as:

```
publisher/pack-name:path/to/sound.mp3
```

The colon (`:`) separates pack identity from the internal path. The hook script resolves this to:

```
~/.agentcraft/packs/publisher/pack-name/path/to/sound.mp3
```

Sounds from your pack will automatically use this format when assigned through the dashboard.

## GitHub Topics

Tag your repo with `agentcraft-pack` to appear in the community registry. Additional optional tags:

| Topic | Meaning |
|-------|---------|
| `agentcraft-pack` | Required for discovery |
| `agentcraft-type-sounds` | Pack contains hook sounds |
| `agentcraft-type-ui` | Pack contains UI theme sounds |

The `agentcraft-type-*` topics are parsed by the registry Action and populate the `types` field in `index.json` automatically (as a fallback when no `pack.json` is present).

## File Size Guidelines

- Individual sounds: ideally < 500KB, max 2MB
- Total pack size: ideally < 50MB
- Large packs slow down `agentcraft pack install` (git clone)

Consider using `.gitattributes` with Git LFS for packs with many large audio files.
