'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { registerAuthTokenProvider } from '@/lib/api-client';

/**
 * Bridges active Clerk sessions into api-client.ts so authenticated API calls
 * automatically send real Clerk JWT Bearer tokens when Clerk is configured.
 */
export function ClerkAuthBridge() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    registerAuthTokenProvider(() => getToken());
    return () => {
      registerAuthTokenProvider(null);
    };
  }, [getToken, isLoaded]);

  return null;
}
