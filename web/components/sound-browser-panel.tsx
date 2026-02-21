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

  const isSearching = search.trim().length > 0;

  const filteredSounds = useMemo(() => {
    if (isSearching) {
      // Global search across all sounds
      const q = search.toLowerCase();
      return sounds.filter((s) =>
        s.filename.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.subcategory.toLowerCase().includes(q)
      );
    }
    // Normal tab-filtered view
    return sounds.filter((s) => s.category === effectiveCategory);
  }, [sounds, effectiveCategory, search, isSearching]);

  const grouped = useMemo(() => groupSoundsByCategory(filteredSounds), [filteredSounds]);

  const showSubTabs = !isSearching && groupCategories.length > 1;

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
          placeholder="SEARCH ALL SOUNDS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
          className="w-full px-3 py-1 text-xs bg-transparent outline-none"
          style={{
            border: `1px solid ${isSearching ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
            color: 'var(--sf-cyan)',
            boxShadow: isSearching ? '0 0 6px rgba(0,229,255,0.15)' : undefined,
          }}
        />

        {/* Group tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto" style={{ opacity: isSearching ? 0.3 : 1, pointerEvents: isSearching ? 'none' : 'auto' }}>
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
        {isSearching && filteredSounds.length > 0 && (
          <div className="text-[9px] uppercase tracking-widest mb-3 opacity-40 px-1">
            {filteredSounds.length} result{filteredSounds.length !== 1 ? 's' : ''}
          </div>
        )}
        {Object.entries(grouped).map(([cat, subcats]) => (
          <div key={cat}>
            {isSearching && (
              <div className="text-[9px] uppercase tracking-widest mb-1 mt-3 px-1 first:mt-0" style={{ color: 'var(--sf-cyan)', opacity: 0.6 }}>
                {cat.replace(/\//g, ' › ')}
              </div>
            )}
            {Object.entries(subcats).map(([subcat, catSounds]) => (
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
            ))}
          </div>
        ))}
        {filteredSounds.length === 0 && (
          <div className="text-xs opacity-30 text-center py-8">NO SOUNDS FOUND</div>
        )}
      </div>
    </div>
  );
}
