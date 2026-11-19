'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  TenantUsageSummary,
  TierQuota,
} from '@knowledge/shared';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { fetchBillingUsage, upgradeSubscription } from '@/lib/api-client';

export default function BillingPage() {
  const { language, t } = useLanguage();
  const [usage, setUsage] = useState<TenantUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingTier, setUpgradingTier] = useState<SubscriptionTier | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsage = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBillingUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to load billing usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (usage?.tier === tier) return;
    setUpgradingTier(tier);
    try {
      const res = await upgradeSubscription(tier);
      setSuccessMsg(
        language === 'my'
          ? `အစီအစဉ်ကို ${SUBSCRIPTION_TIERS[tier].displayName} သို့ အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ!`
          : `Successfully updated subscription to ${SUBSCRIPTION_TIERS[tier].displayName}!`,
      );
      await loadUsage();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
    } finally {
      setUpgradingTier(null);
    }
  };

  const currentTier = usage?.tier || SubscriptionTier.PRO;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
            <CreditCard className="w-4 h-4" />
            <span>{language === 'my' ? 'ငွေပေးချေမှုနှင့် သုံးစွဲမှု' : 'B2B SaaS Metering & Quotas'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.billingTitle}</h1>
          <p className="text-sm text-slate-500 max-w-2xl">{t.billingSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <button
            onClick={loadUsage}
            disabled={isLoading}
            aria-label="Refresh usage data"
            className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title="Refresh Usage"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs font-medium animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Current Quota Consumption Card */}
      {usage && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t.currentPlan}
              </span>
              <div className="flex items-center gap-2.5 mt-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {SUBSCRIPTION_TIERS[currentTier].displayName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {t.activeTier}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 text-left sm:text-right">
              <span className="font-medium text-slate-700">{t.billingCycle}:</span>
              <div className="font-mono text-slate-400 mt-0.5">
                {new Date(usage.currentPeriodStart).toLocaleDateString()} –{' '}
                {new Date(usage.currentPeriodEnd).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* 3 Progress Bars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tokens Bar */}
            <div className="space-y-2 p-4 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>{t.tokenUsage}</span>
                </span>
                <span className="font-mono text-slate-500 font-semibold">{usage.tokenUsagePercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${usage.tokenUsagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{usage.tokenCount.toLocaleString()} used</span>
                <span>{usage.tokenLimit.toLocaleString()} limit</span>
              </div>
            </div>

            {/* Queries Bar */}
            <div className="space-y-2 p-4 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>{t.queryUsage}</span>
                </span>
                <span className="font-mono text-slate-500 font-semibold">{usage.queryUsagePercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${usage.queryUsagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{usage.queryCount.toLocaleString()} queries</span>
                <span>{usage.queryLimit.toLocaleString()} limit</span>
              </div>
            </div>

            {/* Document Count Bar */}
            <div className="space-y-2 p-4 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{t.docUsage}</span>
                </span>
                <span className="font-mono text-slate-500 font-semibold">
                  {Math.round((usage.documentCount / usage.documentLimit) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((usage.documentCount / usage.documentLimit) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{usage.documentCount} indexed</span>
                <span>{usage.documentLimit} limit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tiers Comparison */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {language === 'my' ? 'ရရှိနိုင်သော အစီအစဉ်များ' : 'Available Subscription Tiers'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'my'
              ? 'သင့်လုပ်ငန်းခွင် အတိုင်းအတာနှင့် လိုက်လျောညီထွေဖြစ်သော အစီအစဉ်ကို ရွေးချယ်နိုင်ပါသည်။'
              : 'Choose the appropriate quota tier based on your organization workforce size and query volume.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(SUBSCRIPTION_TIERS).map((tierItem: TierQuota) => {
            const isCurrent = currentTier === tierItem.tier;
            const isEnterprise = tierItem.tier === SubscriptionTier.ENTERPRISE;

            return (
              <div
                key={tierItem.tier}
                className={`rounded-xl border p-6 flex flex-col justify-between bg-white shadow-sm transition-all relative ${
                  isCurrent
                    ? 'border-blue-600 ring-2 ring-blue-600/10'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                    {t.activeTier}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tierItem.displayName}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-slate-900">
                        ${tierItem.priceMonthlyUsd}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Monthly Queries:</span>
                      <span className="font-semibold">{tierItem.maxMonthlyQueries.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Token Budget:</span>
                      <span className="font-semibold">{tierItem.maxMonthlyTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Max Documents:</span>
                      <span className="font-semibold">{tierItem.maxDocuments.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Included Features:
                    </span>
                    <ul className="space-y-2">
                      {tierItem.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleUpgrade(tierItem.tier)}
                    disabled={isCurrent || upgradingTier === tierItem.tier}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isEnterprise
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {upgradingTier === tierItem.tier ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      <span>{t.activeTier}</span>
                    ) : (
                      <>
                        <span>{t.upgradePlan}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
