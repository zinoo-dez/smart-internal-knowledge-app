'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  UploadCloud,
  X,
  RefreshCw,
  CheckCircle2,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { ConnectorStatusResponse, Department, DocumentSource, DocumentSummary } from '@knowledge/shared';
import { Column, DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  createDocument,
  deleteDocument,
  fetchConnectorStatus,
  fetchDocuments,
  sendSlackWebhook,
  syncNotionPage,
  uploadDocumentFile,
} from '@/lib/api-client';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Connector state
  const [connectorStatus, setConnectorStatus] = useState<ConnectorStatusResponse | null>(null);
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const [isSyncingSlack, setIsSyncingSlack] = useState(false);
  const [connectorNotice, setConnectorNotice] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<DocumentSource>(DocumentSource.FILE_UPLOAD);
  const [department, setDepartment] = useState<Department>(Department.ALL);
  const [content, setContent] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, connectors] = await Promise.all([
        fetchDocuments(),
        fetchConnectorStatus(),
      ]);
      setDocuments(docs);
      setConnectorStatus(connectors);
    } catch (err) {
      console.error('Failed to load documents or connector status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNotion = async () => {
    setIsSyncingNotion(true);
    try {
      const res = await syncNotionPage({
        databaseId: 'eng-architecture-handbook',
        pageTitle: 'Notion Engineering Standards & Architecture',
        department: Department.ENGINEERING,
      });
      setConnectorNotice(`Notion Synced: ${res.title}`);
      await loadData();
      setTimeout(() => setConnectorNotice(null), 4000);
    } catch (err) {
      console.error('Failed to sync Notion:', err);
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const handleSyncSlack = async () => {
    setIsSyncingSlack(true);
    try {
      const res = await sendSlackWebhook({
        channel: 'engineering-announcements',
        user: 'lead-dev',
        department: Department.ENGINEERING,
        text: 'Sprint 14 Release Notes: Hybrid search (RRF k=60), Multi-model selector, and PDF ingestion are now verified.',
      });
      setConnectorNotice(res.message);
      await loadData();
      setTimeout(() => setConnectorNotice(null), 4000);
    } catch (err) {
      console.error('Failed to ingest Slack webhook:', err);
    } finally {
      setIsSyncingSlack(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      if (uploadMode === 'FILE' && selectedFile) {
        await uploadDocumentFile(selectedFile, title || selectedFile.name);
      } else if (uploadMode === 'TEXT' && title.trim() && content.trim()) {
        await createDocument({
          title,
          source,
          department,
          content,
        });
      }
      setModalOpen(false);
      setTitle('');
      setContent('');
      setSelectedFile(null);
      setDepartment(Department.ALL);
      await loadData();
    } catch (err) {
      console.error('Failed to ingest document:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document and its vector embeddings?')) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: Column<DocumentSummary>[] = [
    {
      header: 'Document Title',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.title}</div>
            {row.sourceUrl && (
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                <span>External Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Source',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
          {row.source.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Department / ACL',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
          {row.department || 'ALL'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Chunks',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 font-medium">
          {row.chunkCount} chunks
        </span>
      ),
    },
    {
      header: 'Ingested At',
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
          title="Delete document"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage company documentation, sync connectors, and monitor vector chunking status.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Connector Live Notice Banner */}
      {connectorNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{connectorNotice}</span>
        </div>
      )}

      {/* SaaS Connectors Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notion Connector Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-base">
                N
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Notion Workspace</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sync engineering handbooks, SOPs, and product wikis.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Synced: {connectorStatus?.notion.syncedPagesCount ?? 0} pages</span>
            <button
              onClick={handleSyncNotion}
              disabled={isSyncingNotion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-50 min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotion ? 'animate-spin' : ''}`} />
              <span>{isSyncingNotion ? 'Syncing...' : 'Sync Notion Now'}</span>
            </button>
          </div>
        </div>

        {/* Slack Webhook Connector Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Slack Knowledge Webhook</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Archiving announcements from <code className="text-slate-700 font-mono text-[11px]">#engineering-announcements</code>.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ingested: {connectorStatus?.slack.syncedMessagesCount ?? 0} messages</span>
            <button
              onClick={handleSyncSlack}
              disabled={isSyncingSlack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-50 min-h-[36px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isSyncingSlack ? 'Ingesting...' : 'Ingest Test Announcement'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter documents by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Reusable Data Table */}
      <DataTable
        columns={columns}
        data={filteredDocs}
        isLoading={isLoading}
        emptyMessage="No documents found. Click 'Upload Document' to ingest internal knowledge."
      />

      {/* Ingestion Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>Ingest Internal Document</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Mode Switcher */}
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUploadMode('FILE')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    uploadMode === 'FILE'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upload PDF / File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('TEXT')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    uploadMode === 'TEXT'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paste Text / Markdown
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Access Control (Department Visibility)
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value={Department.ALL}>Company-wide (All Employees)</option>
                  <option value={Department.ENGINEERING}>Engineering Department Only</option>
                  <option value={Department.HR}>Human Resources Department Only</option>
                  <option value={Department.OPERATIONS}>Operations Department Only</option>
                  <option value={Department.EXECUTIVE}>Executive Leadership Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Title (Optional for files)
                </label>
                <input
                  type="text"
                  placeholder={selectedFile ? selectedFile.name : 'e.g. IT Security Protocols & VPN Setup'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              {uploadMode === 'FILE' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select or Drop File (.pdf, .txt, .md)
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20">
                    <UploadCloud className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop file'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : 'PDF, Markdown, or Text up to 25MB'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.markdown"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          if (!title) setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Knowledge Source
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value as DocumentSource)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none bg-white"
                    >
                      <option value={DocumentSource.FILE_UPLOAD}>Direct Text Paste</option>
                      <option value={DocumentSource.NOTION}>Notion Workspace Page</option>
                      <option value={DocumentSource.SLACK}>Slack Channel Archive</option>
                      <option value={DocumentSource.GOOGLE_DRIVE}>Google Drive Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Content / Document Text
                    </label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Paste Markdown or text content here to generate chunk embeddings..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none resize-none font-mono text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (uploadMode === 'FILE' && !selectedFile)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Ingesting...' : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
