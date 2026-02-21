'use client';

interface HudHeaderProps {
  enabled: boolean;
  onToggle: () => void;
}

export function HudHeader({ enabled, onToggle }: HudHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
      <div className="flex items-center gap-4">
        <h1 className="sf-heading text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--sf-cyan)' }}>
          AGENTCRAFT
        </h1>
        <span className="text-xs opacity-40" style={{ color: 'var(--sf-cyan)' }}>v0.0.1</span>
        <div className="h-4 w-px opacity-20" style={{ backgroundColor: 'var(--sf-cyan)' }} />
        <span className="text-xs opacity-60">AUDIO ASSIGNMENT TERMINAL</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-1 text-xs sf-heading font-semibold uppercase tracking-wider transition-all"
          style={{
            border: `1px solid ${enabled ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.2)'}`,
            color: enabled ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.4)',
            backgroundColor: enabled ? 'rgba(0,229,255,0.08)' : 'transparent',
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: enabled ? 'var(--sf-green)' : 'rgba(255,255,255,0.2)' }} />
          {enabled ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>
    </header>
  );
}
