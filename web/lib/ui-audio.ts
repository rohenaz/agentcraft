'use client';

type SoundName = 'click' | 'hover' | 'error' | 'pageChange' | 'toggle';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer | null>();
let currentTheme = 'off';
let lastHoveredEl: Element | null = null;
let cleanupListeners: (() => void) | null = null;

// Custom slot paths: e.g. { click: 'ui/sc-bigbox/set1-select.mp3', hover: 'ui/sc-bigbox/set3-move.mp3' }
let customSlots: Partial<Record<SoundName, string>> = {};

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url) ?? null;
  bufferCache.set(url, null); // placeholder so concurrent calls don't double-fetch
  try {
    const res = await fetch(url + '?v=' + Date.now()); // cache-bust
    if (!res.ok) return null;
    const buf = await getCtx().decodeAudioData(await res.arrayBuffer());
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

function urlFor(name: SoundName): string | null {
  if (currentTheme === 'off') return null;
  const custom = customSlots[name];
  if (!custom && (name === 'pageChange' || name === 'toggle')) return null; // no defaults — must be explicitly set
  const rel = custom ?? `ui/${currentTheme}/${name}.mp3`;
  return `/api/audio/${rel}`;
}

export async function setUITheme(
  theme: string,
  uiSounds?: Partial<Record<SoundName, string>>
): Promise<void> {
  currentTheme = theme;
  customSlots = uiSounds ?? {};
  if (theme === 'off') return;

  const names: SoundName[] = ['click', 'hover', 'error', 'pageChange', 'toggle'];
  await Promise.all(
    names.map((name) => {
      const url = urlFor(name);
      if (!url) return;
      bufferCache.delete(url); // force reload
      return loadBuffer(url);
    })
  );
}

export function playUISound(name: SoundName, volume = 0.3): void {
  if (currentTheme === 'off') return;
  const url = urlFor(name);
  if (!url) return;
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

/** Preview any sound by path immediately in the browser (bypasses theme) */
export async function previewUISound(relativePath: string, volume = 0.5): Promise<void> {
  const url = `/api/audio/${relativePath}`;
  bufferCache.delete(url);
  const buf = await loadBuffer(url);
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

  function handleClick(e: MouseEvent) {
    const target = e.target as Element;
    if (target.closest('[data-no-ui-sound]')) return;
    const el = target.closest('button, [role="button"], [data-sf-hover]');
    if (el && !el.hasAttribute('data-no-ui-sound')) {
      playUISound('click');
    }
  }

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
