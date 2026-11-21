import React from 'react';
import { getServerLanguage } from '@/i18n/server';
import { LANDING_CONTENT } from '@/content/landing-content';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const content = LANDING_CONTENT[lang] || LANDING_CONTENT.en;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <MarketingHeader nav={content.nav} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <MarketingFooter footer={content.footer} brandTitle={content.nav.title} />
    </div>
  );
}
