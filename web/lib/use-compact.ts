'use client';

import { useSyncExternalStore } from 'react';

const COMPACT_BREAKPOINT = 768;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.innerWidth < COMPACT_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

export function useCompact() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
