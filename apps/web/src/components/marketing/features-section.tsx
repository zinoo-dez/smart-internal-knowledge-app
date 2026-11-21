import React from 'react';
import {
  Layers,
  Network,
  ShieldCheck,
  Languages,
  Cpu,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface FeaturesSectionProps {
  features: LandingContent['features'];
}

const FEATURE_ICONS = [Layers, Network, ShieldCheck, Languages, Cpu, BarChart3];

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-20 md:py-28 bg-slate-50/60 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {features.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {features.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.items.map((feat, idx) => {
            const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length] || Layers;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {feat.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{feat.tag}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
