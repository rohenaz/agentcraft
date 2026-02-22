# Event Mappings: Claude Code vs OpenCode

AgentCraft defines a set of universal event names. Each client maps these to its native event system.

## Global / Agent Events

| AgentCraft Event | Claude Code Native | OpenCode Native | Notes |
|---|---|---|---|
| `SessionStart` | `SessionStart` hook | Plugin init (runs on every launch) | OC fires on both new and resumed sessions |
| `SessionEnd` | `SessionEnd` hook | `session.deleted` event | |
| `Stop` | `Stop` hook | `session.idle` event | Fires when model finishes responding |
| `SubagentStop` | `SubagentStop` hook | -- | No equivalent in OpenCode |
| `PreToolUse` | `PreToolUse` hook | `tool.execute.before` hook | CC uses Skill matcher for skill-specific; OC fires for all tools |
| `PostToolUse` | `PostToolUse` hook | `tool.execute.after` hook | Same as above |
| `PostToolUseFailure` | `PostToolUseFailure` hook | `session.error` event | |
| `Notification` | `Notification` hook | -- | No equivalent in OpenCode |
| `PreCompact` | `PreCompact` hook | `session.compacted` event | |

## Skill Events

| AgentCraft Event | Claude Code Native | OpenCode Native | Notes |
|---|---|---|---|
| `PreToolUse` (skill) | `PreToolUse` hook with `tool_name=Skill` | `tool.execute.before` with skill key extraction | OC extracts skill name from tool args |
| `PostToolUse` (skill) | `PostToolUse` hook with `tool_name=Skill` | `tool.execute.after` with skill key extraction | Same |

## Per-Agent Overrides

- **Claude Code**: The hook payload includes `agent_type`, enabling per-agent sound overrides (three-tier lookup: skill -> agent -> global).
- **OpenCode**: Plugin events do not carry agent identity. Only global sounds are used. Per-agent overrides configured in the dashboard are stored in `assignments.json` and honored by Claude Code, but ignored by OpenCode.

## Sound Lookup Priority

### Claude Code (play-sound.sh)

1. **Skill-specific**: If `tool_name=Skill`, look up `skills[<qualified_name>].hooks[<event>]`
2. **Agent-specific**: Look up `agents[<agent_type>].hooks[<event>]`
3. **Global fallback**: Look up `global[<event>]`

### OpenCode (opencode.js)

1. **Skill-specific**: If tool is identified as a skill invocation, look up `skills[<key>].hooks[<event>]`
2. **Global fallback**: Look up `global[<event>]`

(No agent-specific tier — OpenCode events lack agent identity.)

## Deduplication

Both clients implement deduplication to prevent the same event from firing multiple times in quick succession:

- **Claude Code**: Uses `/tmp/agentcraft-${EVENT}.lock` files with a 3-second window
- **OpenCode**: Uses an in-memory `Map` with a 3-second window (lives for the plugin process lifetime)
