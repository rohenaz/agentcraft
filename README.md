# AgentCraft

Assign sounds to AI coding agent lifecycle events. Configure everything through an SC2-inspired dashboard — drag sounds onto hook slots, pick a UI theme, and hear your agents come alive.

Works with **Claude Code** and **OpenCode**.

## Install

```bash
claude plugin install agentcraft@rohenaz
```

Then open the dashboard from any Claude Code session:

```
/agentcraft
```

This starts the web UI at `http://localhost:4040` and opens it in your browser. On first run, the sound library is downloaded automatically to `~/.agentcraft/sounds/`.

## Prerequisites

- [Bun](https://bun.sh) — runs the web UI
- [jq](https://jqlang.github.io/jq/) — JSON parsing in the hook script
- [git](https://git-scm.com) — for downloading the sound library on first run
- macOS: `afplay` (built in) · Linux: `paplay` or `aplay`

## Sound Library

Sounds live at `~/.agentcraft/sounds/`. The library is cloned from [agentcraft-sounds](https://github.com/rohenaz/agentcraft-sounds) on first run. Any `.mp3`, `.wav`, `.ogg`, or `.m4a` file you drop in there appears in the browser automatically.

```
~/.agentcraft/sounds/
  sc2/                  StarCraft II sounds (terran, protoss, zerg)
  wc3/                  Warcraft III sounds
  ff7/                  Final Fantasy VII sounds
  ff9/                  Final Fantasy IX sounds
  apps/                 Nostalgic app sounds (AIM, ICQ, Winamp)
  classic-os/           Mac and Windows startup/UI sounds
  phones/               Nokia alerts, Motorola buttons, pager beeps
  ui/                   UI theme sounds (hover, click, error per theme)
```

To update the library later:

```bash
git -C ~/.agentcraft/sounds pull
```

## Assigning Hook Sounds

Hook sounds play when Claude Code fires lifecycle events.

1. Open the **AGENTS** tab in the left sidebar
2. Expand **GLOBAL OVERRIDE** or any agent row
3. Click a hook slot to enter select mode, then click a sound in the browser — or drag a sound card directly onto a slot
4. Hit **ESTABLISH UPLINK** to save

### Hooks

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

You can set sounds globally (fires for all agents) or per-agent (overrides global for that agent only).

## Assigning Skill Sounds

Switch to the **SKILLS** tab to assign sounds to individual skill invocations. Each skill has two slots: **ON INVOKE** and **ON COMPLETE**.

## UI Sound Themes

The header dropdown (UI SFX) controls ambient interface sounds that play as you use the dashboard itself. Pick a theme or set it to OFF.

| Theme | Style |
|-------|-------|
| SC2 | StarCraft II — crisp, digital |
| WC3 | Warcraft III — warm, fantasy |
| FF7 | Final Fantasy VII — retro RPG |
| FF9 | Final Fantasy IX — soft, minimal |
| OFF | No UI sounds |

### UI Sound Slots

Click **⚙** next to the theme dropdown to customize individual slots:

| Slot | Plays on |
|------|----------|
| HOVER | Mouse over interactive elements |
| CLICK | Button press |
| TOGGLE | Expand / collapse sidebar rows |
| PAGE CHANGE | Tab and group navigation |
| CONFIRM | Sound assigned, settings saved |
| ERROR | Action failed |

HOVER, CLICK, and ERROR have theme defaults (`ui/{theme}/{slot}.mp3`). The others (TOGGLE, PAGE CHANGE, CONFIRM) are silent unless explicitly assigned.

## Storage

| Path | Contents |
|------|----------|
| `~/.agentcraft/assignments.json` | Your sound assignments |
| `~/.agentcraft/sounds/` | Sound library |
| `~/.agentcraft/waveforms.json` | Waveform cache |

## Managing the Plugin

```bash
claude plugin update agentcraft@rohenaz     # Update to latest
claude plugin uninstall agentcraft@rohenaz  # Remove
```

The web UI is only needed for configuration — hooks run independently of the dashboard.
