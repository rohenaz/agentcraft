# AgentCraft

Assign sounds to AI coding agent lifecycle events. Drag-and-drop sounds onto hook events through an SC2-inspired dashboard.

Works with **Claude Code** and **OpenCode**.

## Install

### From a Claude Code session (recommended)

Run this in your terminal while Claude Code is active, or ask Claude to run it:

```bash
claude plugin install agentcraft@rohenaz
```

### Using the Claude Code Marketplace UI

Inside a Claude Code session, type:

```
/claude plugin install agentcraft@rohenaz
```

Or browse the marketplace with `claude plugin list` to discover and install plugins.

## Prerequisites

**Required:**
- [Bun](https://bun.sh) — for running the web UI
- [jq](https://jqlang.github.io/jq/) — for JSON parsing in the hook script
- A sound library at `~/code/claude-sounds/` (see below)

**Audio playback:**
- macOS: `afplay` (built in)
- Linux: `paplay` (PulseAudio) or `aplay` (ALSA)

## Sound Library Setup

Sounds live at `~/code/claude-sounds/`. Organize them as:

```
~/code/claude-sounds/
  sc2/terran/session-start/
  sc2/terran/task-complete/
  wc3/orc/acknowledgment/
  apps/aim/
  phones/nokia/
  ...
```

Any audio file (`.mp3`, `.wav`, `.ogg`, `.m4a`) under this directory will appear in the browser.

## Usage

After installing the plugin, open the dashboard in any Claude Code session:

```
/agentcraft
```

This starts the web UI at `http://localhost:4040` and opens it in your browser. From there:

1. **Drag** a sound from the browser onto a hook slot in the agent roster
2. **Click** sound cards to preview them
3. **Save** your assignments with the ESTABLISH UPLINK button

Assignments are stored at `~/.claude/sounds/assignments.json`.

## How It Works

When Claude Code fires a lifecycle event (session start, tool use, agent stop, etc.), the `play-sound.sh` hook script:

1. Reads `~/.claude/sounds/assignments.json`
2. Looks up the sound for that event and agent
3. Plays it in the background via `afplay` (macOS) or `paplay`/`aplay` (Linux)

The web UI is only needed for configuration — hooks run independently.

## Hooks Registered

| Event | When it fires |
|-------|--------------|
| `SessionStart` | New Claude Code session begins |
| `SessionEnd` | Session ends |
| `Stop` | Claude finishes a response |
| `SubagentStop` | A subagent completes |
| `Notification` | Claude sends a notification |
| `PreCompact` | Context is about to be compacted |
| `PreToolUse (Skill)` | A skill is invoked |
| `PostToolUse (Skill)` | A skill completes |

## Managing the Plugin

```bash
claude plugin list                    # List installed plugins
claude plugin update agentcraft@rohenaz   # Update to latest version
claude plugin uninstall agentcraft@rohenaz  # Remove plugin
```
