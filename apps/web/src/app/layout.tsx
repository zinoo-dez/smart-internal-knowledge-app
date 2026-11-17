import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { LanguageProvider } from '@/context/language-context';

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
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
