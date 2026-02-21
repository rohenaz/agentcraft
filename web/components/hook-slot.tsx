'use client';

import { useDroppable } from '@dnd-kit/core';
import { getEventLabel } from '@/lib/utils';
import type { HookEvent } from '@/lib/types';

interface HookSlotProps {
  event: HookEvent;
  scope: string;
  assignedSound?: string;
  onClear: () => void;
  onPreview: (path: string) => void;
}

export function HookSlot({ event, scope, assignedSound, onClear, onPreview }: HookSlotProps) {
  const dropId = `${scope}:${event}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  const label = getEventLabel(event);
  const filename = assignedSound ? assignedSound.split('/').pop() ?? assignedSound : null;

  return (
    <div
      ref={setNodeRef}
      className="flex items-center justify-between px-2 py-1 text-xs transition-all group"
      style={{
        borderWidth: '1px',
        borderStyle: isOver || assignedSound ? 'solid' : 'dashed',
        borderColor: isOver ? 'var(--sf-cyan)' : assignedSound ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.12)',
        backgroundColor: isOver ? 'rgba(0,229,255,0.12)' : assignedSound ? 'rgba(0,229,255,0.04)' : 'transparent',
        boxShadow: isOver ? 'inset 0 0 8px rgba(0,229,255,0.08)' : undefined,
        minHeight: '28px',
      }}
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
      ) : assignedSound ? (
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="truncate text-[11px] opacity-80" title={assignedSound}>
            {filename}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onPreview(assignedSound)}
              className="text-[10px] px-1 hover:opacity-80"
              style={{ color: 'var(--sf-cyan)' }}
              title="Preview"
            >
              &#x25B6;
            </button>
            <button
              onClick={onClear}
              className="text-[10px] px-1 hover:opacity-80"
              style={{ color: 'var(--sf-alert)' }}
              title="Clear"
            >
              &#x2715;
            </button>
          </div>
        </div>
      ) : (
        <span className="text-[10px] opacity-25 italic">drop sound here</span>
      )}
    </div>
  );
}
