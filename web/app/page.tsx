'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { HudHeader } from '@/components/hud-header';
import { AgentRosterPanel } from '@/components/agent-roster-panel';
import { SoundBrowserPanel } from '@/components/sound-browser-panel';
import { AssignmentLogPanel } from '@/components/assignment-log-panel';
import { SoundUnit } from '@/components/sound-unit';
import type { SoundAsset, SoundAssignments, SoundSlot, AgentInfo, SkillInfo, HookEvent, SkillHookEvent, UITheme, UISlotMap, SelectMode } from '@/lib/types';
import { setUITheme, initGlobalUIListeners, playUISound } from '@/lib/ui-audio';
import { normalizeSlot } from '@/lib/utils';
import { UISoundsModal } from '@/components/ui-sounds-modal';
import { useClient } from '@/lib/use-client';
import { useCompact } from '@/lib/use-compact';

const DEFAULT_ASSIGNMENTS: SoundAssignments = {
  global: {},
  agents: {},
  skills: {},
  settings: {
    masterVolume: 1.0,
    enabled: true,
    theme: 'terran',
    uiTheme: 'sc2',
    uiSounds: {
      sc2: { hover: 'ui/sc-bigbox/set2-move.mp3', click: 'ui/sc2/click.mp3', error: 'ui/sc2/error.mp3' },
      wc3: { hover: 'ui/wc3/hover.mp3', click: 'ui/wc3/click.mp3', error: 'ui/wc3/error.mp3' },
      ff7: { hover: 'ui/ff7/cursor-move.mp3', click: 'ui/ff7/cursor-confirm.mp3', error: 'ui/ff7/cursor-error.mp3', pageChange: 'ui/ff7/cursor-select.mp3' },
      ff9: { hover: 'ui/ff9/menu-open.mp3', click: 'ui/ff9/cursor-confirm.mp3' },
    },
  },
};

export default function Page() {
  const [sounds, setSounds] = useState<SoundAsset[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [assignments, setAssignments] = useState<SoundAssignments>(DEFAULT_ASSIGNMENTS);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundAsset | null>(null);
  const [showUISoundsModal, setShowUISoundsModal] = useState(false);
  const [selectMode, setSelectMode] = useState<SelectMode | null>(null);
  const [activePanel, setActivePanel] = useState<'roster' | 'sounds' | 'log'>('roster');
  const cleanupUIRef = useRef<(() => void) | null>(null);
  const { clientId, client } = useClient();
  const compact = useCompact();

  /** Append a sound to an existing slot (deduplicates). */
  const appendSlot = (slot: SoundSlot | undefined, path: string): string[] => {
    const existing = normalizeSlot(slot);
    if (existing.includes(path)) return existing;
    return [...existing, path];
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const fetchAgents = useCallback(() => {
    fetch('/api/agents').then((r) => r.json()).then(setAgents).catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/sounds').then((r) => r.json()).then(setSounds).catch(console.error);
    fetch('/api/skills').then((r) => r.json()).then(setSkills).catch(console.error);
    fetch('/api/assignments').then((r) => r.json()).then((data: SoundAssignments) => {
      setAssignments(data);
      const theme = data.settings?.uiTheme ?? 'sc2';
      setUITheme(theme, data.settings?.uiSounds?.[theme]);
      cleanupUIRef.current = initGlobalUIListeners();
    }).catch(console.error);
    fetchAgents();
    return () => { cleanupUIRef.current?.(); };
  }, [fetchAgents]);

  // Clear select mode on ESC
  useEffect(() => {
    if (!selectMode) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectMode(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectMode]);

  // Auto-switch to sounds panel when select mode activates in compact
  useEffect(() => {
    if (!compact) return;
    if (selectMode) setActivePanel('sounds');
  }, [compact, selectMode]);

  const handleAssignmentChange = useCallback((next: SoundAssignments) => {
    setAssignments(next);
    setIsDirty(true);
  }, []);

  const handlePreview = useCallback(async (path: string) => {
    await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, volume: assignments.settings.masterVolume }),
    });
  }, [assignments.settings.masterVolume]);

  const handleSave = useCallback(async () => {
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignments),
    });
    setIsDirty(false);
    playUISound('confirm', 0.5);
  }, [assignments]);

  const handleToggleEnabled = useCallback(() => {
    handleAssignmentChange({
      ...assignments,
      settings: { ...assignments.settings, enabled: !assignments.settings.enabled },
    });
  }, [assignments, handleAssignmentChange]);

  const handleVolumeChange = useCallback((volume: number) => {
    handleAssignmentChange({
      ...assignments,
      settings: { ...assignments.settings, masterVolume: volume },
    });
  }, [assignments, handleAssignmentChange]);

  const handleUiThemeChange = useCallback((theme: UITheme) => {
    setUITheme(theme, assignments.settings?.uiSounds?.[theme]);
    handleAssignmentChange({
      ...assignments,
      settings: { ...assignments.settings, uiTheme: theme },
    });
  }, [assignments, handleAssignmentChange]);

  const handleUISoundsConfigSave = useCallback((theme: UITheme, sounds: Record<string, UISlotMap>) => {
    const nextSettings = { ...assignments.settings, uiTheme: theme, uiSounds: sounds };
    setUITheme(theme, sounds[theme]);
    handleAssignmentChange({ ...assignments, settings: nextSettings });
    setIsDirty(true);
  }, [assignments, handleAssignmentChange]);

  // Called from SoundBrowserPanel when in select mode and user clicks a sound card
  const handleSelectModeAssign = useCallback((soundPath: string) => {
    if (!selectMode) return;
    playUISound('confirm', 0.5);
    const { scope, event } = selectMode;
    if (scope === 'global') {
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [event]: appendSlot(assignments.global[event as HookEvent], soundPath) } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            enabled: assignments.skills[skillName]?.enabled ?? true,
            hooks: { ...assignments.skills[skillName]?.hooks, [event]: appendSlot(assignments.skills[skillName]?.hooks?.[event as SkillHookEvent], soundPath) },
          },
        },
      });
    } else {
      handleAssignmentChange({
        ...assignments,
        agents: {
          ...assignments.agents,
          [scope]: {
            enabled: assignments.agents[scope]?.enabled ?? true,
            hooks: { ...assignments.agents[scope]?.hooks, [event]: appendSlot(assignments.agents[scope]?.hooks?.[event as HookEvent], soundPath) },
          },
        },
      });
    }
    setSelectMode(null);
    if (compact) setActivePanel('roster');
  }, [selectMode, assignments, handleAssignmentChange, compact]);

  /** Clear all sounds from a slot, or remove a single sound by path. */
  const handleClearAssignment = useCallback((scope: string, event: HookEvent, soundPath?: string) => {
    const removeSoundFromSlot = (slot: SoundSlot | undefined): SoundSlot | undefined => {
      if (!soundPath) return undefined; // clear all
      const arr = normalizeSlot(slot);
      const filtered = arr.filter((s) => s !== soundPath);
      if (filtered.length === 0) return undefined;
      if (filtered.length === 1) return filtered[0]; // collapse to string
      return filtered;
    };

    if (scope === 'global') {
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [event]: removeSoundFromSlot(assignments.global[event]) } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            ...assignments.skills[skillName],
            hooks: { ...assignments.skills[skillName]?.hooks, [event]: removeSoundFromSlot(assignments.skills[skillName]?.hooks?.[event as SkillHookEvent]) },
          },
        },
      });
    } else {
      handleAssignmentChange({
        ...assignments,
        agents: {
          ...assignments.agents,
          [scope]: { ...assignments.agents[scope], hooks: { ...assignments.agents[scope]?.hooks, [event]: removeSoundFromSlot(assignments.agents[scope]?.hooks?.[event]) } },
        },
      });
    }
  }, [assignments, handleAssignmentChange]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const sound = sounds.find((s) => s.path === event.active.id);
    setActiveSound(sound ?? null);
  }, [sounds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSound(null);
    const { active, over } = event;
    if (!over) return;

    const soundPath = active.id as string;
    const dropId = over.id as string;
    // Use lastIndexOf to safely handle skill names containing colons
    const lastColon = dropId.lastIndexOf(':');
    if (lastColon === -1) return;
    const scope = dropId.slice(0, lastColon);
    const hookEvent = dropId.slice(lastColon + 1) as HookEvent;

    if (!scope || !hookEvent) return;
    playUISound('confirm', 0.5);

    if (scope === 'global') {
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [hookEvent]: appendSlot(assignments.global[hookEvent], soundPath) } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            enabled: assignments.skills[skillName]?.enabled ?? true,
            hooks: { ...assignments.skills[skillName]?.hooks, [hookEvent as SkillHookEvent]: appendSlot(assignments.skills[skillName]?.hooks?.[hookEvent as SkillHookEvent], soundPath) },
          },
        },
      });
    } else {
      handleAssignmentChange({
        ...assignments,
        agents: {
          ...assignments.agents,
          [scope]: {
            enabled: assignments.agents[scope]?.enabled ?? true,
            hooks: { ...assignments.agents[scope]?.hooks, [hookEvent]: appendSlot(assignments.agents[scope]?.hooks?.[hookEvent], soundPath) },
          },
        },
      });
    }
  }, [assignments, handleAssignmentChange, sounds]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--sf-bg)' }}>
        <HudHeader enabled={assignments.settings.enabled} onToggle={handleToggleEnabled} uiTheme={assignments.settings.uiTheme ?? 'sc2'} onUiThemeChange={handleUiThemeChange} onConfigureUISounds={() => setShowUISoundsModal(true)} masterVolume={assignments.settings.masterVolume ?? 1.0} onVolumeChange={handleVolumeChange} clientLabel={client.id !== 'unknown' ? client.label : undefined} />
        {compact ? (
          <>
            <div className="shrink-0 flex border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
              {(['roster', 'sounds', 'log'] as const).map((panel) => (
                <button
                  key={panel}
                  data-sf-hover
                  data-no-ui-sound
                  onClick={() => {
                    if (activePanel !== panel) {
                      playUISound('pageChange', 0.25);
                      setActivePanel(panel);
                    }
                  }}
                  className="relative flex-1 py-2 text-[10px] sf-heading font-semibold uppercase tracking-widest transition-all"
                  style={{
                    color: activePanel === panel
                      ? 'var(--sf-cyan)'
                      : (panel === 'sounds' && selectMode)
                        ? 'var(--sf-gold)'
                        : 'rgba(255,255,255,0.35)',
                    borderBottom: `2px solid ${activePanel === panel ? 'var(--sf-cyan)' : 'transparent'}`,
                    backgroundColor: activePanel === panel ? 'rgba(0,229,255,0.04)' : 'transparent',
                  }}
                >
                  {panel === 'roster' ? 'ROSTER' : panel === 'sounds' ? 'SOUNDS' : 'LOG'}
                  {panel === 'log' && isDirty && (
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sf-gold)' }} />
                  )}
                  {panel === 'sounds' && selectMode && (
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sf-gold)' }} />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {activePanel === 'roster' && (
                <AgentRosterPanel
                  assignments={assignments}
                  agents={agents}
                  skills={skills}
                  onAssignmentChange={handleAssignmentChange}
                  onPreview={handlePreview}
                  onAgentsChange={fetchAgents}
                  selectMode={selectMode}
                  onSlotSelect={setSelectMode}
                  client={client}
                />
              )}
              {activePanel === 'sounds' && (
                <SoundBrowserPanel
                  sounds={sounds}
                  assignments={assignments}
                  onPreview={handlePreview}
                  selectMode={selectMode}
                  onSelectModeAssign={handleSelectModeAssign}
                  onClearSelectMode={() => setSelectMode(null)}
                />
              )}
              {activePanel === 'log' && (
                <AssignmentLogPanel assignments={assignments} isDirty={isDirty} onClear={handleClearAssignment} onSave={handleSave} client={client} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '288px 1fr 320px' }}>
            <AgentRosterPanel
              assignments={assignments}
              agents={agents}
              skills={skills}
              onAssignmentChange={handleAssignmentChange}
              onPreview={handlePreview}
              onAgentsChange={fetchAgents}
              selectMode={selectMode}
              onSlotSelect={setSelectMode}
              client={client}
            />
            <SoundBrowserPanel
              sounds={sounds}
              assignments={assignments}
              onPreview={handlePreview}
              selectMode={selectMode}
              onSelectModeAssign={handleSelectModeAssign}
              onClearSelectMode={() => setSelectMode(null)}
            />
            <AssignmentLogPanel assignments={assignments} isDirty={isDirty} onClear={handleClearAssignment} onSave={handleSave} client={client} />
          </div>
        )}
      </div>
      {showUISoundsModal && (
        <UISoundsModal
          uiTheme={assignments.settings.uiTheme ?? 'sc2'}
          uiSounds={assignments.settings.uiSounds ?? {}}
          onSave={handleUISoundsConfigSave}
          onClose={() => setShowUISoundsModal(false)}
        />
      )}
      <DragOverlay dropAnimation={null}>
        {activeSound ? (
          <SoundUnit sound={activeSound} isAssigned={false} onPreview={() => Promise.resolve()} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
