'use client';

import { useState } from 'react';
import { playUISound } from '@/lib/ui-audio';
import { getEventLabel } from '@/lib/utils';
import { CLIENTS, getAllClientIds, type ClientCapabilities, type ClientId } from '@/lib/clients';
import type { HookEvent } from '@/lib/types';

const ALL_EVENTS: HookEvent[] = [
  'SessionStart', 'SessionEnd', 'Stop', 'SubagentStop',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'Notification', 'PreCompact',
];

interface ClientMappingsPanelProps {
  currentClient: ClientCapabilities;
}

export function ClientMappingsPanel({ currentClient }: ClientMappingsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const clientIds = getAllClientIds();

  // Count supported events for each client
  const supportCounts = Object.fromEntries(
    clientIds.map((id) => [id, ALL_EVENTS.filter((e) => CLIENTS[id].supportedEvents.has(e)).length])
  );

  return (
    <div className="border-b" style={{ borderColor: 'var(--sf-border)' }}>
      {/* Header */}
      <div
        data-sf-hover
        data-no-ui-sound
        className="flex items-center justify-between px-4 py-2 cursor-pointer transition-all"
        style={{ backgroundColor: expanded ? 'rgba(0,229,255,0.03)' : 'transparent' }}
        onClick={() => { playUISound('toggle', 0.3); setExpanded(!expanded); }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] opacity-50">{expanded ? '▾' : '▸'}</span>
          <span className="sf-heading text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sf-cyan)' }}>
            EVENT MAPPINGS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {clientIds.map((id) => (
            <span
              key={id}
              className="text-[8px] px-1.5 py-px uppercase tracking-wider"
              style={{
                border: `1px solid ${currentClient.id === id ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: currentClient.id === id ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.3)',
                backgroundColor: currentClient.id === id ? 'rgba(0,229,255,0.06)' : 'transparent',
              }}
            >
              {CLIENTS[id].label.split(' ').map(w => w[0]).join('')} {supportCounts[id]}/{ALL_EVENTS.length}
            </span>
          ))}
        </div>
      </div>

      {/* Mapping table */}
      {expanded && (
        <div className="px-2 pb-3">
          <table className="w-full text-[9px]">
            <thead>
              <tr>
                <th className="text-left px-2 py-1 opacity-30 uppercase tracking-wider font-normal">Event</th>
                {clientIds.map((id) => (
                  <th
                    key={id}
                    className="text-left px-2 py-1 uppercase tracking-wider font-normal"
                    style={{ color: currentClient.id === id ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.35)', opacity: currentClient.id === id ? 0.8 : 0.5 }}
                  >
                    {CLIENTS[id].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_EVENTS.map((event) => (
                <tr
                  key={event}
                  className="border-b transition-all hover:bg-white/[0.02]"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <td className="px-2 py-1.5 uppercase tracking-wider font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {getEventLabel(event)}
                  </td>
                  {clientIds.map((id) => {
                    const client = CLIENTS[id];
                    const supported = client.supportedEvents.has(event);
                    const mapping = client.eventMapping[event];
                    const note = client.eventNotes[event];
                    const isCurrentClient = currentClient.id === id;

                    return (
                      <td
                        key={id}
                        className="px-2 py-1.5"
                        title={note ?? mapping ?? undefined}
                      >
                        {supported ? (
                          <span
                            className="truncate block max-w-[100px]"
                            style={{
                              color: isCurrentClient ? 'rgba(0,229,255,0.7)' : 'rgba(255,255,255,0.4)',
                            }}
                          >
                            {mapping ?? 'supported'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span style={{ color: 'rgba(255,160,0,0.5)' }}>--</span>
                            {note && (
                              <span
                                className="truncate max-w-[80px]"
                                style={{ color: 'rgba(255,160,0,0.35)', fontStyle: 'italic' }}
                              >
                                {note}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Agent overrides note */}
          <div className="mt-2 px-2">
            <div className="text-[8px] uppercase tracking-wider opacity-25 mb-1">PER-AGENT OVERRIDES</div>
            <div className="flex gap-2">
              {clientIds.map((id) => (
                <span
                  key={id}
                  className="text-[8px] px-1.5 py-px"
                  style={{
                    border: `1px solid ${CLIENTS[id].supportsAgentOverrides ? 'rgba(0,200,100,0.3)' : 'rgba(255,160,0,0.3)'}`,
                    color: CLIENTS[id].supportsAgentOverrides ? 'rgba(0,200,100,0.6)' : 'rgba(255,160,0,0.6)',
                  }}
                >
                  {CLIENTS[id].label}: {CLIENTS[id].supportsAgentOverrides ? 'YES' : 'GLOBAL ONLY'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
