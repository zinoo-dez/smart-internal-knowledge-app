import React from 'react';
import type { Metadata } from 'next';
import { Cookie } from 'lucide-react';
import { getServerLanguage } from '@/i18n/server';
import { DOCS_DATA } from '@/data/docs-data';

export const metadata: Metadata = {
  title: 'Cookies & Storage Policy',
  description:
    'VeriKnow cookies and local storage policy: strictly necessary authentication cookies and UI preference storage.',
};

export default async function CookiesPage() {
  const lang = await getServerLanguage();
  const cookiesData = DOCS_DATA[lang]?.cookies || DOCS_DATA.en.cookies;

  return (
    <article className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-slate-100 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Cookie className="w-4 h-4" />
          <span>VeriKnow Privacy & Transparency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {cookiesData.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Last Updated: November 21, 2026 · Effective Immediately
        </p>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        {cookiesData.description}
      </p>

      {/* Storage Items Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Key / Identifier</th>
                <th className="py-3 px-4">Storage Type</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {cookiesData.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                    {item.key}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {item.type}
                  </td>
                  <td className="py-3 px-4 leading-relaxed">
                    {item.purpose}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {item.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 text-xs text-slate-500">
        You may clear cookies and local storage keys at any time via your browser settings. For questions, email{' '}
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
