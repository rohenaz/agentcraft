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

// ── Sound lookup ────────────────────────────────────────────────

/**
 * Look up and play a sound with skill-specific -> global fallback.
 *
 * OpenCode events don't carry agent identity, so the agent-specific
 * tier is skipped. Per-agent overrides in assignments.json are honored
 * by Claude Code only.
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
    debug(`play: event=${assignmentKey} skill=${skillKey ?? 'global'} sound=${soundPath}`);
    playSound(soundPath, vol);
  }
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

    // Skill events — OpenCode fires tool="skill" with args.name
    // containing the skill name (e.g. "ask-questions-if-underspecified").
    // Only play sounds for skill tool calls, not bash/read/edit/write.
    'tool.execute.before': async (input, output) => {
      const toolName = input?.tool ?? '';
      const args = output?.args ?? input?.args ?? {};
      debug(`tool.before: tool=${toolName} args=${JSON.stringify(args).slice(0, 200)}`);

      if (toolName === 'skill' && args.name) {
        const skillKey = args.name;
        if (!isDuplicate(`skill:${skillKey}:PreToolUse`)) {
          playForEvent('PreToolUse', skillKey);
        }
      }
    },

    'tool.execute.after': async (input, output) => {
      const toolName = input?.tool ?? '';
      const args = input?.args ?? output?.args ?? {};
      debug(`tool.after: tool=${toolName} args=${JSON.stringify(args).slice(0, 200)}`);

      if (toolName === 'skill' && args.name) {
        const skillKey = args.name;
        if (!isDuplicate(`skill:${skillKey}:PostToolUse`)) {
          playForEvent('PostToolUse', skillKey);
        }
      }
    },
  };
};
