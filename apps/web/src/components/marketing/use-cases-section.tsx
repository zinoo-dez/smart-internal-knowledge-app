import React from 'react';
import {
  Terminal,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  FileText,
  CornerDownRight,
} from 'lucide-react';
import { LandingContent, UseCaseItem } from '@/content/landing-content';

interface UseCasesSectionProps {
  useCases: LandingContent['useCases'];
}

const USE_CASE_ICONS = [Terminal, BookOpen, ShieldCheck];

export function UseCasesSection({ useCases }: UseCasesSectionProps) {
  return (
    <section id="use-cases" className="py-20 bg-white border-t border-slate-200 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {useCases.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {useCases.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.items.map((item: UseCaseItem, idx: number) => {
            const Icon = USE_CASE_ICONS[idx % USE_CASE_ICONS.length] || FileText;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all space-y-6"
              >
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold tracking-wide uppercase">
                      {item.tag}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>

                  {/* Sample Query & Citation Box */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs shadow-2xs">
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="italic">"{item.query}"</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-blue-700">
                      <FileText className="w-3 h-3 text-blue-500" />
                      <span className="font-semibold">{item.citation}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Key Benefits */}
                <div className="space-y-2.5 pt-4 border-t border-slate-200/70">
                  {item.benefits.map((benefit, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
