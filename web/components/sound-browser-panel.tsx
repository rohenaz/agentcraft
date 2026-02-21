'use client';

import { useState, useMemo } from 'react';
import { SoundUnit } from './sound-unit';
import { groupSoundsByCategory, getGroupLabel, getSubTabLabel } from '@/lib/utils';
import type { SoundAsset, SoundAssignments } from '@/lib/types';

interface SoundBrowserPanelProps {
  sounds: SoundAsset[];
  assignments: SoundAssignments;
  onPreview: (path: string) => void;
}

export function SoundBrowserPanel({ sounds, assignments, onPreview }: SoundBrowserPanelProps) {
  const [activeGroup, setActiveGroup] = useState<string>('sc2');
  const [activeCategory, setActiveCategory] = useState<string>('sc2/terran');
  const [search, setSearch] = useState('');

  const allGroups = useMemo(() => {
    return [...new Set(sounds.map((s) => s.category.split('/')[0]))].sort();
  }, [sounds]);

  const groupCategories = useMemo(() => {
    return [...new Set(
      sounds.filter((s) => s.category.split('/')[0] === activeGroup).map((s) => s.category)
    )].sort();
  }, [sounds, activeGroup]);

  // If activeCategory doesn't belong to current group, use first category of the group
  const effectiveCategory = groupCategories.includes(activeCategory)
    ? activeCategory
    : (groupCategories[0] ?? '');

  const assignedPaths = useMemo(() => {
    const paths = new Set<string>();
    Object.values(assignments.global).forEach((p) => p && paths.add(p));
    Object.values(assignments.agents).forEach((a) => {
      Object.values(a.hooks).forEach((p) => p && paths.add(p));
    });
    return paths;
  }, [assignments]);

  const filteredSounds = useMemo(() => {
    return sounds.filter((s) => {
      if (s.category !== effectiveCategory) return false;
      if (search && !s.filename.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sounds, effectiveCategory, search]);

  const grouped = useMemo(() => groupSoundsByCategory(filteredSounds), [filteredSounds]);

  const showSubTabs = groupCategories.length > 1;

  return (
    <div className="flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--sf-border)', borderRight: '1px solid var(--sf-border)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-2 border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
        <div className="sf-heading text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sf-cyan)' }}>
          SOUND LIBRARY
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="SEARCH SOUNDS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1 text-xs bg-transparent outline-none"
          style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-cyan)' }}
        />

        {/* Group tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {allGroups.map((group) => (
            <button
              key={group}
              data-sf-hover
              onClick={() => setActiveGroup(group)}
              className="shrink-0 px-3 py-1 text-[10px] sf-heading font-semibold uppercase tracking-wider transition-all"
              style={{
                border: `1px solid ${activeGroup === group ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                color: activeGroup === group ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.4)',
                backgroundColor: activeGroup === group ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}
            >
              {getGroupLabel(group)}
            </button>
          ))}
        </div>

        {/* Sub-tabs (race / platform) */}
        {showSubTabs && (
          <div className="flex gap-1 mt-1 overflow-x-auto">
            {groupCategories.map((cat) => (
              <button
                key={cat}
                data-sf-hover
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 px-2 py-0.5 text-[9px] sf-heading font-medium uppercase tracking-wider transition-all"
                style={{
                  border: `1px solid ${effectiveCategory === cat ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.15)'}`,
                  color: effectiveCategory === cat ? 'rgba(0,229,255,0.8)' : 'rgba(255,255,255,0.3)',
                  backgroundColor: effectiveCategory === cat ? 'rgba(0,229,255,0.05)' : 'transparent',
                }}
              >
                {getSubTabLabel(cat)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sound grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(grouped).map(([cat, subcats]) =>
          Object.entries(subcats).map(([subcat, catSounds]) => (
            <div key={`${cat}/${subcat}`} className="mb-4">
              {subcat && <div className="text-[10px] uppercase tracking-widest mb-2 opacity-40 px-1">{subcat.replace(/-/g, ' ')}</div>}
              <div className="grid grid-cols-2 gap-2">
                {catSounds.map((sound) => (
                  <SoundUnit
                    key={sound.id}
                    sound={sound}
                    isAssigned={assignedPaths.has(sound.path)}
                    onPreview={onPreview}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        {filteredSounds.length === 0 && (
          <div className="text-xs opacity-30 text-center py-8">NO SOUNDS FOUND</div>
        )}
      </div>
    </div>
  );
}
