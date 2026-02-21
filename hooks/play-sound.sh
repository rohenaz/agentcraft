#!/bin/bash
# AgentCraft hook - plays assigned sound for this event/agent/skill
CONFIG="$HOME/.claude/sounds/assignments.json"
LIBRARY="$HOME/code/claude-sounds"

# timeout 2: prevents blocking if Claude Code doesn't close stdin (e.g. on crash)
INPUT=$(timeout 2 cat 2>/dev/null || echo '{}')
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
AGENT=$(echo "$INPUT" | jq -r '.agent_type // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

[ -z "$EVENT" ] && exit 0
[ ! -f "$CONFIG" ] && exit 0

ENABLED=$(jq -r '.settings.enabled // true' "$CONFIG")
[ "$ENABLED" = "false" ] && exit 0

# Deduplicate: prevent the same event from firing within 3 seconds.
# Claude Code fires SessionStart twice on resume (process init + session restore).
LOCKFILE="/tmp/agentcraft-${EVENT}.lock"
NOW=$(date +%s)
if [ -f "$LOCKFILE" ]; then
  LAST=$(cat "$LOCKFILE" 2>/dev/null || echo 0)
  if [ $((NOW - LAST)) -lt 3 ]; then
    exit 0
  fi
fi
echo "$NOW" > "$LOCKFILE"

SOUND=""

# Skill-specific lookup: PreToolUse/PostToolUse when tool_name=Skill
# tool_input.skill is the qualified name, e.g. "plugin-dev:hook-development" or "ask-gemini"
if [ "$TOOL_NAME" = "Skill" ]; then
  SKILL_KEY=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
  if [ -n "$SKILL_KEY" ]; then
    SKILL_ENABLED=$(jq -r --arg s "$SKILL_KEY" '.skills[$s].enabled // true' "$CONFIG")
    if [ "$SKILL_ENABLED" = "true" ]; then
      SOUND=$(jq -r --arg s "$SKILL_KEY" --arg e "$EVENT" '.skills[$s].hooks[$e] // empty' "$CONFIG")
    fi
  fi
fi

# Agent-specific lookup
if [ -z "$SOUND" ] && [ -n "$AGENT" ]; then
  AGENT_ENABLED=$(jq -r --arg a "$AGENT" '.agents[$a].enabled // true' "$CONFIG")
  if [ "$AGENT_ENABLED" = "true" ]; then
    SOUND=$(jq -r --arg a "$AGENT" --arg e "$EVENT" '.agents[$a].hooks[$e] // empty' "$CONFIG")
  fi
fi

# Global fallback
[ -z "$SOUND" ] && SOUND=$(jq -r --arg e "$EVENT" '.global[$e] // empty' "$CONFIG")
[ -z "$SOUND" ] && exit 0

FULL="$LIBRARY/$SOUND"
[ ! -f "$FULL" ] && exit 0

if [[ "$OSTYPE" == "darwin"* ]]; then
  afplay "$FULL" &
elif command -v paplay &>/dev/null; then
  paplay "$FULL" &
elif command -v aplay &>/dev/null; then
  aplay "$FULL" &
fi

exit 0
