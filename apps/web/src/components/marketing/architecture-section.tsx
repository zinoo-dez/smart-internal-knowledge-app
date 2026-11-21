import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface ArchitectureSectionProps {
  architecture: LandingContent['architecture'];
}

export function ArchitectureSection({ architecture }: ArchitectureSectionProps) {
  return (
    <section id="architecture" className="py-20 bg-white border-y border-slate-200 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {architecture.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {architecture.subtitle}
          </p>
        </div>

        {/* 4-Step Architecture Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          {architecture.steps.map((step, idx) => (
            <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-mono font-bold text-blue-600 mb-1">
                {step.step}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Privacy & Zero-Training Trust Banner */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold mb-2">
              {architecture.trustBadge}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5">
              {architecture.trustTitle}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {architecture.trustDescription}
            </p>
          </div>
          <Link
            href="/legal/privacy"
            className="px-4 py-2.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shrink-0 whitespace-nowrap shadow-sm"
          >
            {architecture.trustCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
