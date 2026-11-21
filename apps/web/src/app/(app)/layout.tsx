import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { AppShell } from '@/components/layout/app-shell';
import { ClerkAuthBridge } from '@/components/auth/clerk-auth-bridge';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
  Boolean(clerkPublishableKey) &&
  !clerkPublishableKey?.includes('...') &&
  (clerkPublishableKey?.startsWith('pk_live_') || clerkPublishableKey?.startsWith('pk_test_'));

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isClerkEnabled) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ClerkAuthBridge />
        <AppShell>{children}</AppShell>
      </ClerkProvider>
    );
  }

  return <AppShell>{children}</AppShell>;
}
