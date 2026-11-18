'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ShieldCheck,
  FileText,
  Cookie,
  Zap,
  Languages,
  LifeBuoy,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Scale,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { DOCS_DATA, AdvantageItem } from '@/data/docs-data';

type DocTab = 'guide' | 'terms' | 'privacy' | 'cookies';

export default function DocsPage() {
  const { language, t, isMyanmar } = useLanguage();
  const [activeTab, setActiveTab] = useState<DocTab>('guide');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const currentDocs = DOCS_DATA[language];

  const getAdvantageIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      case 'Languages':
        return <Languages className="w-5 h-5 text-emerald-600" />;
      case 'LifeBuoy':
        return <LifeBuoy className="w-5 h-5 text-indigo-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-600" />;
    }
  };

  const tabs = [
    { id: 'guide' as DocTab, label: t.docsTabGuide, icon: BookOpen },
    { id: 'terms' as DocTab, label: t.docsTabTerms, icon: Scale },
    { id: 'privacy' as DocTab, label: t.docsTabPrivacy, icon: Lock },
    { id: 'cookies' as DocTab, label: t.docsTabCookies, icon: Cookie },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
            <BookOpen className="w-4 h-4" />
            <span>{language === 'my' ? 'ရုံးတွင်း အထောက်အကူပြု စင်တာ' : 'Enterprise Documentation Hub'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.docsTitle}</h1>
          <p className="text-sm text-slate-500 max-w-2xl">{t.docsSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            <Bot className="w-4 h-4" />
            <span>{t.docsCtaChat}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 flex items-center gap-2 overflow-x-auto shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap min-h-[44px] ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ZERO-KNOWLEDGE USER GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">{currentDocs.guide.heroTitle}</h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              {currentDocs.guide.heroSubtitle}
            </p>

            {/* Key Advantages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {currentDocs.guide.advantages.map((adv: AdvantageItem, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-white border border-slate-200 shadow-xs">
                      {getAdvantageIcon(adv.icon)}
                    </div>
                    <span className="font-semibold text-slate-900 text-xs">{adv.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5-Step Visual Walkthrough */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'my' ? 'လွယ်ကူသော အသုံးပြုနည်း အဆင့် (၅) ဆင့်' : '5-Step Quick Walkthrough'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'my'
                    ? 'မည်သည့် နည်းပညာ အထူးကျွမ်းကျင်စရာ မလိုဘဲ ချက်ချင်း စတင်အသုံးပြုနိုင်ပါသည်။'
                    : 'Start asking questions in under 30 seconds with zero technical experience.'}
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'ရိုးရှင်းလွယ်ကူ' : 'Zero-Jargon'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {currentDocs.guide.steps.map((st) => (
                <div
                  key={st.step}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between relative group hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {st.step}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 font-mono">
                        STEP 0{st.step}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900">{st.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{st.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-blue-600 font-medium">
                    {st.highlight}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Examples Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {language === 'my' ? 'လက်တွေ့ မေးမြန်းနိုင်သော နမူနာများ' : 'Real-World Inquiry Examples'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'my'
                ? 'အောက်ပါ မေးခွန်းနမူနာများကို ကလစ်နှိပ်၍ စကားပြောခန်းတွင် တိုက်ရိုက် မေးမြန်းနိုင်ပါသည်။'
                : 'Click any example query below to test it directly in the AI Assistant chat.'}
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 w-1/4">{language === 'my' ? 'ကဏ္ဍ' : 'Category'}</th>
                    <th className="p-3 w-1/3">{language === 'my' ? 'မေးမြန်းနိုင်သော မေးခွန်း' : 'What You Can Ask'}</th>
                    <th className="p-3">{language === 'my' ? 'ရရှိမည့် တုံ့ပြန်ချက်နှင့် ကိုးကားချက်' : 'Verified Output'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentDocs.guide.examples.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">{ex.category}</td>
                      <td className="p-3">
                        <Link
                          href="/chat"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          <span>"{ex.query}"</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600">{ex.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {language === 'my' ? 'မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများ (FAQ)' : 'Frequently Asked Questions (FAQ)'}
            </h3>

            <div className="space-y-2">
              {currentDocs.guide.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-lg overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors min-h-[44px]"
                    >
                      <span className="font-semibold text-xs text-slate-800">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERMS & CONDITIONS */}
      {activeTab === 'terms' && (
        <div className="space-y-6">
          {/* Legal Disclaimer Alert Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800 uppercase tracking-wide text-[11px] mb-0.5">
                {language === 'my' ? 'ဥပဒေရေးရာ အသိပေးချက် (Legal Disclaimer)' : 'Legal Disclaimer'}
              </div>
              <p>{t.docsLegalDisclaimer}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{currentDocs.terms.title}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'my'
                  ? 'နောက်ဆုံး အတည်ပြုသည့်နေ့: ၂၀၂၆ ခုနှစ်၊ နိုဝင်ဘာလ ၁၈ ရက်'
                  : 'Effective Date: November 18, 2026 | Scope: Enterprise Internal Deployment'}
              </p>
            </div>

            <div className="space-y-6">
              {currentDocs.terms.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                  <div className="space-y-1.5 pl-4 border-l-2 border-slate-200">
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx} className="text-xs text-slate-600 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY POLICY */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          {/* Legal Disclaimer Alert Banner */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-800 uppercase tracking-wide text-[11px] mb-0.5">
                {language === 'my' ? 'လုံခြုံရေးနှင့် ဒေတာ ကာကွယ်မှု အာမခံချက်' : 'Enterprise Privacy & Security Guarantee'}
              </div>
              <p>
                {language === 'my'
                  ? 'ကုမ္ပဏီတွင်း မေးမြန်းမှုများနှင့် စာရွက်စာတမ်းများကို အများပြည်သူသုံး AI မော်ဒယ်များ လေ့ကျင့်ရာတွင် လုံးဝ အသုံးမပြုပါ။'
                  : 'All queries and internal documents are strictly encrypted and never used for training public foundational AI models.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{currentDocs.privacy.title}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'my'
                  ? 'ဒေတာသီးသန့်ခွဲခြားမှု: Multi-Tenant Architecture (Clerk Auth + PostgreSQL pgvector)'
                  : 'Data Partitioning: Multi-Tenant Organization Isolation (Clerk Auth + PostgreSQL pgvector)'}
              </p>
            </div>

            <div className="space-y-6">
              {currentDocs.privacy.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                  <div className="space-y-1.5 pl-4 border-l-2 border-slate-200">
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx} className="text-xs text-slate-600 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COOKIES & LOCAL STORAGE */}
      {activeTab === 'cookies' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentDocs.cookies.title}</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {currentDocs.cookies.description}
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 w-1/4">Storage Key</th>
                    <th className="p-3 w-1/5">Type</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3 w-1/6">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentDocs.cookies.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-semibold text-blue-600">{item.key}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{item.purpose}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed">
              <strong>
                {language === 'my' ? 'ကွတ်ကီးများနှင့် သိုလှောင်မှု ရှင်းလင်းခြင်း:' : 'Managing Storage:'}
              </strong>{' '}
              {language === 'my'
                ? 'မိမိ browser ၏ setting မှတစ်ဆင့် local storage များကို အချိန်မရွေး ရှင်းလင်းနိုင်ပါသည်။ knowledge_app_lang ကို ရှင်းလင်းလိုက်ပါက စနစ်၏ ပုံမှန်ဘာသာစကား (English) သို့ ပြန်လည်ရောက်ရှိမည် ဖြစ်ပါသည်။'
                : 'You may clear your browser cookies and LocalStorage keys at any time via browser settings. Clearing knowledge_app_lang resets the interface language to the system default (English).'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
