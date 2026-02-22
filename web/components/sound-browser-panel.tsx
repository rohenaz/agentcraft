'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SoundUnit } from './sound-unit';
import { groupSoundsByCategory, getGroupLabel, getSubTabLabel } from '@/lib/utils';
import { playUISound } from '@/lib/ui-audio';
import type { SoundAsset, SoundAssignments, SelectMode } from '@/lib/types';

interface SoundBrowserPanelProps {
  sounds: SoundAsset[];
  assignments: SoundAssignments;
  onPreview: (path: string) => void;
  selectMode: SelectMode | null;
  onSelectModeAssign: (path: string) => void;
  onClearSelectMode: () => void;
}

// Strip pack prefix from category: "publisher/name:sc2/terran" → "sc2/terran"
function internalCat(category: string): string {
  const idx = category.indexOf(':');
  return idx === -1 ? category : category.slice(idx + 1);
}

// Extract pack ID: "publisher/name:sc2/terran" → "publisher/name"
function packOfCat(category: string): string {
  const idx = category.indexOf(':');
  return idx === -1 ? '' : category.slice(0, idx);
}

// "publisher/name" → "name"
function packShortName(packId: string): string {
  return packId.split('/')[1] ?? packId;
}

export function SoundBrowserPanel({ sounds, assignments, onPreview, selectMode, onSelectModeAssign, onClearSelectMode }: SoundBrowserPanelProps) {
  const [activePack, setActivePack] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('sc2');
  const [activeCategory, setActiveCategory] = useState<string>('sc2/terran');
  const [search, setSearch] = useState('');

  // All unique pack IDs present in the library
  const allPacks = useMemo(() => {
    return [...new Set(sounds.map((s) => packOfCat(s.category)))].filter(Boolean).sort();
  }, [sounds]);

  const showPackSelector = allPacks.length > 1;

  // Sounds visible given the current pack filter
  const visibleSounds = useMemo(() => {
    if (!activePack) return sounds;
    const prefix = activePack + ':';
    return sounds.filter((s) => s.category.startsWith(prefix));
  }, [sounds, activePack]);

  const allGroups = useMemo(() => {
    return [...new Set(visibleSounds.map((s) => internalCat(s.category).split('/')[0]))].sort();
  }, [visibleSounds]);

  // If activeGroup disappears after a pack switch, reset to the first available group
  useEffect(() => {
    if (allGroups.length > 0 && !allGroups.includes(activeGroup)) {
      setActiveGroup(allGroups[0]);
    }
  }, [allGroups, activeGroup]);

  const groupCategories = useMemo(() => {
    return [...new Set(
      visibleSounds.filter((s) => internalCat(s.category).split('/')[0] === activeGroup).map((s) => s.category)
    )].sort();
  }, [visibleSounds, activeGroup]);

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
      const q = search.toLowerCase();
      return visibleSounds.filter((s) =>
        s.filename.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.subcategory.toLowerCase().includes(q)
      );
    }
    return visibleSounds.filter((s) => s.category === effectiveCategory);
  }, [visibleSounds, effectiveCategory, search, isSearching]);

  const grouped = useMemo(() => groupSoundsByCategory(filteredSounds), [filteredSounds]);

  const showSubTabs = !isSearching && groupCategories.length > 1;
  // Show pack label on cards when browsing all packs and multiple packs are installed
  const showPackBadge = showPackSelector && !activePack;

  const handleGroupChange = useCallback((group: string) => {
    setActiveGroup(group);
    playUISound('pageChange', 0.4);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    playUISound('pageChange', 0.35);
  }, []);

  const handlePackChange = useCallback((pack: string | null) => {
    setActivePack(pack);
    playUISound('pageChange', 0.4);
  }, []);

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

        {/* SOURCE pack selector — only shown when 2+ packs installed */}
        {showPackSelector && (
          <div
            className="flex items-center gap-1 mt-2 overflow-x-auto"
            style={{ opacity: isSearching ? 0.3 : 1, pointerEvents: isSearching ? 'none' : 'auto' }}
          >
            <span className="text-[9px] tracking-widest uppercase shrink-0" style={{ color: 'var(--sf-gold)', opacity: 0.6 }}>
              SOURCE
            </span>
            <button
              data-sf-hover
              onClick={() => handlePackChange(null)}
              className="shrink-0 px-2 py-0.5 text-[9px] sf-heading font-semibold uppercase tracking-wider transition-all"
              style={{
                border: `1px solid ${!activePack ? 'var(--sf-gold)' : 'rgba(255,192,0,0.2)'}`,
                color: !activePack ? 'var(--sf-gold)' : 'rgba(255,192,0,0.45)',
                backgroundColor: !activePack ? 'rgba(255,192,0,0.08)' : 'transparent',
              }}
            >
              ALL
            </button>
            {allPacks.map((id) => (
              <button
                key={id}
                data-sf-hover
                onClick={() => handlePackChange(id)}
                className="shrink-0 px-2 py-0.5 text-[9px] sf-heading font-semibold uppercase tracking-wider transition-all"
                style={{
                  border: `1px solid ${activePack === id ? 'var(--sf-gold)' : 'rgba(255,192,0,0.2)'}`,
                  color: activePack === id ? 'var(--sf-gold)' : 'rgba(255,192,0,0.45)',
                  backgroundColor: activePack === id ? 'rgba(255,192,0,0.08)' : 'transparent',
                }}
              >
                {packShortName(id)}
              </button>
            ))}
          </div>
        )}

        {/* Group tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto" style={{ opacity: isSearching ? 0.3 : 1, pointerEvents: isSearching ? 'none' : 'auto' }}>
          {allGroups.map((group) => (
            <button
              key={group}
              data-sf-hover
              onClick={() => handleGroupChange(group)}
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
                onClick={() => handleCategoryChange(cat)}
                className="shrink-0 px-2 py-0.5 text-[9px] sf-heading font-medium uppercase tracking-wider transition-all"
                style={{
                  border: `1px solid ${effectiveCategory === cat ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.15)'}`,
                  color: effectiveCategory === cat ? 'rgba(0,229,255,0.8)' : 'rgba(255,255,255,0.3)',
                  backgroundColor: effectiveCategory === cat ? 'rgba(0,229,255,0.05)' : 'transparent',
                }}
              >
                {getSubTabLabel(internalCat(cat))}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Select mode banner */}
      {selectMode && (
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2"
          style={{
            backgroundColor: 'rgba(0,229,255,0.08)',
            borderBottom: '1px solid var(--sf-cyan)',
            boxShadow: '0 0 12px rgba(0,229,255,0.1)',
          }}
        >
          <div>
            <span className="text-[10px] sf-heading font-semibold tracking-widest" style={{ color: 'var(--sf-cyan)' }}>
              ASSIGNING → {selectMode.label}
            </span>
            <span className="text-[10px] opacity-40 ml-3">click a sound card to assign</span>
          </div>
          <button
            data-no-ui-sound
            onClick={onClearSelectMode}
            className="text-[10px] px-2 py-0.5 transition-opacity"
            style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'rgba(0,229,255,0.6)' }}
          >
            ESC
          </button>
        </div>
      )}

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
                {internalCat(cat).replace(/\//g, ' › ')}
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
                      onSelectAssign={selectMode ? () => onSelectModeAssign(sound.path) : undefined}
                      packLabel={showPackBadge ? packShortName(packOfCat(sound.category)) : undefined}
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
