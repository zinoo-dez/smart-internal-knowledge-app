'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
  onCitationClick?: (index: number) => void;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isUser = false,
  onCitationClick,
}) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  // Pre-process citations like [1], [2] into anchor links so they become interactive buttons
  const processedContent = useMemo(() => {
    if (!content) return '';
    // Replace [1], [2] citation markers that are not already markdown links
    return content.replace(/(?<!\[)\[(\d+)\](?!\()/g, '[$1](#cite-$1)');
  }, [content]);

  return (
    <div className="markdown-body text-sm leading-relaxed text-slate-800 break-words space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-slate-900">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-slate-800">{children}</em>;
          },
          h1({ children }) {
            return <h1 className="text-base font-bold text-slate-900 mt-3 mb-1.5 leading-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5 leading-tight">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-2 mb-1">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-slate-600 italic bg-slate-50/60 py-1 rounded-r">
                {children}
              </blockquote>
            );
          },
          code({ className, children, ...props }) {
            const isCodeBlock = Boolean(className);
            if (isCodeBlock) {
              return (
                <div className="relative my-2.5 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                  <div className="flex items-center justify-between px-3 py-1 bg-slate-800/80 text-[11px] font-mono text-slate-400">
                    <span>{className?.replace('language-', '') || 'code'}</span>
                  </div>
                  <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-100 leading-normal">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }
            return (
              <code
                className="bg-slate-100 text-blue-700 text-[13px] px-1.5 py-0.5 rounded font-mono border border-slate-200/80 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg shadow-sm">
                <table className="w-full text-left border-collapse text-xs">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-slate-100">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-3 py-2 text-slate-700 font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 text-slate-700">{children}</td>;
          },
          a({ href, children }) {
            if (href?.startsWith('#cite-')) {
              const citationNum = parseInt(href.replace('#cite-', ''), 10);
              const citationIdx = citationNum - 1;
              return (
                <button
                  type="button"
                  onClick={() => onCitationClick && onCitationClick(citationIdx)}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs border border-blue-200 transition-colors mx-0.5 align-baseline"
                  title={`View citation [${citationNum}]`}
                >
                  [{children}]
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-3 border-slate-200" />;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
