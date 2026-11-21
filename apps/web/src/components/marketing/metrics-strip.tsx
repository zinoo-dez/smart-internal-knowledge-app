import React from 'react';
import { LandingContent } from '@/content/landing-content';

interface MetricsStripProps {
  metrics: LandingContent['metrics'];
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  return (
    <section className="border-y border-slate-200 bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {metrics.map((metric, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tracking-tight mb-1">
                {metric.value}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                {metric.label}
              </div>
              <div className="text-[11px] text-slate-500">
                {metric.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
