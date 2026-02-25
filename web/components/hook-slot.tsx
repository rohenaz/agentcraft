'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { getEventLabel, normalizeSlot, pickRandom } from '@/lib/utils';
import { playUISound } from '@/lib/ui-audio';
import type { HookEvent, SelectMode, SoundSlot } from '@/lib/types';
import type { ClientCapabilities } from '@/lib/clients';

interface HookSlotProps {
  event: HookEvent | string;
  scope: string;
  assignedSound?: SoundSlot;
  onClear: () => void;
  onClearOne?: (path: string) => void;
  onPreview: (path: string) => void;
  selectMode: SelectMode | null;
  onSelect: () => void; // called when empty slot is clicked to enter select mode
  /** If provided, shows compatibility info for the current client */
  client?: ClientCapabilities | null;
  /** Whether this is a skill event slot */
  isSkillEvent?: boolean;
}

export function HookSlot({ event, scope, assignedSound, onClear, onClearOne, onPreview, selectMode, onSelect, client, isSkillEvent }: HookSlotProps) {
  const dropId = `${scope}:${event}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const [isHovered, setIsHovered] = useState(false);

  const label = getEventLabel(event as HookEvent);
  const sounds = normalizeSlot(assignedSound);
  const hasSound = sounds.length > 0;
  const isMulti = sounds.length > 1;
  const displayName = hasSound ? sounds[0].split('/').pop() ?? sounds[0] : null;
  const isSelected = selectMode?.scope === scope && selectMode?.event === event;
  const isSelectModeActive = !!selectMode;

  // Client support check
  const isUnsupported = client && client.id !== 'unknown' && (
    isSkillEvent
      ? !client.supportedSkillEvents.has(event as any)
      : !client.supportedEvents.has(event as HookEvent)
  );
  const nativeMapping = !isSkillEvent ? client?.eventMapping[event as HookEvent] : undefined;
  const eventNote = !isSkillEvent ? client?.eventNotes[event as HookEvent] : undefined;

  const handleContainerClick = () => {
    if (hasSound) {
      onPreview(pickRandom(sounds));
    } else {
      onSelect();
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSound) onPreview(pickRandom(sounds));
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  // Border logic
  let borderColor: string;
  let borderStyle: 'solid' | 'dashed';
  let bgColor: string;

  if (isUnsupported) {
    // Unsupported by current client — dimmed with distinct color
    borderColor = isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
    borderStyle = 'dashed';
    bgColor = isHovered ? 'rgba(255,255,255,0.02)' : 'transparent';
  } else if (isOver) {
    borderColor = 'var(--sf-cyan)';
    borderStyle = 'solid';
    bgColor = 'rgba(0,229,255,0.12)';
  } else if (isSelected) {
    borderColor = 'var(--sf-cyan)';
    borderStyle = 'dashed';
    bgColor = 'rgba(0,229,255,0.08)';
  } else if (hasSound) {
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
      {...(hasSound ? { 'data-no-ui-sound': '' } : {})}
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
      <span className="flex items-center gap-1.5 shrink-0 mr-2">
        <span
          className="text-[10px] uppercase tracking-wider transition-opacity"
          style={{
            color: isUnsupported ? 'rgba(255,255,255,0.25)' : 'var(--sf-cyan)',
            opacity: isOver ? 0.9 : isUnsupported ? 0.4 : 0.5,
            textDecoration: isUnsupported ? 'line-through' : undefined,
          }}
        >
          {label}
        </span>
        {isUnsupported && client && (
          <span
            className="text-[8px] px-1 py-px uppercase tracking-wider shrink-0"
            style={{
              border: '1px solid rgba(255,160,0,0.3)',
              color: 'rgba(255,160,0,0.6)',
              backgroundColor: 'rgba(255,160,0,0.05)',
              lineHeight: '1.2',
            }}
            title={eventNote ?? `Not supported by ${client.label}`}
          >
            {client.id === 'opencode' ? 'OC' : client.id === 'pi' ? 'PI' : client.label.slice(0, 2).toUpperCase()}
          </span>
        )}
        {!isUnsupported && nativeMapping && isHovered && (
          <span
            className="text-[8px] tracking-wider truncate"
            style={{ color: 'rgba(255,255,255,0.25)', maxWidth: '120px' }}
            title={nativeMapping}
          >
            {nativeMapping}
          </span>
        )}
      </span>

      {isOver ? (
        <span className="text-[10px] tracking-wider" style={{ color: 'var(--sf-cyan)' }}>
          RELEASE TO ASSIGN ▼
        </span>
      ) : isSelected ? (
        <span className="text-[10px] tracking-wider animate-pulse" style={{ color: 'var(--sf-cyan)' }}>
          CLICK A SOUND →
        </span>
      ) : hasSound ? (
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="truncate text-[11px] transition-opacity"
            style={{ opacity: isHovered ? 1 : 0.7, color: isHovered ? 'rgba(255,255,255,0.95)' : 'inherit' }}
            title={sounds.join('\n')}
          >
            {displayName}
            {isMulti && (
              <span className="ml-1 text-[9px] opacity-60" style={{ color: 'var(--sf-cyan)' }}>
                +{sounds.length - 1}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0" style={{ opacity: isHovered ? 1 : 0 }}>
            <button
              data-no-ui-sound
              onClick={handlePlayClick}
              className="text-[10px] px-1 transition-opacity"
              style={{ color: 'var(--sf-cyan)' }}
              title={isMulti ? 'Preview (random)' : 'Preview'}
            >
              &#x25B6;
            </button>
            <button
              data-no-ui-sound
              onClick={handleClearClick}
              className="text-[10px] px-1 transition-opacity"
              style={{ color: 'var(--sf-alert)' }}
              title={isMulti ? 'Clear all' : 'Clear'}
            >
              &#x2715;
            </button>
          </div>
        </div>
      ) : isUnsupported ? (
        <span
          className="text-[8px] italic transition-opacity"
          style={{ opacity: isHovered ? 0.4 : 0.15, color: 'rgba(255,160,0,0.8)' }}
        >
          {isHovered ? (eventNote ?? `not available in ${client?.label}`) : 'n/a'}
        </span>
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
