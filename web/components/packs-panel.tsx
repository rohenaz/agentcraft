'use client';

import { useState, useEffect, useCallback } from 'react';
import { playUISound } from '@/lib/ui-audio';

interface PackInfo {
  id: string;
  publisher: string;
  name: string;
  description?: string;
  version?: string;
}

interface RegistryPack {
  id: string;
  name: string;
  publisher: string;
  description: string;
  stars: number;
  updatedAt: string;
}

type PackAction = 'idle' | 'installing' | 'updating' | 'removing';

export function PacksPanel() {
  const [installed, setInstalled] = useState<PackInfo[]>([]);
  const [registry, setRegistry] = useState<RegistryPack[]>([]);
  const [actions, setActions] = useState<Record<string, PackAction>>({});
  const [registryError, setRegistryError] = useState(false);

  const fetchInstalled = useCallback(() => {
    fetch('/api/packs').then(r => r.json()).then(setInstalled).catch(console.error);
  }, []);

  useEffect(() => {
    fetchInstalled();
    // Fetch registry index
    fetch('https://rohenaz.github.io/agentcraft-registry/index.json')
      .then(r => r.json())
      .then(setRegistry)
      .catch(() => setRegistryError(true));
  }, [fetchInstalled]);

  const setAction = (id: string, action: PackAction) =>
    setActions(prev => ({ ...prev, [id]: action }));

  const handleInstall = async (id: string) => {
    setAction(id, 'installing');
    try {
      const r = await fetch('/api/packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: id }) });
      if (!r.ok) throw new Error();
      playUISound('confirm', 0.5);
      fetchInstalled();
    } catch {
      playUISound('error', 0.5);
    }
    setAction(id, 'idle');
  };

  const handleUpdate = async (id: string) => {
    setAction(id, 'updating');
    try {
      const r = await fetch('/api/packs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: id }) });
      if (!r.ok) throw new Error();
      playUISound('confirm', 0.4);
    } catch {
      playUISound('error', 0.5);
    }
    setAction(id, 'idle');
  };

  const handleRemove = async (id: string) => {
    setAction(id, 'removing');
    try {
      const r = await fetch('/api/packs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: id }) });
      if (!r.ok) throw new Error();
      fetchInstalled();
    } catch {
      playUISound('error', 0.5);
    }
    setAction(id, 'idle');
  };

  const installedIds = new Set(installed.map(p => p.id));
  const browsePacks = registry.filter(p => !installedIds.has(p.id));

  const btnStyle = (active: boolean, danger = false) => ({
    border: `1px solid ${danger ? 'rgba(255,80,80,0.4)' : active ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
    color: danger ? 'rgba(255,80,80,0.7)' : active ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
    padding: '2px 8px',
    fontSize: '9px',
    fontFamily: 'inherit',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Installed */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <div className="text-[10px] sf-heading font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sf-cyan)' }}>
          INSTALLED PACKS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {installed.length === 0 && (
          <div className="text-[10px] opacity-30 py-4 text-center">NO PACKS INSTALLED</div>
        )}
        {installed.map(pack => {
          const action = actions[pack.id] ?? 'idle';
          return (
            <div key={pack.id} className="p-2.5" style={{ border: '1px solid var(--sf-border)', backgroundColor: 'rgba(0,229,255,0.02)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <div className="text-xs sf-heading font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {pack.name}
                  </div>
                  <div className="text-[10px] opacity-40">{pack.publisher}{pack.version ? ` · v${pack.version}` : ''}</div>
                  {pack.description && (
                    <div className="text-[10px] opacity-50 mt-0.5 line-clamp-2">{pack.description}</div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button style={btnStyle(false)} disabled={action !== 'idle'} onClick={() => handleUpdate(pack.id)}>
                    {action === 'updating' ? '···' : 'UPDATE'}
                  </button>
                  <button style={btnStyle(false, true)} disabled={action !== 'idle'} onClick={() => handleRemove(pack.id)}>
                    {action === 'removing' ? '···' : 'REMOVE'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Browse */}
        <div className="text-[10px] sf-heading font-semibold tracking-widest uppercase mt-4 mb-2" style={{ color: 'var(--sf-cyan)' }}>
          BROWSE PACKS
        </div>

        {registryError && (
          <div className="text-[10px] opacity-30 py-2 text-center">REGISTRY UNAVAILABLE</div>
        )}

        {!registryError && browsePacks.length === 0 && registry.length > 0 && (
          <div className="text-[10px] opacity-30 py-2 text-center">ALL AVAILABLE PACKS INSTALLED</div>
        )}

        {browsePacks.map(pack => {
          const action = actions[pack.id] ?? 'idle';
          return (
            <div key={pack.id} className="p-2.5" style={{ border: '1px solid var(--sf-border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sf-heading font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {pack.name}
                    </span>
                    {pack.stars > 0 && (
                      <span className="text-[9px] opacity-40">★ {pack.stars}</span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-40">{pack.publisher}</div>
                  <div className="text-[10px] opacity-50 mt-0.5 line-clamp-2">{pack.description}</div>
                </div>
                <button style={btnStyle(true)} disabled={action !== 'idle'} onClick={() => handleInstall(pack.id)}>
                  {action === 'installing' ? '···' : 'INSTALL'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
