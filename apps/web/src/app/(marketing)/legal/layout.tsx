import React from 'react';
import Link from 'next/link';
import { Scale, Lock, Cookie, BookOpen, AlertTriangle } from 'lucide-react';
import { getServerLanguage } from '@/i18n/server';
import { getTranslations } from '@/i18n/translations';

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const t = getTranslations(lang);

  const navLinks = [
    { href: '/legal/privacy', label: t.docsTabPrivacy, icon: Lock },
    { href: '/legal/terms', label: t.docsTabTerms, icon: Scale },
    { href: '/legal/cookies', label: t.docsTabCookies, icon: Cookie },
    { href: '/docs', label: t.docsTabGuide, icon: BookOpen },
  ];

  return (
    <div className="py-12 md:py-16 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation tabs */}
        <nav
          aria-label="Legal documents"
          className="flex flex-wrap items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content body */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          {children}

          {/* Legal Disclaimer Box */}
          <div className="mt-12 pt-6 border-t border-slate-200/80">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Legal Notice & Disclaimer:</span>
                <p className="leading-relaxed text-amber-900/90">{t.docsLegalDisclaimer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
