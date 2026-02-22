# Sound Pack System Design

**Date:** 2026-02-22
**Status:** Approved

## Problem

The current `~/.agentcraft/sounds/` directory is a flat, monolithic library cloned from one repo. There is no way for users to add additional sound packs, no way to ship UI themes as separate installable units, and no concept of publisher or pack identity in assignment paths. The system assumes exactly one sound library exists.

## Goal

A pack system that:
- Lets users install sound packs from any GitHub repo via `agentcraft pack install publisher/name`
- Works drop-in: manually cloning a repo into the right directory is equivalent to installing
- Keeps packs isolated — no file conflicts between publishers
- Migrates the existing `agentcraft-sounds` library cleanly
- Powers the `agentcraft` npm CLI (already registered at 0.0.1)

## Directory Layout

```
~/.agentcraft/
  assignments.json          — sound assignments (paths include pack prefix)
  waveforms.json            — waveform cache
  packs/
    rohenaz/
      agentcraft-sounds/    — official pack (migrated from ~/.agentcraft/sounds/)
        sc2/
        wc3/
        ff7/
        ff9/
        apps/
        classic-os/
        phones/
        ui/                 — UI theme sounds
          sc2/
          wc3/
          ff7/
          ff9/
          sc-bigbox/
    community-publisher/
      halo-pack/            — example third-party pack
        sounds/
        ui/
```

No manifest file required. Any directory at depth `packs/<publisher>/<name>/` is a valid pack. A `pack.json` is optional metadata (name, description, version) for display purposes only.

## Assignment Path Format

Paths in `assignments.json` gain a pack prefix separated by `:`:

```
rohenaz/agentcraft-sounds:sc2/terran/session-start/scv-ready.mp3
```

The hook script resolves this to:
```
~/.agentcraft/packs/rohenaz/agentcraft-sounds/sc2/terran/session-start/scv-ready.mp3
```

Paths without a `:` prefix are legacy paths (from `~/.agentcraft/sounds/`) and fall back to that directory during a migration grace period.

## Default Configuration

The user's current configuration is saved as `defaults/assignments.json` in the `agentcraft-sounds` repo. On first install, if no `~/.agentcraft/assignments.json` exists, the CLI copies this file as the starting configuration.

## CLI (`agentcraft` npm package)

```bash
agentcraft pack install rohenaz/agentcraft-sounds   # git clone into packs/
agentcraft pack install rohenaz/agentcraft-sounds --branch dev  # specific branch
agentcraft pack list                                # show all installed packs
agentcraft pack remove rohenaz/agentcraft-sounds   # rm -rf
agentcraft pack update rohenaz/agentcraft-sounds   # git pull
agentcraft pack update --all                       # pull all packs
agentcraft start                                   # launch dashboard on port 4040
```

Install resolves `publisher/name` to `https://github.com/publisher/name` and clones into `~/.agentcraft/packs/publisher/name/`.

## Web UI Changes

### Sound Browser
- Groups sounds by pack in the category filter
- Pack shown as top-level grouping: `rohenaz/agentcraft-sounds > sc2 > terran`
- Search spans all packs

### API Routes
- `/api/sounds` — scans `~/.agentcraft/packs/` recursively, prefixes all paths with `publisher/name:`
- `/api/audio/[...path]` — resolves `publisher/name:internal/path` to filesystem path
- `/api/ui-sounds` — scans `ui/` directory across all installed packs

### Migration
- On startup, if `~/.agentcraft/sounds/` exists and `~/.agentcraft/packs/` does not, the server symlinks `~/.agentcraft/packs/rohenaz/agentcraft-sounds` → `~/.agentcraft/sounds/` automatically
- Assignment paths without `:` prefix resolve against `rohenaz/agentcraft-sounds` as the default pack

## `/agentcraft` Slash Command Changes

The auto-clone on first run targets `~/.agentcraft/packs/rohenaz/agentcraft-sounds` instead of `~/.agentcraft/sounds/`. Uses `agentcraft pack install` if CLI is available, falls back to raw `git clone`.

## `pack.json` (Optional)

```json
{
  "name": "agentcraft-sounds",
  "publisher": "rohenaz",
  "version": "2.0.0",
  "description": "Official AgentCraft sound library — SC2, WC3, FF7, FF9, phones, classic OS",
  "types": ["sounds", "ui"]
}
```

`types` is informational — the browser detects what's present by scanning the directory.

## Out of Scope (Future)

- Central pack registry / discovery
- Pack ratings or featured packs
- Signed packs / integrity verification
- Pack versioning / lockfile
