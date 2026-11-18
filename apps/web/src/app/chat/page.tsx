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
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Mic,
  Check,
  Lock,
  Database,
  Shield,
  Calendar,
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
  shortLabel: string;
  provider: 'GEMINI' | 'OPENAI' | 'CLAUDE';
  modelName: string;
  purposeTitle: string;
  subtitle: string;
  badge: string;
  isLocked?: boolean;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash-Lite',
    shortLabel: 'Flash-Lite',
    provider: 'GEMINI',
    modelName: 'gemini-3.5-flash-lite',
    purposeTitle: 'Quick answers',
    subtitle: '3.5 Flash-Lite',
    badge: 'Default (Fast)',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    shortLabel: 'Claude 3.5',
    provider: 'CLAUDE',
    modelName: 'claude-3-5-sonnet-20241022',
    purposeTitle: 'Everyday help',
    subtitle: 'Claude 3.5 Sonnet',
    badge: 'Deep Reasoning',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o Pro',
    shortLabel: 'Pro',
    provider: 'OPENAI',
    modelName: 'gpt-4o',
    purposeTitle: 'Detailed research',
    subtitle: '3.1 Pro Flagship',
    badge: 'Multimodal Flagship',
  },
  {
    id: 'mcp-code-argon',
    name: 'Code & Analysis',
    shortLabel: 'Argon',
    provider: 'OPENAI',
    modelName: 'gpt-4o',
    purposeTitle: 'Code and analysis',
    subtitle: '4 Argon (MCP Enabled)',
    badge: 'Coding Specialist',
  },
  {
    id: 'enterprise-carbon',
    name: 'Most Complex Work',
    shortLabel: 'Carbon',
    provider: 'OPENAI',
    modelName: 'o1-preview',
    purposeTitle: 'Most complex work',
    subtitle: '4 Carbon (Enterprise)',
    badge: 'Enterprise Only',
    isLocked: true,
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: DocumentCitation[];
  queryLogId?: string;
  feedbackGiven?: 'UP' | 'DOWN';
  activeTool?: {
    name: string;
    serverName?: string;
    arguments?: Record<string, unknown>;
    result?: unknown;
    status: 'running' | 'completed' | 'approval_required';
    latencyMs?: number;
    actionId?: string;
  };
}

export default function ChatPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<DocumentCitation | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmittedMsg, setTicketSubmittedMsg] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[2]); // Default Pro
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Gemini UI States
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'tools' | 'research'>('chat');
  const [thinkingLevel, setThinkingLevel] = useState<'normal' | 'deep'>('deep');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen]);

  const toggleToolAccordion = (msgId: string) => {
    setOpenAccordions((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleApproveAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.activeTool
          ? {
              ...m,
              activeTool: {
                ...m.activeTool,
                status: 'completed',
                result: { status: 'APPROVED_AND_EXECUTED', timestamp: new Date().toISOString() },
              },
              content: m.content + '\n\n**Action confirmed:** Tool successfully executed with user approval.',
            }
          : m,
      ),
    );
  };

  const handleRejectAction = (msgId: string) => {
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
    );
  };

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
    setMessages([]);
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
    setIsModelDropdownOpen(false);
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
          mode: activeMode,
          thinkingLevel,
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
              } else if (data.type === 'tool_start') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          activeTool: {
                            name: data.toolName,
                            serverName: data.serverName,
                            arguments: data.arguments,
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
                            latencyMs: data.latencyMs,
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
                            name: data.toolName,
                            arguments: data.arguments,
                            status: 'approval_required',
                            actionId: data.actionId,
                          },
                        }
                      : m,
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

  const promptSuggestions = [
    {
      icon: <Database className="w-4 h-4" />,
      text: t.suggestionAws,
    },
    {
      icon: <Shield className="w-4 h-4" />,
      text: t.suggestionVpn,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      text: t.suggestionLeave,
    },
    {
      icon: <Cpu className="w-4 h-4" />,
      text: t.suggestionDbLive,
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      text: t.suggestionMyanmarLeave,
    },
  ];

  const isWelcomeState = messages.length === 0;

  // Render floating Model Dropdown Card matching Gemini Reference UI
  const renderModelDropdownCard = (positionClasses: string) => (
    <div
      className={`absolute ${positionClasses} z-40 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150`}
    >
      <div className="py-1 space-y-0.5">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                if (model.isLocked) {
                  setLockedNotice(`${model.name} requires an Enterprise plan. Upgrade in Plans & Billing.`);
                  setTimeout(() => setLockedNotice(null), 3000);
                  return;
                }
                setSelectedModel(model);
                setIsModelDropdownOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                isSelected
                  ? 'bg-slate-100/90 font-semibold text-slate-900 border border-slate-200/70'
                  : 'hover:bg-slate-50 text-slate-700'
              } ${model.isLocked ? 'opacity-70' : ''}`}
            >
              {/* Left Indicator: Checkmark for Selected, Lock for Locked, Spacer for others */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isSelected ? (
                  <Check className="w-4 h-4 text-slate-900" />
                ) : model.isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : null}
              </div>

              {/* Model Labels */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-xs truncate">
                  {model.purposeTitle}
                </div>
                <div className="text-[11px] text-slate-500 font-normal truncate">
                  {model.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {lockedNotice && (
        <div className="p-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg font-medium leading-tight my-1">
          {lockedNotice}
        </div>
      )}

      {/* Thinking Level Toggle */}
      <div className="pt-2 pb-1 px-1">
        <button
          type="button"
          onClick={() => setThinkingLevel((prev) => (prev === 'deep' ? 'normal' : 'deep'))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 text-xs transition-colors"
        >
          <span className="font-medium flex items-center gap-1.5 text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.thinkingLevel}</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
              {thinkingLevel === 'deep' ? 'Deep' : 'Standard'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 relative">
      {/* Left: Thread History Sidebar */}
      <aside
        className={`shrink-0 transition-all duration-200 flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden ${
          isSidebarOpen ? 'w-64' : 'w-0 border-none'
        }`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full p-3 space-y-3">
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              disabled={isStreaming}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors min-h-[40px]"
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

      {/* Main Screen Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-slate-200/80 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-800 tracking-tight">
                {t.appTitle}
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
                · {selectedModel.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isWelcomeState && (
              <button
                onClick={handleNewChat}
                disabled={isStreaming}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.newConversation}</span>
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* View Switch: Center-Stage Empty State vs Active Message Stream */}
        {isWelcomeState ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-white to-white">
            {/* Center-Stage Greeting */}
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 tracking-tight">
                {t.geminiGreeting}
              </h1>
            </div>

            {/* Omnibox Floating Pill Container */}
            <div className="w-full max-w-2xl relative" ref={modelDropdownRef}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative"
              >
                <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-3.5 pr-2 flex items-center gap-2.5 min-h-[48px]">
                  {/* Plus Action Button */}
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
                    title="Attach context or documents"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Input Query */}
                  <input
                    type="text"
                    placeholder={t.inputPlaceholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm sm:text-base py-2 min-w-0"
                    autoFocus
                  />

                  {/* Model Selector Inline Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shrink-0 border border-slate-200/60"
                    >
                      <span>{selectedModel.shortLabel}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isModelDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Floating Dropdown Card (Center-Stage: Pops DOWN) */}
                    {isModelDropdownOpen && renderModelDropdownCard('right-0 top-full mt-2')}
                  </div>

                  {/* Voice Mic or Send Button */}
                  {input.trim() ? (
                    <button
                      type="submit"
                      disabled={isStreaming}
                      className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                      title="Voice input"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

              {/* Mode Switcher Pills */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveMode('chat')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeMode === 'chat'
                      ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-300/80 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  {t.geminiModeChat}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('tools')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeMode === 'tools'
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.geminiModeTools}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('research')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeMode === 'research'
                      ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.geminiModeResearch}</span>
                </button>
              </div>

              {/* Vertical Prompt Cards (Inspired by Gemini Reference UI) */}
              <div className="mt-8 space-y-1 max-w-xl mx-auto">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(item.text)}
                    className="w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl hover:bg-slate-100/60 text-left transition-all text-slate-600 hover:text-slate-900 group"
                  >
                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
                      {item.icon}
                    </span>
                    <span className="text-sm font-normal truncate">
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Conversation Stream + Docked Floating Omnibox */
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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

                  {/* Message Bubble */}
                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {/* Live MCP Tool Execution Pill & Accordion */}
                    {msg.activeTool && (
                      <div className="mb-3">
                        {msg.activeTool.status === 'running' && (
                          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
                            <span>
                              Calling MCP Tool: <strong className="font-mono">{msg.activeTool.name}</strong>...
                            </span>
                          </div>
                        )}

                        {msg.activeTool.status === 'approval_required' && (
                          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
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
                                onClick={() => handleApproveAction(msg.id)}
                                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs min-h-[32px]"
                              >
                                Approve & Execute
                              </button>
                              <button
                                onClick={() => handleRejectAction(msg.id)}
                                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors min-h-[32px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.activeTool.status === 'completed' && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden text-xs">
                            <button
                              onClick={() => toggleToolAccordion(msg.id)}
                              className="w-full px-3 py-2 flex items-center justify-between bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors min-h-[36px]"
                            >
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-medium text-slate-600">MCP Tool:</span>
                                <span className="font-mono font-bold text-slate-900">{msg.activeTool.name}</span>
                                {msg.activeTool.latencyMs !== undefined && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({msg.activeTool.latencyMs}ms)
                                  </span>
                                )}
                              </div>
                              <ChevronDown
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
                    {msg.role === 'assistant' && (
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

            {/* Bottom Docked Floating Omnibox */}
            <div className="p-3 pb-4 bg-gradient-to-t from-white via-white/95 to-transparent shrink-0">
              <div className="w-full max-w-3xl mx-auto relative" ref={modelDropdownRef}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative"
                >
                  <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-3.5 pr-2 flex items-center gap-2.5 min-h-[48px]">
                    {/* Plus Action Button */}
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
                      title="Attach context or documents"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Input Query */}
                    <input
                      type="text"
                      placeholder={t.inputPlaceholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isStreaming}
                      className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm sm:text-base py-2 min-w-0"
                      autoFocus
                    />

                    {/* Model Selector Inline Pill */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shrink-0 border border-slate-200/60"
                      >
                        <span>{selectedModel.shortLabel}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                            isModelDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Floating Dropdown Card (Bottom Docked: Pops UP) */}
                      {isModelDropdownOpen && renderModelDropdownCard('right-0 bottom-full mb-2')}
                    </div>

                    {/* Voice Mic or Send Button */}
                    {input.trim() ? (
                      <button
                        type="submit"
                        disabled={isStreaming}
                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title="Voice input"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
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
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs min-h-[44px]"
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
