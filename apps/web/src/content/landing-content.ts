import { Language } from '@/i18n/translations';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@knowledge/shared';

export interface UseCaseItem {
  tag: string;
  title: string;
  query: string;
  citation: string;
  description: string;
  benefits: string[];
}

export interface LandingPricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  popular: boolean;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface LandingContent {
  nav: {
    title: string;
    subtitle: string;
    features: string;
    architecture: string;
    useCases: string;
    pricing: string;
    docs: string;
    admin: string;
    launch: string;
  };
  hero: {
    badge: string;
    title: string;
    highlight: string;
    subtitle: string;
    ctaLaunch: string;
    ctaDocs: string;
  };
  mockup: {
    title: string;
    confidence: string;
    query: string;
    answer: string;
    sourceNum: string;
    sourceTitle: string;
    sourcePage: string;
    citedSourcesLabel: string;
    inputPlaceholder: string;
    launchButton: string;
  };
  metrics: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  features: {
    title: string;
    subtitle: string;
    items: Array<{
      title: string;
      description: string;
      tag: string;
    }>;
  };
  architecture: {
    title: string;
    subtitle: string;
    steps: Array<{
      step: string;
      title: string;
      description: string;
    }>;
    trustBadge: string;
    trustTitle: string;
    trustDescription: string;
    trustCta: string;
  };
  useCases: {
    title: string;
    subtitle: string;
    items: UseCaseItem[];
  };
  pricing: {
    title: string;
    subtitle: string;
    tiers: LandingPricingTier[];
  };
  bottomCta: {
    title: string;
    subtitle: string;
    ctaLaunch: string;
    ctaDocs: string;
  };
  footer: {
    tagline: string;
    status: string;
    productHeading: string;
    legalHeading: string;
    navAssistant: string;
    navDocuments: string;
    navBilling: string;
    navAnalytics: string;
    userGuide: string;
    terms: string;
    privacy: string;
    cookies: string;
    rights: string;
  };
}

export const LANDING_CONTENT: Record<Language, LandingContent> = {
  en: {
    nav: {
      title: 'VeriKnow',
      subtitle: 'Citation-Verified Knowledge Assistant',
      features: 'Features',
      architecture: 'Architecture',
      useCases: 'Use Cases',
      pricing: 'Pricing',
      docs: 'User Guide',
      admin: 'Admin Console',
      launch: 'Launch Assistant',
    },
    hero: {
      badge: 'Next-Gen Enterprise Hybrid RAG Platform',
      title: 'Transform Company Knowledge into',
      highlight: 'Verifiable AI Answers',
      subtitle:
        'Multi-tenant documentation & team knowledge assistant powered by PostgreSQL pgvector hybrid search, cross-encoder re-ranking, and strict clickable source citations. Every factual answer cites the exact handbook page.',
      ctaLaunch: 'Launch AI Assistant',
      ctaDocs: 'Explore Documentation',
    },
    mockup: {
      title: 'VeriKnow Assistant · Gemini 2.0 Flash (Active)',
      confidence: 'Citation-Verified · 1 Source',
      query: 'What is our annual leave policy?',
      answer:
        'All full-time employees are entitled to 20 days of paid annual leave per year, accrued monthly. In addition, 10 days of paid medical leave are granted per calendar year [1].',
      sourceNum: '[1]',
      sourceTitle: 'Myanmar Office Leave & Workplace Policy',
      sourcePage: 'p. 14',
      citedSourcesLabel: 'Cited Sources:',
      inputPlaceholder: 'Ask anything about company policies, VPN, AWS, benefits...',
      launchButton: 'Open Assistant',
    },
    metrics: [
      {
        value: 'Citation-Verified',
        label: 'Strict Source Grounding',
        description: 'Every answer backed by clickable document citations',
      },
      {
        value: '< 800ms',
        label: 'Sub-Second on Cache Hits',
        description: 'Instant answers via Redis Semantic Vector Cache',
      },
      {
        value: '3 LLMs',
        label: 'Multi-Model Fallback',
        description: 'Gemini 2.0 Flash primary with Claude 3.5 & GPT-4o failover',
      },
      {
        value: 'Tenant-Isolated',
        label: 'Data-Access Layer Scoping',
        description: 'Org-ID scoping on every query, vector, and cache partition',
      },
    ],
    features: {
      title: 'Engineered for Enterprise Trust & Speed',
      subtitle:
        'Every layer of our architecture is designed for security, accuracy, and operational efficiency.',
      items: [
        {
          title: 'Hybrid Search with RRF',
          description:
            'Combines dense vector embeddings with sparse BM25/tsvector keyword matching via Reciprocal Rank Fusion.',
          tag: 'PostgreSQL + pgvector',
        },
        {
          title: 'Live Omnichannel Connectors',
          description:
            'Seamlessly ingest and auto-sync Notion workspaces, Slack channels, and Google Drive documentation.',
          tag: 'Slack + Notion + Drive',
        },
        {
          title: 'Automated PII Redaction',
          description:
            'Masks AWS secrets, private tokens, credit cards, and sensitive employee PII before storage or inference.',
          tag: 'DataSanitizerService',
        },
        {
          title: 'Bilingual Myanmar Engine',
          description:
            'Punctuation-aware syllable chunking (။ / ၊) with cross-lingual citation grounding between English and Burmese.',
          tag: 'Syllable Chunking (။ / ၊)',
        },
        {
          title: 'Circuit Breaker Failover',
          description:
            'Guarantees high uptime with automated failover from primary Gemini Flash to Claude Sonnet or GPT-4o.',
          tag: 'Gemini + Claude + GPT-4o',
        },
        {
          title: 'Full-Spectrum Observability',
          description:
            'Tracks token budgets, latency distributions, feedback ratios, and unaddressed knowledge gap triage.',
          tag: 'LangSmith + Token Meters',
        },
      ],
    },
    architecture: {
      title: 'Enterprise-Grade Retrieval Architecture',
      subtitle:
        'From client inquiry to verified answer in milliseconds with multi-layer defense.',
      steps: [
        {
          step: '01 / SECURITY GATEWAY',
          title: 'Tenant Auth & PII Masking',
          description:
            'Clerk RBAC token verification and automatic redaction of AWS secrets & employee PII before processing.',
        },
        {
          step: '02 / 0-LATENCY CACHE',
          title: 'Redis Semantic Cache',
          description:
            'Instantaneous hit for frequent questions (>0.96 cosine similarity), eliminating LLM API token costs.',
        },
        {
          step: '03 / HYBRID RETRIEVAL',
          title: 'PostgreSQL RRF Search',
          description:
            'Reciprocal Rank Fusion merges dense semantic embeddings with sparse keyword matching for high recall.',
        },
        {
          step: '04 / VERIFIED ANSWER',
          title: 'Citation-Verified Output',
          description:
            'Strict XML boundaries and Zod schema synthesis with clickable, verifiable source citation drawers.',
        },
      ],
      trustBadge: 'Enterprise Compliance',
      trustTitle: 'Zero Model Training on Your Data',
      trustDescription:
        'Your internal company documents, Slack conversations, and employee inquiries are never used to train third-party foundation models. Multi-tenant isolation is strictly enforced at the data-access layer for every query, vector, and cache partition.',
      trustCta: 'Read Privacy Policy',
    },
    useCases: {
      title: 'Real-World Enterprise Use Cases',
      subtitle:
        'Built for high-velocity engineering, HR, and operations teams needing verifiable answers without manual triage.',
      items: [
        {
          tag: 'Engineering & DevOps',
          title: 'Engineering & DevOps Onboarding',
          query: 'How do I connect to company VPN and access AWS staging?',
          citation: 'DevOps Handbook p. 12 · WireGuard port 51820',
          description:
            'Accelerates engineering ramp-up by answering complex technical runbook questions with direct handbook citations.',
          benefits: [
            'Instant answers for WireGuard VPN, CI/CD pipelines, and AWS role assumptions with clickable handbook pages',
            'Saves 15+ hours weekly of senior engineer interruptions answering repeating onboarding questions',
            'Direct runbook links let developers independently verify commands before executing in terminal',
          ],
        },
        {
          tag: 'People Operations',
          title: 'Bilingual HR & Policy Search (EN / MM)',
          query: 'နှစ်စဉ်ခွင့်နှင့် ဆေးခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ? (Leave & benefits policy)',
          citation: 'Employee Handbook p. 14 · Myanmar Office Leave Policy',
          description:
            'Enables seamless cross-lingual inquiries for distributed teams across Southeast Asia and global headquarters.',
          benefits: [
            'Cross-lingual queries on annual leave, medical coverage, and holidays in English and Myanmar',
            'Syllable-aware chunking respecting Myanmar punctuation markers (။ and ၊) avoids broken keyword matches',
            'Exact policy handbook citations build trust between people operations and team members',
          ],
        },
        {
          tag: 'Security & Compliance',
          title: 'Security & Compliance Readiness',
          query: 'Audit log retention policies and customer data residency',
          citation: 'Infosec Runbook § 4.2 · DataSanitizerService',
          description:
            'Built-in defensive controls and zero-knowledge sanitization tailored for enterprise security audits.',
          benefits: [
            'Automated PII and secret sanitizer masks AWS keys, API tokens, and credentials before storage or inference',
            'Tenant isolation enforced at the data-access layer strictly prevents cross-organization information leakage',
            'Enterprise audit log streaming with CSV export for SIEM integration and SOC 2 compliance readiness',
          ],
        },
      ],
    },
    pricing: {
      title: 'Transparent, Scalable Plans',
      subtitle:
        'Start free for small squads and scale seamlessly to enterprise-wide documentation deployments.',
      tiers: [
        {
          name: SUBSCRIPTION_TIERS[SubscriptionTier.FREE].displayName,
          price: `$${SUBSCRIPTION_TIERS[SubscriptionTier.FREE].priceMonthlyUsd}`,
          period: '/ month',
          description: 'Ideal for small squads testing AI documentation search.',
          popular: false,
          features: [
            `Up to ${SUBSCRIPTION_TIERS[SubscriptionTier.FREE].maxMonthlyQueries.toLocaleString()} queries / month`,
            `${SUBSCRIPTION_TIERS[SubscriptionTier.FREE].maxDocuments} indexed company documents`,
            'Gemini 2.0 Flash engine',
            'Basic Hybrid Vector Search',
            'Community documentation access',
          ],
          ctaLabel: 'Get Started Free',
          ctaHref: '/chat',
        },
        {
          name: SUBSCRIPTION_TIERS[SubscriptionTier.PRO].displayName,
          price: `$${SUBSCRIPTION_TIERS[SubscriptionTier.PRO].priceMonthlyUsd}`,
          period: '/ month',
          description: 'For growing teams requiring Slack bot and scheduled connector sync.',
          popular: true,
          features: [
            `Up to ${SUBSCRIPTION_TIERS[SubscriptionTier.PRO].maxMonthlyQueries.toLocaleString()} queries / month`,
            `${SUBSCRIPTION_TIERS[SubscriptionTier.PRO].maxDocuments} indexed company documents`,
            'Claude 3.5 & GPT-4o model selector',
            'Slack Bot & Notion auto-sync',
            'Redis Semantic Cache (Instant hits)',
            'Priority email support',
          ],
          ctaLabel: 'Start Pro Trial',
          ctaHref: '/admin/billing',
        },
        {
          name: SUBSCRIPTION_TIERS[SubscriptionTier.ENTERPRISE].displayName,
          price: `$${SUBSCRIPTION_TIERS[SubscriptionTier.ENTERPRISE].priceMonthlyUsd}`,
          period: '/ month',
          description: 'Custom vector partitions, 10,000 queries / month (Fair-use), and dedicated support.',
          popular: false,
          features: [
            `Up to ${SUBSCRIPTION_TIERS[SubscriptionTier.ENTERPRISE].maxMonthlyQueries.toLocaleString()} queries / month (Fair-use) or Custom Volume`,
            `Up to ${SUBSCRIPTION_TIERS[SubscriptionTier.ENTERPRISE].maxDocuments.toLocaleString()} indexed documents`,
            'Dedicated vector database partition',
            'Enterprise Audit Logs & CSV export',
            'Circuit Breaker failover & custom uptime SLA',
            'BYOK (Bring Your Own Key) & custom volume scaling on request',
          ],
          ctaLabel: 'Contact Sales',
          ctaHref: 'mailto:sales@veriknow.example?subject=Enterprise%20Plan%20Inquiry%20-%20VeriKnow',
        },
      ],
    },
    bottomCta: {
      title: 'Empower Your Workforce with Verifiable AI Search',
      subtitle:
        'Index company policies, link Slack channels, and deliver instant grounded answers with verifiable citations.',
      ctaLaunch: 'Launch AI Assistant',
      ctaDocs: 'Explore Documentation',
    },
    footer: {
      tagline:
        'Next-generation grounded internal knowledge assistant for modern engineering, product, and HR teams.',
      status: 'All Systems Operational',
      productHeading: 'Product',
      legalHeading: 'Documentation & Legal',
      navAssistant: 'AI Assistant',
      navDocuments: 'Document Knowledge',
      navBilling: 'Plans & Billing',
      navAnalytics: 'Usage & Analytics',
      userGuide: 'User Guide',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      cookies: 'Cookies & Storage',
      rights: 'All rights reserved. Built with Next.js 15, NestJS, and PostgreSQL.',
    },
  },
  my: {
    nav: {
      title: 'VeriKnow',
      subtitle: 'လုပ်ငန်းသုံး AI အသိပညာ လက်ထောက်',
      features: 'စွမ်းဆောင်ချက်များ',
      architecture: 'စနစ်ဗိသုကာ',
      useCases: 'အသုံးချမှုပုံစံများ',
      pricing: 'အစီအစဉ်များ',
      docs: 'အသုံးပြုနည်း လမ်းညွှန်',
      admin: 'အက်ဒမင် ထိန်းချုပ်ခွင့်',
      launch: 'လက်ထောက်ကို စတင်မည်',
    },
    hero: {
      badge: 'လုပ်ငန်းသုံး ဉာဏ်ရည်တု အသိပညာ ရှာဖွေရေး စနစ်',
      title: 'လုပ်ငန်းတွင်း အသိပညာနှင့် မူဝါဒများကို',
      highlight: 'တိကျခိုင်မာသော AI အဖြစ်သို့ ပြောင်းလဲပါ',
      subtitle:
        'PostgreSQL pgvector hybrid search၊ cross-encoder re-ranking နှင့် မူရင်းမှတ်တမ်းများကို တိုက်ရိုက်ကိုးကားစိစစ်နိုင်သော စနစ်ဖြင့် တည်ဆောက်ထားသည့် အဖွဲ့အစည်းသုံး AI လက်ထောက်။ အဖြေတိုင်းတွင် တရားဝင် လက်စွဲစာမျက်နှာ အကိုးအကား ပါဝင်သည်။',
      ctaLaunch: 'AI လက်ထောက်ကို စတင်သုံးမည်',
      ctaDocs: 'လမ်းညွှန်မှတ်တမ်းများ ဖတ်ရှုမည်',
    },
    mockup: {
      title: 'VeriKnow လက်ထောက် · Gemini 2.0 Flash (တက်ကြွနေသည်)',
      confidence: 'ကိုးကားချက်ဖြင့် စိစစ်ပြီး (Citation-Verified)',
      query: 'နှစ်စဉ်ခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ?',
      answer:
        'အမြဲတမ်းဝန်ထမ်းများအားလုံးသည် တစ်နှစ်လျှင် နှစ်စဉ် လုပ်သက်ခွင့် (Annual Leave) ရက်ပေါင်း ၂၀ အပြည့် ခံစားခွင့်ရှိပါသည်။ ထို့အပြင် တစ်နှစ်လျှင် အရေးပေါ်နှင့် ဆေးခွင့် ၁၀ ရက် ခံစားခွင့် ရှိပါသည် [1]။',
      sourceNum: '[1]',
      sourceTitle: 'မြန်မာရုံးခွဲ ဝန်ထမ်းလက်စွဲ (Leave Policy Handbook)',
      sourcePage: 'စာမျက်နှာ ၁၄',
      citedSourcesLabel: 'ကိုးကားထားသော မှတ်တမ်းများ:',
      inputPlaceholder: 'ကုမ္ပဏီမူဝါဒ၊ VPN၊ ခွင့်ရက်၊ လုံခြုံရေးအကြောင်း မေးမြန်းပါ...',
      launchButton: 'စတင်သုံးမည်',
    },
    metrics: [
      {
        value: 'အကိုးအကား ခိုင်လုံမှု',
        label: 'တိကျခိုင်မာသော မူရင်းကိုးကားချက်',
        description: 'အဖြေတိုင်းတွင် တရားဝင် ကုမ္ပဏီမူရင်းမှတ်တမ်း အကိုးအကား ပါဝင်သည်',
      },
      {
        value: '< ၈၀၀ မီလီစက္ကန့်',
        label: 'အမြန်ဆန်ဆုံး ပြန်လည်ဖြေကြားမှု',
        description: 'Redis Semantic Vector Cache ဖြင့် လျင်မြန်စွာ ပြန်လည်ဖြေကြားသည်',
      },
      {
        value: 'မော်ဒယ် ၃ မျိုး',
        label: 'အလိုအလျောက် ပြောင်းလဲသုံးစွဲမှု',
        description: 'Gemini 2.0 Flash၊ Claude 3.5 Sonnet နှင့် GPT-4o အကြား ပြောင်းလဲနိုင်သည်',
      },
      {
        value: 'သီးသန့်ခွဲခြားထားမှု',
        label: 'Data Access Layer အဆင့် သီးသန့်မှု',
        description: 'Tenant တစ်ခုစီ၏ Query၊ Vector နှင့် Cache များကို တင်းကျပ်စွာ ခွဲခြားထားသည်',
      },
    ],
    features: {
      title: 'လုပ်ငန်းသုံး ယုံကြည်စိတ်ချရမှုနှင့် မြန်ဆန်မှုအတွက် တည်ဆောက်ထားသည်',
      subtitle:
        'လုံခြုံရေး၊ တိကျမှုနှင့် လုပ်ငန်းခွင် အထောက်အကူပြုနိုင်မှု အပြည့်အဝရရှိစေရန် အဆင့်တိုင်းကို စနစ်တကျ ရေးဆွဲထားပါသည်။',
      items: [
        {
          title: 'Hybrid Search (RRF စနစ်)',
          description:
            'Dense vector embeddings နှင့် BM25/tsvector စာလုံးအကိုက်ရှာဖွေမှုကို RRF algorithm ဖြင့် ပေါင်းစပ်ထားသည်။',
          tag: 'PostgreSQL + pgvector',
        },
        {
          title: 'တိုက်ရိုက်ချိတ်ဆက်နိုင်သော စနစ်များ',
          description:
            'Notion မှတ်တမ်းများ၊ Slack စကားဝိုင်းများနှင့် Google Drive ဖိုင်များကို အချိန်နှင့်တပြေးညီ အလိုအလျောက် ရယူသည်။',
          tag: 'Slack + Notion + Drive',
        },
        {
          title: 'လျှို့ဝှက်အချက်အလက်များ ဖုံးကွယ်စနစ်',
          description:
            'AWS credentials၊ private tokens၊ credit cards နှင့် ဝန်ထမ်း PII များကို မသိမ်းဆည်းမီ အလိုအလျောက် ဖုံးကွယ်ပေးသည်။',
          tag: 'DataSanitizerService',
        },
        {
          title: 'မြန်မာစာသီးသန့် အင်ဂျင်',
          description:
            'မြန်မာစာ ပုဒ်မ (။) နှင့် ပုဒ်ဖြတ် (၊) များကို တိကျစွာ ခွဲခြမ်းစိစစ်နိုင်ပြီး ဘာသာစကား ၂ မျိုးဖြင့် ချိတ်ဆက်ကိုးကားနိုင်သည်။',
          tag: 'Syllable Chunking (။ / ၊)',
        },
        {
          title: 'အလိုအလျောက် ပြောင်းလဲသုံးစွဲမှု စနစ်',
          description:
            'မူရင်း Gemini Flash အခက်အခဲရှိပါက Claude Sonnet သို့မဟုတ် GPT-4o သို့ အလိုအလျောက် လွှဲပြောင်းပေးသည်။',
          tag: 'Gemini + Claude + GPT-4o',
        },
        {
          title: 'စနစ်စောင့်ကြည့်မှု အပြည့်အစုံ',
          description:
            'Token ကုန်ကျစရိတ်၊ ကြာချိန်၊ သုံးစွဲသူ အကြံပြုချက်များနှင့် ဖြေဆိုရန်ကျန်သော မေးခွန်းများကို တိကျစွာ သုံးသပ်နိုင်သည်။',
          tag: 'LangSmith + Token Meters',
        },
      ],
    },
    architecture: {
      title: 'လုပ်ငန်းသုံး အဆင့်မြင့် ရှာဖွေရေး ဗိသုကာ',
      subtitle:
        'မေးခွန်းမေးမြန်းမှုမှ ခိုင်လုံသောအဖြေရရှိသည်အထိ အဆင့်ဆင့် လုံခြုံစွာ စိစစ်ဆောင်ရွက်ပုံ။',
      steps: [
        {
          step: '၀၁ / လုံခြုံရေး ဂိတ်ဝေး',
          title: 'အဖွဲ့အစည်း စိစစ်ခြင်းနှင့် PII ဖုံးကွယ်ခြင်း',
          description:
            'Clerk RBAC guard နှင့် AWS token များ၊ လျှို့ဝှက်ကုဒ်များကို မစီမံမီ အလိုအလျောက် ဖုံးကွယ်ခြင်း။',
        },
        {
          step: '၀၂ / အမြန်နှုန်း Cache',
          title: 'Redis Semantic Cache',
          description:
            'တူညီသော မေးခွန်းများအတွက် Cosine similarity > 0.96 ဖြင့် LLM မခေါ်ဘဲ ချက်ချင်း ဖြေကြားခြင်း။',
        },
        {
          step: '၀၃ / ပေါင်းစပ်ရှာဖွေမှု',
          title: 'PostgreSQL RRF ရှာဖွေခြင်း',
          description:
            'Dense vector နှင့် စာလုံးအကိုက်ရှာဖွေမှုကို ပေါင်းစပ်ပြီး အကိုက်ညီဆုံး အပိုင်းများကို စီစစ်ခြင်း။',
        },
        {
          step: '၀၄ / စိစစ်ပြီးအဖြေ',
          title: 'ခိုင်လုံသော အကိုးအကား အဖြေထုတ်ပေးခြင်း',
          description:
            'စစ်ဆေးနိုင်သော Document Citation [1], [2] များနှင့်တကွ Circuit Breaker အကာအကွယ်ဖြင့် ဖြေဆိုခြင်း။',
        },
      ],
      trustBadge: 'လုပ်ငန်းသုံး စည်းမျဉ်းလိုက်နာမှု',
      trustTitle: 'သင့်ဒေတာများဖြင့် AI Model အား လုံးဝ လေ့ကျင့်သင်ကြားခြင်း မပြုပါ',
      trustDescription:
        'ကုမ္ပဏီမှတ်တမ်းများ၊ Slack စကားဝိုင်းများနှင့် ဝန်ထမ်းများ မေးမြန်းချက်များကို ပြင်ပ AI model များ လေ့ကျင့်ရန် ဘယ်တော့မှ မသုံးပါ။ Tenant တစ်ခုစီ၏ ဒေတာများကို Data Access Layer တွင် တင်းကျပ်စွာ သီးသန့်ခွဲခြားထားပါသည်။',
      trustCta: 'လုံခြုံရေး မူဝါဒ ဖတ်ရှုမည်',
    },
    useCases: {
      title: 'လက်တွေ့လုပ်ငန်းခွင် အသုံးချမှုပုံစံများ (Real-World Use Cases)',
      subtitle:
        'ဝန်ထမ်းအသစ် မိတ်ဆက်ခြင်းနှင့် ထပ်ခါတလဲလဲ မေးခွန်းများ ဖြေကြားရာတွင် အချိန်ကုန်သက်သာစေပုံများ။',
      items: [
        {
          tag: 'အင်ဂျင်နီယာနှင့် DevOps',
          title: 'Engineering & DevOps Onboarding',
          query: 'ကုမ္ပဏီ VPN ချိတ်ဆက်ပြီး AWS staging သို့ မည်သို့ ဝင်ရောက်ရမည်နည်း?',
          citation: 'DevOps Handbook စာမျက်နှာ ၁၂ · WireGuard port 51820',
          description:
            'အင်ဂျင်နီယာအသစ်များအတွက် စနစ်လမ်းညွှန်ချက်များနှင့် ပတ်သက်သော မေးခွန်းများကို မူရင်းမှတ်တမ်းအကိုးအကားဖြင့် ချက်ချင်း ဖြေရှင်းပေးသည်။',
          benefits: [
            'WireGuard VPN၊ CI/CD ပိုက်လိုင်းနှင့် AWS အကောင့် အသုံးပြုနည်းများကို မူရင်းစာမျက်နှာ ညွှန်ပြချက်ဖြင့် ချက်ချင်း ဖြေကြားနိုင်သည်',
            'အကြီးတန်း အင်ဂျင်နီယာများထံ ထပ်ခါတလဲလဲ မေးမြန်းမှုများကို လျှော့ချပေးပြီး တစ်ပတ်လျှင် အချိန် ၁၅ နာရီကျော် သက်သာစေသည်',
            'Runbook လင့်ခ်များ ပါဝင်သောကြောင့် အင်ဂျင်နီယာငယ်များအနေဖြင့် Command များကို မ run မီ ကိုယ်တိုင် စစ်ဆေးနိုင်သည်',
          ],
        },
        {
          tag: 'လူ့စွမ်းအားအရင်းအမြစ် (HR)',
          title: 'Bilingual HR & Policy Search (EN / MM)',
          query: 'နှစ်စဉ်ခွင့်နှင့် ဆေးခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ? (Leave & benefits policy)',
          citation: 'Employee Handbook စာမျက်နှာ ၁၄ · Myanmar Office Leave Policy',
          description:
            'ပြည်တွင်းနှင့် နိုင်ငံတကာ အဖွဲ့အစည်းများအကြား ဘာသာစကား အခက်အခဲမရှိဘဲ ရုံးတွင်းမူဝါဒများကို မေးမြန်းနိုင်စေသည်။',
          benefits: [
            'နှစ်စဉ်ခွင့်၊ ဆေးခွင့်နှင့် အလုပ်ပိတ်ရက် မူဝါဒများကို မြန်မာလိုဖြစ်စေ၊ အင်္ဂလိပ်လိုဖြစ်စေ လွတ်လပ်စွာ မေးမြန်းနိုင်သည်',
            'မြန်မာစာ ပုဒ်မ (။) နှင့် ပုဒ်ဖြတ် (၊) များကို တိကျစွာ ခွဲခြမ်းစိစစ်နိုင်သောကြောင့် စာလုံးပျက်စီးမှု မရှိဘဲ မှန်ကန်စွာ ရှာဖွေနိုင်သည်',
            'တိကျသော လက်စွဲစာမျက်နှာ အကိုးအကားများ ပါဝင်သဖြင့် ဝန်ထမ်းများနှင့် HR အကြား ယုံကြည်စိတ်ချရမှု တိုးတက်စေသည်',
          ],
        },
        {
          tag: 'လုံခြုံရေးနှင့် စစ်ဆေးမှု',
          title: 'Security & Compliance Readiness',
          query: 'Audit log ထိန်းသိမ်းမှု မူဝါဒနှင့် ဒေတာလုံခြုံရေး စည်းမျဉ်းများ',
          citation: 'Infosec Runbook § 4.2 · DataSanitizerService',
          description:
            'လုပ်ငန်းသုံး လုံခြုံရေး စစ်ဆေးမှုများနှင့် ကိုက်ညီစေရန် ကြိုတင်ကာကွယ်မှုများနှင့် အလိုအလျောက် သန့်စင်စနစ်များ ပါဝင်သည်။',
          benefits: [
            'AWS keys၊ API tokens နှင့် စကားဝှက်များကို ဒေတာဘေ့စ်သို့ မရောက်မီ အလိုအလျောက် Masking ပြုလုပ်ပေးသည်',
            'Data Access Layer တွင် တင်းကျပ်စွာ ခွဲခြားထားသောကြောင့် အဖွဲ့အစည်းတစ်ခုနှင့် တစ်ခုအကြား ဒေတာပေါက်ကြားမှု လုံးဝ မရှိနိုင်ပါ',
            'SOC 2 နှင့် စာရင်းစစ် ဆေးမှုများအတွက် အထောက်အကူပြုသော Audit Log Streaming နှင့် CSV Export စနစ် ပါဝင်သည်',
          ],
        },
      ],
    },
    pricing: {
      title: 'ရှင်းလင်းပြီး ရွေးချယ်နိုင်သော အစီအစဉ်များ',
      subtitle:
        'အဖွဲ့ငယ်များအတွက် အခမဲ့ စတင်နိုင်ပြီး ကုမ္ပဏီကြီးများအတွက် ချဲ့ထွင်အသုံးပြုနိုင်ပါသည်။',
      tiers: [
        {
          name: 'Starter (အခြေခံ)',
          price: '$၀',
          period: '/ လစဉ်',
          description: 'AI စနစ်ကို စတင်စမ်းသပ်လိုသော အဖွဲ့ငယ်များအတွက် သင့်လျော်သည်။',
          popular: false,
          features: [
            'လစဉ် မေးမြန်းမှု ၁၀၀ အထိ',
            'မှတ်တမ်းစာရွက်စာတမ်း ၁၀ ခု အထိ',
            'Gemini 2.0 Flash engine',
            'အခြေခံ Hybrid Vector Search',
            'အများသုံး လမ်းညွှန်မှတ်တမ်းများ',
          ],
          ctaLabel: 'အခမဲ့ စတင်မည်',
          ctaHref: '/chat',
        },
        {
          name: 'Business Pro',
          price: '$၄၉',
          period: '/ လစဉ်',
          description: 'Slack bot နှင့် အလိုအလျောက် Sync ပြုလုပ်ရန် လိုအပ်သော အဖွဲ့များအတွက်။',
          popular: true,
          features: [
            'လစဉ် မေးမြန်းမှု ၂,၅၀၀ အထိ',
            'မှတ်တမ်းစာရွက်စာတမ်း ၁၀၀ အထိ',
            'Claude 3.5 & GPT-4o ရွေးချယ်ခွင့်',
            'Slack Bot & Notion auto-sync',
            'Redis Semantic Cache (ချက်ချင်း အဖြေပေးစနစ်)',
            'အီးမေးလ် ဦးစားပေး အကူအညီ',
          ],
          ctaLabel: 'Pro စမ်းသပ်သုံးမည်',
          ctaHref: '/admin/billing',
        },
        {
          name: 'Enterprise Scale',
          price: '$၂၉၉',
          period: '/ လစဉ်',
          description: 'သီးသန့် Vector Partition၊ လစဉ် မေးမြန်းမှု ၁၀,၀၀၀ (Fair-use) နှင့် အထူးဝန်ဆောင်မှု။',
          popular: false,
          features: [
            'လစဉ် မေးမြန်းမှု ၁၀,၀၀၀ အထိ (Fair-use) သို့မဟုတ် စိတ်ကြိုက်ပမာဏ',
            'မှတ်တမ်းစာရွက်စာတမ်း ၁၀,၀၀၀ အထိ',
            'သီးသန့် Vector Database Partition',
            'Enterprise Audit Logs & CSV export',
            'Circuit Breaker failover & Custom Uptime SLA',
            'BYOK (Bring Your Own Key) & စိတ်ကြိုက် သီးသန့်ချဲ့ထွင်နိုင်ခြင်း',
          ],
          ctaLabel: 'အရောင်းဌာနသို့ ဆက်သွယ်ရန်',
          ctaHref: 'mailto:sales@veriknow.example?subject=Enterprise%20Plan%20Inquiry%20-%20VeriKnow',
        },
      ],
    },
    bottomCta: {
      title: 'လုပ်ငန်းတွင်း အသိပညာ ရှာဖွေမှုကို ယနေ့ပင် စတင်လိုက်ပါ',
      subtitle:
        'မိနစ်ပိုင်းအတွင်း စာရွက်စာတမ်းများ ထည့်သွင်းပြီး ဝန်ထမ်းများအား အမှန်ကန်ဆုံး အဖြေများ ပေးနိုင်ရန် စတင်လိုက်ပါ။',
      ctaLaunch: 'AI လက်ထောက်ကို စတင်သုံးမည်',
      ctaDocs: 'လမ်းညွှန်မှတ်တမ်းများ ဖတ်ရှုမည်',
    },
    footer: {
      tagline:
        'ခေတ်မီ အင်ဂျင်နီယာ၊ ထုတ်ကုန်နှင့် HR အဖွဲ့များအတွက် တိကျခိုင်မာသော အဖွဲ့အစည်းသုံး AI အသိပညာ လက်ထောက်။',
      status: 'စနစ်များ ပုံမှန် လည်ပတ်နေပါသည်',
      productHeading: 'ထုတ်ကုန်နှင့် ဝန်ဆောင်မှု',
      legalHeading: 'ဥပဒေနှင့် လမ်းညွှန်',
      navAssistant: 'AI လက်ထောက်',
      navDocuments: 'မှတ်တမ်းစာရွက်စာတမ်းများ',
      navBilling: 'အစီအစဉ်နှင့် ငွေပေးချေမှု',
      navAnalytics: 'အသုံးပြုမှုနှင့် သုံးသပ်ချက်',
      userGuide: 'အသုံးပြုနည်း လမ်းညွှန်',
      terms: 'အသုံးပြုမှု စည်းမျဉ်းများ',
      privacy: 'ပုဂ္ဂိုလ်ရေး လုံခြုံမှု မူဝါဒ',
      cookies: 'ကွတ်ကီးနှင့် သိမ်းဆည်းမှု',
      rights: 'မူပိုင်ခွင့်များ ရယူထားပြီးဖြစ်သည်။ Next.js 15၊ NestJS နှင့် PostgreSQL တို့ဖြင့် တည်ဆောက်ထားသည်။',
    },
  },
};
