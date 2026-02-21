'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { HudHeader } from '@/components/hud-header';
import { AgentRosterPanel } from '@/components/agent-roster-panel';
import { SoundBrowserPanel } from '@/components/sound-browser-panel';
import { AssignmentLogPanel } from '@/components/assignment-log-panel';
import { SoundUnit } from '@/components/sound-unit';
import type { SoundAsset, SoundAssignments, AgentInfo, SkillInfo, HookEvent, SkillHookEvent } from '@/lib/types';
import { setUITheme, initGlobalUIListeners } from '@/lib/ui-audio';

const DEFAULT_ASSIGNMENTS: SoundAssignments = {
  global: {},
  agents: {},
  skills: {},
  settings: { masterVolume: 1.0, enabled: true, theme: 'terran', uiTheme: 'sc2' },
};

export default function Page() {
  const [sounds, setSounds] = useState<SoundAsset[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [assignments, setAssignments] = useState<SoundAssignments>(DEFAULT_ASSIGNMENTS);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundAsset | null>(null);
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
      setUITheme(theme);
      cleanupUIRef.current = initGlobalUIListeners();
    }).catch(console.error);
    fetchAgents();
    return () => { cleanupUIRef.current?.(); };
  }, [fetchAgents]);

  const handleAssignmentChange = useCallback((next: SoundAssignments) => {
    setAssignments(next);
    setIsDirty(true);
  }, []);

  const handlePreview = useCallback(async (path: string) => {
    await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  }, []);

  const handleSave = useCallback(async () => {
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignments),
    });
    setIsDirty(false);
  }, [assignments]);

  const handleToggleEnabled = useCallback(() => {
    handleAssignmentChange({
      ...assignments,
      settings: { ...assignments.settings, enabled: !assignments.settings.enabled },
    });
  }, [assignments, handleAssignmentChange]);

  const handleUiThemeChange = useCallback((theme: 'sc2' | 'wc3' | 'off') => {
    setUITheme(theme);
    handleAssignmentChange({
      ...assignments,
      settings: { ...assignments.settings, uiTheme: theme },
    });
  }, [assignments, handleAssignmentChange]);

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
        <HudHeader enabled={assignments.settings.enabled} onToggle={handleToggleEnabled} uiTheme={assignments.settings.uiTheme ?? 'sc2'} onUiThemeChange={handleUiThemeChange} />
        <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '288px 1fr 320px' }}>
          <AgentRosterPanel
            assignments={assignments}
            agents={agents}
            skills={skills}
            onAssignmentChange={handleAssignmentChange}
            onPreview={handlePreview}
            onAgentsChange={fetchAgents}
          />
          <SoundBrowserPanel sounds={sounds} assignments={assignments} onPreview={handlePreview} />
          <AssignmentLogPanel assignments={assignments} isDirty={isDirty} onClear={handleClearAssignment} onSave={handleSave} />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeSound ? (
          <SoundUnit sound={activeSound} isAssigned={false} onPreview={() => Promise.resolve()} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
