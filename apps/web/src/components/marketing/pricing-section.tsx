import React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface PricingSectionProps {
  pricing: LandingContent['pricing'];
}

export function PricingSection({ pricing }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-slate-50/60 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {pricing.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {pricing.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricing.tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-8 border transition-all flex flex-col justify-between relative ${
                tier.popular
                  ? 'bg-white border-blue-500 shadow-xl ring-2 ring-blue-500/10'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold tracking-wide uppercase shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                </div>
                <p className="text-xs text-slate-500 min-h-[32px] mb-6 leading-relaxed">
                  {tier.description}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{tier.period}</span>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100 mb-8">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={tier.ctaHref}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-center transition-colors shadow-sm block ${
                  tier.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tier.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
