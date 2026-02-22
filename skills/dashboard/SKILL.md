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
cd ~/.config/opencode/plugins/ && ls  # verify agentcraft.js exists
# The web directory may need to be started from the agentcraft repo:
cd /path/to/agentcraft/web && bun dev --port 4040 &
```

Then open `http://localhost:4040?client=opencode` in the browser.

## Event Support by Client

Both clients share the same `assignments.json` config. Sounds assigned in the dashboard work across both clients for supported events.

**Supported by both**: SessionStart, SessionEnd, Stop, PreToolUse, PostToolUse (skill events), PostToolUseFailure, PreCompact

**Claude Code only**: SubagentStop, Notification

**Skill events in OpenCode**: OpenCode fires `tool.execute.before`/`tool.execute.after` with `tool="skill"` and `args.name` containing the skill name. The plugin extracts the skill key and does skill-specific sound lookup, the same as Claude Code.

**Per-agent overrides**: Claude Code only. OpenCode uses global sounds (agent identity is not available in OpenCode plugin events).

## Shared Configuration

The dashboard writes to `~/.agentcraft/assignments.json`. Both the Claude Code hook script (`hooks/play-sound.sh`) and the OpenCode plugin (`opencode.js`) read from this same file at runtime. Changes made in the dashboard take effect immediately for both clients without restart.

## Additional Resources

- **`references/event-mappings.md`** — Full event mapping table showing how each AgentCraft event maps to native events in each client
