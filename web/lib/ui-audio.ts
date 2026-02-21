'use client';

type SoundName = 'click' | 'hover' | 'error';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer | null>();
let currentTheme = 'off';
let lastHoveredEl: Element | null = null;
let cleanupListeners: (() => void) | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url) ?? null;
  bufferCache.set(url, null);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await getCtx().decodeAudioData(await res.arrayBuffer());
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function setUITheme(theme: string): Promise<void> {
  currentTheme = theme;
  if (theme === 'off') return;
  // Clear stale null entries so retry works after theme switch
  bufferCache.delete(`/api/audio/ui/${theme}/click.mp3`);
  bufferCache.delete(`/api/audio/ui/${theme}/hover.mp3`);
  await Promise.all([
    loadBuffer(`/api/audio/ui/${theme}/click.mp3`),
    loadBuffer(`/api/audio/ui/${theme}/hover.mp3`),
  ]);
}

export function playUISound(name: SoundName, volume = 0.3): void {
  if (currentTheme === 'off') return;
  const url = `/api/audio/ui/${currentTheme}/${name}.mp3`;
  const buf = bufferCache.get(url);
  if (!buf) return;

  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function initGlobalUIListeners(): () => void {
  if (cleanupListeners) cleanupListeners();

  // Click: fire on buttons and data-sf-hover elements, SKIP data-no-ui-sound
  function handleClick(e: MouseEvent) {
    const target = e.target as Element;
    if (target.closest('[data-no-ui-sound]')) return;
    const el = target.closest('button, [role="button"], [data-sf-hover]');
    if (el && !el.hasAttribute('data-no-ui-sound')) {
      playUISound('click');
    }
  }

  // Hover: only fire on elements marked with data-sf-hover (container-level)
  function handleMouseover(e: MouseEvent) {
    const el = (e.target as Element).closest('[data-sf-hover]');
    if (el && el !== lastHoveredEl) {
      lastHoveredEl = el;
      playUISound('hover', 0.2);
    }
    if (!el) lastHoveredEl = null;
  }

  document.addEventListener('click', handleClick, { passive: true });
  document.addEventListener('mouseover', handleMouseover, { passive: true });

  cleanupListeners = () => {
    document.removeEventListener('click', handleClick);
    document.removeEventListener('mouseover', handleMouseover);
    cleanupListeners = null;
  };

  return cleanupListeners;
}
