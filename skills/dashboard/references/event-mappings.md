# Event Mappings: Claude Code vs OpenCode vs Pi

AgentCraft defines a set of universal event names. Each client maps these to its native event system.

## Global / Agent Events

| AgentCraft Event | Claude Code Native | OpenCode Native | Pi Native | Notes |
|---|---|---|---|---|
| `SessionStart` | `SessionStart` hook | Plugin init (runs on every launch) | `session_start` / `session_switch` | OC fires on both new and resumed; Pi fires on load + /new or /resume |
| `SessionEnd` | `SessionEnd` hook | `session.deleted` event | `session_shutdown` | |
| `Stop` | `Stop` hook | `session.idle` event | `agent_end` | Fires when model finishes responding |
| `SubagentStop` | `SubagentStop` hook | -- | -- | No equivalent in OpenCode or Pi |
| `PreToolUse` | `PreToolUse` hook | `tool.execute.before` hook | `tool_call` | CC uses Skill matcher; OC fires for skill tool; Pi fires for all tools |
| `PostToolUse` | `PostToolUse` hook | `tool.execute.after` hook | `tool_execution_end` | Same as above |
| `PostToolUseFailure` | `PostToolUseFailure` hook | `session.error` event | `tool_execution_end` (isError) | |
| `Notification` | `Notification` hook | -- | -- | No equivalent in OpenCode or Pi |
| `PreCompact` | `PreCompact` hook | `session.compacted` event | `session_before_compact` | |

## Skill Events

| AgentCraft Event | Claude Code Native | OpenCode Native | Pi Native | Notes |
|---|---|---|---|---|
| `PreToolUse` (skill) | `PreToolUse` hook with `tool_name=Skill` | `tool.execute.before` with skill key extraction | `tool_call` with custom tool name lookup | Pi matches custom tool names against skill assignments; built-in tools use global only |
| `PostToolUse` (skill) | `PostToolUse` hook with `tool_name=Skill` | `tool.execute.after` with skill key extraction | `tool_execution_end` with custom tool name lookup | Same |

## Per-Agent Overrides

- **Claude Code**: The hook payload includes `agent_type`, enabling per-agent sound overrides (three-tier lookup: skill -> agent -> global).
- **OpenCode**: Plugin events do not carry agent identity. Only global sounds are used. Per-agent overrides configured in the dashboard are stored in `assignments.json` and honored by Claude Code, but ignored by OpenCode.
- **Pi**: Extension events do not carry agent identity. Only global sounds are used. Same behavior as OpenCode.

## Sound Lookup Priority

### Claude Code (play-sound.sh)

1. **Skill-specific**: If `tool_name=Skill`, look up `skills[<qualified_name>].hooks[<event>]`
2. **Agent-specific**: Look up `agents[<agent_type>].hooks[<event>]`
3. **Global fallback**: Look up `global[<event>]`

### OpenCode (opencode.ts)

1. **Skill-specific**: If tool is identified as a skill invocation, look up `skills[<key>].hooks[<event>]`
2. **Global fallback**: Look up `global[<event>]`

(No agent-specific tier — OpenCode events lack agent identity.)

### Pi (pi-extension.ts)

1. **Tool/skill-specific**: If tool is a custom tool (not built-in read/bash/edit/write/grep/find/ls), look up `skills[<tool_name>].hooks[<event>]`
2. **Global fallback**: Look up `global[<event>]`

(No agent-specific tier — Pi events lack agent identity. Built-in tools skip skill lookup to avoid noise.)

## Deduplication

All three clients implement deduplication to prevent the same event from firing multiple times in quick succession:

- **Claude Code**: Uses `/tmp/agentcraft-${EVENT}.lock` files with a 3-second window
- **OpenCode**: Uses an in-memory `Map` with a 3-second window (lives for the plugin process lifetime)
- **Pi**: Uses an in-memory `Map` with a 3-second window (lives for the extension process lifetime)
