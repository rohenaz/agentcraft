# AgentCraft TODO

## Features

### Push-to-Talk / Dictation Mute Key
Assign a configurable hotkey (default: Fn key) that suppresses sound playback while held.
Use case: PTT dictation apps (Whisper, SuperWhisper, etc.) use a held key to record. Sounds
firing during active recording interrupt or bleed into the mic capture.

**Design notes:**
- Settings UI: "MUTE WHILE HELD" key picker in the dashboard (default `Fn`, allow any key)
- Stored in `assignments.json` under `settings.muteKey` (e.g. `"Fn"`, `"CapsLock"`, `"F13"`)
- Detection: the hook script can't read keyboard state directly. Options:
  1. **Lock file approach** — dashboard JS writes `/tmp/agentcraft-muted.lock` on `keydown`
     and removes it on `keyup`. Hook script checks for file existence before playing.
     Requires the dashboard to be open (reasonable — it's a config tool).
  2. **Daemon approach** — small background process (bun script) listens to keyboard events
     via IOKit/CGEvent on macOS and manages the lock file. Survives without dashboard open.
  3. **Passive detection** — read `/proc/bus/input` on Linux or `hidutil` output on macOS
     to poll key state at hook execution time (complex, likely too slow).
- Recommended: start with option 1 (lock file via dashboard), add option 2 as optional daemon.
- The `play-sound.sh` check would be: `[ -f "/tmp/agentcraft-muted.lock" ] && exit 0`
- Dashboard global keydown/keyup listeners write/remove the lock file via a small API route
  (`POST /api/mute { active: boolean }`)

### Sound Browser SOURCE Dropdown (multi-pack filter)
Gemini Option A: compact SOURCE dropdown above group tabs, invisible at 1 pack, appears at 2+.
Filters the sound browser to a specific pack or shows all with pack badges on cards.
See: conversation history / Gemini recommendation for full spec.
