export type HookEvent =
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'SubagentStop'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Notification'
  | 'PreCompact';

export type SkillHookEvent = 'PreToolUse' | 'PostToolUse';

export interface AgentConfig {
  enabled: boolean;
  hooks: Partial<Record<HookEvent, string>>;
}

export interface SkillConfig {
  enabled: boolean;
  hooks: Partial<Record<SkillHookEvent, string>>;
}

export type UITheme = 'sc2' | 'wc3' | 'ff7' | 'ff9' | 'off';

export interface SelectMode {
  scope: string;  // 'global' | agent-name | 'skill/qualifiedName'
  event: string;  // HookEvent | SkillHookEvent
  label: string;  // e.g. "SESSION START"
}

export interface UISlotMap {
  click?: string;      // relative path under ~/code/claude-sounds/
  hover?: string;
  error?: string;
  pageChange?: string; // tab/group navigation
  toggle?: string;     // expand/collapse sidebar items
  confirm?: string;    // sound assigned, settings saved
}

export interface SoundAssignments {
  global: Partial<Record<HookEvent, string>>;
  agents: Record<string, AgentConfig>;
  skills: Record<string, SkillConfig>;
  settings: {
    masterVolume: number;
    enabled: boolean;
    theme: 'terran' | 'protoss' | 'zerg';
    uiTheme: UITheme;
    uiSounds?: Record<string, UISlotMap>; // theme -> slot -> path
  };
}

export interface SoundAsset {
  id: string;
  filename: string;
  category: string;
  subcategory: string;
  path: string;
  waveform: number[]; // 16 RMS values, normalized 1–10
}

export interface AgentInfo {
  name: string;
  filename: string;
  description?: string;
  model?: string;
  tools?: string;
  color?: string;
  prompt?: string;
}

export interface SkillInfo {
  name: string;          // directory name, e.g. "hook-development"
  qualifiedName: string; // "plugin-dev:hook-development" or "ask-gemini" (user skill)
  description: string;
  namespace?: string;    // "plugin-dev" for plugin skills, undefined for user skills
}

export interface AgentFormData {
  name: string;
  description: string;
  model: string;
  tools: string;
  color: string;
  prompt: string;
}
