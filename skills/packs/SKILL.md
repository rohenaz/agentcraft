---
name: agentcraft-packs
description: This skill should be used when the user asks to "install a sound pack", "add a pack", "find sound packs", "publish a pack", "create a pack", "share my sounds", "agentcraft pack install", "browse packs", "remove a pack", "update packs", or wants to know how the AgentCraft pack system works.
---

# AgentCraft Sound Packs

Sound packs are git repos containing audio files. Any GitHub repo can be a pack — no approval, no registry required. Install by `publisher/name` slug, same as GitHub.

## Installing Packs

### From the CLI

```bash
agentcraft init                                    # first-time setup
agentcraft add rohenaz/agentcraft-sounds           # official pack
agentcraft add publisher/repo-name                 # any GitHub repo
agentcraft list                                    # show installed packs
agentcraft update rohenaz/agentcraft-sounds        # git pull one pack
agentcraft update                                  # update all packs
agentcraft remove publisher/repo-name              # uninstall
```

`agentcraft pack install publisher/repo-name` resolves to `https://github.com/publisher/repo-name` and clones into `~/.agentcraft/packs/publisher/repo-name/`.

Install the CLI globally:
```bash
bun install -g agentcraft   # or: npm install -g agentcraft
```

### From the Dashboard

Open the **PACKS** tab in the AgentCraft dashboard. Installed packs show UPDATE/REMOVE buttons. The **BROWSE PACKS** section fetches the community registry and shows packs not yet installed with an INSTALL button.

### Manual Install (identical result)

```bash
git clone https://github.com/publisher/repo-name ~/.agentcraft/packs/publisher/repo-name
```

Manual clone and CLI install are exactly equivalent — no manifest or registration step.

## Pack Storage

Packs live at `~/.agentcraft/packs/<publisher>/<name>/`. The dashboard auto-discovers everything at that path depth — any directory placed there works.

```
~/.agentcraft/packs/
  rohenaz/
    agentcraft-sounds/     ← official pack
  publisher/
    custom-pack/           ← any git repo cloned here
```

## Sound Assignment Paths

Assigned sounds are stored in `~/.agentcraft/assignments.json` with a pack-prefixed path:

```
rohenaz/agentcraft-sounds:sc2/terran/session-start/scv-ready.mp3
```

Format: `publisher/name:internal/path/to/sound.mp3`

The hook script resolves this to the absolute path at runtime:
```
~/.agentcraft/packs/rohenaz/agentcraft-sounds/sc2/terran/session-start/scv-ready.mp3
```

## Publishing a Pack

Any GitHub repo with audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) is a valid pack. No manifest required — directory structure is the organization.

### Step 1: Organize the repo

Recommended structure — group sounds into directories by game, theme, or purpose:

```
my-sounds/
  sc2/
    terran/
      session-start/
        ready.mp3
      task-complete/
        salute.mp3
  halo/
    unsc/
      session-start/
        wake-up.mp3
  ui/               ← optional: UI theme sounds
    sc2/
      click.mp3
      hover.mp3
```

Any directory layout works. The dashboard groups sounds by their directory path.

### Step 2: Add `pack.json` (optional but recommended)

```json
{
  "name": "my-sounds",
  "publisher": "your-github-username",
  "version": "1.0.0",
  "description": "Short description of the pack",
  "types": ["sounds", "ui"]
}
```

`types` is informational. Use `"ui"` if the pack includes a `ui/` directory with dashboard theme sounds.

### Step 3: Tag the repo on GitHub

Add the `agentcraft-pack` topic to the GitHub repo. This makes it discoverable in:
- The community registry at `https://rohenaz.github.io/agentcraft-registry/`
- GitHub search: `https://github.com/topics/agentcraft-pack`

To tag: GitHub repo → **Settings** → **Topics** → type `agentcraft-pack` → Save.

The registry GitHub Action runs every 6 hours and automatically picks up newly tagged repos.

### Step 4: Share the install command

```bash
agentcraft pack install your-username/your-repo-name
```

That's the entire publish workflow — push to GitHub, tag it, done.

## Pack Discovery

Find community packs three ways:

1. **Dashboard** — PACKS tab → BROWSE PACKS section shows the registry
2. **Registry** — `https://github.com/topics/agentcraft-pack`
3. **Registry JSON** — `https://rohenaz.github.io/agentcraft-registry/index.json`

## UI Theme Sounds

Packs can include a `ui/` directory with sounds that play as you use the AgentCraft dashboard (hover, click, page change, etc.). The dashboard's **UI SFX** dropdown lets users pick which pack's UI theme to use.

Structure the `ui/` directory by theme name:

```
ui/
  sc2/
    click.mp3
    hover.mp3
    confirm.mp3
    error.mp3
    pageChange.mp3
  wc3/
    click.mp3
    ...
```

## Additional Resources

- **`references/pack-format.md`** — Full audio file requirements, directory naming conventions, and pack.json schema
- **Registry source** — `https://github.com/rohenaz/agentcraft-registry`
