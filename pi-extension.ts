/**
 * AgentCraft — Pi extension
 *
 * Plays sounds on pi lifecycle events using the same assignments.json
 * config as the Claude Code and OpenCode plugins. Shared config lives at:
 *   ~/.agentcraft/assignments.json
 *
 * Packs are stored at:
 *   ~/.agentcraft/packs/<publisher>/<name>/
 *
 * Install for pi:
 *   Global:  cp pi-extension.ts ~/.pi/agent/extensions/agentcraft.ts
 *   Package: pi install git:github.com/rohenaz/agentcraft
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { platform } from "node:process";

const ASSIGNMENTS_PATH = join(homedir(), ".agentcraft", "assignments.json");
const PACKS_DIR = join(homedir(), ".agentcraft", "packs");

// Built-in tools that should NOT trigger skill-level sound lookups.
// These fire far too often for per-tool sounds to be useful.
const BUILTIN_TOOLS = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);

// ── Config helpers ──────────────────────────────────────────────

/** A slot can hold a single sound path or an array for random selection. */
type SoundSlot = string | string[];

interface Assignments {
  global: Record<string, SoundSlot>;
  agents: Record<string, { enabled: boolean; hooks: Record<string, SoundSlot> }>;
  skills: Record<string, { enabled: boolean; hooks: Record<string, SoundSlot> }>;
  settings: {
    masterVolume: number;
    enabled: boolean;
    theme: string;
    uiTheme: string;
  };
}

function getAssignments(): Assignments | null {
  try {
    return JSON.parse(readFileSync(ASSIGNMENTS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function resolvePackPath(soundPath: string): string | null {
  if (!soundPath) return null;
  if (soundPath.includes(":")) {
    const colon = soundPath.indexOf(":");
    const packId = soundPath.slice(0, colon);
    const internal = soundPath.slice(colon + 1);
    const slash = packId.indexOf("/");
    const publisher = packId.slice(0, slash);
    const name = packId.slice(slash + 1);
    return join(PACKS_DIR, publisher, name, internal);
  }
  // Legacy path — fall back to rohenaz/agentcraft-sounds
  return join(PACKS_DIR, "rohenaz", "agentcraft-sounds", soundPath);
}

// ── Sound playback ──────────────────────────────────────────────

// Fire-and-forget — detached child process, never blocks pi
function playSound(soundPath: string, volume: number): void {
  const full = resolvePackPath(soundPath);
  if (!full || !existsSync(full)) return;
  const vol = String(volume);

  if (platform === "darwin") {
    const child = spawn("afplay", ["-v", vol, full], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } else if (platform === "linux") {
    const cmd = existsSync("/usr/bin/paplay") ? "paplay" : "aplay";
    const args =
      cmd === "paplay"
        ? [`--volume=${Math.round(volume * 65536)}`, full]
        : [full];
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.unref();
  }
}

// ── Deduplication ───────────────────────────────────────────────

const lastFired = new Map<string, number>();
const DEDUP_MS = 3000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = lastFired.get(key) ?? 0;
  if (now - last < DEDUP_MS) return true;
  lastFired.set(key, now);
  return false;
}

// ── Sound lookup ────────────────────────────────────────────────

/** Resolve a SoundSlot to a single path, picking randomly from arrays. */
function resolveSlot(slot: SoundSlot | undefined | null): string | null {
  if (!slot) return null;
  if (Array.isArray(slot)) {
    const filtered = slot.filter(Boolean);
    if (filtered.length === 0) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  return slot || null;
}

/**
 * Look up and play a sound with skill/tool → global fallback.
 *
 * Pi events don't carry agent identity, so the agent-specific
 * tier is skipped. Per-agent overrides are honored by Claude Code only.
 */
function playForEvent(assignmentKey: string, toolName?: string): void {
  const a = getAssignments();
  if (!a || a.settings?.enabled === false) return;
  const vol = a.settings?.masterVolume ?? 0.5;

  let soundPath: string | null = null;

  // 1. Tool/skill-specific lookup (custom tools only, not built-ins)
  if (toolName && !BUILTIN_TOOLS.has(toolName)) {
    const skillConfig = a.skills?.[toolName];
    if (skillConfig?.enabled !== false) {
      soundPath = resolveSlot(skillConfig?.hooks?.[assignmentKey]);
    }
  }

  // 2. Global fallback
  if (!soundPath) {
    soundPath = resolveSlot(a.global?.[assignmentKey]);
  }

  if (soundPath) {
    playSound(soundPath, vol);
  }
}

// ── Pi extension ────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── Session lifecycle ───────────────────────────────────────

  pi.on("session_start", async () => {
    if (!isDuplicate("SessionStart")) {
      playForEvent("SessionStart");
    }
  });

  pi.on("session_switch", async (event) => {
    // Fires on /new or /resume — treat as a new session start
    if (!isDuplicate("SessionStart")) {
      playForEvent("SessionStart");
    }
  });

  pi.on("session_shutdown", async () => {
    if (!isDuplicate("SessionEnd")) {
      playForEvent("SessionEnd");
    }
  });

  // ── Agent lifecycle ─────────────────────────────────────────

  pi.on("agent_end", async () => {
    // Agent finished responding to a prompt — equivalent to Claude Code "Stop"
    if (!isDuplicate("Stop")) {
      playForEvent("Stop");
    }
  });

  // ── Tool events ─────────────────────────────────────────────

  pi.on("tool_call", async (event) => {
    // PreToolUse: fires before any tool executes
    const toolName = event.toolName;
    const dedupKey = `PreToolUse:${toolName}`;
    if (!isDuplicate(dedupKey)) {
      playForEvent("PreToolUse", toolName);
    }
    // Never block — return nothing
  });

  pi.on("tool_execution_end", async (event) => {
    const toolName = event.toolName;

    if (event.isError) {
      // PostToolUseFailure: tool errored
      const dedupKey = `PostToolUseFailure:${toolName}`;
      if (!isDuplicate(dedupKey)) {
        playForEvent("PostToolUseFailure", toolName);
      }
    } else {
      // PostToolUse: tool completed successfully
      const dedupKey = `PostToolUse:${toolName}`;
      if (!isDuplicate(dedupKey)) {
        playForEvent("PostToolUse", toolName);
      }
    }
  });

  // ── Compaction ──────────────────────────────────────────────

  pi.on("session_before_compact", async () => {
    if (!isDuplicate("PreCompact")) {
      playForEvent("PreCompact");
    }
    // Don't cancel — return nothing
  });

  // ── /agentcraft command ─────────────────────────────────────

  pi.registerCommand("agentcraft", {
    description: "Open the AgentCraft sound assignment dashboard",
    handler: async (args, ctx) => {
      const trimmed = args?.trim() ?? "";

      // Stop subcommand
      if (trimmed === "--stop" || trimmed === "stop") {
        const { code } = await pi.exec("bash", [
          "-c",
          "kill $(lsof -ti:4040) 2>/dev/null",
        ]);
        ctx.ui.notify(
          code === 0
            ? "AgentCraft server stopped"
            : "AgentCraft server not running",
          "info",
        );
        return;
      }

      // First-time setup
      const { code: initCode, stderr: initErr } = await pi.exec(
        "agentcraft",
        ["init"],
        { timeout: 30000 },
      );
      if (initCode !== 0) {
        ctx.ui.notify(
          `agentcraft init failed — is the CLI installed? (bun install -g agentcraft)\n${initErr}`,
          "error",
        );
        return;
      }

      // Check if server is already running
      const { code: lsofCode } = await pi.exec("lsof", ["-ti:4040"], {
        timeout: 3000,
      });

      if (lsofCode !== 0) {
        // Not running — try to start it
        // Look for web directory relative to this extension (works when installed as pi package)
        const extensionDir = import.meta.dirname;
        const webDir = extensionDir ? join(extensionDir, "web") : null;

        if (webDir && existsSync(join(webDir, "package.json"))) {
          ctx.ui.notify("Starting AgentCraft dashboard...", "info");
          await pi.exec("bash", [
            "-c",
            `cd "${webDir}" && bun install --silent 2>/dev/null; bun dev --port 4040 &`,
          ]);

          // Poll for server readiness
          for (let i = 0; i < 15; i++) {
            const { code } = await pi.exec("bash", [
              "-c",
              'curl -sf http://localhost:4040/api/health | grep -q \'"ok"\'',
            ]);
            if (code === 0) break;
            await new Promise((r) => setTimeout(r, 1000));
          }
        } else {
          ctx.ui.notify(
            "Dashboard web directory not found. Start manually:\n  cd /path/to/agentcraft/web && bun dev --port 4040",
            "warning",
          );
          return;
        }
      }

      // Open in browser
      const url = "http://localhost:4040?client=pi";
      if (platform === "darwin") {
        await pi.exec("open", [url]);
      } else if (platform === "linux") {
        await pi.exec("xdg-open", [url]);
      }

      ctx.ui.notify("AgentCraft dashboard opened", "info");
    },
  });
}
