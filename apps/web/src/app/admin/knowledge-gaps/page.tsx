'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Search,
  BookOpen,
  X,
  FileEdit,
} from 'lucide-react';
import { KnowledgeGapItem, KnowledgeGapSummaryResponse } from '@knowledge/shared';
import { Column, DataTable } from '@/components/ui/data-table';
import {
  assignKnowledgeGap,
  fetchKnowledgeGaps,
  resolveKnowledgeGap,
} from '@/lib/api-client';

export default function KnowledgeGapsPage() {
  const [data, setData] = useState<KnowledgeGapSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resolveModalGap, setResolveModalGap] = useState<KnowledgeGapItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignModalGap, setAssignModalGap] = useState<KnowledgeGapItem | null>(null);
  const [assignedEmail, setAssignedEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const loadGaps = async () => {
    setIsLoading(true);
    try {
      const res = await fetchKnowledgeGaps();
      setData(res);
    } catch (err) {
      console.error('Failed to load knowledge gaps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGaps();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalGap || !resolutionNote.trim()) return;

    try {
      await resolveKnowledgeGap(resolveModalGap.id, resolutionNote);
      setNotice(`Resolved knowledge gap: "${resolveModalGap.query.slice(0, 30)}..."`);
      setResolveModalGap(null);
      setResolutionNote('');
      await loadGaps();
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to resolve gap:', err);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalGap || !assignedEmail.trim()) return;

    try {
      await assignKnowledgeGap(assignModalGap.id, assignedEmail);
      setNotice(`Assigned gap to ${assignedEmail}`);
      setAssignModalGap(null);
      setAssignedEmail('');
      await loadGaps();
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to assign gap:', err);
    }
  };

  const gapsList = data?.gaps || [];
  const filteredGaps = gapsList.filter(
    (g) =>
      g.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const unresolvedCount = gapsList.filter((g) => g.status === 'UNRESOLVED').length;
  const resolvedCount = gapsList.filter((g) => g.status === 'RESOLVED').length;

  const columns: Column<KnowledgeGapItem>[] = [
    {
      header: 'Employee Inquiry / Missing Topic',
      className: 'w-[45%]',
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900 text-sm">{row.query}</div>
          <div className="text-xs text-slate-400 mt-0.5">Asked by {row.userEmail}</div>
          {row.resolutionNote && (
            <div className="mt-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-1.5 rounded">
              <span className="font-semibold">Resolution:</span> {row.resolutionNote}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.category}
        </span>
      ),
    },
    {
      header: 'Assigned Owner',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.assignedTo ? (
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-mono">
              {row.assignedTo}
            </span>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) =>
        row.status === 'RESOLVED' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Unresolved
          </span>
        ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'UNRESOLVED' && (
            <>
              <button
                onClick={() => {
                  setAssignModalGap(row);
                  setAssignedEmail(row.assignedTo || '');
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                title="Assign owner"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setResolveModalGap(row);
                  setResolutionNote('');
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Resolve gap with note"
              >
                Resolve
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Gap Triage Inbox</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review queries where the AI Assistant found zero matching internal documentation.
          Assign content owners and resolve gaps once new handbooks are authored.
        </p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Unresolved Gaps</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {unresolvedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Requires documentation authoring</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Resolved Gaps</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {resolvedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Documentation successfully added</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Top Missing Category</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            {data?.topCategories[0]?.category || 'None detected'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {data?.topCategories[0]?.count ?? 0} unanswered inquiries
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter knowledge gaps by inquiry query or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Reusable Data Table */}
      <DataTable
        columns={columns}
        data={filteredGaps}
        isLoading={isLoading}
        emptyMessage="No knowledge gaps found. All employee inquiries have matching citations!"
        keyExtractor={(item) => item.id}
      />

      {/* Resolve Modal */}
      {resolveModalGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Resolve Knowledge Gap</h3>
              <button
                onClick={() => setResolveModalGap(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Missing Topic
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {resolveModalGap.query}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Resolution Note / Document Reference
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g., Authored 'Parental Leave 2026' in Notion handbook and synchronized vector chunks."
                  className="w-full mt-1.5 p-3 text-sm rounded-lg border border-slate-200 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModalGap(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Content Lead</h3>
              <button
                onClick={() => setAssignModalGap(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Topic
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {assignModalGap.query}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Owner Email
                </label>
                <input
                  type="email"
                  required
                  value={assignedEmail}
                  onChange={(e) => setAssignedEmail(e.target.value)}
                  placeholder="e.g., hr.director@company.internal"
                  className="w-full mt-1.5 p-3 text-sm rounded-lg border border-slate-200 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalGap(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
