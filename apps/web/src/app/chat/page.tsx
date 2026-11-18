'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  LifeBuoy,
  X,
  ExternalLink,
  Sparkles,
  Cpu,
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ConversationSummary, DocumentCitation, FeedbackType } from '@knowledge/shared';
import {
  createSupportTicket,
  deleteConversation,
  fetchConversationDetail,
  fetchConversations,
  submitFeedback,
} from '@/lib/api-client';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { MarkdownContent } from '@/components/ui/markdown-content';

interface ModelOption {
  id: string;
  name: string;
  provider: 'GEMINI' | 'OPENAI' | 'CLAUDE';
  modelName: string;
  badge: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'GEMINI',
    modelName: 'gemini-2.0-flash',
    badge: 'Default (Fast)',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'CLAUDE',
    modelName: 'claude-3-5-sonnet-20241022',
    badge: 'Deep Reasoning',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OPENAI',
    modelName: 'gpt-4o',
    badge: 'Multimodal Flagship',
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: DocumentCitation[];
  queryLogId?: string;
  feedbackGiven?: 'UP' | 'DOWN';
}

export default function ChatPage() {
  const { t, language, isMyanmar } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am your Smart Internal Knowledge Assistant. Ask me any question regarding company policies, engineering documentation, onboarding, or internal tools.\n\nEvery answer includes verifiable citations directly linked to company documentation.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<DocumentCitation | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmittedMsg, setTicketSubmittedMsg] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync welcome message on initial language toggle if conversation has not started
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-msg') {
        return [{ id: 'welcome-msg', role: 'assistant', content: t.chatWelcomeDesc }];
      }
      return prev;
    });
  }, [language, t.chatWelcomeDesc]);

  const loadThreads = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.warn('Failed to load conversation history:', err);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectThread = async (threadId: string) => {
    if (isStreaming || threadId === activeConversationId) return;
    try {
      const detail = await fetchConversationDetail(threadId);
      setActiveConversationId(detail.id);
      if (detail.messages && detail.messages.length > 0) {
        setMessages(
          detail.messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            citations: m.citations,
            queryLogId: m.queryLogId,
          })),
        );
      }
    } catch (err) {
      console.error('Failed to load thread detail:', err);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setActiveConversationId(null);
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: t.chatWelcomeDesc,
      },
    ]);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation thread?')) return;
    try {
      await deleteConversation(threadId);
      setConversations((prev) => prev.filter((t) => t.id !== threadId));
      if (activeConversationId === threadId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    }
  };

  const handleSend = async (questionText?: string) => {
    const query = (questionText || input).trim();
    if (!query || isStreaming) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: query },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:4000/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': 'dev-admin-01',
          'x-mock-org-id': 'mock-org-default',
          'x-mock-role': 'ADMIN',
          'x-mock-email': 'admin@company.internal',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: query }],
          modelProvider: selectedModel.provider,
          modelName: selectedModel.modelName,
          conversationId: activeConversationId || undefined,
        }),
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let collectedCitations: DocumentCitation[] = [];
      let logId: string | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());
              if (data.type === 'token') {
                streamedContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: streamedContent } : m,
                  ),
                );
              } else if (data.type === 'citations') {
                collectedCitations = data.citations;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, citations: collectedCitations }
                      : m,
                  ),
                );
              } else if (data.type === 'done') {
                logId = data.queryLogId;
                if (data.conversationId && !activeConversationId) {
                  setActiveConversationId(data.conversationId);
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, queryLogId: logId } : m,
                  ),
                );
                loadThreads();
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err) {
      console.warn('Backend stream error, using client-side simulated answer:', err);
      // Fallback demo response if backend is not started
      const demoAnswer = `Based on **Company Remote Work & VPN Setup Handbook** [1], all employees connecting to internal database clusters must install the WireGuard VPN client and authenticate using single sign-on (SSO).\n\nIf you encounter connection drops, verify your IP is whitelisted on the internal portal.`;
      const demoCitations: DocumentCitation[] = [
        {
          chunkId: 'chunk-demo-1',
          documentId: 'seed-doc-1',
          documentTitle: 'Company Remote Work & VPN Setup Handbook',
          source: 'FILE_UPLOAD' as any,
          snippet:
            'All employees connecting to internal database clusters must install the WireGuard VPN client and authenticate using single sign-on (SSO). Security certificates expire after 90 days.',
          relevanceScore: 0.96,
        },
      ];

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: demoAnswer,
                citations: demoCitations,
                queryLogId: 'mock-query-log-1',
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFeedback = async (
    msgId: string,
    queryLogId: string | undefined,
    type: FeedbackType,
  ) => {
    if (!queryLogId) return;
    try {
      await submitFeedback(queryLogId, type);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, feedbackGiven: type === FeedbackType.THUMBS_UP ? 'UP' : 'DOWN' } : m,
        ),
      );
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const handleTicketCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle) return;

    try {
      const res = await createSupportTicket({
        title: ticketTitle,
        description: ticketDescription || 'Created from AI Assistant inquiry',
        priority: 'MEDIUM',
        category: 'IT',
      });
      setTicketSubmittedMsg(res.message);
      setTimeout(() => {
        setTicketModalOpen(false);
        setTicketSubmittedMsg(null);
        setTicketTitle('');
        setTicketDescription('');
      }, 2500);
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 relative">
      {/* Left: Thread History Sidebar */}
      <aside
        className={`shrink-0 transition-all duration-200 flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden ${
          isSidebarOpen ? 'w-64' : 'w-0 border-none'
        }`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full p-3 space-y-3">
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              disabled={isStreaming}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newConversation}</span>
            </button>

            {/* Threads Header */}
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>{t.pastConversations}</span>
              <span className="font-mono text-slate-500">{conversations.length}</span>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {t.noConversations}
                </div>
              ) : (
                conversations.map((thread) => {
                  const isActive = activeConversationId === thread.id;
                  return (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread.id)}
                      className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/60'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{thread.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity shrink-0"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Screen */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden">
        {/* Top Controls: Sidebar Toggle + Model Selector & Suggestions */}
        <div className="pb-3 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.modelLabel}</span>
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = selectedModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      disabled={isStreaming}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                      }`}
                    >
                      {model.name}
                    </button>
                  );
                })}
              </div>
              <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedModel.badge}
              </span>
            </div>

            {/* Language Switcher in Chat Header */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>

        {/* Suggestions Bar */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.suggestionsLabel}</span>
          </span>
          {[
            t.suggestionVpn,
            t.suggestionLeave,
            t.suggestionAws,
            t.suggestionMyanmarLeave,
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isStreaming}
              className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-full border border-slate-200 transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3.5 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-600" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <MarkdownContent
                content={msg.content}
                isUser={msg.role === 'user'}
                onCitationClick={(idx) => {
                  if (msg.citations && msg.citations[idx]) {
                    setSelectedCitation(msg.citations[idx]);
                  }
                }}
              />

              {/* Citations list for assistant messages */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.citedSources}:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCitation(c)}
                        className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <span>[{idx + 1}]</span>
                        <span className="truncate max-w-[200px]">{c.documentTitle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assistant Message Actions & Feedback */}
              {msg.role === 'assistant' && msg.id !== 'welcome-msg' && (
                <div className="mt-3 pt-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(msg.id, msg.queryLogId, FeedbackType.THUMBS_UP)}
                      disabled={!!msg.feedbackGiven}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                        msg.feedbackGiven === 'UP' ? 'text-emerald-600 font-bold' : ''
                      }`}
                      title={t.feedbackHelpful}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, msg.queryLogId, FeedbackType.THUMBS_DOWN)}
                      disabled={!!msg.feedbackGiven}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                        msg.feedbackGiven === 'DOWN' ? 'text-rose-600 font-bold' : ''
                      }`}
                      title={t.feedbackUnhelpful}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    {msg.feedbackGiven && (
                      <span className="text-[11px] text-slate-500">Thank you for feedback!</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setTicketTitle('Escalated inquiry: ' + (messages[messages.length - 2]?.content || ''));
                      setTicketModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>{t.openTicket}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-slate-200 shrink-0"
      >
        <div className="relative flex items-center bg-white rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
          <input
            type="text"
            placeholder={t.inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            className="w-full py-3.5 pl-4 pr-14 text-sm bg-transparent outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2.5 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      </div>

      {/* Right-Side Slide-out Citation Inspection Drawer */}
      {selectedCitation && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>{t.drawerTitle}</span>
            </div>
            <button
              onClick={() => setSelectedCitation(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {t.sourceDoc}
              </div>
              <div className="font-semibold text-slate-900 text-sm">
                {selectedCitation.documentTitle}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {t.relevanceMatch}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {selectedCitation.source}
                </span>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Score: {(selectedCitation.relevanceScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Exact Excerpted Text
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                {selectedCitation.snippet}
              </div>
            </div>

            {selectedCitation.sourceUrl && (
              <a
                href={selectedCitation.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline pt-2"
              >
                <span>Open original document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Support Ticket Modal Dialog */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <LifeBuoy className="w-5 h-5 text-blue-600" />
                <span>{t.createTicketTitle}</span>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketSubmittedMsg ? (
              <div className="p-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                {ticketSubmittedMsg}
              </div>
            ) : (
              <form onSubmit={handleTicketCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.ticketSubject}
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.ticketDescription}
                  </label>
                  <textarea
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide details about your question or issue..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-600 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTicketModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px]"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm min-h-[44px]"
                  >
                    {t.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
