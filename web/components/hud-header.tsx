'use client';

interface HudHeaderProps {
  enabled: boolean;
  onToggle: () => void;
  uiTheme: 'sc2' | 'wc3' | 'off';
  onUiThemeChange: (theme: 'sc2' | 'wc3' | 'off') => void;
  onConfigureUISounds: () => void;
}

const UI_THEMES: { value: 'sc2' | 'wc3' | 'off'; label: string }[] = [
  { value: 'sc2', label: 'SC2' },
  { value: 'wc3', label: 'WC3' },
  { value: 'off', label: 'OFF' },
];

export function HudHeader({ enabled, onToggle, uiTheme, onUiThemeChange, onConfigureUISounds }: HudHeaderProps) {
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
        {/* UI sound theme picker */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] tracking-widest uppercase opacity-40 mr-1">UI SFX</span>
          {UI_THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => onUiThemeChange(t.value)}
              className="px-2 py-0.5 text-[10px] sf-heading font-medium uppercase tracking-wider transition-all"
              style={{
                border: `1px solid ${uiTheme === t.value ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                color: uiTheme === t.value ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.35)',
                backgroundColor: uiTheme === t.value ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            data-sf-hover
            onClick={onConfigureUISounds}
            title="Configure UI sound assignments"
            className="px-2 py-0.5 text-[10px] sf-heading font-medium uppercase tracking-wider transition-all ml-1"
            style={{
              border: '1px solid var(--sf-border)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            ⚙
          </button>
        </div>

        <div className="h-4 w-px opacity-20" style={{ backgroundColor: 'var(--sf-cyan)' }} />

        {/* Master enable/disable */}
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
