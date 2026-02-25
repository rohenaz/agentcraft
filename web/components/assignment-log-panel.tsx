'use client';

import { getEventLabel, normalizeSlot } from '@/lib/utils';
import { ClientMappingsPanel } from './client-mappings-panel';
import type { SoundAssignments, HookEvent } from '@/lib/types';
import type { ClientCapabilities } from '@/lib/clients';
import { useCompact } from '@/lib/use-compact';

interface AssignmentEntry {
  scope: string;
  event: HookEvent;
  sound: string;
  /** Total sounds in this slot (for display) */
  slotTotal: number;
}

interface AssignmentLogPanelProps {
  assignments: SoundAssignments;
  isDirty: boolean;
  onClear: (scope: string, event: HookEvent, soundPath?: string) => void;
  onSave: () => void;
  client?: ClientCapabilities | null;
}

export function AssignmentLogPanel({ assignments, isDirty, onClear, onSave, client }: AssignmentLogPanelProps) {
  const compact = useCompact();
  const entries: AssignmentEntry[] = [];

  // Global entries — expand arrays into individual rows
  for (const [event, slot] of Object.entries(assignments.global)) {
    const sounds = normalizeSlot(slot);
    for (const sound of sounds) {
      entries.push({ scope: 'GLOBAL', event: event as HookEvent, sound, slotTotal: sounds.length });
    }
  }

  // Agent entries — expand arrays into individual rows
  for (const [agentName, config] of Object.entries(assignments.agents)) {
    for (const [event, slot] of Object.entries(config.hooks)) {
      const sounds = normalizeSlot(slot);
      for (const sound of sounds) {
        entries.push({ scope: agentName, event: event as HookEvent, sound, slotTotal: sounds.length });
      }
    }
  }

  // Skill entries — expand arrays into individual rows
  for (const [skillName, config] of Object.entries(assignments.skills)) {
    for (const [event, slot] of Object.entries(config.hooks)) {
      const sounds = normalizeSlot(slot);
      for (const sound of sounds) {
        entries.push({ scope: `skill/${skillName}`, event: event as HookEvent, sound, slotTotal: sounds.length });
      }
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2 border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
        <div className="sf-heading text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sf-cyan)' }}>
          ASSIGNMENT LOG
        </div>
        {isDirty && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--sf-gold)' }}>
            &#x25CF; UNSAVED CHANGES
          </div>
        )}
      </div>

      {/* Client mappings (shown when client is identified) */}
      {client && client.id !== 'unknown' && (
        <ClientMappingsPanel currentClient={client} />
      )}

      {/* Assignment table */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-xs opacity-30 text-center py-8">NO ASSIGNMENTS</div>
        ) : (
          <table className="w-full text-[10px]">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--sf-panel)' }}>
              <tr>
                <th className="text-left px-3 py-1 opacity-40 uppercase tracking-wider font-normal">Scope</th>
                <th className="text-left px-2 py-1 opacity-40 uppercase tracking-wider font-normal">Event</th>
                <th className="text-left px-2 py-1 opacity-40 uppercase tracking-wider font-normal">Sound</th>
                <th className="px-2 py-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className="border-b transition-all hover:bg-white/5"
                  style={{ borderColor: 'rgba(0,229,255,0.06)' }}
                >
                  <td className="px-3 py-1.5 truncate" style={{ maxWidth: compact ? '140px' : '80px', color: entry.scope === 'GLOBAL' ? 'var(--sf-gold)' : undefined }}>
                    {entry.scope}
                  </td>
                  <td className="px-2 py-1.5 truncate opacity-70" style={{ maxWidth: compact ? '140px' : '90px' }}>
                    {getEventLabel(entry.event)}
                  </td>
                  <td className="px-2 py-1.5 truncate opacity-60" style={{ maxWidth: compact ? '160px' : '100px' }}>
                    <span title={entry.sound}>{entry.sound.split('/').pop()}</span>
                    {entry.slotTotal > 1 && (
                      <span className="ml-1 text-[8px] opacity-40" style={{ color: 'var(--sf-cyan)' }}>
                        1/{entry.slotTotal}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => onClear(entry.scope === 'GLOBAL' ? 'global' : entry.scope, entry.event, entry.sound)}
                      className="opacity-40 hover:opacity-80 transition-opacity text-[10px]"
                      style={{ color: 'var(--sf-alert)' }}
                      title={entry.slotTotal > 1 ? 'Remove this sound' : 'Clear'}
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Save button */}
      <div className="shrink-0 p-3 border-t" style={{ borderColor: 'var(--sf-border)' }}>
        <button
          onClick={onSave}
          className={`w-full py-2 text-xs sf-heading font-bold uppercase tracking-widest transition-all ${isDirty ? 'sf-pulse-gold' : ''}`}
          style={{
            border: `1px solid ${isDirty ? 'var(--sf-gold)' : 'var(--sf-border)'}`,
            color: isDirty ? 'var(--sf-gold)' : 'rgba(255,255,255,0.3)',
            backgroundColor: isDirty ? 'rgba(255,192,0,0.06)' : 'transparent',
          }}
        >
          {isDirty ? '\u2B21 ESTABLISH UPLINK' : 'SYNCED'}
        </button>
      </div>
    </div>
  );
}
