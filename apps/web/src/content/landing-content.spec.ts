import { describe, it, expect } from 'vitest';
import { LANDING_CONTENT } from './landing-content';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@knowledge/shared';

describe('Landing Page Content & Credibility Checks', () => {
  const en = LANDING_CONTENT.en;
  const my = LANDING_CONTENT.my;

  it('contains zero ungrounded/hyperbolic marketing claims in English copy', () => {
    const rawEn = JSON.stringify(en);

    // Should NOT contain banned hyperbolic marketing claims
    expect(rawEn).not.toMatch(/100%\s*Grounded/i);
    expect(rawEn).not.toMatch(/Zero\s*Hallucination/i);
    expect(rawEn).not.toMatch(/Zero\s*Data\s*Leak/i);
    expect(rawEn).not.toMatch(/Unlimited\s*monthly\s*queries/i);
    expect(rawEn).not.toMatch(/Unlimited\s*document\s*storage/i);

    // Should contain realistic enterprise credibility phrasing
    expect(rawEn).toMatch(/Citation-Verified/i);
    expect(rawEn).toMatch(/Strict Source Grounding/i);
    expect(rawEn).toMatch(/Tenant-Isolated/i);
    expect(rawEn).toMatch(/Sub-Second on Cache Hits/i);
  });

  it('contains 3 concrete real-world enterprise use cases with citations', () => {
    expect(en.useCases.items).toHaveLength(3);
    expect(my.useCases.items).toHaveLength(3);

    const [devOps, hr, security] = en.useCases.items;

    // 1. Engineering & DevOps Onboarding
    expect(devOps.title).toContain('Engineering & DevOps Onboarding');
    expect(devOps.citation).toContain('DevOps Handbook');
    expect(devOps.benefits.length).toBeGreaterThanOrEqual(3);

    // 2. Bilingual HR & Policy Search
    expect(hr.title).toContain('Bilingual HR & Policy Search');
    expect(hr.citation).toContain('Employee Handbook');
    expect(hr.benefits.length).toBeGreaterThanOrEqual(3);

    // 3. Security & Compliance Readiness
    expect(security.title).toContain('Security & Compliance Readiness');
    expect(security.citation).toContain('DataSanitizerService');
    expect(security.benefits.length).toBeGreaterThanOrEqual(3);
  });

  it('synchronizes pricing quotas with @knowledge/shared SUBSCRIPTION_TIERS', () => {
    const [starter, pro, enterprise] = en.pricing.tiers;

    // Free tier: 100 queries
    expect(starter.features.some((f) => f.includes(`${SUBSCRIPTION_TIERS[SubscriptionTier.FREE].maxMonthlyQueries.toLocaleString()} queries`))).toBe(true);

    // Pro tier: 2,500 queries
    expect(pro.features.some((f) => f.includes(`${SUBSCRIPTION_TIERS[SubscriptionTier.PRO].maxMonthlyQueries.toLocaleString()} queries`))).toBe(true);

    // Enterprise tier: 10,000 queries (fair-use)
    expect(enterprise.features.some((f) => f.includes('10,000 queries / month (Fair-use)'))).toBe(true);
    expect(enterprise.features.some((f) => f.includes('BYOK'))).toBe(true);
    expect(enterprise.ctaLabel).toBe('Contact Sales');
    expect(enterprise.ctaHref).toContain('mailto:sales@veriknow.example');
  });

  it('defines dedicated legal and documentation links for footer', () => {
    expect(en.footer.userGuide).toBe('User Guide');
    expect(en.footer.terms).toBe('Terms & Conditions');
    expect(en.footer.privacy).toBe('Privacy Policy');
    expect(en.footer.cookies).toBe('Cookies & Storage');
  });

  it('maintains bilingual structural parity between English and Myanmar', () => {
    expect(my.metrics).toHaveLength(en.metrics.length);
    expect(my.features.items).toHaveLength(en.features.items.length);
    expect(my.architecture.steps).toHaveLength(en.architecture.steps.length);
    expect(my.useCases.items).toHaveLength(en.useCases.items.length);
    expect(my.pricing.tiers).toHaveLength(en.pricing.tiers.length);
  });
});
