import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/context/language-context';
import { getServerLanguage } from '@/i18n/server';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: {
    default: 'VeriKnow — Citation-Verified Knowledge Assistant',
    template: '%s · VeriKnow',
  },
  description:
    'Multi-tenant enterprise documentation & RAG assistant with strict source grounding, hybrid search, and verifiable citations.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'VeriKnow — Citation-Verified Knowledge Assistant',
    description:
      'Multi-tenant internal documentation & Slack/Notion/Drive assistant with clickable citations and strict tenant isolation.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLang = await getServerLanguage();

  return (
    <html lang={initialLang}>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <LanguageProvider initialLanguage={initialLang}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
