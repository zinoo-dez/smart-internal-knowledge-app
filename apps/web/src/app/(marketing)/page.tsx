import React from 'react';
import type { Metadata } from 'next';
import { getServerLanguage } from '@/i18n/server';
import { LANDING_CONTENT } from '@/content/landing-content';
import { HeroSection } from '@/components/marketing/hero-section';
import { MetricsStrip } from '@/components/marketing/metrics-strip';
import { FeaturesSection } from '@/components/marketing/features-section';
import { ArchitectureSection } from '@/components/marketing/architecture-section';
import { UseCasesSection } from '@/components/marketing/use-cases-section';
import { PricingSection } from '@/components/marketing/pricing-section';
import { CtaBanner } from '@/components/marketing/cta-banner';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLanguage();
  const c = LANDING_CONTENT[lang] || LANDING_CONTENT.en;
  return {
    title: `${c.nav.title} — ${c.nav.subtitle}`,
    description: c.hero.subtitle,
  };
}

export default async function HomePage() {
  const lang = await getServerLanguage();
  const content = LANDING_CONTENT[lang] || LANDING_CONTENT.en;

  return (
    <>
      <HeroSection hero={content.hero} mockup={content.mockup} />
      <MetricsStrip metrics={content.metrics} />
      <FeaturesSection features={content.features} />
      <ArchitectureSection architecture={content.architecture} />
      <UseCasesSection useCases={content.useCases} />
      <PricingSection pricing={content.pricing} />
      <CtaBanner bottomCta={content.bottomCta} />
    </>
  );
}
