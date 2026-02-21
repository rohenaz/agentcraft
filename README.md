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

This starts the web UI at `http://localhost:4040` and opens it in your browser.

## Prerequisites

- [Bun](https://bun.sh) — runs the web UI
- [jq](https://jqlang.github.io/jq/) — JSON parsing in the hook script
- A sound library at `~/code/claude-sounds/` (see below)
- macOS: `afplay` (built in) · Linux: `paplay` or `aplay`

## Sound Library

Sounds live at `~/code/claude-sounds/`. Any `.mp3`, `.wav`, `.ogg`, or `.m4a` file under this directory appears in the browser automatically, organized by subfolder.

Suggested structure:

```
~/code/claude-sounds/
  sc2/terran/session-start/
  sc2/terran/task-complete/
  wc3/human/acknowledgment/
  ff7/battle/
  ff9/misc/
  phones/nokia/alerts/
  phones/pager/
  phones/motorola/
  apps/aim/
  classic-os/
  ui/sc2/          ← UI theme sounds (hover, click, error, etc.)
  ui/wc3/
  ui/ff7/
  ui/ff9/
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

## Managing the Plugin

```bash
claude plugin update agentcraft@rohenaz     # Update to latest
claude plugin uninstall agentcraft@rohenaz  # Remove
```

Assignments are stored at `~/.claude/sounds/assignments.json`.

The web UI is only needed for configuration — hooks run independently of the dashboard.
