import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { BrandIcon } from '@/components/ui/brand-icon';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { MobileNav } from '@/components/marketing/mobile-nav';
import { LandingContent } from '@/content/landing-content';

interface MarketingHeaderProps {
  nav: LandingContent['nav'];
}

export function MarketingHeader({ nav }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <BrandIcon className="w-9 h-9 shadow-sm group-hover:brightness-110 transition-all" />
          <div>
            <span className="font-bold text-slate-900 text-base tracking-tight block leading-tight">
              {nav.title}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              {nav.subtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">
            {nav.features}
          </a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">
            {nav.architecture}
          </a>
          <a href="#use-cases" className="hover:text-blue-600 transition-colors">
            {nav.useCases}
          </a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">
            {nav.pricing}
          </a>
          <Link href="/docs" className="hover:text-blue-600 transition-colors">
            {nav.docs}
          </Link>
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher compact />
          <Link
            href="/admin/documents"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 min-h-[36px] flex items-center"
          >
            {nav.admin}
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{nav.launch}</span>
          </Link>
        </div>

        {/* Mobile Actions & Menu */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher compact />
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  );
}
