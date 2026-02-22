'use client';

import { useState, useEffect } from 'react';
import { getClientCapabilities, type ClientCapabilities, type ClientId } from './clients';

const DEFAULT = { clientId: 'unknown' as ClientId, client: getClientCapabilities(null) };

/**
 * Read the `?client=` query parameter from the current URL.
 * Returns the client capabilities for the identified client.
 *
 * Uses useEffect to avoid SSR hydration mismatch — server always
 * renders as 'unknown', client updates after mount.
 */
export function useClient(): { clientId: ClientId; client: ClientCapabilities } {
  const [result, setResult] = useState(DEFAULT);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('client');
    if (raw) {
      const client = getClientCapabilities(raw);
      setResult({ clientId: client.id, client });
    }
  }, []);

  return result;
}
