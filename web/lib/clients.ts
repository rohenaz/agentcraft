import type { HookEvent, SkillHookEvent } from './types';

export type ClientId = 'claude-code' | 'opencode' | 'unknown';

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
      'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
      'PreCompact',
    ]),
    supportedSkillEvents: new Set<SkillHookEvent>(ALL_SKILL_EVENTS),
    supportsAgentOverrides: false,
    eventMapping: {
      SessionStart: 'Plugin init',
      SessionEnd: 'session.deleted',
      Stop: 'session.idle',
      PreToolUse: 'tool.execute.before',
      PostToolUse: 'tool.execute.after',
      PostToolUseFailure: 'session.error',
      PreCompact: 'session.compacted',
    },
    eventNotes: {
      SessionStart: 'Fires on both new and resumed sessions',
      Stop: 'Fires when model finishes responding',
      SubagentStop: 'No equivalent in OpenCode — subagents are not exposed',
      Notification: 'No equivalent in OpenCode',
      PreToolUse: 'Fires via tool.execute.before for every tool call',
      PostToolUse: 'Fires via tool.execute.after for every tool call',
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
  return ['claude-code', 'opencode'];
}
