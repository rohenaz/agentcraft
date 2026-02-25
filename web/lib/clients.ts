import type { HookEvent, SkillHookEvent } from './types';

export type ClientId = 'claude-code' | 'opencode' | 'pi' | 'unknown';

export interface ClientCapabilities {
  id: ClientId;
  label: string;
  /** Global/agent hook events this client can fire */
  supportedEvents: Set<HookEvent>;
  /** Skill-level events this client can fire */
  supportedSkillEvents: Set<SkillHookEvent>;
  /** Whether per-agent overrides are possible (requires agent identity in events) */
  supportsAgentOverrides: boolean;
  /** Native event name mapping (for the settings panel) */
  eventMapping: Partial<Record<HookEvent, string>>;
  /** Notes for events that work differently */
  eventNotes: Partial<Record<HookEvent, string>>;
}

const ALL_HOOK_EVENTS: HookEvent[] = [
  'SessionStart', 'SessionEnd', 'Stop', 'SubagentStop',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'Notification', 'PreCompact',
];

const ALL_SKILL_EVENTS: SkillHookEvent[] = ['PreToolUse', 'PostToolUse'];

export const CLIENTS: Record<ClientId, ClientCapabilities> = {
  'claude-code': {
    id: 'claude-code',
    label: 'Claude Code',
    supportedEvents: new Set(ALL_HOOK_EVENTS),
    supportedSkillEvents: new Set(ALL_SKILL_EVENTS),
    supportsAgentOverrides: true,
    eventMapping: {
      SessionStart: 'SessionStart hook',
      SessionEnd: 'SessionEnd hook',
      Stop: 'Stop hook',
      SubagentStop: 'SubagentStop hook',
      PreToolUse: 'PreToolUse hook',
      PostToolUse: 'PostToolUse hook',
      PostToolUseFailure: 'PostToolUseFailure hook',
      Notification: 'Notification hook',
      PreCompact: 'PreCompact hook',
    },
    eventNotes: {},
  },
  'opencode': {
    id: 'opencode',
    label: 'OpenCode',
    supportedEvents: new Set<HookEvent>([
      'SessionStart', 'SessionEnd', 'Stop',
      'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PreCompact',
    ]),
    supportedSkillEvents: new Set<SkillHookEvent>(ALL_SKILL_EVENTS),
    supportsAgentOverrides: false,
    eventMapping: {
      SessionStart: 'Plugin init',
      SessionEnd: 'session.deleted',
      Stop: 'session.idle',
      PreToolUse: 'tool.execute.before (skill)',
      PostToolUse: 'tool.execute.after (skill)',
      PostToolUseFailure: 'session.error',
      PreCompact: 'session.compacted',
    },
    eventNotes: {
      SessionStart: 'Fires on both new and resumed sessions',
      Stop: 'Fires when model finishes responding',
      SubagentStop: 'No equivalent in OpenCode',
      Notification: 'No equivalent in OpenCode',
      PreToolUse: 'Only fires for skill tool calls (tool="skill")',
      PostToolUse: 'Only fires for skill tool calls (tool="skill")',
    },
  },
  'pi': {
    id: 'pi',
    label: 'Pi',
    supportedEvents: new Set<HookEvent>([
      'SessionStart', 'SessionEnd', 'Stop',
      'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PreCompact',
    ]),
    supportedSkillEvents: new Set<SkillHookEvent>(ALL_SKILL_EVENTS),
    supportsAgentOverrides: false,
    eventMapping: {
      SessionStart: 'session_start / session_switch',
      SessionEnd: 'session_shutdown',
      Stop: 'agent_end',
      PreToolUse: 'tool_call',
      PostToolUse: 'tool_execution_end',
      PostToolUseFailure: 'tool_execution_end (isError)',
      PreCompact: 'session_before_compact',
    },
    eventNotes: {
      SessionStart: 'Fires on session load and /new or /resume',
      Stop: 'Fires when agent finishes responding to a prompt',
      SubagentStop: 'No equivalent in pi (build via extensions)',
      Notification: 'No equivalent in pi',
      PreToolUse: 'Fires for all tool calls (read, bash, edit, write, custom)',
      PostToolUse: 'Fires for all tool calls; skill lookup matches custom tool names',
    },
  },
  'unknown': {
    id: 'unknown',
    label: 'All Clients',
    supportedEvents: new Set(ALL_HOOK_EVENTS),
    supportedSkillEvents: new Set(ALL_SKILL_EVENTS),
    supportsAgentOverrides: true,
    eventMapping: {},
    eventNotes: {},
  },
};

/** Get capabilities for a client ID, falling back to 'unknown' */
export function getClientCapabilities(clientId: string | null): ClientCapabilities {
  if (clientId && clientId in CLIENTS) {
    return CLIENTS[clientId as ClientId];
  }
  return CLIENTS['unknown'];
}

/** Check if a specific event is supported by a client */
export function isEventSupported(clientId: ClientId, event: HookEvent | SkillHookEvent, isSkill?: boolean): boolean {
  const client = CLIENTS[clientId];
  if (!client) return true;
  if (isSkill) return client.supportedSkillEvents.has(event as SkillHookEvent);
  return client.supportedEvents.has(event as HookEvent);
}

/** Get all client IDs (excluding 'unknown') for comparison views */
export function getAllClientIds(): ClientId[] {
  return ['claude-code', 'opencode', 'pi'];
}
