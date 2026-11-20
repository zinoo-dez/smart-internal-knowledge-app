import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { ClerkAuthBridge } from '@/components/auth/clerk-auth-bridge';
import { LanguageProvider } from '@/context/language-context';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
  Boolean(clerkPublishableKey) &&
  !clerkPublishableKey?.includes('...') &&
  (clerkPublishableKey?.startsWith('pk_live_') || clerkPublishableKey?.startsWith('pk_test_'));

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Smart Internal Knowledge Assistant',
  description: 'Multi-tenant enterprise documentation & RAG assistant with verifiable citations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <LanguageProvider>
          {isClerkEnabled ? (
            <ClerkProvider publishableKey={clerkPublishableKey}>
              <ClerkAuthBridge />
              <AppShell>{children}</AppShell>
            </ClerkProvider>
          ) : (
            <AppShell>{children}</AppShell>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
