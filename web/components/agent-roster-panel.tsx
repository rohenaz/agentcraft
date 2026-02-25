'use client';

import { useState, useMemo } from 'react';
import { HookSlot } from './hook-slot';
import { AgentForm } from './agent-form';
import { PacksPanel } from './packs-panel';
import { playUISound } from '@/lib/ui-audio';
import { getEventLabel, normalizeSlot } from '@/lib/utils';
import type { HookEvent, SkillHookEvent, SoundAssignments, SoundSlot, AgentInfo, SkillInfo, AgentFormData, SelectMode } from '@/lib/types';
import type { ClientCapabilities } from '@/lib/clients';

const HOOK_GROUPS: { label: string; events: HookEvent[] }[] = [
  { label: 'LIFECYCLE', events: ['SessionStart', 'SessionEnd', 'Stop'] },
  { label: 'TOOLING', events: ['PreToolUse', 'PostToolUse', 'PostToolUseFailure'] },
  { label: 'SUBAGENTS', events: ['SubagentStop'] },
  { label: 'SYSTEM', events: ['Notification', 'PreCompact'] },
];

const ALL_EVENTS: HookEvent[] = HOOK_GROUPS.flatMap((g) => g.events);
const SKILL_EVENTS: SkillHookEvent[] = ['PreToolUse', 'PostToolUse'];
const SKILL_EVENT_LABELS: Record<SkillHookEvent, string> = {
  PreToolUse: 'ON INVOKE',
  PostToolUse: 'ON COMPLETE',
};

// ── Agent row ────────────────────────────────────────────────────

interface AgentRowProps {
  scope: string;
  label: string;
  isGlobal?: boolean;
  hooks: Partial<Record<HookEvent, SoundSlot>>;
  enabled?: boolean;
  agentInfo?: AgentInfo;
  onToggle?: () => void;
  onClear: (event: HookEvent) => void;
  onPreview: (path: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  selectMode: SelectMode | null;
  onSlotSelect: (mode: SelectMode) => void;
  client?: ClientCapabilities | null;
}

function AgentRow({ scope, label, isGlobal, hooks, enabled, onToggle, onClear, onPreview, onEdit, onDelete, selectMode, onSlotSelect, client }: AgentRowProps) {
  const [expanded, setExpanded] = useState(!!isGlobal);
  const [isHovered, setIsHovered] = useState(false);
  const filledCount = Object.values(hooks).filter((v) => normalizeSlot(v).length > 0).length;

  const agentUnsupported = !isGlobal && client && client.id !== 'unknown' && !client.supportsAgentOverrides;

  return (
    <div className="mb-1">
      <div
        data-sf-hover
        data-no-ui-sound
        className="flex items-center justify-between px-3 py-2 cursor-pointer transition-all group"
        style={{
          border: `1px solid ${isGlobal ? 'var(--sf-border-gold)' : isHovered ? 'rgba(0,229,255,0.35)' : 'var(--sf-border)'}`,
          backgroundColor: isGlobal
            ? isHovered ? 'rgba(255,192,0,0.08)' : 'rgba(255,192,0,0.04)'
            : isHovered ? 'rgba(0,229,255,0.04)' : 'transparent',
          opacity: agentUnsupported ? 0.5 : 1,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => { playUISound('toggle', 0.3); setExpanded(!expanded); }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] opacity-60 shrink-0">{expanded ? '▾' : '▸'}</span>
          <span
            className="text-xs sf-heading font-semibold uppercase tracking-wider truncate"
            style={{ color: isGlobal ? 'var(--sf-gold)' : 'rgba(255,255,255,0.8)' }}
          >
            {label}
          </span>
          {agentUnsupported && (
            <span
              className="text-[8px] px-1 py-px uppercase tracking-wider shrink-0"
              style={{
                border: '1px solid rgba(255,160,0,0.3)',
                color: 'rgba(255,160,0,0.6)',
                backgroundColor: 'rgba(255,160,0,0.05)',
                lineHeight: '1.2',
              }}
              title={`${client.label} does not support per-agent overrides — uses global sounds only`}
            >
              GLOBAL ONLY
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] opacity-40">{filledCount}/{ALL_EVENTS.length}</span>
          {!isGlobal && onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="text-[10px] px-2 py-0.5 transition-all"
              style={{
                border: `1px solid ${enabled ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.2)'}`,
                color: enabled ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {enabled ? 'ON' : 'OFF'}
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all"
              style={{ border: '1px solid var(--sf-border)', color: 'rgba(255,255,255,0.4)' }}
              title="Edit agent"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all"
              style={{ border: '1px solid rgba(255,51,102,0.3)', color: 'var(--sf-alert)' }}
              title="Delete agent"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="ml-3 mt-1 mb-2 space-y-1">
          {HOOK_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[9px] uppercase tracking-widest opacity-30 mb-1 ml-1">{group.label}</div>
              {group.events.map((event) => (
                <HookSlot
                  key={event}
                  event={event}
                  scope={scope}
                  assignedSound={hooks[event]}
                  onClear={() => onClear(event)}
                  onPreview={onPreview}
                  selectMode={selectMode}
                  onSelect={() => onSlotSelect({ scope, event, label: getEventLabel(event) })}
                  client={client}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skill row ────────────────────────────────────────────────────

interface SkillRowProps {
  skill: SkillInfo;
  hooks: Partial<Record<SkillHookEvent, SoundSlot>>;
  enabled: boolean;
  onToggle: () => void;
  onClear: (event: SkillHookEvent) => void;
  onPreview: (path: string) => void;
  selectMode: SelectMode | null;
  onSlotSelect: (mode: SelectMode) => void;
  client?: ClientCapabilities | null;
}

function SkillRow({ skill, hooks, enabled, onToggle, onClear, onPreview, selectMode, onSlotSelect, client }: SkillRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const filledCount = Object.values(hooks).filter((v) => normalizeSlot(v).length > 0).length;
  const scope = `skill/${skill.qualifiedName}`;

  return (
    <div className="mb-1">
      <div
        data-sf-hover
        data-no-ui-sound
        className="flex items-center justify-between px-3 py-2 cursor-pointer transition-all"
        style={{
          border: `1px solid ${isHovered ? 'rgba(0,168,255,0.4)' : 'rgba(0,168,255,0.2)'}`,
          backgroundColor: isHovered ? 'rgba(0,168,255,0.07)' : 'rgba(0,168,255,0.03)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => { playUISound('toggle', 0.3); setExpanded(!expanded); }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] opacity-60 shrink-0">{expanded ? '▾' : '▸'}</span>
          <span className="text-xs sf-heading font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--sf-blue)' }}>
            {skill.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] opacity-40">{filledCount}/2</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-[10px] px-2 py-0.5 transition-all"
            style={{
              border: `1px solid ${enabled ? 'var(--sf-blue)' : 'rgba(255,255,255,0.2)'}`,
              color: enabled ? 'var(--sf-blue)' : 'rgba(255,255,255,0.3)',
            }}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-3 mt-1 mb-2">
          <div className="text-[9px] uppercase tracking-widest opacity-30 mb-1 ml-1">SIGNALS</div>
          {SKILL_EVENTS.map((event) => (
            <HookSlot
              key={event}
              event={event as HookEvent}
              scope={scope}
              assignedSound={hooks[event]}
              onClear={() => onClear(event)}
              onPreview={onPreview}
              selectMode={selectMode}
              onSelect={() => onSlotSelect({ scope, event, label: SKILL_EVENT_LABELS[event] })}
              client={client}
              isSkillEvent
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel export ─────────────────────────────────────────────────

interface AgentRosterPanelProps {
  assignments: SoundAssignments;
  agents: AgentInfo[];
  skills: SkillInfo[];
  onAssignmentChange: (next: SoundAssignments) => void;
  onPreview: (path: string) => void;
  onAgentsChange: () => void;
  selectMode: SelectMode | null;
  onSlotSelect: (mode: SelectMode) => void;
  client?: ClientCapabilities | null;
}

export function AgentRosterPanel({ assignments, agents, skills, onAssignmentChange, onPreview, onAgentsChange, selectMode, onSlotSelect, client }: AgentRosterPanelProps) {
  const [activeView, setActiveView] = useState<'agents' | 'skills' | 'packs'>('agents');
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentInfo | undefined>();
  const [skillSearch, setSkillSearch] = useState('');
  const [collapsedNs, setCollapsedNs] = useState<Set<string>>(new Set());

  const clearGlobalHook = (event: HookEvent) => {
    onAssignmentChange({ ...assignments, global: { ...assignments.global, [event]: undefined } });
  };

  const clearAgentHook = (agentName: string, event: HookEvent) => {
    onAssignmentChange({
      ...assignments,
      agents: {
        ...assignments.agents,
        [agentName]: {
          ...assignments.agents[agentName],
          hooks: { ...assignments.agents[agentName]?.hooks, [event]: undefined },
        },
      },
    });
  };

  const clearSkillHook = (skillName: string, event: SkillHookEvent) => {
    onAssignmentChange({
      ...assignments,
      skills: {
        ...assignments.skills,
        [skillName]: {
          ...assignments.skills[skillName],
          hooks: { ...assignments.skills[skillName]?.hooks, [event]: undefined },
        },
      },
    });
  };

  const toggleAgent = (agentName: string) => {
    const current = assignments.agents[agentName] ?? { enabled: true, hooks: {} };
    onAssignmentChange({
      ...assignments,
      agents: { ...assignments.agents, [agentName]: { ...current, enabled: !current.enabled } },
    });
  };

  const toggleSkill = (skillName: string) => {
    const current = assignments.skills[skillName] ?? { enabled: true, hooks: {} };
    onAssignmentChange({
      ...assignments,
      skills: { ...assignments.skills, [skillName]: { ...current, enabled: !current.enabled } },
    });
  };

  const handleSaveAgent = async (data: AgentFormData, originalName?: string) => {
    if (originalName) {
      await fetch(`/api/agents/${originalName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditingAgent(undefined);
    onAgentsChange();
  };

  const handleDeleteAgent = async (agentName: string) => {
    await fetch(`/api/agents/${agentName}`, { method: 'DELETE' });
    onAgentsChange();
  };

  const allAgentNames = new Set([
    ...Object.keys(assignments.agents),
    ...agents.map((a) => a.name),
  ]);

  // Build unified skill list: merge assigned skills + discovered skills by qualifiedName
  const allSkills = useMemo(() => {
    const map = new Map<string, SkillInfo>();
    // Discovered skills
    for (const s of skills) map.set(s.qualifiedName, s);
    // Skills in assignments that weren't discovered (show them anyway)
    for (const key of Object.keys(assignments.skills)) {
      if (!map.has(key)) {
        map.set(key, { name: key.includes(':') ? key.split(':').pop()! : key, qualifiedName: key, description: '' });
      }
    }
    return [...map.values()];
  }, [skills, assignments.skills]);

  // Filter by search
  const filteredSkills = useMemo(() => {
    const q = skillSearch.toLowerCase();
    return q ? allSkills.filter(s => s.qualifiedName.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) : allSkills;
  }, [allSkills, skillSearch]);

  // Group by namespace
  const skillGroups = useMemo(() => {
    const groups = new Map<string, SkillInfo[]>();
    for (const s of filteredSkills) {
      const ns = s.namespace ?? '(user)';
      if (!groups.has(ns)) groups.set(ns, []);
      groups.get(ns)!.push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === '(user)') return -1;
      if (b === '(user)') return 1;
      return a.localeCompare(b);
    });
  }, [filteredSkills]);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Tab bar header */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
        <div className="flex items-stretch">
          {(['agents', 'skills', 'packs'] as const).map((view) => (
            <button
              key={view}
              data-sf-hover
              data-no-ui-sound
              onClick={() => {
                if (activeView !== view) {
                  playUISound('pageChange', 0.25);
                  setActiveView(view);
                }
              }}
              className="flex-1 py-2.5 text-[10px] sf-heading font-semibold uppercase tracking-widest transition-all"
              style={{
                color: activeView === view ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.35)',
                borderBottom: `2px solid ${activeView === view ? 'var(--sf-cyan)' : 'transparent'}`,
                backgroundColor: activeView === view ? 'rgba(0,229,255,0.04)' : 'transparent',
              }}
            >
              {view.toUpperCase()}
            </button>
          ))}
          {activeView === 'agents' && (
            <button
              onClick={() => { setShowForm(!showForm); setEditingAgent(undefined); }}
              className="text-[10px] px-3 sf-heading uppercase tracking-wider transition-all"
              style={{
                borderLeft: '1px solid var(--sf-border)',
                color: showForm ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {showForm ? '✕' : '+'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeView === 'agents' && (
          <>
            {/* Add/Edit form */}
            {(showForm || editingAgent) && (
              <AgentForm
                initial={editingAgent}
                onSave={handleSaveAgent}
                onCancel={() => { setShowForm(false); setEditingAgent(undefined); }}
              />
            )}

            {/* Global override */}
            <AgentRow
              scope="global"
              label="GLOBAL OVERRIDE"
              isGlobal
              hooks={assignments.global}
              onClear={clearGlobalHook}
              onPreview={onPreview}
              selectMode={selectMode}
              onSlotSelect={onSlotSelect}
              client={client}
            />

            {/* Per-agent rows */}
            {[...allAgentNames].map((name) => {
              const config = assignments.agents[name] ?? { enabled: true, hooks: {} };
              const agentInfo = agents.find((a) => a.name === name);
              return (
                <AgentRow
                  key={name}
                  scope={name}
                  label={name}
                  hooks={config.hooks}
                  enabled={config.enabled}
                  agentInfo={agentInfo}
                  onToggle={() => toggleAgent(name)}
                  onClear={(event) => clearAgentHook(name, event)}
                  onPreview={onPreview}
                  onEdit={() => { setEditingAgent(agentInfo); setShowForm(false); }}
                  onDelete={() => handleDeleteAgent(name)}
                  selectMode={selectMode}
                  onSlotSelect={onSlotSelect}
                  client={client}
                />
              );
            })}
          </>
        )}

        {activeView === 'skills' && (
          <>
            {/* Search */}
            <input
              type="text"
              placeholder="FILTER SKILLS..."
              value={skillSearch}
              onChange={e => setSkillSearch(e.target.value)}
              className="w-full text-[10px] px-2 py-1 mb-3 bg-transparent outline-none sf-mono"
              style={{
                border: `1px solid ${skillSearch ? 'var(--sf-blue)' : 'var(--sf-border)'}`,
                color: 'rgba(255,255,255,0.6)',
                caretColor: 'var(--sf-cyan)',
              }}
            />

            {/* Grouped by namespace */}
            {skillGroups.map(([ns, nsSkills]) => {
              const isCollapsed = collapsedNs.has(ns);
              const assignedCount = nsSkills.filter(s => assignments.skills[s.qualifiedName]?.hooks.PreToolUse || assignments.skills[s.qualifiedName]?.hooks.PostToolUse).length;
              return (
                <div key={ns} className="mb-1">
                  {/* Namespace header */}
                  <div
                    data-sf-hover
                    data-no-ui-sound
                    className="flex items-center justify-between px-2 py-1 cursor-pointer transition-all"
                    style={{ backgroundColor: 'rgba(0,168,255,0.05)', borderBottom: '1px solid rgba(0,168,255,0.1)' }}
                    onClick={() => {
                      playUISound('toggle', 0.3);
                      setCollapsedNs(prev => {
                        const next = new Set(prev);
                        if (next.has(ns)) next.delete(ns); else next.add(ns);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] opacity-40">{isCollapsed ? '▸' : '▾'}</span>
                      <span className="sf-heading text-[9px] uppercase tracking-wider" style={{ color: 'var(--sf-blue)' }}>
                        {ns}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-40">
                      {assignedCount > 0 && <span style={{ color: 'var(--sf-blue)', marginRight: 4 }}>{assignedCount}✦</span>}
                      {nsSkills.length}
                    </span>
                  </div>

                  {!isCollapsed && nsSkills.sort((a, b) => a.name.localeCompare(b.name)).map((s) => {
                    const config = assignments.skills[s.qualifiedName] ?? { enabled: true, hooks: {} };
                    return (
                      <SkillRow
                        key={s.qualifiedName}
                        skill={s}
                        hooks={config.hooks}
                        enabled={config.enabled}
                        onToggle={() => toggleSkill(s.qualifiedName)}
                        onClear={(event) => clearSkillHook(s.qualifiedName, event)}
                        onPreview={onPreview}
                        selectMode={selectMode}
                        onSlotSelect={onSlotSelect}
                        client={client}
                      />
                    );
                  })}
                </div>
              );
            })}
          </>
        )}

        {activeView === 'packs' && <PacksPanel />}
      </div>
    </div>
  );
}
