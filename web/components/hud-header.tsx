'use client';

import { useState } from 'react';
import type { UITheme } from '@/lib/types';

interface HudHeaderProps {
  enabled: boolean;
  onToggle: () => void;
  uiTheme: UITheme;
  onUiThemeChange: (theme: UITheme) => void;
  onConfigureUISounds: () => void;
  masterVolume: number;
  onVolumeChange: (v: number) => void;
}

const UI_THEMES: { value: UITheme; label: string }[] = [
  { value: 'sc2', label: 'SC2' },
  { value: 'wc3', label: 'WC3' },
  { value: 'ff7', label: 'FF7' },
  { value: 'ff9', label: 'FF9' },
  { value: 'off', label: 'OFF' },
];

export function HudHeader({ enabled, onToggle, uiTheme, onUiThemeChange, onConfigureUISounds, masterVolume, onVolumeChange }: HudHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const activeLabel = UI_THEMES.find((t) => t.value === uiTheme)?.label ?? uiTheme.toUpperCase();

  return (
    <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-panel)' }}>
      <div className="flex items-center gap-4">
        <h1 className="sf-logo text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--sf-cyan)' }}>
          AGENTCRAFT
        </h1>
        <span className="text-xs opacity-40" style={{ color: 'var(--sf-cyan)' }}>v0.0.3</span>
        <div className="h-4 w-px opacity-20" style={{ backgroundColor: 'var(--sf-cyan)' }} />
        <span className="text-xs opacity-60">AUDIO ASSIGNMENT TERMINAL</span>
      </div>

      <div className="flex items-center gap-4">
        {/* UI sound theme dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase opacity-40">UI SFX</span>

          <div className="relative">
            {/* Click-away overlay */}
            {showDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            )}

            {/* Trigger */}
            <button
              data-sf-hover
              data-no-ui-sound
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-0.5 text-[10px] sf-heading font-medium uppercase tracking-wider transition-all"
              style={{
                position: 'relative',
                zIndex: 11,
                border: `1px solid ${showDropdown ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                color: uiTheme === 'off' ? 'rgba(255,255,255,0.3)' : 'var(--sf-cyan)',
                backgroundColor: showDropdown ? 'rgba(0,229,255,0.08)' : 'transparent',
                minWidth: '3.5rem',
              }}
            >
              <span>{activeLabel}</span>
              <span style={{ opacity: 0.5 }}>{showDropdown ? '▴' : '▾'}</span>
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div
                className="absolute right-0 top-full mt-1"
                style={{
                  zIndex: 20,
                  border: '1px solid var(--sf-border)',
                  backgroundColor: 'var(--sf-panel)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                  minWidth: '5rem',
                }}
              >
                {UI_THEMES.map((t, i) => (
                  <button
                    key={t.value}
                    data-sf-hover
                    onClick={() => {
                      onUiThemeChange(t.value);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[10px] sf-heading font-medium uppercase tracking-wider transition-all"
                    style={{
                      color: uiTheme === t.value ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.5)',
                      backgroundColor: uiTheme === t.value ? 'rgba(0,229,255,0.08)' : 'transparent',
                      borderBottom: i < UI_THEMES.length - 1 ? '1px solid var(--sf-border)' : 'none',
                    }}
                  >
                    <span style={{ opacity: uiTheme === t.value ? 1 : 0 }}>▸</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configure gear */}
          <button
            data-sf-hover
            onClick={onConfigureUISounds}
            title="Configure UI sound assignments"
            className="px-2 py-0.5 text-[10px] sf-heading font-medium transition-all"
            style={{
              border: '1px solid var(--sf-border)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            ⚙
          </button>
        </div>

        <div className="h-4 w-px opacity-20" style={{ backgroundColor: 'var(--sf-cyan)' }} />

        {/* Master volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] tracking-widest uppercase opacity-40">VOL</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(masterVolume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            data-no-ui-sound
            className="w-16"
            style={{ cursor: 'pointer', accentColor: 'var(--sf-cyan)', verticalAlign: 'middle' }}
          />
          <span className="text-[10px] w-7 text-right tabular-nums" style={{ color: 'var(--sf-cyan)', opacity: 0.7 }}>
            {Math.round(masterVolume * 100)}%
          </span>
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
