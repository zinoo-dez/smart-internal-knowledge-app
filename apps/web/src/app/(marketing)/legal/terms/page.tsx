import React from 'react';
import type { Metadata } from 'next';
import { Scale } from 'lucide-react';
import { getServerLanguage } from '@/i18n/server';
import { DOCS_DATA } from '@/data/docs-data';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'VeriKnow enterprise terms and conditions of service: permitted business use, role-based access control, AI grounding, and fair-use quotas.',
};

export default async function TermsPage() {
  const lang = await getServerLanguage();
  const termsData = DOCS_DATA[lang]?.terms || DOCS_DATA.en.terms;

  return (
    <article className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-slate-100 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          <span>VeriKnow Service Terms</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {termsData.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Last Updated: November 21, 2026 · Effective Immediately
        </p>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6 pt-2">
        {termsData.sections.map((section, idx) => (
          <section key={idx} className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {section.title}
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {section.content.map((paragraph, pIdx) => (
                <p key={pIdx}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Enterprise Quota Fair-Use Note */}
        <section className="space-y-2 pt-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            5. Enterprise Subscription Tiers & Fair-Use Policy
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Enterprise subscriptions include monthly query allocations (up to 10,000 queries per month under standard fair-use terms) and up to 10,000 indexed documents. Custom query volumes, dedicated infrastructure pools, and Bring-Your-Own-Key (BYOK) configurations are subject to an Enterprise Addendum.
            </p>
            <p>
              Automated scraping or unmetered script-driven continuous querying outside designated MCP connectors or API limits is prohibited to ensure optimal latency and platform availability for all users.
            </p>
          </div>
        </section>
      </div>

      {/* Contact Note */}
      <div className="pt-6 border-t border-slate-100 text-xs text-slate-500">
        For enterprise contracts, service level agreements (SLAs), or customized commercial terms, contact{' '}
        <a
          href="mailto:legal@veriknow.example"
          className="font-medium text-blue-600 hover:underline"
        >
          legal@veriknow.example
        </a>
        .
      </div>
    </article>
  );
}
