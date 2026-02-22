/**
 * AgentCraft — OpenCode plugin
 *
 * Plays sounds on OpenCode lifecycle events using the same assignments.json
 * config as the Claude Code plugin. Shared config lives at:
 *   ~/.agentcraft/assignments.json
 *
 * Packs are stored at:
 *   ~/.agentcraft/packs/<publisher>/<name>/
 *
 * To install for OpenCode, copy this file to:
 *   ~/.config/opencode/plugins/agentcraft.js   (global)
 *   .opencode/plugins/agentcraft.js             (project)
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

const DEBUG_LOG = join(homedir(), '.agentcraft', 'opencode-debug.log');
function debug(msg) {
  try { appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`); } catch {}
}

const ASSIGNMENTS_PATH = join(homedir(), '.agentcraft', 'assignments.json');
const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');

// ── Config helpers ──────────────────────────────────────────────

function getAssignments() {
  try {
    return JSON.parse(readFileSync(ASSIGNMENTS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function resolvePackPath(soundPath) {
  if (!soundPath) return null;
  if (soundPath.includes(':')) {
    const colon = soundPath.indexOf(':');
    const packId = soundPath.slice(0, colon);
    const internal = soundPath.slice(colon + 1);
    const slash = packId.indexOf('/');
    const publisher = packId.slice(0, slash);
    const name = packId.slice(slash + 1);
    return join(PACKS_DIR, publisher, name, internal);
  }
  return join(PACKS_DIR, 'rohenaz', 'agentcraft-sounds', soundPath);
}

// ── Sound playback ──────────────────────────────────────────────

// Fire-and-forget — detached child process, never blocks OpenCode UI
function playSound(soundPath, volume) {
  const full = resolvePackPath(soundPath);
  if (!full || !existsSync(full)) return;
  const vol = String(volume ?? 0.5);
  if (process.platform === 'darwin') {
    const child = spawn('afplay', ['-v', vol, full], { stdio: 'ignore', detached: true });
    child.unref();
  } else if (process.platform === 'linux') {
    const cmd = existsSync('/usr/bin/paplay') ? 'paplay' : 'aplay';
    const child = spawn(cmd, [full], { stdio: 'ignore', detached: true });
    child.unref();
  }
}

// ── Deduplication ───────────────────────────────────────────────
// Suppress the same event key from firing within a short window.
// In-memory map since the plugin lives for the process lifetime.
const lastFired = new Map();
const DEDUP_MS = 3000;

function isDuplicate(key) {
  const now = Date.now();
  const last = lastFired.get(key) ?? 0;
  if (now - last < DEDUP_MS) return true;
  lastFired.set(key, now);
  return false;
}

// ── Three-tier sound lookup (matches Claude Code play-sound.sh) ─

/**
 * Look up and play a sound using the same priority as Claude Code:
 *   1. Skill-specific (if skillKey provided)
 *   2. Global fallback
 *
 * Note: OpenCode events don't carry agent identity, so we skip the
 * agent-specific tier. Per-agent overrides configured in the dashboard
 * will still be honored by Claude Code; OpenCode uses global sounds.
 */
function playForEvent(assignmentKey, skillKey) {
  const a = getAssignments();
  if (!a || a.settings?.enabled === false) return;
  const vol = a.settings?.masterVolume ?? 0.5;

  let soundPath = null;

  // 1. Skill-specific lookup
  if (skillKey) {
    const skillConfig = a.skills?.[skillKey];
    if (skillConfig?.enabled !== false) {
      soundPath = skillConfig?.hooks?.[assignmentKey] ?? null;
    }
  }

  // 2. Global fallback
  if (!soundPath) {
    soundPath = a.global?.[assignmentKey] ?? null;
  }

  if (soundPath) {
    debug(`play: event=${assignmentKey} skill=${skillKey ?? 'n/a'} sound=${soundPath}`);
    playSound(soundPath, vol);
  }
}

// ── Tool name → skill key resolution ────────────────────────────
// In Claude Code, skill events fire when tool_name === "Skill" and
// tool_input.skill carries the qualified name (e.g. "plugin:skill-name").
//
// In OpenCode, tool hooks fire for every tool execution. We need to
// identify which tool calls are skill invocations and extract the key.
//
// OpenCode's Skill tool typically shows as tool name "Skill" or
// "mcp_skill" with the skill name in the arguments. We try multiple
// extraction strategies and log the raw shape for discovery.

function extractSkillKey(toolName, args) {
  // Strategy 1: Direct "Skill" tool (same as Claude Code)
  if (toolName === 'Skill' || toolName === 'mcp_skill') {
    // args.skill or args.name carries the qualified skill name
    return args?.skill ?? args?.name ?? null;
  }

  // Strategy 2: Tool name contains "skill" (case-insensitive)
  if (/skill/i.test(toolName)) {
    return args?.skill ?? args?.name ?? toolName;
  }

  return null;
}

// ── Event mapping ───────────────────────────────────────────────

const EVENT_MAP = {
  'session.idle': 'Stop',
  'session.deleted': 'SessionEnd',
  'session.compacted': 'PreCompact',
  'session.error': 'PostToolUseFailure',
};

// ── Plugin export ───────────────────────────────────────────────

export const AgentCraft = async () => {
  // SessionStart: plugin init runs once per OpenCode launch (new or resume)
  if (!isDuplicate('SessionStart')) {
    playForEvent('SessionStart');
  }

  return {
    // Lifecycle events via the catch-all event handler
    event: async ({ event }) => {
      const assignmentKey = EVENT_MAP[event.type];
      if (assignmentKey && !isDuplicate(assignmentKey)) {
        playForEvent(assignmentKey);
      }
    },

    // Tool events — fires for every tool execution, but we only play
    // sounds for skill invocations (matching Claude Code's Skill matcher).
    'tool.execute.before': async (input, output) => {
      const toolName = input?.tool ?? '';
      const args = output?.args ?? input?.args ?? {};

      debug(`tool.before: tool=${toolName} input=${JSON.stringify(input).slice(0, 300)} output=${JSON.stringify(output).slice(0, 300)}`);

      const skillKey = extractSkillKey(toolName, args);
      if (skillKey && !isDuplicate(`skill:${skillKey}:PreToolUse`)) {
        playForEvent('PreToolUse', skillKey);
      }
    },

    'tool.execute.after': async (input, output) => {
      const toolName = input?.tool ?? '';
      const args = output?.args ?? input?.args ?? {};

      debug(`tool.after: tool=${toolName} input=${JSON.stringify(input).slice(0, 300)} output=${JSON.stringify(output).slice(0, 300)}`);

      const skillKey = extractSkillKey(toolName, args);
      if (skillKey && !isDuplicate(`skill:${skillKey}:PostToolUse`)) {
        playForEvent('PostToolUse', skillKey);
      }
    },
  };
};
