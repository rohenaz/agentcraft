# AgentCraft

Assign sounds to your AI coding agent's lifecycle events. Configure everything through an SC2-inspired dashboard — drag sounds onto hook slots, pick a UI theme, and hear your agents come alive.

Works with **Claude Code**, **OpenCode**, and **Pi**.

![AgentCraft dashboard](screenshot.jpg)

## How It Works

**1. Run the skill**

From any Claude Code session:

```
/agentcraft
```

**2. Sounds download automatically**

On first launch, AgentCraft installs the [agentcraft-sounds](https://github.com/rohenaz/agentcraft-sounds) pack to `~/.agentcraft/packs/rohenaz/agentcraft-sounds/`. No manual setup required.

**3. The dashboard opens at `http://localhost:4040`**

A local web UI starts in the background. It stays running between sessions so subsequent `/agentcraft` calls open instantly.

**4. Assign sounds to hook points and skill calls**

- **AGENTS tab** — Expand **GLOBAL OVERRIDE** or any agent row. Click a hook slot (SESSION START, STOP, TOOL FAILURE, etc.) to enter select mode, then click any sound in the browser to assign it. Or drag a sound card directly onto a slot.
- **SKILLS tab** — Assign sounds to individual skill invocations. Each skill has an **ON INVOKE** and **ON COMPLETE** slot.
- Hit **ESTABLISH UPLINK** to save.

From then on, Claude Code plays your sounds automatically as it works — no dashboard needed.

## Install

### Claude Code

```bash
claude plugin install agentcraft@rohenaz
```

### Pi

```bash
pi install git:github.com/rohenaz/agentcraft
```

Or copy the extension file manually:

```bash
cp pi-extension.ts ~/.pi/agent/extensions/agentcraft.ts
```

Then from any pi session: `/agentcraft` to open the dashboard.

### OpenCode

```bash
cp opencode.ts ~/.config/opencode/plugins/agentcraft.ts
```

## CLI

The `agentcraft` CLI manages sound packs:

```bash
bun install -g agentcraft
```

```bash
agentcraft init                                    # first-time setup
agentcraft add rohenaz/agentcraft-sounds           # install a pack from GitHub
agentcraft list                                    # list installed packs
agentcraft update rohenaz/agentcraft-sounds        # update a pack (git pull)
agentcraft update                                  # update all packs
agentcraft remove rohenaz/agentcraft-sounds        # remove a pack
agentcraft init my-sounds                          # scaffold a new pack repo
```

## Sound Packs

Packs live at `~/.agentcraft/packs/<publisher>/<name>/`. Each pack is a plain git repo — installing is just a clone, updating is just a pull.

```
~/.agentcraft/packs/
  rohenaz/
    agentcraft-sounds/     ← official pack
  you/
    custom-pack/           ← any git repo cloned here works automatically
```

**Manual install** works identically to the CLI:
```bash
git clone https://github.com/publisher/name ~/.agentcraft/packs/publisher/name
```

### Pack Structure

Sounds are organized into directories — the dashboard reads depth dynamically:

```
my-sounds/
  sc2/                          ← group tab
    terran/                     ← sub-tab
      session-start/            ← subcategory
        scv-ready.mp3
      task-complete/
        marine-salute.mp3
  ui/                           ← optional: dashboard UI theme sounds
    sc2/
      click.mp3
      hover.mp3
      confirm.mp3
      error.mp3
      pageChange.mp3
```

Any layout works — flat, mood-organized, game-organized. File names become display names in the browser (`scv-ready.mp3` → "Scv Ready"). Supported formats: `.mp3`, `.wav`, `.ogg`, `.m4a`.

Add an optional `pack.json` at the root for display metadata:

```json
{
  "name": "my-sounds",
  "publisher": "your-github-username",
  "version": "1.0.0",
  "description": "Short description shown in the dashboard",
  "types": ["sounds", "ui"]
}
```

### Creating a Pack

**Fastest path — scaffold with the CLI:**

```bash
agentcraft init my-sounds
cd my-sounds
# drop your audio files in, then push to GitHub
```

**Or ask your agent.** From any Claude Code session, say something like:

> "Help me create a sound pack" or "scaffold a new agentcraft pack called my-sounds"

The agent will invoke the `agentcraft:packs` skill and walk you through the whole process — directory structure, `pack.json`, and publishing.

### Publishing

1. Push the repo to GitHub
2. Add the `agentcraft-pack` topic (repo **Settings → Topics**)
3. Share the install command: `agentcraft add your-username/your-repo`

The community registry picks up newly tagged repos every 6 hours. No approval required.

## Prerequisites

- [Bun](https://bun.sh) — runs the web UI
- [jq](https://jqlang.github.io/jq/) — JSON parsing in the hook script
- [git](https://git-scm.com) — downloads packs on install
- macOS: `afplay` (built in) · Linux: `paplay` or `aplay`

## Hooks

| Event | When it fires |
|-------|--------------|
| `SessionStart` | New session begins |
| `SessionEnd` | Session ends |
| `Stop` | Claude finishes a response |
| `SubagentStop` | A subagent completes |
| `Notification` | Claude sends a notification |
| `PreCompact` | Context is about to be compacted |
| `PreToolUse (Skill)` | A skill is invoked |
| `PostToolUse (Skill)` | A skill completes |

Sounds can be set globally (fires for all agents) or per-agent (overrides global for that agent).

## UI Sound Themes

The **UI SFX** dropdown in the header controls ambient sounds that play as you use the dashboard. Click **⚙** to customize individual slots per theme.

| Theme | Style |
|-------|-------|
| SC2 | StarCraft II — crisp, digital |
| WC3 | Warcraft III — warm, fantasy |
| FF7 | Final Fantasy VII — retro RPG |
| FF9 | Final Fantasy IX — soft, minimal |
| OFF | No UI sounds |

## Storage

| Path | Contents |
|------|----------|
| `~/.agentcraft/assignments.json` | Your sound assignments |
| `~/.agentcraft/packs/` | Installed sound packs |

## Managing the Plugin

### Claude Code

```bash
claude plugin update agentcraft@rohenaz     # Update to latest
claude plugin uninstall agentcraft@rohenaz  # Remove
```

### Pi

```bash
pi update                                   # Update all packages
pi remove git:github.com/rohenaz/agentcraft # Remove
```
