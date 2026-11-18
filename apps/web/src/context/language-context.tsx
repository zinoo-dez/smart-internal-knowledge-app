'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'my';

interface Translations {
  // Navigation & Shell
  appTitle: string;
  appSubtitle: string;
  navWorkspace: string;
  navAssistant: string;
  navDocuments: string;
  navKnowledgeGaps: string;
  navAnalytics: string;
  navAuditLogs: string;
  navDocs: string;
  multiTenantActive: string;
  roleAdmin: string;
  languageLabel: string;

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
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appTitle: 'Internal Knowledge',
    appSubtitle: 'Enterprise Assistant',
    navWorkspace: 'Workspace',
    navAssistant: 'AI Assistant',
    navDocuments: 'Document Knowledge',
    navKnowledgeGaps: 'Knowledge Gaps',
    navAnalytics: 'Usage & Analytics',
    navAuditLogs: 'Audit & Compliance',
    navDocs: 'Help & Guides',
    multiTenantActive: 'Multi-Tenant Active',
    roleAdmin: 'Role: ADMIN',
    languageLabel: 'Language',

    docsTitle: 'Help Center & Documentation',
    docsSubtitle: 'Zero-knowledge user guides, workflow walkthroughs, and legal compliance policies.',
    docsTabGuide: 'User Guide',
    docsTabTerms: 'Terms & Conditions',
    docsTabPrivacy: 'Privacy Policy',
    docsTabCookies: 'Cookies & Storage',
    docsCtaChat: 'Open AI Assistant',
    docsLegalDisclaimer:
      'This is an AI-generated template for baseline compliance. For full production enterprise release, please have this reviewed by a qualified legal professional.',

    chatWelcomeTitle: 'Hello! I am your Smart Internal Knowledge Assistant.',
    chatWelcomeDesc:
      'Ask me any question regarding company policies, engineering documentation, onboarding, or internal tools.\n\nEvery answer includes verifiable citations directly linked to company documentation.',
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
  },
  my: {
    appTitle: 'ကုမ္ပဏီ ဗဟုသုတ လက်ထောက်',
    appSubtitle: 'Enterprise AI Assistant',
    navWorkspace: 'လုပ်ငန်းခွင်',
    navAssistant: 'AI လက်ထောက်',
    navDocuments: 'မှတ်တမ်းစာရွက်စာတမ်းများ',
    navKnowledgeGaps: 'မေးခွန်းလိုအပ်ချက်များ',
    navAnalytics: 'အသုံးပြုမှုနှင့် သုံးသပ်ချက်',
    navAuditLogs: 'လုံခြုံရေးနှင့် စစ်ဆေးမှု',
    navDocs: 'အကူအညီနှင့် လမ်းညွှန်',
    multiTenantActive: 'လုပ်ငန်းစနစ် လည်ပတ်နေသည်',
    roleAdmin: 'ရာထူး: အက်ဒမင်',
    languageLabel: 'ဘာသာစကား',

    docsTitle: 'အကူအညီနှင့် လမ်းညွှန်မှတ်တမ်းများ',
    docsSubtitle: 'အသုံးပြုနည်း လမ်းညွှန်များ၊ အဆင့်ဆင့် လိုက်နာဆောင်ရွက်ပုံများနှင့် ဥပဒေရေးရာ မူဝါဒများ။',
    docsTabGuide: 'အသုံးပြုနည်း လမ်းညွှန်',
    docsTabTerms: 'အသုံးပြုမှု စည်းမျဉ်းများ',
    docsTabPrivacy: 'ပုဂ္ဂိုလ်ရေး လုံခြုံမှု မူဝါဒ',
    docsTabCookies: 'ကွတ်ကီးနှင့် သိမ်းဆည်းမှု',
    docsCtaChat: 'AI လက်ထောက်ကို သုံးမည်',
    docsLegalDisclaimer:
      'ဤစာတမ်းသည် AI စနစ်ဖြင့် အခြေခံလိုက်နာရန် ရေးဆွဲထားသော စံပြမူကြမ်းသာ ဖြစ်ပါသည်။ လုပ်ငန်းခွင် အပြည့်အဝ တရားဝင် ထုတ်ပြန်အသုံးပြုရန်အတွက် အရည်အချင်းပြည့်မီသော ဥပဒေအကြံပေးပညာရှင်နှင့် စစ်ဆေးအတည်ပြုရန် လိုအပ်ပါသည်။',

    chatWelcomeTitle: 'မင်္ဂလာပါ! ကျွန်ုပ်သည် ကုမ္ပဏီ၏ AI လက်ထောက်ဖြစ်ပါသည်။',
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
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isMyanmar: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: TRANSLATIONS.en,
  isMyanmar: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('knowledge_assistant_lang');
      if (saved === 'my' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('knowledge_assistant_lang', lang);
    } catch {
      // Ignore localStorage access restrictions
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: TRANSLATIONS[language],
        isMyanmar: language === 'my',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
