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
 * To install for OpenCode, symlink or copy this file to:
 *   ~/.config/opencode/plugins/agentcraft.js   (global)
 *   .opencode/plugins/agentcraft.js             (project)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

const ASSIGNMENTS_PATH = join(homedir(), '.agentcraft', 'assignments.json');
const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');

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
    // "publisher/name:internal/path/to/sound.mp3"
    const colon = soundPath.indexOf(':');
    const packId = soundPath.slice(0, colon);
    const internal = soundPath.slice(colon + 1);
    const slash = packId.indexOf('/');
    const publisher = packId.slice(0, slash);
    const name = packId.slice(slash + 1);
    return join(PACKS_DIR, publisher, name, internal);
  }
  // Legacy path — resolve against official pack
  return join(PACKS_DIR, 'rohenaz', 'agentcraft-sounds', soundPath);
}

function play(soundPath) {
  const full = resolvePackPath(soundPath);
  if (!full || !existsSync(full)) return;
  try {
    if (process.platform === 'darwin') execSync(`afplay "${full}" &`, { stdio: 'ignore' });
    else if (process.platform === 'linux') {
      if (existsSync('/usr/bin/paplay')) execSync(`paplay "${full}" &`, { stdio: 'ignore' });
      else execSync(`aplay "${full}" &`, { stdio: 'ignore' });
    }
  } catch { /* non-blocking, ignore errors */ }
}

function playEvent(a, event) {
  if (!a || a.settings?.enabled === false) return;
  play(a.global?.[event]);
}

export const AgentCraft = async () => {
  return {
    // Session start → SessionStart
    'session.created': async () => {
      playEvent(getAssignments(), 'SessionStart');
    },

    // Agent idle/done → Stop
    'session.idle': async () => {
      playEvent(getAssignments(), 'Stop');
    },

    // Context compacted → PreCompact
    'session.compacted': async () => {
      playEvent(getAssignments(), 'PreCompact');
    },

    // Tool about to run → PreToolUse (skills only)
    'tool.execute.before': async (input) => {
      const a = getAssignments();
      if (!a || a.settings?.enabled === false) return;
      if (input.tool === 'skill') {
        const key = input.args?.skill;
        if (!key) return;
        const cfg = a.skills?.[key];
        if (cfg && cfg.enabled !== false) play(cfg.hooks?.PreToolUse);
      }
    },

    // Tool finished → PostToolUse (skills only)
    'tool.execute.after': async (input) => {
      const a = getAssignments();
      if (!a || a.settings?.enabled === false) return;
      if (input.tool === 'skill') {
        const key = input.args?.skill;
        if (!key) return;
        const cfg = a.skills?.[key];
        if (cfg && cfg.enabled !== false) play(cfg.hooks?.PostToolUse);
      }
    },
  };
};
