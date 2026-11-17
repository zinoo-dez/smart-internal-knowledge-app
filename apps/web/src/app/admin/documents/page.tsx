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
} from 'lucide-react';
import { DocumentSource, DocumentSummary } from '@knowledge/shared';
import { Column, DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { createDocument, deleteDocument, fetchDocuments } from '@/lib/api-client';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<DocumentSource>(DocumentSource.FILE_UPLOAD);
  const [content, setContent] = useState('');

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createDocument({
        title,
        source,
        content,
      });
      setModalOpen(false);
      setTitle('');
      setContent('');
      await loadDocs();
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Security Protocols & VPN Setup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Knowledge Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as DocumentSource)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value={DocumentSource.FILE_UPLOAD}>File Upload / Direct Text</option>
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
                  disabled={isSubmitting}
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
