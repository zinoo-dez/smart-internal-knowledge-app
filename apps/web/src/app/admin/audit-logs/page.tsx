'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Download,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  FileText,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';
import { AuditLogItem, PaginatedAuditLogsResponse } from '@knowledge/shared';
import { Column, DataTable } from '@/components/ui/data-table';
import { fetchAuditLogs, getExportAuditLogsUrl } from '@/lib/api-client';

export default function AuditLogsPage() {
  const [data, setData] = useState<PaginatedAuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchAuditLogs({
        page,
        limit: 25,
        action: selectedAction === 'ALL' ? undefined : selectedAction,
        search: searchTerm.trim() || undefined,
      });
      setData(res);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleExportCsv = () => {
    const url = getExportAuditLogsUrl({
      action: selectedAction === 'ALL' ? undefined : selectedAction,
      search: searchTerm.trim() || undefined,
    });
    window.open(url, '_blank');
  };

  const items = data?.items || [];
  const totalLogs = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Aggregate high-level stats from current view
  const piiRedactionsCount = items.filter((i) => i.action === 'PII_FLAGGED').length;
  const docOperationsCount = items.filter(
    (i) => i.action === 'DOCUMENT_INGESTED' || i.action === 'DOCUMENT_DELETED',
  ).length;
  const governanceCount = items.filter(
    (i) => i.action === 'KNOWLEDGE_GAP_RESOLVED' || i.action === 'KNOWLEDGE_GAP_ASSIGNED',
  ).length;

  const renderActionBadge = (action: string) => {
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
    if (action === 'PII_FLAGGED') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (action === 'DOCUMENT_INGESTED') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (action === 'DOCUMENT_DELETED') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (action === 'KNOWLEDGE_GAP_RESOLVED') {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (action === 'QUERY_EXECUTED') {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClasses}`}
      >
        {action}
      </span>
    );
  };

  const columns: Column<AuditLogItem>[] = [
    {
      header: 'Timestamp (UTC)',
      className: 'w-[18%]',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {new Date(row.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
        </span>
      ),
    },
    {
      header: 'Action',
      className: 'w-[18%]',
      cell: (row) => renderActionBadge(row.action),
    },
    {
      header: 'Resource Target',
      className: 'w-[24%]',
      cell: (row) => (
        <div className="text-sm font-medium text-slate-800 truncate max-w-[260px]" title={row.resource}>
          {row.resource}
        </div>
      ),
    },
    {
      header: 'Actor',
      className: 'w-[25%]',
      cell: (row) => (
        <div>
          <div className="text-sm text-slate-800 font-medium">{row.userEmail}</div>
          {row.userName && <div className="text-xs text-slate-400">{row.userName}</div>}
        </div>
      ),
    },
    {
      header: 'Audit Evidence',
      className: 'w-[15%] text-right',
      cell: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Details</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit & Compliance Trail</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              SOC 2 / ISO 27001
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable data access, document ingestion, and administrative governance event logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadLogs(currentPage)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 min-h-[40px]"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm min-h-[40px]"
          >
            <Download className="w-4 h-4" />
            <span>Export Compliance CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Audit Records</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">{totalLogs}</div>
          <div className="text-xs text-slate-400 mt-1">Tenant-scoped access events</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">PII Redaction Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">{piiRedactionsCount}</div>
          <div className="text-xs text-slate-400 mt-1">AWS keys, SSH tokens, credentials masked</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Document Operations</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">{docOperationsCount}</div>
          <div className="text-xs text-slate-400 mt-1">Files uploaded, deleted, and indexed</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Governance Actions</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 font-mono">{governanceCount}</div>
          <div className="text-xs text-slate-400 mt-1">Knowledge gaps resolved & assigned</div>
        </div>
      </div>

      {/* Search & Action Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by actor email, resource, or action..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[40px]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[40px]"
          >
            <option value="ALL">All Actions</option>
            <option value="DOCUMENT_INGESTED">DOCUMENT_INGESTED</option>
            <option value="DOCUMENT_DELETED">DOCUMENT_DELETED</option>
            <option value="PII_FLAGGED">PII_FLAGGED</option>
            <option value="KNOWLEDGE_GAP_RESOLVED">KNOWLEDGE_GAP_RESOLVED</option>
            <option value="KNOWLEDGE_GAP_ASSIGNED">KNOWLEDGE_GAP_ASSIGNED</option>
            <option value="QUERY_EXECUTED">QUERY_EXECUTED</option>
          </select>
        </div>
      </div>

      {/* Main Audit Data Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyMessage="No audit logs found matching your filter criteria."
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
          <div className="text-xs text-slate-500">
            Showing Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadLogs(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => loadLogs(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Audit Record Evidence</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium">Record ID</span>
                  <div className="font-mono text-slate-800 font-semibold truncate">{selectedLog.id}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Action</span>
                  <div className="mt-0.5">{renderActionBadge(selectedLog.action)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium">Actor Email</span>
                  <div className="text-slate-800 font-medium">{selectedLog.userEmail}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Timestamp (UTC)</span>
                  <div className="font-mono text-slate-800">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Resource Target</span>
                <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-700 break-all">
                  {selectedLog.resource}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Details & Sanitized Metadata</span>
                <pre className="mt-1 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-44">
                  {JSON.stringify(selectedLog.details, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
