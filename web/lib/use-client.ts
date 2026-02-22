'use client';

import { useMemo } from 'react';
import { getClientCapabilities, type ClientCapabilities, type ClientId } from './clients';

/**
 * Read the `?client=` query parameter from the current URL.
 * Returns the client capabilities for the identified client.
 *
 * Usage: when Claude Code opens the dashboard, it passes `?client=claude-code`.
 * When OpenCode opens it, it passes `?client=opencode`.
 * If no param is present, returns 'unknown' (all events shown as supported).
 */
export function useClient(): { clientId: ClientId; client: ClientCapabilities } {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { clientId: 'unknown' as ClientId, client: getClientCapabilities(null) };
    }
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('client');
    const client = getClientCapabilities(raw);
    return { clientId: client.id, client };
  }, []);
}
