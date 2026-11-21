'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Cpu, Database, Shield, Sparkles } from 'lucide-react';
import { ConversationSummary, DocumentCitation, FeedbackType } from '@knowledge/shared';
import {
  API_BASE_URL,
  createSupportTicket,
  deleteConversation,
  executeMcpTool,
  fetchConversationDetail,
  fetchConversations,
  getAuthHeaders,
  isMixedContentBlocked,
  markOfflineDemoMode,
  submitFeedback,
} from '@/lib/api-client';
import { createSseLineParser } from '@/lib/sse-parser';
import { useLanguage } from '@/context/language-context';
import { AVAILABLE_MODELS, ChatMessage, ModelOption } from '@/components/chat/types';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatOmnibox } from '@/components/chat/chat-omnibox';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { CitationDrawer } from '@/components/chat/citation-drawer';
import { SupportTicketModal } from '@/components/chat/support-ticket-modal';

export default function ChatPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [activeMode, setActiveMode] = useState<'chat' | 'tools' | 'research'>('chat');
  const [thinkingLevel, setThinkingLevel] = useState<'normal' | 'deep'>('deep');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close mobile sidebar drawer on Escape
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

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
    setIsMobileDrawerOpen(false);
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
    setIsMobileDrawerOpen(false);
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation thread?')) return;
    try {
      await deleteConversation(threadId);
      setConversations((prev) => prev.filter((item) => item.id !== threadId));
      if (activeConversationId === threadId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    }
  };

  const applySseEvent = (
    assistantMsgId: string,
    data: Record<string, unknown>,
    streamRef: { content: string },
  ) => {
    if (data.type === 'token' && typeof data.content === 'string') {
      streamRef.content += data.content;
      const latestContent = streamRef.content;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, content: latestContent } : m)),
      );
    } else if (data.type === 'tool_start') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                activeTool: {
                  name: String(data.toolName || ''),
                  serverName: data.serverName ? String(data.serverName) : undefined,
                  arguments: data.arguments as Record<string, unknown> | undefined,
                  status: 'running',
                },
              }
            : m,
        ),
      );
    } else if (data.type === 'tool_result') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && m.activeTool
            ? {
                ...m,
                activeTool: {
                  ...m.activeTool,
                  result: data.result,
                  latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
                  status: 'completed',
                },
              }
            : m,
        ),
      );
    } else if (data.type === 'tool_approval_required') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                activeTool: {
                  serverId: data.serverId ? String(data.serverId) : undefined,
                  name: String(data.toolName || ''),
                  arguments: data.arguments as Record<string, unknown> | undefined,
                  status: 'approval_required',
                  actionId: data.actionId ? String(data.actionId) : undefined,
                },
              }
            : m,
        ),
      );
    } else if (data.type === 'citations' && Array.isArray(data.citations)) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, citations: data.citations as DocumentCitation[] }
            : m,
        ),
      );
    } else if (data.type === 'follow_ups' && Array.isArray(data.questions)) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, followUpQuestions: data.questions as string[] }
            : m,
        ),
      );
    } else if (data.type === 'error') {
      const errorMsg =
        typeof data.message === 'string'
          ? data.message
          : 'An unexpected error occurred while generating the response.';
      streamRef.content = streamRef.content
        ? `${streamRef.content}\n\n> **Error:** ${errorMsg}`
        : `**Unable to complete request:** ${errorMsg}`;
      const latestContent = streamRef.content;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, content: latestContent } : m)),
      );
    } else if (data.type === 'done') {
      const logId = typeof data.queryLogId === 'string' ? data.queryLogId : undefined;
      if (typeof data.conversationId === 'string' && !activeConversationId) {
        setActiveConversationId(data.conversationId);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, queryLogId: logId } : m)),
      );
      loadThreads();
    }
  };

  const handleSend = async (
    questionText?: string,
    overrideMode?: 'chat' | 'tools' | 'research',
  ) => {
    const query = (questionText || input).trim();
    if (!query || isStreaming) return;

    const effectiveMode = overrideMode || activeMode;
    if (overrideMode && overrideMode !== activeMode) {
      setActiveMode(overrideMode);
    }

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: query },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);
    setIsStreaming(true);

    try {
      if (isMixedContentBlocked()) {
        throw new Error(
          'Mixed content: HTTPS page cannot fetch from HTTP API. Falling back to demo mode.',
        );
      }

      const recentHistory = messages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0)
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 1000),
        }));

      const headers = await getAuthHeaders(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...recentHistory, { role: 'user', content: query }],
          modelProvider: selectedModel.provider,
          modelName: selectedModel.modelName,
          conversationId: activeConversationId || undefined,
          mode: effectiveMode,
          thinkingLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat stream rejected with HTTP ${response.status}`);
      }

      markOfflineDemoMode(false);

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseLineParser();
      const streamRef = { content: '' };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const events = parser.push(decoder.decode(value, { stream: true }));
        for (const event of events) {
          applySseEvent(assistantMsgId, event, streamRef);
        }
      }

      // Flush any final partial line
      for (const event of parser.flush()) {
        applySseEvent(assistantMsgId, event, streamRef);
      }

      if (!streamRef.content.trim()) {
        throw new Error('Empty stream response received from backend.');
      }
    } catch (err) {
      markOfflineDemoMode(true);
      console.warn('Backend stream error, using client-side simulated answer:', err);
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
                followUpQuestions: [
                  'Where can I download the WireGuard configuration file?',
                  'Who is the designated IT on-call contact for VPN access?',
                  'Can I connect to VPN from my mobile device?',
                ],
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
          m.id === msgId
            ? { ...m, feedbackGiven: type === FeedbackType.THUMBS_UP ? 'UP' : 'DOWN' }
            : m,
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

  const promptSuggestions: Array<{
    icon: React.ReactNode;
    text: string;
    mode?: 'chat' | 'tools' | 'research';
  }> = [
    { icon: <Database className="w-4 h-4" aria-hidden="true" />, text: t.suggestionAws },
    { icon: <Shield className="w-4 h-4" aria-hidden="true" />, text: t.suggestionVpn },
    { icon: <Calendar className="w-4 h-4" aria-hidden="true" />, text: t.suggestionLeave },
    {
      icon: <Cpu className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionDbLive,
      mode: 'tools',
    },
    { icon: <Sparkles className="w-4 h-4" aria-hidden="true" />, text: t.suggestionMyanmarLeave },
  ];

  const lastUserQuery = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const isWelcomeState = messages.length === 0;

  return (
    <div className="flex-1 min-h-0 flex w-full md:gap-4 relative overflow-hidden md:p-3 lg:p-4">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isStreaming={isStreaming}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        onNewChat={handleNewChat}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
      />

      <main
        aria-label="Assistant workspace"
        className="flex-1 min-h-0 flex flex-col min-w-0 bg-white md:rounded-xl md:border md:border-slate-200/80 md:shadow-xs relative overflow-hidden"
      >
        <ChatHeader
          selectedModel={selectedModel}
          isStreaming={isStreaming}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsMobileDrawerOpen((prev) => !prev);
            } else {
              setIsDesktopSidebarOpen((prev) => !prev);
            }
          }}
          onNewChat={handleNewChat}
        />

        {isWelcomeState ? (
          <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-white to-white">
            <div className="text-center mb-6 sm:mb-8 space-y-1.5 sm:space-y-2 px-2">
              <h1 className="text-2xl sm:text-4xl font-normal text-slate-800 tracking-tight">
                {t.geminiGreeting}
              </h1>
            </div>

            <div className="w-full max-w-2xl relative px-1 sm:px-0">
              <ChatOmnibox
                input={input}
                isStreaming={isStreaming}
                selectedModel={selectedModel}
                thinkingLevel={thinkingLevel}
                dropdownDirection="down"
                onInputChange={setInput}
                onSelectModel={setSelectedModel}
                onToggleThinkingLevel={() =>
                  setThinkingLevel((prev) => (prev === 'deep' ? 'normal' : 'deep'))
                }
                onSubmit={() => handleSend()}
              />

              <div
                role="tablist"
                aria-label="Assistant modes"
                className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar w-full px-1 py-1 justify-start sm:justify-center"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'chat'}
                  onClick={() => setActiveMode('chat')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[36px] flex items-center ${
                    activeMode === 'chat'
                      ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-300/80 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  {t.geminiModeChat}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'tools'}
                  onClick={() => setActiveMode('tools')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[36px] ${
                    activeMode === 'tools'
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  <span>{t.geminiModeTools}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'research'}
                  onClick={() => setActiveMode('research')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[36px] ${
                    activeMode === 'research'
                      ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                  <span>{t.geminiModeResearch}</span>
                </button>
              </div>

              <div
                aria-label="Suggested prompts"
                className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mx-auto px-1"
              >
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Suggested inquiry: ${item.text}`}
                    onClick={() => handleSend(item.text, item.mode)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-100 sm:bg-transparent border border-slate-200/50 sm:border-transparent text-left transition-all text-slate-700 hover:text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                  >
                    <span
                      className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="text-xs sm:text-sm font-normal truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              openAccordions={openAccordions}
              messagesEndRef={messagesEndRef}
              onToggleToolAccordion={(msgId) =>
                setOpenAccordions((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
              }
              onApproveAction={async (msgId) => {
                const targetMsg = messages.find((m) => m.id === msgId);
                if (!targetMsg?.activeTool) return;
                const { serverId, name, arguments: toolArgs } = targetMsg.activeTool;

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.activeTool
                      ? { ...m, activeTool: { ...m.activeTool, status: 'running' } }
                      : m,
                  ),
                );

                try {
                  if (!serverId) {
                    throw new Error('Missing MCP server identifier for tool execution.');
                  }
                  const execRes = await executeMcpTool({
                    serverId,
                    toolName: name,
                    arguments: toolArgs || {},
                  });
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msgId && m.activeTool
                        ? {
                            ...m,
                            activeTool: {
                              ...m.activeTool,
                              status: 'completed',
                              latencyMs: execRes.latencyMs,
                              result: execRes.result,
                            },
                            content:
                              (m.content ? `${m.content}\n\n` : '') +
                              `**Action confirmed:** Executed \`${execRes.toolName}\` (${execRes.latencyMs}ms).`,
                          }
                        : m,
                    ),
                  );
                } catch (err: unknown) {
                  const errMsg = err instanceof Error ? err.message : 'Tool execution failed.';
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msgId && m.activeTool
                        ? {
                            ...m,
                            activeTool: {
                              ...m.activeTool,
                              status: 'completed',
                              result: { status: 'EXECUTION_ERROR', error: errMsg },
                            },
                            content:
                              (m.content ? `${m.content}\n\n` : '') +
                              `**Action failed:** ${errMsg}`,
                          }
                        : m,
                    ),
                  );
                }
              }}
              onRejectAction={(msgId) =>
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.activeTool
                      ? {
                          ...m,
                          activeTool: {
                            ...m.activeTool,
                            status: 'completed',
                            result: { status: 'CANCELLED_BY_USER' },
                          },
                          content: m.content + '\n\n*Action cancelled by user.*',
                        }
                      : m,
                  ),
                )
              }
              onSelectCitation={setSelectedCitation}
              onFollowUpClick={(q) => setInput(q)}
              onFeedback={handleFeedback}
              onOpenTicket={(escalatedQuery) => {
                setTicketTitle('Escalated inquiry: ' + escalatedQuery);
                setTicketModalOpen(true);
              }}
            />

            <div className="p-2 sm:p-3 pb-safe bg-gradient-to-t from-white via-white to-white/95 border-t border-slate-100/80 md:border-t-0 shrink-0">
              <div className="w-full max-w-3xl mx-auto relative px-1 sm:px-0">
                <ChatOmnibox
                  input={input}
                  isStreaming={isStreaming}
                  selectedModel={selectedModel}
                  thinkingLevel={thinkingLevel}
                  dropdownDirection="up"
                  onInputChange={setInput}
                  onSelectModel={setSelectedModel}
                  onToggleThinkingLevel={() =>
                    setThinkingLevel((prev) => (prev === 'deep' ? 'normal' : 'deep'))
                  }
                  onSubmit={() => handleSend()}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <CitationDrawer
        citation={selectedCitation}
        initialSearchTerm={lastUserQuery}
        onClose={() => setSelectedCitation(null)}
      />

      <SupportTicketModal
        open={ticketModalOpen}
        ticketTitle={ticketTitle}
        ticketDescription={ticketDescription}
        submittedMessage={ticketSubmittedMsg}
        onTitleChange={setTicketTitle}
        onDescriptionChange={setTicketDescription}
        onSubmit={handleTicketCreate}
        onClose={() => setTicketModalOpen(false)}
      />
    </div>
  );
}
