'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, Highlighter, X } from 'lucide-react';
import { DocumentCitation } from '@knowledge/shared';
import { useLanguage } from '@/context/language-context';

interface CitationDrawerProps {
  citation: DocumentCitation | null;
  initialSearchTerm: string;
  onClose: () => void;
}

export function CitationDrawer({ citation, initialSearchTerm, onClose }: CitationDrawerProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [highlightTerm, setHighlightTerm] = useState(initialSearchTerm);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHighlightTerm(initialSearchTerm);
  }, [initialSearchTerm, citation]);

  // Open/close native modal <dialog> using showModal() so browser provides top layer, focus trap, Esc, & inert backdrop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (citation && !dialog.open) {
      dialog.showModal();
    } else if (!citation && dialog.open) {
      dialog.close();
    }
  }, [citation]);

  // Mandatory light-dismiss pointer fallback for browsers lacking <dialog closedby="any"> (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof HTMLDialogElement === 'undefined') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleCopy = () => {
    if (citation?.snippet) {
      navigator.clipboard.writeText(citation.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderHighlightedSnippet = (text: string, query: string) => {
    if (!text) return null;
    const terms = (query || '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (terms.length === 0) return <span>{text}</span>;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-semibold border-b border-amber-300"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </span>
    );
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="citation-drawer-heading"
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-full sm:w-96 max-w-full bg-white border-l border-slate-200 shadow-2xl p-6 open:flex flex-col"
    >
      {citation && (
        <>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2
              id="citation-drawer-heading"
              className="flex items-center gap-2 font-semibold text-slate-900 text-sm"
            >
              <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>{t.drawerTitle}</span>
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close citation inspector"
              autoFocus
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {t.sourceDoc}
              </div>
              <div className="font-semibold text-slate-900 text-sm leading-snug">
                {citation.documentTitle}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Provenance: Chunk #{citation.chunkId.slice(0, 8)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.relevanceMatch}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {citation.source}
                </span>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Score: {(citation.relevanceScore * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                  Role: ACL Verified
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Highlighter className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  <span>Interactive Source Highlighting</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="Copy excerpt to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" aria-hidden="true" />
                      <span>Copy Excerpt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative mb-2">
                <input
                  type="text"
                  aria-label="Filter or highlight terms in excerpt"
                  placeholder="Filter or highlight terms in excerpt..."
                  value={highlightTerm}
                  onChange={(e) => setHighlightTerm(e.target.value)}
                  className="w-full pl-2.5 pr-2 py-1.5 text-xs rounded-md border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none bg-slate-50/50"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-text">
                {renderHighlightedSnippet(citation.snippet, highlightTerm)}
              </div>
            </div>

            {citation.sourceUrl && (
              <a
                href={citation.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <span>Open original document</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
