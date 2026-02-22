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
 * Look up and play a sound from global assignments.
 *
 * OpenCode events don't carry agent or skill identity, so only the
 * global tier is used. Per-agent and per-skill overrides configured
 * in the dashboard are stored in assignments.json and honored by
 * Claude Code, but not available in OpenCode.
 */
function playForEvent(assignmentKey) {
  const a = getAssignments();
  if (!a || a.settings?.enabled === false) return;
  const vol = a.settings?.masterVolume ?? 0.5;
  const soundPath = a.global?.[assignmentKey] ?? null;

  if (soundPath) {
    debug(`play: event=${assignmentKey} sound=${soundPath}`);
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

    // Tool events — debug logging only.
    // OpenCode skills load as prompt context, not discrete tool calls,
    // so there's no way to identify skill invocations from tool hooks.
    'tool.execute.before': async (input, output) => {
      debug(`tool.before: tool=${input?.tool} args=${JSON.stringify(output?.args ?? {}).slice(0, 200)}`);
    },

    'tool.execute.after': async (input, output) => {
      debug(`tool.after: tool=${input?.tool} args=${JSON.stringify(output?.args ?? {}).slice(0, 200)}`);
    },
  };
};
