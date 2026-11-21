import React from 'react';
import Link from 'next/link';
import { BrandIcon } from '@/components/ui/brand-icon';
import { LandingContent } from '@/content/landing-content';

interface MarketingFooterProps {
  footer: LandingContent['footer'];
  brandTitle: string;
}

export function MarketingFooter({ footer, brandTitle }: MarketingFooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandIcon className="w-7 h-7 rounded-md" />
              <span className="font-bold text-slate-900 text-sm">{brandTitle}</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {footer.tagline}
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{footer.status}</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              {footer.productHeading}
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/chat" className="hover:text-blue-600 transition-colors">
                  {footer.navAssistant}
                </Link>
              </li>
              <li>
                <Link href="/admin/documents" className="hover:text-blue-600 transition-colors">
                  {footer.navDocuments}
                </Link>
              </li>
              <li>
                <Link href="/admin/billing" className="hover:text-blue-600 transition-colors">
                  {footer.navBilling}
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-blue-600 transition-colors">
                  {footer.navAnalytics}
                </Link>
              </li>
            </ul>
          </div>

          {/* Dedicated Legal & Docs Links */}
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              {footer.legalHeading}
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="hover:text-blue-600 transition-colors">
                  {footer.userGuide}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-blue-600 transition-colors">
                  {footer.terms}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-blue-600 transition-colors">
                  {footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-blue-600 transition-colors">
                  {footer.cookies}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div>
            © {new Date().getFullYear()} {brandTitle}. {footer.rights}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-slate-600 transition-colors">
              {footer.privacy}
            </Link>
            <span>·</span>
            <Link href="/legal/terms" className="hover:text-slate-600 transition-colors">
              {footer.terms}
            </Link>
            <span>·</span>
            <Link href="/legal/cookies" className="hover:text-slate-600 transition-colors">
              {footer.cookies}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
