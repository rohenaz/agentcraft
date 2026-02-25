#!/bin/bash
# AgentCraft hook - plays assigned sound for this event/agent/skill
CONFIG="$HOME/.agentcraft/assignments.json"
PACKS="$HOME/.agentcraft/packs"

# Read stdin with 2s timeout. 'timeout' isn't available by default on macOS,
# so use perl's alarm() which is always present.
INPUT=$(perl -e '$SIG{ALRM}=sub{exit 0}; alarm 2; local $/; $d=<STDIN>; print $d if $d' 2>/dev/null)
[ -z "$INPUT" ] && INPUT='{}'
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
AGENT=$(echo "$INPUT" | jq -r '.agent_type // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

[ -z "$EVENT" ] && exit 0
[ ! -f "$CONFIG" ] && exit 0

ENABLED=$(jq -r '.settings.enabled // true' "$CONFIG")
[ "$ENABLED" = "false" ] && exit 0

VOLUME=$(jq -r '.settings.masterVolume // 1' "$CONFIG")

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

# pick_random_from_slot: given a jq expression result that may be a string or array,
# pick one entry randomly. Outputs a single string.
pick_random_from_slot() {
  local RAW="$1"
  [ -z "$RAW" ] && return
  # Check if it's a JSON array
  if echo "$RAW" | jq -e 'type == "array"' >/dev/null 2>&1; then
    local LEN
    LEN=$(echo "$RAW" | jq 'length')
    [ "$LEN" -eq 0 ] && return
    local IDX=$((RANDOM % LEN))
    echo "$RAW" | jq -r ".[$IDX]"
  else
    # Scalar string — use jq -r to strip quotes, handle "null"
    local VAL
    VAL=$(echo "$RAW" | jq -r '. // empty')
    echo "$VAL"
  fi
}

# Skill-specific lookup: PreToolUse/PostToolUse when tool_name=Skill
# tool_input.skill is the qualified name, e.g. "plugin-dev:hook-development" or "ask-gemini"
if [ "$TOOL_NAME" = "Skill" ]; then
  SKILL_KEY=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
  if [ -n "$SKILL_KEY" ]; then
    SKILL_ENABLED=$(jq -r --arg s "$SKILL_KEY" '.skills[$s].enabled // true' "$CONFIG")
    if [ "$SKILL_ENABLED" = "true" ]; then
      RAW_SLOT=$(jq --arg s "$SKILL_KEY" --arg e "$EVENT" '.skills[$s].hooks[$e] // empty' "$CONFIG")
      SOUND=$(pick_random_from_slot "$RAW_SLOT")
    fi
  fi
fi

# Agent-specific lookup
if [ -z "$SOUND" ] && [ -n "$AGENT" ]; then
  AGENT_ENABLED=$(jq -r --arg a "$AGENT" '.agents[$a].enabled // true' "$CONFIG")
  if [ "$AGENT_ENABLED" = "true" ]; then
    RAW_SLOT=$(jq --arg a "$AGENT" --arg e "$EVENT" '.agents[$a].hooks[$e] // empty' "$CONFIG")
    SOUND=$(pick_random_from_slot "$RAW_SLOT")
  fi
fi

# Global fallback
if [ -z "$SOUND" ]; then
  RAW_SLOT=$(jq --arg e "$EVENT" '.global[$e] // empty' "$CONFIG")
  SOUND=$(pick_random_from_slot "$RAW_SLOT")
fi
[ -z "$SOUND" ] && exit 0

# Resolve pack-prefixed path: "publisher/name:internal/path"
if echo "$SOUND" | grep -q ':'; then
  PACK_ID="${SOUND%%:*}"
  INTERNAL="${SOUND#*:}"
  PUBLISHER="${PACK_ID%%/*}"
  PACKNAME="${PACK_ID##*/}"
  FULL="$PACKS/$PUBLISHER/$PACKNAME/$INTERNAL"
else
  # Legacy path — fall back to rohenaz/agentcraft-sounds
  FULL="$PACKS/rohenaz/agentcraft-sounds/$SOUND"
fi

[ ! -f "$FULL" ] && exit 0

if [[ "$OSTYPE" == "darwin"* ]]; then
  afplay -v "$VOLUME" "$FULL" &
elif command -v paplay &>/dev/null; then
  VOLUME_PAPLAY=$(awk "BEGIN{printf \"%d\", $VOLUME * 65536}")
  paplay --volume="$VOLUME_PAPLAY" "$FULL" &
elif command -v aplay &>/dev/null; then
  aplay "$FULL" &
fi

exit 0
