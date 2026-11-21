export type Language = 'en' | 'my';

export const LANG_COOKIE_NAME = 'veriknow_lang';

export interface Translations {
  // Navigation & Shell
  appTitle: string;
  appSubtitle: string;
  navWorkspace: string;
  navAssistant: string;
  navDocuments: string;
  navKnowledgeGaps: string;
  navAnalytics: string;
  navAuditLogs: string;
  navBilling: string;
  navDocs: string;
  navMcp: string;
  mcpHubTitle: string;
  mcpHubSubtitle: string;
  mcpConnectCustom: string;
  mcpBrowseMarketplace: string;
  mcpActiveServers: string;
  mcpEnabledTools: string;
  mcpAvgLatency: string;
  mcpHealthStatus: string;
  mcpTestPing: string;
  mcpConfigure: string;
  mcpDiscoverTools: string;
  mcpStepGeneral: string;
  mcpStepAuth: string;
  mcpStepTools: string;
  mcpServerName: string;
  mcpTransport: string;
  mcpEndpointUrl: string;
  mcpAuthHeaders: string;
  mcpRequireApproval: string;
  mcpSaveAndActivate: string;
  multiTenantActive: string;
  roleAdmin: string;
  languageLabel: string;

  // Billing & Quotas Dashboard
  billingTitle: string;
  billingSubtitle: string;
  currentPlan: string;
  billingCycle: string;
  tokenUsage: string;
  queryUsage: string;
  docUsage: string;
  upgradePlan: string;
  activeTier: string;

  // Documentation Web Hub
  docsTitle: string;
  docsSubtitle: string;
  docsTabGuide: string;
  docsTabTerms: string;
  docsTabPrivacy: string;
  docsTabCookies: string;
  docsCtaChat: string;
  docsLegalDisclaimer: string;

  // Chat Interface
  geminiGreeting: string;
  geminiModeChat: string;
  geminiModeTools: string;
  geminiModeResearch: string;
  suggestionDbLive: string;
  modelFlashDesc: string;
  modelClaudeDesc: string;
  modelGptDesc: string;
  thinkingLevel: string;
  chatWelcomeTitle: string;
  chatWelcomeDesc: string;
  modelLabel: string;
  suggestionsLabel: string;
  suggestionVpn: string;
  suggestionLeave: string;
  suggestionAws: string;
  suggestionMyanmarLeave: string;
  inputPlaceholder: string;
  newConversation: string;
  pastConversations: string;
  noConversations: string;
  searchingSources: string;
  citedSources: string;
  openTicket: string;
  ticketCreated: string;
  feedbackHelpful: string;
  feedbackUnhelpful: string;

  // Modals & Drawers
  createTicketTitle: string;
  ticketCategory: string;
  ticketPriority: string;
  ticketSubject: string;
  ticketDescription: string;
  cancel: string;
  submit: string;
  drawerTitle: string;
  sourceDoc: string;
  relevanceMatch: string;

  // Home Landing Page (maintained for compatibility)
  landingBadge: string;
  landingHeroTitle: string;
  landingHeroHighlight: string;
  landingHeroSubtitle: string;
  landingCtaLaunch: string;
  landingCtaDocs: string;
  landingCtaAdmin: string;
  landingMockupQuery: string;
  landingMockupAnswer: string;
  landingMockupConfidence: string;
  landingMetricGrounded: string;
  landingMetricGroundedDesc: string;
  landingMetricLatency: string;
  landingMetricLatencyDesc: string;
  landingMetricModels: string;
  landingMetricModelsDesc: string;
  landingMetricIsolation: string;
  landingMetricIsolationDesc: string;
  landingFeaturesTitle: string;
  landingFeaturesSubtitle: string;
  featHybridTitle: string;
  featHybridDesc: string;
  featConnectorsTitle: string;
  featConnectorsDesc: string;
  featSecurityTitle: string;
  featSecurityDesc: string;
  featMyanmarTitle: string;
  featMyanmarDesc: string;
  featCircuitTitle: string;
  featCircuitDesc: string;
  featObservabilityTitle: string;
  featObservabilityDesc: string;
  landingArchTitle: string;
  landingArchSubtitle: string;
  landingTrustBadge: string;
  landingTrustTitle: string;
  landingTrustDesc: string;
  landingPricingTitle: string;
  landingPricingSubtitle: string;
  landingPricingStarter: string;
  landingPricingStarterPrice: string;
  landingPricingStarterDesc: string;
  landingPricingPro: string;
  landingPricingProPrice: string;
  landingPricingProDesc: string;
  landingPricingEnterprise: string;
  landingPricingEnterprisePrice: string;
  landingPricingEnterpriseDesc: string;
  landingPricingCta: string;
  landingTestimonialTitle: string;
  landingTestimonialSubtitle: string;
  landingFooterTagline: string;
  landingFooterRights: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appTitle: 'VeriKnow',
    appSubtitle: 'Citation-Verified Knowledge Assistant',
    navWorkspace: 'Workspace',
    navAssistant: 'AI Assistant',
    navDocuments: 'Document Knowledge',
    navKnowledgeGaps: 'Knowledge Gaps',
    navAnalytics: 'Usage & Analytics',
    navAuditLogs: 'Audit & Compliance',
    navBilling: 'Plans & Billing',
    navDocs: 'Help & Guides',
    navMcp: 'MCP & Integrations',
    mcpHubTitle: 'Model Context Protocol (MCP) Hub',
    mcpHubSubtitle:
      'Connect enterprise MCP servers, discover live tools, and power the AI assistant with real-time systems.',
    mcpConnectCustom: 'Connect Custom MCP',
    mcpBrowseMarketplace: 'Browse Catalog',
    mcpActiveServers: 'Active Servers',
    mcpEnabledTools: 'Enabled Tools',
    mcpAvgLatency: 'Avg Latency',
    mcpHealthStatus: 'System Health',
    mcpTestPing: 'Test Ping',
    mcpConfigure: 'Configure',
    mcpDiscoverTools: 'Discover Tools',
    mcpStepGeneral: '1. Endpoint & Transport',
    mcpStepAuth: '2. Authentication & Secrets',
    mcpStepTools: '3. Discover & Permissions',
    mcpServerName: 'Server Name',
    mcpTransport: 'Transport Protocol',
    mcpEndpointUrl: 'SSE Endpoint URL',
    mcpAuthHeaders: 'Custom Headers (Encrypted AES-256)',
    mcpRequireApproval: 'Require User Approval before execution',
    mcpSaveAndActivate: 'Save & Activate MCP',
    multiTenantActive: 'Multi-Tenant Active',
    roleAdmin: 'Role: ADMIN',
    languageLabel: 'Language',

    billingTitle: 'Subscription & Usage Quotas',
    billingSubtitle:
      'Manage enterprise subscription tiers, monitor monthly token budgets, and upgrade quotas.',
    currentPlan: 'Current Plan',
    billingCycle: 'Billing Cycle',
    tokenUsage: 'Monthly Token Usage',
    queryUsage: 'Monthly Queries',
    docUsage: 'Indexed Documents',
    upgradePlan: 'Upgrade Plan',
    activeTier: 'Active',

    docsTitle: 'Help Center & Documentation',
    docsSubtitle: 'Zero-knowledge user guides, workflow walkthroughs, and legal compliance policies.',
    docsTabGuide: 'User Guide',
    docsTabTerms: 'Terms & Conditions',
    docsTabPrivacy: 'Privacy Policy',
    docsTabCookies: 'Cookies & Storage',
    docsCtaChat: 'Open AI Assistant',
    docsLegalDisclaimer:
      'This is an AI-generated template for baseline compliance. For full production enterprise release, please have this reviewed by a qualified legal professional.',

    geminiGreeting: 'Where should we start?',
    geminiModeChat: 'Chat',
    geminiModeTools: 'Live MCP Tools',
    geminiModeResearch: 'Deep Research',
    suggestionDbLive: 'Query live PostgreSQL database for active employees',
    modelFlashDesc: 'Quick answers · 3.5 Flash-Lite',
    modelClaudeDesc: 'Everyday help & code · Claude 3.5 Sonnet',
    modelGptDesc: 'Deep research & multimodal · GPT-4o',
    thinkingLevel: 'Thinking level',

    chatWelcomeTitle: 'Hello! I am your VeriKnow Assistant.',
    chatWelcomeDesc:
      'Ask me any question regarding company policies, engineering documentation, onboarding, or internal tools.\n\nEvery answer is strictly grounded with verifiable document citations.',
    modelLabel: 'MODEL:',
    suggestionsLabel: 'SUGGESTIONS:',
    suggestionVpn: 'How do I setup company VPN?',
    suggestionLeave: 'What is our annual leave policy?',
    suggestionAws: 'AWS credentials & security handbook',
    suggestionMyanmarLeave: 'မြန်မာရုံးခွဲ ဝန်ထမ်းခွင့် မူဝါဒ',
    inputPlaceholder: 'Ask anything about company policies, VPN, AWS, benefits...',
    newConversation: 'New Conversation',
    pastConversations: 'PAST CONVERSATIONS',
    noConversations: 'No past conversations',
    searchingSources: 'Searching knowledge base & ranking citations...',
    citedSources: 'Cited Sources',
    openTicket: 'Open Ticket',
    ticketCreated: 'Support Ticket Created',
    feedbackHelpful: 'Helpful',
    feedbackUnhelpful: 'Needs improvement',

    createTicketTitle: 'Open Internal Support Ticket',
    ticketCategory: 'Department Category',
    ticketPriority: 'Priority',
    ticketSubject: 'Inquiry Subject',
    ticketDescription: 'Detailed Context',
    cancel: 'Cancel',
    submit: 'Submit Ticket',
    drawerTitle: 'Cited Document Sources',
    sourceDoc: 'Source Document',
    relevanceMatch: 'Relevance Match',

    // Home Landing Page
    landingBadge: 'Next-Gen Enterprise Hybrid RAG Platform',
    landingHeroTitle: 'Transform Company Knowledge into',
    landingHeroHighlight: 'Verifiable AI Answers',
    landingHeroSubtitle:
      'Multi-tenant documentation & team knowledge assistant powered by PostgreSQL pgvector hybrid search, cross-encoder re-ranking, and real-time verifiable source citations.',
    landingCtaLaunch: 'Launch AI Assistant',
    landingCtaDocs: 'Explore Documentation',
    landingCtaAdmin: 'Admin Console',
    landingMockupQuery: 'What is our annual leave policy?',
    landingMockupAnswer:
      'All full-time employees are entitled to 20 days of paid annual leave per year, accrued monthly. In addition, 10 days of paid medical leave are granted per calendar year [1].',
    landingMockupConfidence: 'Citation-Verified · 1 Source',
    landingMetricGrounded: 'Citation-Verified',
    landingMetricGroundedDesc: 'Every answer backed by clickable document citations',
    landingMetricLatency: '< 800ms',
    landingMetricLatencyDesc: 'Sub-second on cache hits via Redis Semantic Vector Cache',
    landingMetricModels: '3 LLMs',
    landingMetricModelsDesc: 'Dynamic fallback: Gemini 2.0, Claude 3.5 & GPT-4o',
    landingMetricIsolation: 'Tenant-Isolated',
    landingMetricIsolationDesc: 'Org-ID scoping on every query, vector, and cache partition',

    landingFeaturesTitle: 'Engineered for Enterprise Trust & Speed',
    landingFeaturesSubtitle:
      'Every layer of our architecture is designed for security, accuracy, and operational efficiency.',
    featHybridTitle: 'Hybrid Search with RRF',
    featHybridDesc:
      'Combines dense vector embeddings with sparse BM25/tsvector keyword matching via Reciprocal Rank Fusion.',
    featConnectorsTitle: 'Live Omnichannel Connectors',
    featConnectorsDesc:
      'Seamlessly ingest and auto-sync Notion workspaces, Slack channels, and Google Drive documentation.',
    featSecurityTitle: 'Automated PII Redaction',
    featSecurityDesc:
      'Masks AWS secrets, private tokens, credit cards, and sensitive employee PII before storage or inference.',
    featMyanmarTitle: 'Bilingual Myanmar Engine',
    featMyanmarDesc:
      'Punctuation-aware syllable chunking (။ / ၊) with cross-lingual citation grounding between English and Burmese.',
    featCircuitTitle: 'Circuit Breaker Failover',
    featCircuitDesc:
      'Guarantees high uptime with automated failover from primary Gemini Flash to Claude Sonnet or GPT-4o.',
    featObservabilityTitle: 'Full-Spectrum Observability',
    featObservabilityDesc:
      'Tracks token budgets, latency distributions, feedback ratios, and unaddressed knowledge gap triage.',

    landingArchTitle: 'Enterprise-Grade Retrieval Architecture',
    landingArchSubtitle:
      'From client inquiry to verified answer in milliseconds with multi-layer defense.',
    landingTrustBadge: 'Enterprise Compliance',
    landingTrustTitle: 'Zero Model Training on Your Data',
    landingTrustDesc:
      'Your internal company documents, Slack conversations, and employee inquiries are never used to train third-party foundation models. Multi-tenant isolation is enforced at the data-access layer.',

    landingPricingTitle: 'Transparent, Scalable Plans',
    landingPricingSubtitle:
      'Start free for small teams and scale seamlessly to enterprise-wide documentation deployments.',
    landingPricingStarter: 'Starter',
    landingPricingStarterPrice: '$0',
    landingPricingStarterDesc: 'Ideal for small squads testing AI documentation search.',
    landingPricingPro: 'Pro Team',
    landingPricingProPrice: '$49',
    landingPricingProDesc: 'For growing teams requiring Slack bot and scheduled connector sync.',
    landingPricingEnterprise: 'Enterprise',
    landingPricingEnterprisePrice: '$299',
    landingPricingEnterpriseDesc: 'Custom vector partitions, 10,000 queries / month (Fair-use), and dedicated support.',
    landingPricingCta: 'Get Started',

    landingTestimonialTitle: 'Real-World Enterprise Use Cases',
    landingTestimonialSubtitle:
      'See how verifiable internal knowledge search accelerates onboarding and eliminates repetitive questions.',

    landingFooterTagline:
      'Next-generation grounded internal knowledge assistant for modern engineering, product, and HR teams.',
    landingFooterRights: 'All rights reserved. Built with Next.js 15, NestJS, and PostgreSQL.',
  },
  my: {
    appTitle: 'VeriKnow',
    appSubtitle: 'လုပ်ငန်းသုံး AI အသိပညာ လက်ထောက်',
    navWorkspace: 'လုပ်ငန်းခွင်',
    navAssistant: 'AI လက်ထောက်',
    navDocuments: 'မှတ်တမ်းစာရွက်စာတမ်းများ',
    navKnowledgeGaps: 'မေးခွန်းလိုအပ်ချက်များ',
    navAnalytics: 'အသုံးပြုမှုနှင့် သုံးသပ်ချက်',
    navAuditLogs: 'လုံခြုံရေးနှင့် စစ်ဆေးမှု',
    navBilling: 'အစီအစဉ်နှင့် ငွေပေးချေမှု',
    navDocs: 'အကူအညီနှင့် လမ်းညွှန်',
    navMcp: 'ချိတ်ဆက်မှုများနှင့် MCP',
    mcpHubTitle: 'Model Context Protocol (MCP) စီမံခန့်ခွဲမှု',
    mcpHubSubtitle:
      'လုပ်ငန်းသုံး MCP server များကို ချိတ်ဆက်ပြီး AI လက်ထောက်အား live data နှင့် enterprise tools များဖြင့် ချိတ်ဆက်အသုံးပြုပါ။',
    mcpConnectCustom: 'Custom MCP ချိတ်ဆက်မည်',
    mcpBrowseMarketplace: 'စျေးကွက်ကြည့်ရှုမည်',
    mcpActiveServers: 'ချိတ်ဆက်ထားသော Servers',
    mcpEnabledTools: 'အသုံးပြုနိုင်သော Tools များ',
    mcpAvgLatency: 'ပျမ်းမျှ တုံ့ပြန်ချိန်',
    mcpHealthStatus: 'လည်ပတ်မှု အခြေအနေ',
    mcpTestPing: 'Ping စမ်းသပ်မည်',
    mcpConfigure: 'ပြင်ဆင်မည်',
    mcpDiscoverTools: 'Tools ရှာဖွေမည်',
    mcpStepGeneral: '၁။ လိပ်စာနှင့် ပရိုတိုကော',
    mcpStepAuth: '၂။ လုံခြုံရေးနှင့် ခွင့်ပြုချက်',
    mcpStepTools: '၃။ Tools ရှာဖွေမှုနှင့် ခွင့်ပြုချက်များ',
    mcpServerName: 'Server အမည်',
    mcpTransport: 'ချိတ်ဆက်မှု အမျိုးအစား',
    mcpEndpointUrl: 'SSE Endpoint လိပ်စာ',
    mcpAuthHeaders: 'လုံခြုံရေး Headers (AES-256 ဖြင့် ကုဒ်ဝှက်ထားသည်)',
    mcpRequireApproval: 'အသုံးမပြုမီ သုံးစွဲသူထံမှ အတည်ပြုချက် တောင်းရန်',
    mcpSaveAndActivate: 'သိမ်းဆည်းပြီး စတင်အသုံးပြုမည်',
    multiTenantActive: 'လုပ်ငန်းစနစ် လည်ပတ်နေသည်',
    roleAdmin: 'ရာထူး: အက်ဒမင်',
    languageLabel: 'ဘာသာစကား',

    billingTitle: 'စာရင်းသွင်းမှုနှင့် အသုံးပြုမှု ကန့်သတ်ချက်များ',
    billingSubtitle:
      'လုပ်ငန်းသုံး အစီအစဉ်များ၊ လစဉ် Token စားသုံးမှုနှင့် ကန့်သတ်ချက်များကို စီမံခန့်ခွဲပါ။',
    currentPlan: 'လက်ရှိ အစီအစဉ်',
    billingCycle: 'ငွေပေးချေမှု ကာလ',
    tokenUsage: 'လစဉ် Token အသုံးပြုမှု',
    queryUsage: 'လစဉ် မေးမြန်းမှု အရေအတွက်',
    docUsage: 'ထည့်သွင်းထားသော မှတ်တမ်းများ',
    upgradePlan: 'အစီအစဉ် အဆင့်မြှင့်မည်',
    activeTier: 'လက်ရှိသုံးနေသည်',

    docsTitle: 'အကူအညီနှင့် လမ်းညွှန်မှတ်တမ်းများ',
    docsSubtitle: 'အသုံးပြုနည်း လမ်းညွှန်များ၊ အဆင့်ဆင့် လိုက်နာဆောင်ရွက်ပုံများနှင့် ဥပဒေရေးရာ မူဝါဒများ။',
    docsTabGuide: 'အသုံးပြုနည်း လမ်းညွှန်',
    docsTabTerms: 'အသုံးပြုမှု စည်းမျဉ်းများ',
    docsTabPrivacy: 'ပုဂ္ဂိုလ်ရေး လုံခြုံမှု မူဝါဒ',
    docsTabCookies: 'ကွတ်ကီးနှင့် သိမ်းဆည်းမှု',
    docsCtaChat: 'AI လက်ထောက်ကို သုံးမည်',
    docsLegalDisclaimer:
      'ဤစာတမ်းသည် AI စနစ်ဖြင့် အခြေခံလိုက်နာရန် ရေးဆွဲထားသော စံပြမူကြမ်းသာ ဖြစ်ပါသည်။ လုပ်ငန်းခွင် အပြည့်အဝ တရားဝင် ထုတ်ပြန်အသုံးပြုရန်အတွက် အရည်အချင်းပြည့်မီသော ဥပဒေအကြံပေးပညာရှင်နှင့် စစ်ဆေးအတည်ပြုရန် လိုအပ်ပါသည်။',

    geminiGreeting: 'ဘာကနေ စတင်မေးမြန်းလိုပါသလဲခင်ဗျာ?',
    geminiModeChat: 'စကားဝိုင်း',
    geminiModeTools: 'Live MCP Tools',
    geminiModeResearch: 'အသေးစိတ်သုတေသန',
    suggestionDbLive: 'Live database မှ ဝန်ထမ်းအချက်အလက်များ စစ်ဆေးမည်',
    modelFlashDesc: 'အမြန်ဆုံးအဖြေများ · 3.5 Flash-Lite',
    modelClaudeDesc: 'နေ့စဉ်အကူအညီနှင့် Code · Claude 3.5 Sonnet',
    modelGptDesc: 'အသေးစိတ်ဆန်းစစ်ချက် · GPT-4o',
    thinkingLevel: 'စဉ်းစားတွေးခေါ်မှုအဆင့်',

    chatWelcomeTitle: 'မင်္ဂလာပါ! ကျွန်ုပ်သည် VeriKnow ကုမ္ပဏီတွင်း AI လက်ထောက်ဖြစ်ပါသည်။',
    chatWelcomeDesc:
      'ကုမ္ပဏီမူဝါဒများ၊ အင်ဂျင်နီယာမှတ်တမ်းများ၊ အလုပ်ခွင်လမ်းညွှန်များနှင့် internal tools များအကြောင်း မည်သည့်အရာမဆို မေးမြန်းနိုင်ပါသည်။\n\nအဖြေတိုင်းတွင် တရားဝင် ကုမ္ပဏီမှတ်တမ်းများနှင့် တိုက်ရိုက်ချိတ်ဆက်ထားသော အကိုးအကား (Citations) များ ပါဝင်ပါသည်။',
    modelLabel: 'မော်ဒယ်:',
    suggestionsLabel: 'အကြံပြုချက်များ:',
    suggestionVpn: 'ကုမ္ပဏီ VPN ဘယ်လို ချိတ်ဆက်ရမလဲ?',
    suggestionLeave: 'နှစ်စဉ်ခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ?',
    suggestionAws: 'AWS လုံခြုံရေးနှင့် လမ်းညွှန်ချက်များ',
    suggestionMyanmarLeave: 'မြန်မာရုံးခွဲ ဝန်ထမ်းခွင့် မူဝါဒ',
    inputPlaceholder: 'ကုမ္ပဏီမူဝါဒ၊ VPN၊ ခွင့်ရက်၊ လုံခြုံရေးအကြောင်း မေးမြန်းပါ...',
    newConversation: 'စကားဝိုင်းအသစ်',
    pastConversations: 'ယခင် စကားဝိုင်းမှတ်တမ်းများ',
    noConversations: 'စကားဝိုင်းမှတ်တမ်း မရှိသေးပါ',
    searchingSources: 'ကုမ္ပဏီမှတ်တမ်းများကို ရှာဖွေစိစစ်နေပါသည်...',
    citedSources: 'ကိုးကားထားသော မှတ်တမ်းများ',
    openTicket: 'လက်မှတ်ဖွင့်မည်',
    ticketCreated: 'အကူအညီတောင်းခံလွှာ ဖွင့်ပြီးပါပြီ',
    feedbackHelpful: 'အသုံးဝင်သည်',
    feedbackUnhelpful: 'ပြင်ဆင်ရန်လိုသည်',

    createTicketTitle: 'ကုမ္ပဏီတွင်း အကူအညီတောင်းခံလွှာ ဖွင့်ရန်',
    ticketCategory: 'ဌာနအမျိုးအစား',
    ticketPriority: 'အရေးကြီးမှုအဆင့်',
    ticketSubject: 'မေးမြန်းမှုခေါင်းစဉ်',
    ticketDescription: 'အသေးစိတ်အချက်အလက်',
    cancel: 'မလုပ်တော့ပါ',
    submit: 'လက်မှတ်တင်သွင်းမည်',
    drawerTitle: 'ကိုးကားထားသော ကုမ္ပဏီမှတ်တမ်းများ',
    sourceDoc: 'မူရင်းမှတ်တမ်း',
    relevanceMatch: 'ကိုက်ညီမှုအဆင့်',

    // Home Landing Page
    landingBadge: 'လုပ်ငန်းသုံး ဉာဏ်ရည်တု အသိပညာ ရှာဖွေရေး စနစ်',
    landingHeroTitle: 'လုပ်ငန်းတွင်း အသိပညာနှင့် မူဝါဒများကို',
    landingHeroHighlight: 'တိကျခိုင်မာသော AI အဖြစ်သို့ ပြောင်းလဲပါ',
    landingHeroSubtitle:
      'PostgreSQL pgvector hybrid search၊ cross-encoder re-ranking နှင့် မူရင်းမှတ်တမ်းများကို တိုက်ရိုက်ကိုးကားစိစစ်နိုင်သော စနစ်ဖြင့် တည်ဆောက်ထားသည့် အဖွဲ့အစည်းသုံး AI လက်ထောက်။',
    landingCtaLaunch: 'AI လက်ထောက်ကို စတင်သုံးမည်',
    landingCtaDocs: 'လမ်းညွှန်မှတ်တမ်းများ ဖတ်ရှုမည်',
    landingCtaAdmin: 'အက်ဒမင် ထိန်းချုပ်ခွင့်',
    landingMockupQuery: 'နှစ်စဉ်ခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ?',
    landingMockupAnswer:
      'အမြဲတမ်းဝန်ထမ်းများအားလုံးသည် တစ်နှစ်လျှင် နှစ်စဉ် လုပ်သက်ခွင့် (Annual Leave) ရက်ပေါင်း ၂၀ အပြည့် ခံစားခွင့်ရှိပါသည်။ ထို့အပြင် တစ်နှစ်လျှင် အရေးပေါ်နှင့် ဆေးခွင့် ၁၀ ရက် ခံစားခွင့် ရှိပါသည် [1]။',
    landingMockupConfidence: 'ကိုးကားချက်ဖြင့် စိစစ်ပြီး (Citation-Verified)',
    landingMetricGrounded: 'အကိုးအကား ခိုင်လုံမှု',
    landingMetricGroundedDesc: 'အဖြေတိုင်းတွင် တရားဝင် ကုမ္ပဏီမူရင်းမှတ်တမ်း အကိုးအကား ပါဝင်သည်',
    landingMetricLatency: '< ၈၀၀ မီလီစက္ကန့်',
    landingMetricLatencyDesc: 'Redis Semantic Vector Cache ဖြင့် လျင်မြန်စွာ ပြန်လည်ဖြေကြားသည်',
    landingMetricModels: 'မော်ဒယ် ၃ မျိုး',
    landingMetricModelsDesc: 'Gemini 2.0၊ Claude 3.5 Sonnet နှင့် GPT-4o အကြား ပြောင်းလဲသုံးစွဲနိုင်သည်',
    landingMetricIsolation: 'သီးသန့်ခွဲခြားထားမှု',
    landingMetricIsolationDesc: 'Data Access Layer တွင် Org-ID အလိုက် တင်းကျပ်စွာ သီးသန့်ခွဲခြားထားသည်',

    landingFeaturesTitle: 'လုပ်ငန်းသုံး ယုံကြည်စိတ်ချရမှုနှင့် မြန်ဆန်မှုအတွက် တည်ဆောက်ထားသည်',
    landingFeaturesSubtitle:
      'လုံခြုံရေး၊ တိကျမှုနှင့် လုပ်ငန်းခွင် အထောက်အကူပြုနိုင်မှု အပြည့်အဝရရှိစေရန် အဆင့်တိုင်းကို စနစ်တကျ ရေးဆွဲထားပါသည်။',
    featHybridTitle: 'Hybrid Search (RRF စနစ်)',
    featHybridDesc:
      'Dense vector embeddings နှင့် BM25/tsvector စာလုံးအကိုက်ရှာဖွေမှုကို RRF algorithm ဖြင့် ပေါင်းစပ်ထားသည်။',
    featConnectorsTitle: 'တိုက်ရိုက်ချိတ်ဆက်နိုင်သော စနစ်များ',
    featConnectorsDesc:
      'Notion မှတ်တမ်းများ၊ Slack စကားဝိုင်းများနှင့် Google Drive ဖိုင်များကို အချိန်နှင့်တပြေးညီ အလိုအလျောက် ရယူသည်။',
    featSecurityTitle: 'လျှို့ဝှက်အချက်အလက်များ ဖုံးကွယ်စနစ်',
    featSecurityDesc:
      'AWS credentials၊ private tokens၊ credit cards နှင့် ဝန်ထမ်း PII များကို မသိမ်းဆည်းမီ အလိုအလျောက် ဖုံးကွယ်ပေးသည်။',
    featMyanmarTitle: 'မြန်မာစာသီးသန့် အင်ဂျင်',
    featMyanmarDesc:
      'မြန်မာစာ ပုဒ်မ (။) နှင့် ပုဒ်ဖြတ် (၊) များကို တိကျစွာ ခွဲခြမ်းစိစစ်နိုင်ပြီး ဘာသာစကား ၂ မျိုးဖြင့် ချိတ်ဆက်ကိုးကားနိုင်သည်။',
    featCircuitTitle: 'အလိုအလျောက် ပြောင်းလဲသုံးစွဲမှု စနစ်',
    featCircuitDesc:
      'မူရင်း Gemini Flash အခက်အခဲရှိပါက Claude Sonnet သို့မဟုတ် GPT-4o သို့ အလိုအလျောက် လွှဲပြောင်းပေးသည်။',
    featObservabilityTitle: 'စနစ်စောင့်ကြည့်မှု အပြည့်အစုံ',
    featObservabilityDesc:
      'Token ကုန်ကျစရိတ်၊ ကြာချိန်၊ သုံးစွဲသူ အကြံပြုချက်များနှင့် ဖြေဆိုရန်ကျန်သော မေးခွန်းများကို တိကျစွာ သုံးသပ်နိုင်သည်။',

    landingArchTitle: 'လုပ်ငန်းသုံး အဆင့်မြင့် ရှာဖွေရေး ဗိသုကာ',
    landingArchSubtitle:
      'မေးခွန်းမေးမြန်းမှုမှ ခိုင်လုံသောအဖြေရရှိသည်အထိ အဆင့်ဆင့် လုံခြုံစွာ စိစစ်ဆောင်ရွက်ပုံ။',
    landingTrustBadge: 'လုပ်ငန်းသုံး စည်းမျဉ်းလိုက်နာမှု',
    landingTrustTitle: 'သင့်ဒေတာများဖြင့် AI Model အား လုံးဝ လေ့ကျင့်သင်ကြားခြင်း မပြုပါ',
    landingTrustDesc:
      'ကုမ္ပဏီမှတ်တမ်းများ၊ Slack စကားဝိုင်းများနှင့် ဝန်ထမ်းများ မေးမြန်းချက်များကို ပြင်ပ AI model များ လေ့ကျင့်ရန် ဘယ်တော့မှ မသုံးပါ။ Tenant တစ်ခုစီ၏ ဒေတာများကို Data Access Layer တွင် တင်းကျပ်စွာ သီးသန့်ခွဲခြားထားပါသည်။',

    landingPricingTitle: 'ရှင်းလင်းပြီး ရွေးချယ်နိုင်သော အစီအစဉ်များ',
    landingPricingSubtitle:
      'အဖွဲ့ငယ်များအတွက် အခမဲ့ စတင်နိုင်ပြီး ကုမ္ပဏီကြီးများအတွက် ချဲ့ထွင်အသုံးပြုနိုင်ပါသည်။',
    landingPricingStarter: 'အခြေခံ အစီအစဉ်',
    landingPricingStarterPrice: '$၀',
    landingPricingStarterDesc: 'AI စနစ်ကို စတင်စမ်းသပ်လိုသော အဖွဲ့ငယ်များအတွက် သင့်လျော်သည်။',
    landingPricingPro: 'ပရော်ဖက်ရှင်နယ် အဖွဲ့',
    landingPricingProPrice: '$၄၉',
    landingPricingProDesc: 'Slack bot နှင့် အလိုအလျောက် Sync ပြုလုပ်ရန် လိုအပ်သော အဖွဲ့များအတွက်။',
    landingPricingEnterprise: 'လုပ်ငန်းကြီးများ',
    landingPricingEnterprisePrice: '$၂၉၉',
    landingPricingEnterpriseDesc: 'သီးသန့် Vector Partition၊ လစဉ် မေးမြန်းမှု ၁၀,၀၀၀ (Fair-use) နှင့် အထူးဝန်ဆောင်မှု။',
    landingPricingCta: 'စတင်အသုံးပြုမည်',

    landingTestimonialTitle: 'လက်တွေ့လုပ်ငန်းခွင် အသုံးချမှုပုံစံများ (Real-World Use Cases)',
    landingTestimonialSubtitle:
      'ဝန်ထမ်းအသစ် မိတ်ဆက်ခြင်းနှင့် ထပ်ခါတလဲလဲ မေးခွန်းများ ဖြေကြားရာတွင် အချိန်ကုန်သက်သာစေပုံများ။',

    landingFooterTagline:
      'ခေတ်မီ အင်ဂျင်နီယာ၊ ထုတ်ကုန်နှင့် HR အဖွဲ့များအတွက် တိကျခိုင်မာသော အဖွဲ့အစည်းသုံး AI အသိပညာ လက်ထောက်။',
    landingFooterRights: 'မူပိုင်ခွင့်များ ရယူထားပြီးဖြစ်သည်။ Next.js 15၊ NestJS နှင့် PostgreSQL တို့ဖြင့် တည်ဆောက်ထားသည်။',
  },
};

export function getTranslations(lang: Language): Translations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}
