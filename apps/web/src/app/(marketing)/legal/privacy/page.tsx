import React from 'react';
import type { Metadata } from 'next';
import { Lock, ShieldCheck, Database, Key } from 'lucide-react';
import { getServerLanguage } from '@/i18n/server';
import { DOCS_DATA } from '@/data/docs-data';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'VeriKnow enterprise data privacy policy: zero model training on customer data, automated PII redaction, and strict tenant isolation.',
};

export default async function PrivacyPage() {
  const lang = await getServerLanguage();
  const privacyData = DOCS_DATA[lang]?.privacy || DOCS_DATA.en.privacy;

  return (
    <article className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-slate-100 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Lock className="w-4 h-4" />
          <span>VeriKnow Compliance & Trust</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {privacyData.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Last Updated: November 21, 2026 · Effective Immediately
        </p>
      </div>

      {/* Trust Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Zero Model Training</span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed">
            Customer queries and uploaded files are never used to train foundation models.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>Automated PII Redaction</span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed">
            AWS keys, passwords, and employee PII are masked before indexing.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Data-Access Scoping</span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed">
            Strict organization-ID partitioning on every query, vector, and cache.
          </p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6 pt-2">
        {privacyData.sections.map((section, idx) => (
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
      </div>

      {/* Contact Note */}
      <div className="pt-6 border-t border-slate-100 text-xs text-slate-500">
        Questions regarding data protection or enterprise GDPR / SOC 2 compliance? Email our data privacy team at{' '}
        <a
          href="mailto:privacy@veriknow.example"
          className="font-medium text-blue-600 hover:underline"
        >
          privacy@veriknow.example
        </a>
        .
      </div>
    </article>
  );
}
