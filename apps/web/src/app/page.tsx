'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Bot,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Network,
  Languages,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Lock,
  Zap,
  Users,
  FileText,
} from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export default function HomePage() {
  const { t, isMyanmar } = useLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const features = [
    {
      icon: Layers,
      title: t.featHybridTitle,
      description: t.featHybridDesc,
      tag: 'PostgreSQL + pgvector',
    },
    {
      icon: Network,
      title: t.featConnectorsTitle,
      description: t.featConnectorsDesc,
      tag: 'Slack + Notion + Drive',
    },
    {
      icon: ShieldCheck,
      title: t.featSecurityTitle,
      description: t.featSecurityDesc,
      tag: 'Automated Redaction',
    },
    {
      icon: Languages,
      title: t.featMyanmarTitle,
      description: t.featMyanmarDesc,
      tag: 'Syllable Chunking (။ / ၊)',
    },
    {
      icon: Cpu,
      title: t.featCircuitTitle,
      description: t.featCircuitDesc,
      tag: 'Gemini + Claude + GPT-4o',
    },
    {
      icon: BarChart3,
      title: t.featObservabilityTitle,
      description: t.featObservabilityDesc,
      tag: 'LangSmith + Token Meters',
    },
  ];

  const pricingTiers = [
    {
      name: t.landingPricingStarter,
      price: t.landingPricingStarterPrice,
      period: isMyanmar ? '/ လစဉ်' : '/ month',
      description: t.landingPricingStarterDesc,
      popular: false,
      features: isMyanmar
        ? [
            'လစဉ် မေးမြန်းမှု ၅၀ အထိ',
            'မှတ်တမ်းစာရွက်စာတမ်း ၅ ခု အထိ',
            'Gemini 2.0 Flash မော်ဒယ်',
            'အခြေခံ Hybrid Vector Search',
            'အများသုံး လမ်းညွှန်မှတ်တမ်းများ',
          ]
        : [
            'Up to 50 queries / month',
            '5 indexed company documents',
            'Gemini 2.0 Flash engine',
            'Basic Hybrid Vector Search',
            'Community documentation access',
          ],
    },
    {
      name: t.landingPricingPro,
      price: t.landingPricingProPrice,
      period: isMyanmar ? '/ လစဉ်' : '/ month',
      description: t.landingPricingProDesc,
      popular: true,
      features: isMyanmar
        ? [
            'လစဉ် မေးမြန်းမှု ၁,၀၀၀ အထိ',
            'မှတ်တမ်းစာရွက်စာတမ်း ၅၀ အထိ',
            'Claude 3.5 Sonnet & GPT-4o ရွေးချယ်ခွင့်',
            'Slack Bot & Notion Auto-Sync',
            'Redis Semantic Vector Cache (0-Latency)',
            'အီးမေးလ် ဦးစားပေး အကူအညီ',
          ]
        : [
            'Up to 1,000 queries / month',
            '50 indexed company documents',
            'Claude 3.5 & GPT-4o model selector',
            'Slack Bot & Notion auto-sync',
            'Redis Semantic Cache (0-Latency)',
            'Priority email support',
          ],
    },
    {
      name: t.landingPricingEnterprise,
      price: t.landingPricingEnterprisePrice,
      period: isMyanmar ? '/ လစဉ်' : '/ month',
      description: t.landingPricingEnterpriseDesc,
      popular: false,
      features: isMyanmar
        ? [
            'အကန့်အသတ်မရှိ မေးမြန်းနိုင်ခြင်း',
            'အကန့်အသတ်မရှိ မှတ်တမ်းများ ထည့်သွင်းနိုင်ခြင်း',
            'သီးသန့် Vector Database Partition',
            'Enterprise Audit Logs & CSV Export',
            'Circuit Breaker High-Availability SLA',
            '၂၄/၇ သီးသန့် အင်ဂျင်နီယာ အကူအညီ',
          ]
        : [
            'Unlimited monthly queries',
            'Unlimited document storage',
            'Dedicated vector database partition',
            'Enterprise Audit Logs & CSV export',
            'Circuit Breaker 99.9% uptime SLA',
            '24/7 dedicated engineering support',
          ],
    },
  ];

  const testimonials = [
    {
      quote: isMyanmar
        ? 'အင်ဂျင်နီယာအသစ်များ Onboarding လုပ်ရာတွင် မေးလေ့ရှိသော VPN၊ CI/CD နှင့် AWS လမ်းညွှန်များကို ချက်ချင်း အကိုးအကားနှင့်တကွ ဖြေပေးနိုင်၍ အချိန် ၁၅ နာရီကျော် သက်သာစေပါသည်။'
        : 'Saved our engineering team 15+ hours weekly answering repeating onboarding questions about VPN, CI/CD, and AWS credentials with verifiable handbook links.',
      author: 'Aung Zaw Htet',
      role: isMyanmar ? 'အကြီးတန်း အင်ဂျင်နီယာ မန်နေဂျာ' : 'VP of Engineering',
      company: 'Fintech Enterprise',
    },
    {
      quote: isMyanmar
        ? 'ဝန်ထမ်းခွင့်ရက်နှင့် ကျန်းမာရေးခံစားခွင့် မူဝါဒများကို မြန်မာလို မေးသည်ဖြစ်စေ၊ အင်္ဂလိပ်လို မေးသည်ဖြစ်စေ လက်စွဲစာအုပ် မူရင်းစာမျက်နှာကို တိကျစွာ ကိုးကားပေးနိုင်ပါသည်။'
        : 'Policy inquiries in both English and Burmese are answered instantly with exact handbook citations. Zero hallucinations and absolute peace of mind.',
      author: 'May Thu Lin',
      role: isMyanmar ? 'လူ့စွမ်းအားအရင်းအမြစ် ဒါရိုက်တာ' : 'Head of People & HR',
      company: 'Logistics Group',
    },
    {
      quote: isMyanmar
        ? 'ဒေတာများ မသိမ်းဆည်းမီ AWS key များနှင့် ကိုယ်ရေးအချက်အလက်များကို အလိုအလျောက် Masking ပြုလုပ်ပေးသည့် Data Sanitizer စနစ်က ကျွန်ုပ်တို့၏ Security Audit ကို အပြည့်အဝ အောင်မြင်စေခဲ့သည်။'
        : 'The automated PII sanitizer and strict tenant isolation passed our enterprise compliance audit without a single flag. A benchmark in AI security.',
      author: 'David Harrison',
      role: isMyanmar ? 'သတင်းအချက်အလက် လုံခြုံရေး အရာရှိချုပ်' : 'Chief Information Security Officer',
      company: 'Cloud Services Corp',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Public Marketing Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-blue-700 transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight block leading-tight">
                {t.appTitle}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                {t.appSubtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              {isMyanmar ? 'အဓိက စွမ်းဆောင်ချက်များ' : 'Features'}
            </a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">
              {isMyanmar ? 'စနစ်ဗိသုကာ' : 'Architecture'}
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              {isMyanmar ? 'အစီအစဉ်များ' : 'Pricing'}
            </a>
            <Link href="/docs" className="hover:text-blue-600 transition-colors">
              {t.navDocs}
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/admin/documents"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              {t.landingCtaAdmin}
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.landingCtaLaunch}</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher compact />
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-landing-nav"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div id="mobile-landing-nav" className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
            >
              {isMyanmar ? 'အဓိက စွမ်းဆောင်ချက်များ' : 'Features'}
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
            >
              {isMyanmar ? 'စနစ်ဗိသုကာ' : 'Architecture'}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
            >
              {isMyanmar ? 'အစီအစဉ်များ' : 'Pricing'}
            </a>
            <Link
              href="/docs"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
            >
              {t.navDocs}
            </Link>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/chat"
                onClick={() => setMobileNavOpen(false)}
                className="w-full text-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                {t.landingCtaLaunch}
              </Link>
              <Link
                href="/admin/documents"
                onClick={() => setMobileNavOpen(false)}
                className="w-full text-center px-4 py-2.5 rounded-lg bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              >
                {t.landingCtaAdmin}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {/* 2. Hero Section with Live Assistant Mockup */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.landingBadge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight md:leading-tight mb-6">
              {t.landingHeroTitle}{' '}
              <span className="text-blue-600 underline decoration-blue-200 decoration-wavy underline-offset-4">
                {t.landingHeroHighlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
              {t.landingHeroSubtitle}
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
              <Link
                href="/chat"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all min-h-[44px]"
              >
                <span>{t.landingCtaLaunch}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[44px]"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>{t.landingCtaDocs}</span>
              </Link>
            </div>
          </div>

          {/* Interactive Assistant Showcase Preview Card */}
          <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {/* Top Bar */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                </div>
                <span className="ml-2 font-medium text-slate-600 font-mono text-[11px]">
                  Internal Knowledge Assistant · Gemini 2.0 Flash (Active)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  {t.landingMockupConfidence}
                </span>
              </div>
            </div>

            {/* Chat Body Mockup */}
            <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
              {/* User Question */}
              <div className="flex justify-end items-start gap-2.5">
                <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-none max-w-lg shadow-sm font-medium">
                  {t.landingMockupQuery}
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
                  U
                </div>
              </div>

              {/* Assistant Answer */}
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 text-slate-800 text-sm p-4 rounded-2xl rounded-tl-none max-w-xl shadow-sm space-y-3">
                  <p className="leading-relaxed">
                    {t.landingMockupAnswer.replace(' [1]', '')}{' '}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                      [1]
                    </span>
                  </p>

                  {/* Cited Sources Drawer */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      <span>{t.citedSources}:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        <span className="font-semibold">[1]</span>
                        <span>
                          {isMyanmar
                            ? 'မြန်မာရုံးခွဲ ဝန်ထမ်းလက်စွဲ (Leave Policy Handbook)'
                            : 'Myanmar Office Leave & Workplace Policy'}
                        </span>
                        <span className="text-[10px] text-blue-500 font-mono">p. 14</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Input Preview */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 px-4">
              <span className="truncate">{t.inputPlaceholder}</span>
              <Link
                href="/chat"
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
              >
                {t.landingCtaLaunch}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KPI Proof Metrics Strip */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tracking-tight mb-1">
                {t.landingMetricGrounded}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                {isMyanmar ? 'ခိုင်လုံသော အကိုးအကား' : 'Zero Hallucinations'}
              </div>
              <div className="text-[11px] text-slate-500">{t.landingMetricGroundedDesc}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight mb-1">
                {t.landingMetricLatency}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                {isMyanmar ? 'အမြန်ဆန်ဆုံး ကြာချိန်' : 'Sub-Second Retrieval'}
              </div>
              <div className="text-[11px] text-slate-500">{t.landingMetricLatencyDesc}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight mb-1">
                {t.landingMetricModels}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                {isMyanmar ? 'အလိုအလျောက် ပြောင်းလဲမှု' : 'Multi-Model Fallback'}
              </div>
              <div className="text-[11px] text-slate-500">{t.landingMetricModelsDesc}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight mb-1">
                {t.landingMetricIsolation}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                {isMyanmar ? 'အဖွဲ့အစည်း သီးသန့်ခွဲခြားမှု' : 'Tenant Row Isolation'}
              </div>
              <div className="text-[11px] text-slate-500">{t.landingMetricIsolationDesc}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Six Enterprise Feature Pillars */}
      <section id="features" className="py-20 md:py-28 bg-slate-50/60 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t.landingFeaturesTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.landingFeaturesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
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

      {/* 5. Enterprise Architecture & Privacy Trust Section */}
      <section id="architecture" className="py-20 bg-white border-y border-slate-200 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t.landingArchTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.landingArchSubtitle}
            </p>
          </div>

          {/* 4-Step Architecture Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-mono font-bold text-blue-600 mb-1">01 / SECURITY GATEWAY</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {isMyanmar ? 'အဖွဲ့အစည်း စိစစ်ခြင်း' : 'Tenant Auth & PII Masking'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isMyanmar
                  ? 'Clerk RBAC guard နှင့် AWS token များ၊ လျှို့ဝှက်ကုဒ်များကို အလိုအလျောက် ဖုံးကွယ်ခြင်း။'
                  : 'Clerk RBAC token verification and automatic redaction of AWS secrets & employee PII.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-mono font-bold text-blue-600 mb-1">02 / 0-LATENCY CACHE</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {isMyanmar ? 'Redis Vector Cache' : 'Redis Semantic Cache'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isMyanmar
                  ? 'တူညီသော မေးခွန်းများအတွက် Cosine similarity > 0.96 ဖြင့် LLM မခေါ်ဘဲ ချက်ချင်း ဖြေကြားခြင်း။'
                  : 'Instantaneous hit for frequent questions (>0.96 similarity), eliminating API token costs.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-mono font-bold text-blue-600 mb-1">03 / HYBRID RETRIEVAL</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {isMyanmar ? 'pgvector + BM25 RRF' : 'PostgreSQL RRF Search'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isMyanmar
                  ? 'Dense vector နှင့် စာလုံးအကိုက်ရှာဖွေမှုကို ပေါင်းစပ်ပြီး အကိုက်ညီဆုံး အပိုင်းများကို စီစစ်ခြင်း။'
                  : 'Reciprocal Rank Fusion merges semantic embeddings with keyword matching for high precision.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-mono font-bold text-blue-600 mb-1">04 / VERIFIED ANSWER</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {isMyanmar ? 'အကိုးအကား အပြည့်အစုံ' : 'Grounded Citation Output'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isMyanmar
                  ? 'စစ်ဆေးနိုင်သော Document Citation [1], [2] များနှင့်တကွ Circuit Breaker အကာအကွယ်ဖြင့် ဖြေဆိုခြင်း။'
                  : 'Strict XML boundaries and Zod schema synthesis with clickable citation drawer.'}
              </p>
            </div>
          </div>

          {/* Privacy & Zero-Training Trust Banner */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold mb-2">
                {t.landingTrustBadge}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5">
                {t.landingTrustTitle}
              </h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                {t.landingTrustDesc}
              </p>
            </div>
            <Link
              href="/docs"
              className="px-4 py-2.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shrink-0 whitespace-nowrap shadow-sm"
            >
              {isMyanmar ? 'မူဝါဒ အပြည့်အစုံ ဖတ်မည်' : 'Read Compliance Policy'}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Transparent Subscription Pricing Tiers */}
      <section id="pricing" className="py-20 md:py-28 bg-slate-50/60 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t.landingPricingTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.landingPricingSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-8 border transition-all flex flex-col justify-between relative ${
                  tier.popular
                    ? 'bg-white border-blue-500 shadow-xl ring-2 ring-blue-500/10'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold tracking-wide uppercase shadow-sm">
                    {isMyanmar ? 'လူကြိုက်အများဆုံး' : 'Most Popular'}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 min-h-[32px] mb-6 leading-relaxed">
                    {tier.description}
                  </p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                      {tier.price}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{tier.period}</span>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-100 mb-8">
                    {tier.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/admin/billing"
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-center transition-colors shadow-sm block ${
                    tier.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {t.landingPricingCta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Corporate Testimonials & Social Proof */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t.landingTestimonialTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.landingTestimonialSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((test, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-6"
              >
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  "{test.quote}"
                </p>
                <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {test.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{test.author}</div>
                    <div className="text-[11px] text-slate-500">
                      {test.role} · {test.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Bottom CTA Banner */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
            {isMyanmar
              ? 'လုပ်ငန်းတွင်း အသိပညာ ရှာဖွေမှုကို ယနေ့ပင် စတင်လိုက်ပါ'
              : 'Empower Your Workforce with Verifiable AI Search'}
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
            {isMyanmar
              ? 'မိနစ်ပိုင်းအတွင်း စာရွက်စာတမ်းများ ထည့်သွင်းပြီး ဝန်ထမ်းများအား အမှန်ကန်ဆုံး အဖြေများ ပေးနိုင်ရန် စတင်လိုက်ပါ။'
              : 'Index company policies, link Slack channels, and deliver instant grounded answers with verifiable citations.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm transition-all min-h-[44px]"
            >
              <span>{t.landingCtaLaunch}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 border border-slate-700 transition-colors min-h-[44px]"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>{t.landingCtaDocs}</span>
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* 9. Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">{t.appTitle}</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {t.landingFooterTagline}
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isMyanmar ? 'စနစ်များ ပုံမှန် လည်ပတ်နေပါသည်' : 'All Systems Operational'}</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                {isMyanmar ? 'ထုတ်ကုန်နှင့် ဝန်ဆောင်မှု' : 'Product'}
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/chat" className="hover:text-blue-600 transition-colors">
                    {t.navAssistant}
                  </Link>
                </li>
                <li>
                  <Link href="/admin/documents" className="hover:text-blue-600 transition-colors">
                    {t.navDocuments}
                  </Link>
                </li>
                <li>
                  <Link href="/admin/billing" className="hover:text-blue-600 transition-colors">
                    {t.navBilling}
                  </Link>
                </li>
                <li>
                  <Link href="/admin/analytics" className="hover:text-blue-600 transition-colors">
                    {t.navAnalytics}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                {isMyanmar ? 'ဥပဒေနှင့် လမ်းညွှန်' : 'Documentation & Legal'}
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/docs" className="hover:text-blue-600 transition-colors">
                    {t.docsTabGuide}
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-blue-600 transition-colors">
                    {t.docsTabTerms}
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-blue-600 transition-colors">
                    {t.docsTabPrivacy}
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-blue-600 transition-colors">
                    {t.docsTabCookies}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>© {new Date().getFullYear()} {t.appTitle}. {t.landingFooterRights}</div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher compact />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
