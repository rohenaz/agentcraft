/**
 * AgentCraft — OpenCode plugin
 *
 * Plays sounds on OpenCode lifecycle events using the same assignments.json
 * config as the Claude Code plugin. Shared config lives at:
 *   ~/.claude/sounds/assignments.json
 *
 * To install for OpenCode, symlink or copy this file to:
 *   ~/.config/opencode/plugins/agentcraft.js   (global)
 *   .opencode/plugins/agentcraft.js             (project)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.claude', 'sounds', 'assignments.json');
const LIBRARY_PATH = join(homedir(), 'code', 'claude-sounds');

function getAssignments() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function play(soundPath) {
  if (!soundPath) return;
  const full = join(LIBRARY_PATH, soundPath);
  if (!existsSync(full)) return;
  try {
    if (process.platform === 'darwin') execSync(`afplay "${full}" &`, { stdio: 'ignore' });
    else if (process.platform === 'linux') execSync(`paplay "${full}" &`, { stdio: 'ignore' });
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
