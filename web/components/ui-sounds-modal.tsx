'use client';

import { useState, useEffect, useCallback } from 'react';
import { previewUISound } from '@/lib/ui-audio';
import type { UITheme, UISlotMap } from '@/lib/types';

interface UISound {
  path: string;
  filename: string;
  group: string;
}

type SlotName = 'click' | 'hover' | 'error' | 'pageChange';

const SLOTS: { name: SlotName; label: string; desc: string }[] = [
  { name: 'hover', label: 'HOVER', desc: 'Mouse over interactive element' },
  { name: 'click', label: 'CLICK', desc: 'Button or card clicked' },
  { name: 'error', label: 'ERROR', desc: 'Action failed or invalid' },
  { name: 'pageChange', label: 'PAGE CHANGE', desc: 'Tab / group navigation' },
];

interface Props {
  uiTheme: UITheme;
  uiSounds: Record<string, UISlotMap>;
  onSave: (theme: UITheme, sounds: Record<string, UISlotMap>) => void;
  onClose: () => void;
}

export function UISoundsModal({ uiTheme, uiSounds, onSave, onClose }: Props) {
  const [sounds, setSounds] = useState<UISound[]>([]);
  const [activeTheme, setActiveTheme] = useState<UITheme>(uiTheme === 'off' ? 'sc2' : uiTheme);
  const [slots, setSlots] = useState<UISlotMap>(uiSounds[uiTheme === 'off' ? 'sc2' : uiTheme] ?? {});
  const [activeSlot, setActiveSlot] = useState<SlotName>('hover');
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ui-sounds').then((r) => r.json()).then(setSounds).catch(console.error);
  }, []);

  // When theme changes, load existing slot config for that theme
  const switchTheme = useCallback((theme: UITheme) => {
    setActiveTheme(theme);
    setSlots(uiSounds[theme] ?? {});
  }, [uiSounds]);

  const handlePreview = useCallback(async (path: string) => {
    setPlaying(path);
    await previewUISound(path, 0.5);
    setTimeout(() => setPlaying((p) => p === path ? null : p), 800);
  }, []);

  const assignSound = useCallback((path: string) => {
    setSlots((prev) => ({ ...prev, [activeSlot]: path }));
    handlePreview(path);
  }, [activeSlot, handlePreview]);

  const clearSlot = useCallback((slot: SlotName) => {
    setSlots((prev) => { const next = { ...prev }; delete next[slot]; return next; });
  }, []);

  const handleSave = useCallback(() => {
    const nextSounds = { ...uiSounds, [activeTheme]: slots };
    onSave(activeTheme, nextSounds);
    onClose();
  }, [uiSounds, activeTheme, slots, onSave, onClose]);

  // Group sounds by their group
  const grouped = sounds.reduce<Record<string, UISound[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  const formatName = (filename: string) =>
    filename.replace(/\.(mp3|wav|ogg|m4a)$/i, '').replace(/-/g, ' ').replace(/_/g, ' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col"
        style={{
          width: 680,
          maxHeight: '85vh',
          backgroundColor: 'var(--sf-panel)',
          border: '1px solid var(--sf-cyan)',
          boxShadow: '0 0 40px rgba(0,229,255,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--sf-border)' }}
        >
          <span className="sf-heading text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--sf-cyan)' }}>
            UI SFX CONFIGURATOR
          </span>
          <button
            onClick={onClose}
            data-no-ui-sound
            className="text-xs opacity-40 hover:opacity-100 transition-opacity px-2 py-1"
            style={{ color: 'var(--sf-cyan)' }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Theme selector */}
        <div className="flex items-center gap-2 px-5 py-2 shrink-0" style={{ borderBottom: '1px solid var(--sf-border)' }}>
          <span className="text-[10px] tracking-widest uppercase opacity-40">THEME</span>
          {(['sc2', 'wc3', 'ff7', 'ff9'] as const).map((t) => (
            <button
              key={t}
              data-sf-hover
              onClick={() => switchTheme(t)}
              className="px-3 py-0.5 text-[10px] sf-heading font-semibold uppercase tracking-wider transition-all"
              style={{
                border: `1px solid ${activeTheme === t ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                color: activeTheme === t ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.35)',
                backgroundColor: activeTheme === t ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
          <span className="text-[10px] opacity-30 ml-2">
            Click a slot on the left, then pick a sound on the right to assign.
          </span>
        </div>

        {/* Body: 2-col */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: slots */}
          <div className="flex flex-col gap-0 shrink-0" style={{ width: 240, borderRight: '1px solid var(--sf-border)' }}>
            <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest opacity-40">
              EVENT SLOTS
            </div>
            {SLOTS.map(({ name, label, desc }) => {
              const assigned = slots[name];
              const isActive = activeSlot === name;
              return (
                <div
                  key={name}
                  data-sf-hover
                  onClick={() => setActiveSlot(name)}
                  className="flex flex-col gap-1 px-4 py-3 cursor-pointer transition-all"
                  style={{
                    borderLeft: `3px solid ${isActive ? 'var(--sf-cyan)' : 'transparent'}`,
                    backgroundColor: isActive ? 'rgba(0,229,255,0.06)' : 'transparent',
                    borderBottom: '1px solid var(--sf-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] sf-heading font-semibold tracking-wider"
                      style={{ color: isActive ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.7)' }}
                    >
                      {label}
                    </span>
                    <div className="flex items-center gap-1">
                      {assigned && (
                        <>
                          <button
                            data-no-ui-sound
                            onClick={(e) => { e.stopPropagation(); handlePreview(assigned); }}
                            className="text-[9px] px-1.5 py-0.5 transition-all"
                            style={{
                              border: '1px solid rgba(0,229,255,0.4)',
                              color: playing === assigned ? 'var(--sf-cyan)' : 'rgba(0,229,255,0.6)',
                            }}
                          >
                            ▶
                          </button>
                          <button
                            data-no-ui-sound
                            onClick={(e) => { e.stopPropagation(); clearSlot(name); }}
                            className="text-[9px] px-1.5 py-0.5 transition-all opacity-40 hover:opacity-100"
                            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] opacity-40">{desc}</span>
                  {assigned ? (
                    <span
                      className="text-[9px] truncate"
                      style={{ color: 'var(--sf-green)' }}
                      title={assigned}
                    >
                      {formatName(assigned.split('/').pop() ?? assigned)}
                    </span>
                  ) : (
                    <span className="text-[9px] opacity-25 italic">— unassigned (uses default) —</span>
                  )}
                </div>
              );
            })}

            {/* Default paths note */}
            <div className="px-4 pt-3 pb-2">
              <div className="text-[9px] opacity-25 leading-relaxed">
                Defaults: ui/{activeTheme}/hover.mp3<br />
                ui/{activeTheme}/click.mp3<br />
                ui/{activeTheme}/error.mp3
              </div>
            </div>
          </div>

          {/* Right: sound browser */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest opacity-40 shrink-0">
              AVAILABLE SOUNDS — click to preview & assign to{' '}
              <span style={{ color: 'var(--sf-cyan)' }}>{activeSlot.toUpperCase()}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {Object.entries(grouped).sort().map(([group, groupSounds]) => (
                <div key={group} className="mb-4">
                  <div
                    className="text-[9px] uppercase tracking-widest mb-2 px-1 py-0.5"
                    style={{ color: 'var(--sf-cyan)', opacity: 0.5, borderBottom: '1px solid var(--sf-border)' }}
                  >
                    {group.replace(/-/g, ' ')}
                  </div>
                  <div className="flex flex-col gap-1">
                    {groupSounds.map((s) => {
                      const isAssignedHere = Object.values(slots).includes(s.path);
                      const isPlaying = playing === s.path;
                      return (
                        <button
                          key={s.path}
                          data-no-ui-sound
                          onClick={() => assignSound(s.path)}
                          className="flex items-center gap-2 px-3 py-2 text-left transition-all"
                          style={{
                            border: `1px solid ${isAssignedHere ? 'var(--sf-green)' : isPlaying ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                            backgroundColor: isPlaying ? 'rgba(0,229,255,0.08)' : isAssignedHere ? 'rgba(0,255,136,0.06)' : 'transparent',
                            color: isPlaying ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          <span
                            className="text-[9px] shrink-0 px-1"
                            style={{ color: isPlaying ? 'var(--sf-cyan)' : 'rgba(0,229,255,0.5)' }}
                          >
                            {isPlaying ? '♪' : '▶'}
                          </span>
                          <span className="text-[11px] truncate">{formatName(s.filename)}</span>
                          {isAssignedHere && (
                            <span
                              className="ml-auto text-[9px] shrink-0"
                              style={{ color: 'var(--sf-green)' }}
                            >
                              {Object.entries(slots).find(([, v]) => v === s.path)?.[0].toUpperCase()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {sounds.length === 0 && (
                <div className="text-xs opacity-30 text-center py-8">LOADING...</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--sf-border)' }}
        >
          <button
            data-no-ui-sound
            onClick={onClose}
            className="px-4 py-1.5 text-xs sf-heading uppercase tracking-wider transition-all"
            style={{
              border: '1px solid var(--sf-border)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            CANCEL
          </button>
          <button
            data-sf-hover
            onClick={handleSave}
            className="px-5 py-1.5 text-xs sf-heading font-semibold uppercase tracking-wider transition-all"
            style={{
              border: '1px solid var(--sf-cyan)',
              color: 'var(--sf-cyan)',
              backgroundColor: 'rgba(0,229,255,0.1)',
              boxShadow: '0 0 10px rgba(0,229,255,0.15)',
            }}
          >
            SAVE CONFIG
          </button>
        </div>
      </div>
    </div>
  );
}
