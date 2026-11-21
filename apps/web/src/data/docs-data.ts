import { Language } from '@/context/language-context';

export interface GuideStep {
  step: number;
  title: string;
  description: string;
  highlight: string;
}

export interface AdvantageItem {
  icon: string;
  title: string;
  description: string;
}

export interface ExampleInquiry {
  category: string;
  query: string;
  outcome: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LegalSection {
  title: string;
  content: string[];
}

export interface CookieItem {
  key: string;
  type: string;
  purpose: string;
  duration: string;
}

export interface DocsBundle {
  guide: {
    heroTitle: string;
    heroSubtitle: string;
    advantages: AdvantageItem[];
    steps: GuideStep[];
    examples: ExampleInquiry[];
    faqs: FaqItem[];
  };
  terms: {
    title: string;
    sections: LegalSection[];
  };
  privacy: {
    title: string;
    sections: LegalSection[];
  };
  cookies: {
    title: string;
    description: string;
    items: CookieItem[];
  };
}

export const DOCS_DATA: Record<Language, DocsBundle> = {
  en: {
    guide: {
      heroTitle: 'Your 24/7 Digital Workplace Companion',
      heroSubtitle:
        'Instant, verified answers to any question about company policies, benefits, tools, and runbooks — with direct citations to official documents.',
      advantages: [
        {
          icon: 'Zap',
          title: 'Instant Answers, Zero Waiting',
          description:
            'No waiting days for HR or IT email replies. Get verified answers within seconds, anytime.',
        },
        {
          icon: 'ShieldCheck',
          title: 'Citation-Verified & Strictly Grounded',
          description:
            'Every single answer cites the official handbook or document with clickable proof [1].',
        },
        {
          icon: 'Languages',
          title: 'Bilingual (English & Myanmar)',
          description:
            'Ask in English or Myanmar. The assistant mirrors your language with clear, natural explanations.',
        },
        {
          icon: 'LifeBuoy',
          title: 'One-Click Support Tickets',
          description:
            'If a question cannot be answered from existing files, open an internal ticket with the right team instantly.',
        },
      ],
      steps: [
        {
          step: 1,
          title: 'Open the AI Assistant',
          description: 'Click on AI Assistant in the left navigation sidebar to enter the chat workspace.',
          highlight: 'Navigation Sidebar',
        },
        {
          step: 2,
          title: 'Choose Your Language',
          description: 'Toggle between EN and မြန်မာ at the top-right header at any time.',
          highlight: 'EN | မြန်မာ Toggle',
        },
        {
          step: 3,
          title: 'Ask Anything or Click a Suggestion',
          description:
            'Type your question in natural language, or click any prompt pill like "How do I setup company VPN?".',
          highlight: 'Natural Language Input',
        },
        {
          step: 4,
          title: 'Verify with Interactive Citations',
          description:
            'Click on any blue citation badge like [1] to slide open the official handbook excerpt and verify the facts.',
          highlight: 'Clickable [1], [2] Badges',
        },
        {
          step: 5,
          title: 'Give Feedback or Escalate',
          description:
            'Rate responses with Thumbs-Up 👍 or Thumbs-Down 👎, or click "Open Ticket" for human assistance.',
          highlight: 'Feedback & Support',
        },
      ],
      examples: [
        {
          category: 'Annual Leave & Holidays',
          query: 'How many days of annual leave do I have per year?',
          outcome: 'Shows 20 days entitlement with policy citations [1] and rollover rules.',
        },
        {
          category: 'Remote Work & VPN',
          query: 'How do I connect to company VPN from home?',
          outcome: 'Provides step-by-step WireGuard setup via 1Password and gateway port 51820 [1].',
        },
        {
          category: 'Medical & Sick Leave',
          query: 'What is the policy for medical leave if I get sick?',
          outcome: 'Explains 10-day medical allowance and medical certificate submission procedure [1].',
        },
        {
          category: 'Engineering Architecture',
          query: 'How do we deploy to production on AWS?',
          outcome: 'Details automated GitHub Actions deployment upon merge to main branch [1].',
        },
      ],
      faqs: [
        {
          question: 'Can other coworkers view my chat messages?',
          answer:
            'No. Your conversation threads are private to your user account and protected under your organization tenant.',
        },
        {
          question: 'What happens if the assistant does not find the information?',
          answer:
            'The assistant safely informs you that the information is missing from indexed documents, identifies the relevant department contact, and offers a 1-click button to open a support ticket.',
        },
        {
          question: 'Do I need to type formal keywords or technical jargon?',
          answer:
            'No. Simply type naturally as if you were messaging a colleague on Slack or Teams. The assistant understands everyday language.',
        },
      ],
    },
    terms: {
      title: 'Terms & Conditions of Service',
      sections: [
        {
          title: '1. Permitted Business Use',
          content: [
            'The VeriKnow Assistant is provided exclusively for authorized employees, contractors, and partners of the organization.',
            'Access is granted solely for internal business workflows, including policy lookups, engineering onboarding, and workplace information retrieval.',
          ],
        },
        {
          title: '2. User Accounts & Role-Based Access Control (RBAC)',
          content: [
            'Access is secured via Clerk Authentication and restricted to organization accounts.',
            'Users are assigned roles (ADMIN or MEMBER) governing access permissions. Bypassing authorization boundaries or attempting to access unauthorized department records is strictly prohibited.',
          ],
        },
        {
          title: '3. AI Grounding & Verification Notice',
          content: [
            'All responses are generated using enterprise generative AI models grounded in company records via Retrieval-Augmented Generation (RAG).',
            'Every response includes document citations. For contractual, legal, or safety decisions, users must verify the cited primary company document.',
          ],
        },
        {
          title: '4. Prohibited Activities',
          content: [
            'Users must not submit malicious inputs, attempt prompt injection or jailbreak attacks, or attempt to extract system prompts and proprietary algorithms.',
            'Exfiltrating confidential company documentation to external parties is a violation of employment agreements.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Enterprise Data Privacy & Security Policy',
      sections: [
        {
          title: '1. Categories of Processed Data',
          content: [
            'User Identity: Name, corporate email, role, and department from Clerk Auth.',
            'Conversation Logs: Query text, generated responses, citations, and model latency.',
            'Document Knowledge: Official PDF handbooks, Notion pages, and Slack messages uploaded by administrators.',
          ],
        },
        {
          title: '2. Automated Data Sanitizer (PII & Secret Masking)',
          content: [
            'Before ingestion and vector indexing, all text passes through the DataSanitizerService.',
            'Sensitive tokens including AWS access keys, private API keys, bearer tokens, SSNs, and credit cards are automatically redacted.',
          ],
        },
        {
          title: '3. Enterprise AI Providers & Zero Model Training Commitment',
          content: [
            'The platform uses Google Gemini, Anthropic Claude, and OpenAI via secure enterprise endpoints.',
            'Corporate queries and documentation are NEVER used to train, fine-tune, or improve public foundational AI models.',
          ],
        },
        {
          title: '4. Multi-Tenant Database Isolation',
          content: [
            'All PostgreSQL tables, pgvector embeddings, and Redis cache partitions are strictly isolated by organization ID.',
            'Cross-tenant data leakage is prevented via parameterized queries and middleware authorization checks.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies & Local Storage Policy',
      description:
        'The platform uses only strictly necessary session cookies and browser LocalStorage keys. We do not use third-party marketing, analytics, or tracking cookies.',
      items: [
        {
          key: '__session',
          type: 'Essential Cookie',
          purpose: 'Maintains secure single sign-on (SSO) session state via Clerk Auth.',
          duration: 'Session duration',
        },
        {
          key: 'veriknow_lang',
          type: 'Preferences Cookie',
          purpose: 'Stores your preferred interface language (en for English, my for Myanmar) for server-side rendering.',
          duration: '1 year',
        },
        {
          key: 'knowledge_assistant_lang',
          type: 'LocalStorage',
          purpose: 'Legacy fallback key for your preferred interface language.',
          duration: 'Persistent until cleared',
        },
        {
          key: 'theme',
          type: 'LocalStorage',
          purpose: 'Remembers light-mode visual design system preferences.',
          duration: 'Persistent until cleared',
        },
      ],
    },
  },
  my: {
    guide: {
      heroTitle: 'သင်၏ ၂၄ နာရီ ရုံးတွင်း ဒစ်ဂျစ်တယ် လုပ်ဖော်ကိုင်ဖက်ကောင်း',
      heroSubtitle:
        'ကုမ္ပဏီမူဝါဒများ၊ ခွင့်ရက်များ၊ ရုံးသုံး tools များနှင့် စနစ်လမ်းညွှန်များကို တရားဝင် စာရွက်စာတမ်း ကိုးကားချက်များဖြင့် စက္ကန့်ပိုင်းအတွင်း တိကျစွာ ရှာဖွေဖြေကြားပေးပါသည်။',
      advantages: [
        {
          icon: 'Zap',
          title: 'စောင့်ဆိုင်းစရာမလိုဘဲ ချက်ချင်းအဖြေရခြင်း',
          description:
            'HR သို့မဟုတ် IT ထံ အီးမေးလ်ပို့ပြီး ရက်ပေါင်းများစွာ စောင့်စရာမလိုဘဲ အချိန်မရွေး ချက်ချင်း အဖြေရရှိနိုင်ပါသည်။',
        },
        {
          icon: 'ShieldCheck',
          title: 'ခိုင်လုံသော အကိုးအကားဖြင့် စိစစ်ထားခြင်း',
          description:
            'အဖြေတိုင်းတွင် တရားဝင် ကုမ္ပဏီစာရွက်စာတမ်း မူရင်းကိုးကားချက် [1] ပါဝင်ပါသည်။',
        },
        {
          icon: 'Languages',
          title: 'မြန်မာစာနှင့် အင်္ဂလိပ်စာ ၂ မျိုးလုံး သုံးနိုင်ခြင်း',
          description:
            'အင်္ဂလိပ်လိုဖြစ်စေ၊ မြန်မာလိုဖြစ်စေ လွတ်လပ်စွာ မေးမြန်းနိုင်ပြီး သဘာဝကျသော ဘာသာစကားဖြင့် ပြန်လည်ဖြေကြားပေးပါသည်။',
        },
        {
          icon: 'LifeBuoy',
          title: 'အကူအညီတောင်းခံလွှာ ချက်ချင်းဖွင့်နိုင်ခြင်း',
          description:
            'စာရွက်စာတမ်းများထဲတွင် မပါရှိသော မေးခွန်းများအတွက် သက်ဆိုင်ရာဌာနထံ Support Ticket ချက်ချင်း ပေးပို့နိုင်ပါသည်။',
        },
      ],
      steps: [
        {
          step: 1,
          title: 'AI လက်ထောက်ကို ဖွင့်ပါ',
          description: 'ဘယ်ဘက် မီနူးဘားရှိ "AI လက်ထောက်" ကို နှိပ်၍ စကားပြောခန်းသို့ ဝင်ရောက်ပါ။',
          highlight: 'မီနူးဘား ရွေးချယ်မှု',
        },
        {
          step: 2,
          title: 'ဘာသာစကားကို ရွေးချယ်ပါ',
          description: 'စခရင် အပေါ်ညာဘက်ထောင့်တွင် EN နှင့် မြန်မာ အကြား မိမိနှစ်သက်ရာကို အချိန်မရွေး ပြောင်းလဲနိုင်ပါသည်။',
          highlight: 'EN | မြန်မာ ခလုတ်',
        },
        {
          step: 3,
          title: 'သိလိုသည်ကို လွတ်လပ်စွာ မေးမြန်းပါ',
          description:
            'မေးခွန်းကို ရိုက်ထည့်ပါ သို့မဟုတ် "ကုမ္ပဏီ VPN ဘယ်လို ချိတ်ဆက်ရမလဲ?" စသည့် အကြံပြုခလုတ်များကို နှိပ်ပါ။',
          highlight: 'သဘာဝစကားပြော စာရိုက်နေရာ',
        },
        {
          step: 4,
          title: 'ကိုးကားချက် အထောက်အထားကို စစ်ဆေးပါ',
          description:
            'အပြာရောင် ကိုးကားနံပါတ် [1] ကို နှိပ်လိုက်ပါက ညာဘက်တွင် ကုမ္ပဏီလက်စွဲ မူရင်းစာပိုဒ် ပွင့်လာပါမည်။',
          highlight: 'နှိပ်နိုင်သော [1], [2] Badges',
        },
        {
          step: 5,
          title: 'အမှတ်ပေးပါ သို့မဟုတ် လက်မှတ်ဖွင့်ပါ',
          description:
            'အဖြေကို သဘောကျပါက 👍 ကို နှိပ်ပါ၊ လူကိုယ်တိုင် ထပ်မံကူညီရန်လိုပါက "လက်မှတ်ဖွင့်မည်" ကို နှိပ်ပါ။',
          highlight: 'တုံ့ပြန်ချက်နှင့် အကူအညီ',
        },
      ],
      examples: [
        {
          category: 'နှစ်စဉ်ခွင့်နှင့် အလုပ်ပိတ်ရက်',
          query: 'နှစ်စဉ်ခွင့် ခံစားခွင့် မူဝါဒက ဘာလဲ?',
          outcome: 'နှစ်စဉ် လုပ်သက်ခွင့် ၂၀ ရက် ခံစားခွင့်ရှိကြောင်း မူရင်းကိုးကားချက် [1] ဖြင့် ရှင်းပြပေးသည်။',
        },
        {
          category: 'ရုံးပြင်ပ အလုပ်လုပ်ခြင်းနှင့် VPN',
          query: 'ကုမ္ပဏီ VPN ချိတ်ဖို့ ဘာတွေလိုအပ်သလဲ?',
          outcome: '1Password မှ WireGuard config ရယူခြင်းနှင့် port 51820 ချိတ်ဆက်ပုံကို ဖော်ပြပေးသည် [1]။',
        },
        {
          category: 'နေမကောင်း၍ ဆေးခွင့်ယူခြင်း',
          query: 'နေမကောင်းလို့ ဆေးခွင့်ယူချင်ရင် ဘယ်လိုလုပ်ရမလဲ?',
          outcome: 'ဆေးခွင့် ၁၀ ရက် ခံစားခွင့်နှင့် ဆေးလက်မှတ်တင်ပြရမည့် စည်းမျဉ်းကို ပြသပေးသည် [1]။',
        },
        {
          category: 'နည်းပညာနှင့် စနစ်လမ်းညွှန်',
          query: 'စနစ်ကို Production ပေါ် တင်ဖို့ ဘာအဆင့်တွေ လိုအပ်သလဲ?',
          outcome: 'GitHub Actions မှတစ်ဆင့် main branch သို့ merge ချိန် အလိုအလျောက် deploy ဖြစ်ပုံကို ဖော်ပြသည် [1]။',
        },
      ],
      faqs: [
        {
          question: 'ကျွန်ုပ် မေးမြန်းထားသော မေးခွန်းများကို အခြားသူများ မြင်နိုင်ပါသလား?',
          answer:
            'မမြင်နိုင်ပါ။ သင်၏ စကားပြောမှတ်တမ်းများသည် သင်၏ ကိုယ်ပိုင် အကောင့်ထဲတွင်သာ လုံခြုံစွာ သီးသန့်တည်ရှိပါသည်။',
        },
        {
          question: 'လက်ထောက်က အချက်အလက် မတွေ့ရှိပါဟု ဖြေကြားပါက မည်သို့လုပ်ရမည်နည်း?',
          answer:
            'လက်ထောက်သည် မှန်းဆဖြေကြားခြင်း မပြုဘဲ မည်သည့်ဌာနထံ ဆက်သွယ်ရမည်ကို အီးမေးလ်၊ Slack အကောင့်များနှင့်တကွ ဖော်ပြပေးမည်ဖြစ်ပြီး Support Ticket ချက်ချင်း ဖွင့်ပေးနိုင်ပါသည်။',
        },
        {
          question: 'မေးခွန်းမေးရာတွင် ရုံးသုံးစကားလုံး အခေါ်အဝေါ် အခက်အခဲများ သုံးရန် လိုပါသလား?',
          answer:
            'မလိုပါ။ လုပ်ဖော်ကိုင်ဖက် အချင်းချင်း နေ့စဉ် စကားပြောသကဲ့သို့ သဘာဝကျကျသာ ရိုက်ထည့် မေးမြန်းနိုင်ပါသည်။',
        },
      ],
    },
    terms: {
      title: 'အသုံးပြုမှု စည်းမျဉ်းနှင့် သတ်မှတ်ချက်များ (Terms & Conditions)',
      sections: [
        {
          title: '၁။ ခွင့်ပြုထားသော အသုံးပြုမှု နယ်ပယ်',
          content: [
            'ဤစနစ်သည် ကုမ္ပဏီ၏ တရားဝင် ဝန်ထမ်းများနှင့် တာဝန်ရှိသူများသာ အသုံးပြုရန် သီးသန့် ကန့်သတ်ထားပါသည်။',
            'ကုမ္ပဏီ မူဝါဒများ၊ ဝန်ထမ်းလမ်းညွှန်များနှင့် လုပ်ငန်းဆိုင်ရာ အချက်အလက်များကို ရှာဖွေဖတ်ရှုရန်အတွက်သာ အသုံးပြုခွင့် ရှိပါသည်။',
          ],
        },
        {
          title: '၂။ အကောင့်နှင့် ဝင်ရောက်ခွင့် အဆင့်သတ်မှတ်ချက် (RBAC)',
          content: [
            'Clerk Authentication စနစ်ဖြင့် လုံခြုံစွာ စစ်ဆေးအတည်ပြုထားသော အကောင့်များသာ ဝင်ရောက်ခွင့်ရရှိသည်။',
            'အက်ဒမင် (ADMIN) သို့မဟုတ် အဖွဲ့ဝင် (MEMBER) အလိုက် ခွင့်ပြုထားသော စာရွက်စာတမ်းများကိုသာ ဖတ်ရှုခွင့်ရှိပြီး အခြားဌာန၏ လျှို့ဝှက်စာရွက်စာတမ်းများကို ရယူရန် ကြိုးပမ်းခြင်းကို တားမြစ်ပါသည်။',
          ],
        },
        {
          title: '၃။ AI စနစ်၏ တုံ့ပြန်ချက်များနှင့် စစ်ဆေးခြင်းဆိုင်ရာ အသိပေးချက်',
          content: [
            'ကုမ္ပဏီ စာရွက်စာတမ်းများကို အခြေခံ၍ RAG နည်းပညာဖြင့် တုံ့ပြန်ချက်များ ထုတ်ပေးခြင်း ဖြစ်ပါသည်။',
            'အဖြေတိုင်းတွင် တရားဝင် ကိုးကားချက်များ ပါဝင်သော်လည်း၊ ဥပဒေကြောင်းအရ အရေးပါသော ဆုံးဖြတ်ချက်များတွင် မူရင်းကိုးကားစာရွက်စာတမ်းကို ပြန်လည်စစ်ဆေး အတည်ပြုရန် လိုအပ်ပါသည်။',
          ],
        },
        {
          title: '၄။ တားမြစ်ထားသော အပြုအမူများ',
          content: [
            'စနစ်၏ လုံခြုံရေးစည်းမျဉ်းများကို ကျော်လွှားရန် ကြိုးပမ်းခြင်း (Prompt Injection / Jailbreak) သို့မဟုတ် လျှို့ဝှက် prompt များကို ထုတ်ဖော်ရန် ကြိုးပမ်းခြင်းကို တားမြစ်သည်။',
            'ကုမ္ပဏီတွင်း လျှို့ဝှက်အချက်အလက်များကို ပြင်ပသို့ ခွင့်ပြုချက်မရှိဘဲ ပေါက်ကြားစေခြင်းသည် ဝန်ထမ်းစည်းကမ်း ဖောက်ဖျက်မှု ဖြစ်သည်။',
          ],
        },
      ],
    },
    privacy: {
      title: 'ပုဂ္ဂိုလ်ရေးဆိုင်ရာ အချက်အလက် လုံခြုံမှု မူဝါဒ (Privacy Policy)',
      sections: [
        {
          title: '၁။ ရယူကိုင်တွယ်သော အချက်အလက်များ',
          content: [
            'အသုံးပြုသူ အထောက်အထား: အမည်၊ အီးမေးလ်၊ ရာထူးနှင့် သက်ဆိုင်ရာ ဌာန။',
            'စကားပြောမှတ်တမ်းများ: မေးမြန်းခဲ့သော မေးခွန်းများ၊ ရွေးချယ်ခဲ့သော ဘာသာစကားနှင့် တုံ့ပြန်ချက်များ။',
            'ရုံးတွင်း စာရွက်စာတမ်းများ: အက်ဒမင်များ တင်သွင်းထားသော PDF၊ Notion နှင့် Slack မှတ်တမ်းများ။',
          ],
        },
        {
          title: '၂။ လျှို့ဝှက်အချက်အလက်များ အလိုအလျောက် ဖယ်ရှားခြင်း (Data Sanitizer)',
          content: [
            'စာရွက်စာတမ်းများ တင်သွင်းချိန်နှင့် မေးခွန်းမေးမြန်းချိန်တိုင်းတွင် Data Sanitizer စနစ်က စစ်ဆေးပေးသည်။',
            'AWS access keys၊ Private API keys၊ စကားဝှက်များ၊ SSN နှင့် credit card နံပါတ်များကို အလိုအလျောက် mask လုပ်ပစ်သည်။',
          ],
        },
        {
          title: '၃။ ပြင်ပ AI ပံ့ပိုးသူများနှင့် ဒေတာလုံခြုံမှု အာမခံချက်',
          content: [
            'Google Gemini, Anthropic Claude နှင့် OpenAI တို့၏ enterprise လိုင်းများကို အသုံးပြုထားသည်။',
            'ကုမ္ပဏီ၏ အချက်အလက်များကို အများပြည်သူသုံး AI မော်ဒယ်များ သင်ကြားလေ့ကျင့်ရာတွင် လုံးဝ အသုံးမပြုပါ။',
          ],
        },
        {
          title: '၄။ အဖွဲ့အစည်းအလိုက် သီးသန့်ခွဲခြားထားမှု (Multi-Tenancy)',
          content: [
            'ဒေတာဘေ့စ်အတွင်းရှိ စာရွက်စာတမ်းများနှင့် မှတ်တမ်းများကို organization ID ဖြင့် တင်းကြပ်စွာ သီးခြားစီ ခွဲခြားထားသည်။',
            'အခြားကုမ္ပဏီ သို့မဟုတ် ပြင်ပအဖွဲ့အစည်းများထံ ဒေတာပေါက်ကြားမှု လုံးဝ မရှိစေရန် စီမံထားပါသည်။',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies နှင့် ဒေသတွင်း ဒေတာသိမ်းဆည်းမှုဆိုင်ရာ မူဝါဒ',
      description:
        'ဤစနစ်သည် စီးပွားဖြစ် ကြော်ငြာ cookies များနှင့် ခြေရာခံခြင်းများကို လုံးဝ အသုံးမပြုပါ။ စနစ်လည်ပတ်ရန် မဖြစ်မနေ လိုအပ်သော အောက်ပါ အချက်များကိုသာ သိမ်းဆည်းပါသည်:',
      items: [
        {
          key: '__session',
          type: 'မရှိမဖြစ် လိုအပ်သော Cookie',
          purpose: 'လုံခြုံစွာ ဝင်ရောက်နိုင်ရန် (Login Session) ထိန်းသိမ်းပေးသည်။',
          duration: 'အကောင့်ဖွင့်ထားချိန်အထိ',
        },
        {
          key: 'knowledge_app_lang',
          type: 'LocalStorage',
          purpose: 'သင်ရွေးချယ်ထားသော ဘာသာစကား (en သို့မဟုတ် my) ကို မှတ်သားပေးသည်။',
          duration: 'ဖျက်မပစ်မချင်း',
        },
        {
          key: 'theme',
          type: 'LocalStorage',
          purpose: 'အလင်းရောင်ပုံစံ သတ်မှတ်ချက်ကို မှတ်သားပေးသည်။',
          duration: 'ဖျက်မပစ်မချင်း',
        },
      ],
    },
  },
};
