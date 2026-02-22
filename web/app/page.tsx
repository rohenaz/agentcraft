'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { HudHeader } from '@/components/hud-header';
import { AgentRosterPanel } from '@/components/agent-roster-panel';
import { SoundBrowserPanel } from '@/components/sound-browser-panel';
import { AssignmentLogPanel } from '@/components/assignment-log-panel';
import { SoundUnit } from '@/components/sound-unit';
import type { SoundAsset, SoundAssignments, AgentInfo, SkillInfo, HookEvent, SkillHookEvent, UITheme, UISlotMap, SelectMode } from '@/lib/types';
import { setUITheme, initGlobalUIListeners, playUISound } from '@/lib/ui-audio';
import { UISoundsModal } from '@/components/ui-sounds-modal';

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
  const cleanupUIRef = useRef<(() => void) | null>(null);

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
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [event]: soundPath } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            enabled: assignments.skills[skillName]?.enabled ?? true,
            hooks: { ...assignments.skills[skillName]?.hooks, [event]: soundPath },
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
            hooks: { ...assignments.agents[scope]?.hooks, [event]: soundPath },
          },
        },
      });
    }
    setSelectMode(null);
  }, [selectMode, assignments, handleAssignmentChange]);

  const handleClearAssignment = useCallback((scope: string, event: HookEvent) => {
    if (scope === 'global') {
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [event]: undefined } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            ...assignments.skills[skillName],
            hooks: { ...assignments.skills[skillName]?.hooks, [event]: undefined },
          },
        },
      });
    } else {
      handleAssignmentChange({
        ...assignments,
        agents: {
          ...assignments.agents,
          [scope]: { ...assignments.agents[scope], hooks: { ...assignments.agents[scope]?.hooks, [event]: undefined } },
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
      handleAssignmentChange({ ...assignments, global: { ...assignments.global, [hookEvent]: soundPath } });
    } else if (scope.startsWith('skill/')) {
      const skillName = scope.slice(6);
      handleAssignmentChange({
        ...assignments,
        skills: {
          ...assignments.skills,
          [skillName]: {
            enabled: assignments.skills[skillName]?.enabled ?? true,
            hooks: { ...assignments.skills[skillName]?.hooks, [hookEvent as SkillHookEvent]: soundPath },
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
            hooks: { ...assignments.agents[scope]?.hooks, [hookEvent]: soundPath },
          },
        },
      });
    }
  }, [assignments, handleAssignmentChange, sounds]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--sf-bg)' }}>
        <HudHeader enabled={assignments.settings.enabled} onToggle={handleToggleEnabled} uiTheme={assignments.settings.uiTheme ?? 'sc2'} onUiThemeChange={handleUiThemeChange} onConfigureUISounds={() => setShowUISoundsModal(true)} masterVolume={assignments.settings.masterVolume ?? 1.0} onVolumeChange={handleVolumeChange} />
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
          />
          <SoundBrowserPanel
            sounds={sounds}
            assignments={assignments}
            onPreview={handlePreview}
            selectMode={selectMode}
            onSelectModeAssign={handleSelectModeAssign}
            onClearSelectMode={() => setSelectMode(null)}
          />
          <AssignmentLogPanel assignments={assignments} isDirty={isDirty} onClear={handleClearAssignment} onSave={handleSave} />
        </div>
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
