'use client';

import React from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  LifeBuoy,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import { DocumentCitation, FeedbackType } from '@knowledge/shared';
import { useLanguage } from '@/context/language-context';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { ChatMessage } from './types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  openAccordions: Record<string, boolean>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onToggleToolAccordion: (msgId: string) => void;
  onApproveAction: (msgId: string) => void;
  onRejectAction: (msgId: string) => void;
  onSelectCitation: (citation: DocumentCitation) => void;
  onFollowUpClick: (question: string) => void;
  onFeedback: (msgId: string, queryLogId: string | undefined, type: FeedbackType) => void;
  onOpenTicket: (escalatedQuery: string) => void;
}

export function ChatMessageList({
  messages,
  isStreaming,
  openAccordions,
  messagesEndRef,
  onToggleToolAccordion,
  onApproveAction,
  onRejectAction,
  onSelectCitation,
  onFollowUpClick,
  onFeedback,
  onOpenTicket,
}: ChatMessageListProps) {
  const { t } = useLanguage();

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Conversation message stream"
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-3.5 ${
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <div
            aria-hidden="true"
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            {msg.role === 'user' ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4 text-blue-600" />
            )}
          </div>

          <div
            className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
            }`}
          >
            {msg.role === 'assistant' && !msg.content && !msg.activeTool && isStreaming && (
              <div
                role="status"
                aria-label="Assistant is thinking"
                className="flex items-center gap-1.5 py-1 px-0.5"
              >
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-300ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" />
              </div>
            )}

            {msg.activeTool && (
              <div className="mb-3">
                {msg.activeTool.status === 'running' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2"
                  >
                    <Cpu
                      className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Calling MCP Tool: <strong className="font-mono">{msg.activeTool.name}</strong>
                      ...
                    </span>
                  </div>
                )}

                {msg.activeTool.status === 'approval_required' && (
                  <div
                    role="alertdialog"
                    aria-labelledby={`hitl-title-${msg.id}`}
                    className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2"
                  >
                    <div
                      id={`hitl-title-${msg.id}`}
                      className="flex items-center gap-1.5 font-bold text-amber-900"
                    >
                      <AlertCircle
                        className="w-4 h-4 text-amber-600 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span>Action Approval Required (Human-in-the-Loop)</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      The assistant requested execution of mutating tool:{' '}
                      <strong className="font-mono">{msg.activeTool.name}</strong>
                    </p>
                    {msg.activeTool.arguments && (
                      <pre className="p-2 rounded bg-white/70 border border-amber-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
                        {JSON.stringify(msg.activeTool.arguments, null, 2)}
                      </pre>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onApproveAction(msg.id)}
                        aria-label={`Approve execution of tool ${msg.activeTool.name}`}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        Approve &amp; Execute
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectAction(msg.id)}
                        aria-label={`Cancel execution of tool ${msg.activeTool.name}`}
                        className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {msg.activeTool.status === 'completed' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => onToggleToolAccordion(msg.id)}
                      aria-expanded={Boolean(openAccordions[msg.id])}
                      aria-label={`Toggle execution details for MCP tool ${msg.activeTool.name}`}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span className="font-medium text-slate-600">MCP Tool:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {msg.activeTool.name}
                        </span>
                        {msg.activeTool.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({msg.activeTool.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          openAccordions[msg.id] ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openAccordions[msg.id] && (
                      <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
                        {Boolean(msg.activeTool.arguments) && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Arguments
                            </span>
                            <pre className="p-2 rounded bg-slate-50 text-[11px] font-mono text-slate-800 overflow-x-auto border border-slate-100">
                              {JSON.stringify(msg.activeTool.arguments, null, 2)}
                            </pre>
                          </div>
                        )}
                        {Boolean(msg.activeTool.result) && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Execution Result
                            </span>
                            <pre className="p-2 rounded bg-slate-50 text-[11px] font-mono text-slate-800 overflow-x-auto border border-slate-100">
                              {JSON.stringify(msg.activeTool.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <MarkdownContent
              content={msg.content}
              isUser={msg.role === 'user'}
              onCitationClick={(idx) => {
                if (msg.citations && msg.citations[idx]) {
                  onSelectCitation(msg.citations[idx]);
                }
              }}
            />

            {msg.citations && msg.citations.length > 0 && (
              <nav aria-label="Cited Sources" className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  <span>{t.citedSources}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.citations.map((c, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => onSelectCitation(c)}
                      aria-label={`Inspect source citation ${idx + 1}: ${c.documentTitle}`}
                      className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100 hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>[{idx + 1}]</span>
                      <span className="truncate max-w-[200px]">{c.documentTitle}</span>
                    </button>
                  ))}
                </div>
              </nav>
            )}

            {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-500" aria-hidden="true" />
                  <span>Suggested Follow-ups</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {msg.followUpQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      aria-label={`Ask follow-up question: ${q}`}
                      onClick={() => onFollowUpClick(q)}
                      className="text-xs text-left px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors shadow-2xs inline-flex items-center gap-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      title="Click to ask this follow-up question"
                    >
                      <span>{q}</span>
                      <ChevronRight
                        className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msg.role === 'assistant' && msg.content && (
              <div className="mt-3 pt-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onFeedback(msg.id, msg.queryLogId, FeedbackType.THUMBS_UP)}
                    disabled={!!msg.feedbackGiven}
                    aria-label={t.feedbackHelpful}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      msg.feedbackGiven === 'UP' ? 'text-emerald-600 font-bold' : ''
                    }`}
                    title={t.feedbackHelpful}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onFeedback(msg.id, msg.queryLogId, FeedbackType.THUMBS_DOWN)}
                    disabled={!!msg.feedbackGiven}
                    aria-label={t.feedbackUnhelpful}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      msg.feedbackGiven === 'DOWN' ? 'text-rose-600 font-bold' : ''
                    }`}
                    title={t.feedbackUnhelpful}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  {msg.feedbackGiven && (
                    <span role="status" aria-live="polite" className="text-[11px] text-slate-500">
                      Thank you for feedback!
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenTicket(messages[messages.length - 2]?.content || '')
                  }
                  aria-label={t.openTicket}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
                >
                  <LifeBuoy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.openTicket}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
