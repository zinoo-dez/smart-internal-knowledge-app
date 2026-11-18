export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface TierQuota {
  tier: SubscriptionTier;
  displayName: string;
  priceMonthlyUsd: number;
  maxMonthlyQueries: number;
  maxMonthlyTokens: number;
  maxDocuments: number;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierQuota> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    displayName: 'Starter (Free)',
    priceMonthlyUsd: 0,
    maxMonthlyQueries: 100,
    maxMonthlyTokens: 250000,
    maxDocuments: 10,
    features: [
      'Gemini 2.0 Flash Model',
      'Basic Hybrid Search (Keyword + Vector)',
      'Community Ticket Escalation',
      '10 Indexed Documents',
    ],
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    displayName: 'Business Pro',
    priceMonthlyUsd: 49,
    maxMonthlyQueries: 2500,
    maxMonthlyTokens: 5000000,
    maxDocuments: 100,
    features: [
      'Multi-Model Access (Gemini, Claude 3.5, GPT-4o)',
      'Cross-Encoder Re-Ranking',
      'Redis Semantic Caching (0-latency hits)',
      'Slack & Notion Real-Time Ingestion',
      '100 Indexed Documents',
    ],
  },
  [SubscriptionTier.ENTERPRISE]: {
    tier: SubscriptionTier.ENTERPRISE,
    displayName: 'Enterprise Scale',
    priceMonthlyUsd: 299,
    maxMonthlyQueries: 50000,
    maxMonthlyTokens: 50000000,
    maxDocuments: 10000,
    features: [
      'Dedicated Vector DB Partitioning',
      'Custom LLM Fine-Tuning & Embeddings',
      'Unlimited Knowledge Connectors (Drive, Slack, Notion)',
      '99.9% SLA & Dedicated Support Manager',
      'Audit Log Streaming & SIEM Integration',
    ],
  },
};

export interface TenantUsageSummary {
  organizationId: string;
  tier: SubscriptionTier;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  queryCount: number;
  queryLimit: number;
  queryUsagePercent: number;
  tokenCount: number;
  tokenLimit: number;
  tokenUsagePercent: number;
  documentCount: number;
  documentLimit: number;
  isQuotaExceeded: boolean;
}
