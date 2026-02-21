'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { getEventLabel } from '@/lib/utils';
import { playUISound } from '@/lib/ui-audio';
import type { HookEvent, SelectMode } from '@/lib/types';

interface HookSlotProps {
  event: HookEvent | string;
  scope: string;
  assignedSound?: string;
  onClear: () => void;
  onPreview: (path: string) => void;
  selectMode: SelectMode | null;
  onSelect: () => void; // called when empty slot is clicked to enter select mode
}

export function HookSlot({ event, scope, assignedSound, onClear, onPreview, selectMode, onSelect }: HookSlotProps) {
  const dropId = `${scope}:${event}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const [isHovered, setIsHovered] = useState(false);

  const label = getEventLabel(event as HookEvent);
  const filename = assignedSound ? assignedSound.split('/').pop() ?? assignedSound : null;
  const isSelected = selectMode?.scope === scope && selectMode?.event === event;
  const isSelectModeActive = !!selectMode;

  const handleContainerClick = () => {
    if (assignedSound) {
      onPreview(assignedSound);
    } else {
      onSelect();
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (assignedSound) onPreview(assignedSound);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  // Border logic
  let borderColor: string;
  let borderStyle: 'solid' | 'dashed';
  let bgColor: string;

  if (isOver) {
    borderColor = 'var(--sf-cyan)';
    borderStyle = 'solid';
    bgColor = 'rgba(0,229,255,0.12)';
  } else if (isSelected) {
    borderColor = 'var(--sf-cyan)';
    borderStyle = 'dashed';
    bgColor = 'rgba(0,229,255,0.08)';
  } else if (assignedSound) {
    borderColor = isHovered ? 'rgba(0,229,255,0.7)' : 'rgba(0,229,255,0.4)';
    borderStyle = 'solid';
    bgColor = isHovered ? 'rgba(0,229,255,0.08)' : 'rgba(0,229,255,0.04)';
  } else if (isSelectModeActive) {
    // Another slot is being selected — mute everything
    borderColor = 'rgba(0,229,255,0.06)';
    borderStyle = 'dashed';
    bgColor = 'transparent';
  } else {
    borderColor = isHovered ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.12)';
    borderStyle = 'dashed';
    bgColor = isHovered ? 'rgba(0,229,255,0.03)' : 'transparent';
  }

  return (
    <div
      ref={setNodeRef}
      data-sf-hover
      {...(assignedSound ? { 'data-no-ui-sound': '' } : {})}
      className="flex items-center justify-between px-2 py-1 text-xs transition-all cursor-pointer select-none"
      style={{
        borderWidth: '1px',
        borderStyle,
        borderColor,
        backgroundColor: bgColor,
        boxShadow: isOver ? 'inset 0 0 8px rgba(0,229,255,0.08)' : isSelected ? '0 0 6px rgba(0,229,255,0.15)' : undefined,
        minHeight: '28px',
        opacity: isSelectModeActive && !isSelected ? 0.45 : 1,
      }}
      onMouseEnter={() => { setIsHovered(true); playUISound('hover', 0.15); }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleContainerClick}
    >
      <span
        className="text-[10px] uppercase tracking-wider shrink-0 mr-2 transition-opacity"
        style={{ color: 'var(--sf-cyan)', opacity: isOver ? 0.9 : 0.5 }}
      >
        {label}
      </span>

      {isOver ? (
        <span className="text-[10px] tracking-wider" style={{ color: 'var(--sf-cyan)' }}>
          RELEASE TO ASSIGN ▼
        </span>
      ) : isSelected ? (
        <span className="text-[10px] tracking-wider animate-pulse" style={{ color: 'var(--sf-cyan)' }}>
          CLICK A SOUND →
        </span>
      ) : assignedSound ? (
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="truncate text-[11px] transition-opacity"
            style={{ opacity: isHovered ? 1 : 0.7, color: isHovered ? 'rgba(255,255,255,0.95)' : 'inherit' }}
            title={assignedSound}
          >
            {filename}
          </span>
          <div className="flex items-center gap-1 shrink-0" style={{ opacity: isHovered ? 1 : 0 }}>
            <button
              data-no-ui-sound
              onClick={handlePlayClick}
              className="text-[10px] px-1 transition-opacity"
              style={{ color: 'var(--sf-cyan)' }}
              title="Preview"
            >
              &#x25B6;
            </button>
            <button
              data-no-ui-sound
              onClick={handleClearClick}
              className="text-[10px] px-1 transition-opacity"
              style={{ color: 'var(--sf-alert)' }}
              title="Clear"
            >
              &#x2715;
            </button>
          </div>
        </div>
      ) : (
        <span
          className="text-[10px] italic transition-opacity"
          style={{ opacity: isHovered ? 0.5 : 0.2 }}
        >
          {isHovered ? 'click to assign' : 'empty'}
        </span>
      )}
    </div>
  );
}
