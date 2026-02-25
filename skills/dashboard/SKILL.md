---
name: agentcraft-dashboard
description: This skill should be used when the user asks to "open agentcraft", "launch the dashboard", "configure sounds", "assign sounds", "open the sound assignment UI", "manage sound assignments", "agentcraft dashboard", or wants to open the AgentCraft web interface. Covers launching the dashboard server and opening it with the correct client identifier for both Claude Code and OpenCode.
---

# AgentCraft Dashboard

The AgentCraft dashboard is a web UI for assigning sounds to agent lifecycle events. It runs locally on port 4040 and reads/writes `~/.agentcraft/assignments.json`.

## Client Identification

The dashboard accepts a `?client=` query parameter that controls which client's event support is displayed. **Always pass this parameter when opening the dashboard.**

| Client | Parameter | Example URL |
|---|---|---|
| Claude Code | `?client=claude-code` | `http://localhost:4040?client=claude-code` |
| OpenCode | `?client=opencode` | `http://localhost:4040?client=opencode` |
| Pi | `?client=pi` | `http://localhost:4040?client=pi` |
| Unknown/generic | (omit) | `http://localhost:4040` |

When the client is identified, the dashboard:
- Shows a client badge in the header
- Marks unsupported events with visual indicators
- Displays an EVENT MAPPINGS panel comparing native event names across clients
- Dims per-agent override rows for clients that only support global sounds

## Launching from Claude Code

Use the `/agentcraft` slash command. It handles server startup, health polling, and opens the browser with `?client=claude-code` automatically.

If the slash command is unavailable, start manually:

```bash
agentcraft init                    # first-time setup (installs pack + config)
agentcraft start                   # starts dashboard on port 4040
open "http://localhost:4040?client=claude-code"
```

To stop: `/agentcraft --stop` or `kill $(lsof -ti:4040)`.

## Launching from Pi

From any pi session, use the registered command:

```
/agentcraft
```

This handles first-time setup, starts the dashboard server, and opens the browser with `?client=pi` automatically.

To stop: `/agentcraft --stop` or `/agentcraft stop`.

If the command is unavailable (extension not loaded), launch manually:

```bash
agentcraft init                    # first-time setup
cd /path/to/agentcraft/web && bun dev --port 4040 &
open "http://localhost:4040?client=pi"
```

## Launching from OpenCode

OpenCode does not have slash commands. Launch the dashboard via the CLI:

```bash
agentcraft init                    # first-time setup (if not done)
agentcraft start                   # starts dashboard on port 4040
open "http://localhost:4040?client=opencode"
```

If `agentcraft` is not installed globally:

```bash
# Install the CLI
bun install -g agentcraft          # or: npm install -g agentcraft

# Or start the server directly from the plugin source
cd ~/.config/opencode/plugins/ && ls  # verify agentcraft.ts exists
# The web directory may need to be started from the agentcraft repo:
cd /path/to/agentcraft/web && bun dev --port 4040 &
```

Then open `http://localhost:4040?client=opencode` in the browser.

## Event Support by Client

All clients share the same `assignments.json` config. Sounds assigned in the dashboard work across all clients for supported events.

**Supported by all three**: SessionStart, SessionEnd, Stop, PreToolUse, PostToolUse (skill events), PostToolUseFailure, PreCompact

**Claude Code only**: SubagentStop, Notification

**Skill events in OpenCode**: OpenCode fires `tool.execute.before`/`tool.execute.after` with `tool="skill"` and `args.name` containing the skill name. The plugin extracts the skill key and does skill-specific sound lookup, the same as Claude Code.

**Tool events in Pi**: Pi fires `tool_call` before any tool executes and `tool_execution_end` after completion. The extension maps custom tool names to skill assignments — built-in tools (read, bash, edit, write) only use global sound assignments.

**Per-agent overrides**: Claude Code only. OpenCode and Pi use global sounds (agent identity is not available in their event systems).

## Shared Configuration

The dashboard writes to `~/.agentcraft/assignments.json`. The Claude Code hook script (`hooks/play-sound.sh`), the OpenCode plugin (`opencode.ts`), and the Pi extension (`pi-extension.ts`) all read from this same file at runtime. Changes made in the dashboard take effect immediately for all clients without restart.

## Additional Resources

- **`references/event-mappings.md`** — Full event mapping table showing how each AgentCraft event maps to native events in each client
