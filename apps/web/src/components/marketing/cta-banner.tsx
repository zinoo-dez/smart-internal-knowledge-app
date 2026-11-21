import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface CtaBannerProps {
  bottomCta: LandingContent['bottomCta'];
}

export function CtaBanner({ bottomCta }: CtaBannerProps) {
  return (
    <section className="py-16 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
          {bottomCta.title}
        </h2>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
          {bottomCta.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/chat"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm transition-all min-h-[44px]"
          >
            <span>{bottomCta.ctaLaunch}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 border border-slate-700 transition-colors min-h-[44px]"
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>{bottomCta.ctaDocs}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
