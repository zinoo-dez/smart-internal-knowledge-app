import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen, Bot } from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface HeroSectionProps {
  hero: LandingContent['hero'];
  mockup: LandingContent['mockup'];
}

export function HeroSection({ hero, mockup }: HeroSectionProps) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{hero.badge}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight md:leading-tight mb-6">
            {hero.title}{' '}
            <span className="text-blue-600 underline decoration-blue-200 decoration-wavy underline-offset-4">
              {hero.highlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            {hero.subtitle}
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <Link
              href="/chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all min-h-[44px]"
            >
              <span>{hero.ctaLaunch}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[44px]"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>{hero.ctaDocs}</span>
            </Link>
          </div>
        </div>

        {/* Live Assistant Showcase Preview Card */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5" aria-hidden="true">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
              </div>
              <span className="ml-2 font-medium text-slate-600 font-mono text-[11px]">
                {mockup.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                {mockup.confidence}
              </span>
            </div>
          </div>

          {/* Chat Body Mockup */}
          <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
            {/* User Question */}
            <div className="flex justify-end items-start gap-2.5">
              <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-none max-w-lg shadow-sm font-medium">
                {mockup.query}
              </div>
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
                U
              </div>
            </div>

            {/* Assistant Answer */}
            <div className="flex justify-start items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 text-slate-800 text-sm p-4 rounded-2xl rounded-tl-none max-w-xl shadow-sm space-y-3">
                <p className="leading-relaxed">
                  {mockup.answer.replace(' [1]', '')}{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                    {mockup.sourceNum}
                  </span>
                </p>

                {/* Cited Sources Drawer */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-blue-600" />
                    <span>{mockup.citedSourcesLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100">
                      <span className="font-semibold">{mockup.sourceNum}</span>
                      <span>{mockup.sourceTitle}</span>
                      <span className="text-[10px] text-blue-500 font-mono">{mockup.sourcePage}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Input Preview */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 px-4">
            <span className="truncate">{mockup.inputPlaceholder}</span>
            <Link
              href="/chat"
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
            >
              {mockup.launchButton}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
