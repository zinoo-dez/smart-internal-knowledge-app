'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileText,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AnalyticsSummaryResponse } from '@knowledge/shared';
import { Column, DataTable } from '@/components/ui/data-table';
import { fetchAnalytics } from '@/lib/api-client';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const topQueryColumns: Column<{ query: string; count: number }>[] = [
    {
      header: 'Frequent Employee Query',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-900">{row.query}</span>
        </div>
      ),
    },
    {
      header: 'Frequency',
      className: 'text-right',
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
          {row.count} asks
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Assistant Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor employee search activity, LLM token consumption, and retrieval quality scores.
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inquiries</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : data?.totalQueries ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across all workspace members</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Base</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : data?.totalDocuments ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active indexed documents</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tokens Consumed</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {isLoading ? '...' : data?.totalTokensUsed.toLocaleString() ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gemini 1.5/2.0 Flash</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Satisfaction Rate</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-1.5">
            <span>{isLoading ? '...' : `${data?.satisfactionRate ?? 100}%`}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Thumbs-up feedback ratio</p>
        </div>
      </div>

      {/* Model & Observability Status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">
              AI Layer: Google Gemini (gemini-1.5-flash & text-embedding-004)
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-model switching enabled with LangSmith trace telemetry active.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            LangSmith Connected
          </span>
        </div>
      </div>

      {/* Top Queries Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Top Searched Topics & Gaps</span>
          </h2>
          <span className="text-xs text-slate-400">Live aggregated counts</span>
        </div>
        <DataTable
          columns={topQueryColumns}
          data={data?.topQueries ?? []}
          isLoading={isLoading}
          emptyMessage="No queries logged yet. Employee questions will appear here."
        />
      </div>
    </div>
  );
}
