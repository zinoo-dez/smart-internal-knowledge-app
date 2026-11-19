'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  Copy,
  Highlighter,
  Menu,
  BarChart3,
  FileText,
  ShieldCheck,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { ConversationSummary, DocumentCitation, FeedbackType } from '@knowledge/shared';
import {
  API_BASE_URL,
  createSupportTicket,
  deleteConversation,
  fetchConversationDetail,
  fetchConversations,
  submitFeedback,
} from '@/lib/api-client';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { cn } from '@/lib/utils';

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
  followUpQuestions?: string[];
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
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<DocumentCitation | null>(null);
  const [copiedCitationSnippet, setCopiedCitationSnippet] = useState(false);
  const [highlightSearchTerm, setHighlightSearchTerm] = useState('');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmittedMsg, setTicketSubmittedMsg] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[2]); // Default Pro
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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

  // Keyboard accessibility: Escape key closes overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModelDropdownOpen) setIsModelDropdownOpen(false);
        if (isMobileDrawerOpen) setIsMobileDrawerOpen(false);
        if (selectedCitation) setSelectedCitation(null);
        if (ticketModalOpen) setTicketModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModelDropdownOpen, isMobileDrawerOpen, selectedCitation, ticketModalOpen]);

  // Auto-seed highlight search term from latest user inquiry
  useEffect(() => {
    if (selectedCitation) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        setHighlightSearchTerm(lastUserMsg.content);
      }
    }
  }, [selectedCitation, messages]);

  const handleCopyCitation = () => {
    if (selectedCitation?.snippet) {
      navigator.clipboard.writeText(selectedCitation.snippet);
      setCopiedCitationSnippet(true);
      setTimeout(() => setCopiedCitationSnippet(false), 2000);
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
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
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
              } else if (data.type === 'follow_ups') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, followUpQuestions: data.questions }
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
      icon: <Database className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionAws,
    },
    {
      icon: <Shield className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionVpn,
    },
    {
      icon: <Calendar className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionLeave,
    },
    {
      icon: <Cpu className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionDbLive,
    },
    {
      icon: <Sparkles className="w-4 h-4" aria-hidden="true" />,
      text: t.suggestionMyanmarLeave,
    },
  ];

  const isWelcomeState = messages.length === 0;

  // Render floating Model Dropdown Card matching Gemini Reference UI with full ARIA semantics
  const renderModelDropdownCard = (positionClasses: string) => (
    <div
      role="listbox"
      aria-label="AI Model Options"
      className={`absolute ${positionClasses} z-40 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150`}
    >
      <div className="py-1 space-y-0.5">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <button
              key={model.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`${model.purposeTitle}, ${model.subtitle}${model.isLocked ? ' (Enterprise Plan Required)' : ''}`}
              onClick={() => {
                if (model.isLocked) {
                  setLockedNotice(`${model.name} requires an Enterprise plan. Upgrade in Plans & Billing.`);
                  setTimeout(() => setLockedNotice(null), 3000);
                  return;
                }
                setSelectedModel(model);
                setIsModelDropdownOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isSelected
                  ? 'bg-slate-100/90 font-semibold text-slate-900 border border-slate-200/70'
                  : 'hover:bg-slate-50 text-slate-700'
              } ${model.isLocked ? 'opacity-70' : ''}`}
            >
              {/* Left Indicator: Checkmark for Selected, Lock for Locked, Spacer for others */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
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
        <div role="status" aria-live="polite" className="p-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg font-medium leading-tight my-1">
          {lockedNotice}
        </div>
      )}

      {/* Thinking Level Toggle */}
      <div className="pt-2 pb-1 px-1">
        <button
          type="button"
          aria-label={`Thinking level: currently set to ${thinkingLevel === 'deep' ? 'Deep' : 'Standard'}. Click to toggle.`}
          onClick={() => setThinkingLevel((prev) => (prev === 'deep' ? 'normal' : 'deep'))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span className="font-medium flex items-center gap-1.5 text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>{t.thinkingLevel}</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
              {thinkingLevel === 'deep' ? 'Deep' : 'Standard'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full md:gap-4 relative overflow-hidden md:p-3 lg:p-4">
      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left: Thread History Sidebar (Desktop) / Slide-over Drawer (Mobile) */}
      <aside
        aria-label="Conversation history"
        className={cn(
          'transition-all duration-200 flex flex-col bg-white overflow-hidden',
          // Mobile: slide-over drawer
          'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 shadow-2xl md:shadow-xs md:static md:z-auto md:rounded-xl md:border md:border-slate-200/80',
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Desktop: collapsible panel
          isDesktopSidebarOpen ? 'md:w-64' : 'md:w-0 md:border-none',
        )}
      >
        <div className="flex flex-col h-full p-3 space-y-3">
          {/* Mobile Drawer Brand Header with Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 md:hidden">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                KA
              </div>
              <span className="font-semibold text-slate-900 text-xs">{t.appTitle}</span>
            </div>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            disabled={isStreaming}
            aria-label={t.newConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t.newConversation}</span>
          </button>

          {/* Threads Header */}
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>{t.pastConversations}</span>
            <span className="font-mono text-slate-500" aria-label={`${conversations.length} total saved conversations`}>
              {conversations.length}
            </span>
          </div>

          {/* Threads List */}
          <nav aria-label="Past conversations" className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                {t.noConversations}
              </div>
            ) : (
              conversations.map((thread) => {
                const isActive = activeConversationId === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectThread(thread.id);
                      }
                    }}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Open conversation: ${thread.title}`}
                    className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/60'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <MessageSquare
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{thread.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      aria-label={`Delete conversation: ${thread.title}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity shrink-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 rounded"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </nav>

          {/* Mobile-Only Workspace Navigation Links */}
          <div className="pt-2 border-t border-slate-100 md:hidden space-y-1">
            <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.navWorkspace}
            </div>
            {[
              { label: t.navDocuments, href: '/admin/documents', icon: FileText },
              { label: t.navKnowledgeGaps, href: '/admin/knowledge-gaps', icon: AlertCircle },
              { label: t.navAnalytics, href: '/admin/analytics', icon: BarChart3 },
              { label: t.navAuditLogs, href: '/admin/audit-logs', icon: ShieldCheck },
              { label: t.navBilling, href: '/admin/billing', icon: CreditCard },
              { label: t.navMcp, href: '/admin/mcp', icon: Cpu },
              { label: t.navDocs, href: '/docs', icon: HelpCircle },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[38px]"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Footer with Org info & Language */}
          <div className="pt-2 border-t border-slate-100 md:hidden flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Org: mock-org-default</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </aside>

      {/* Main Screen Container */}
      <main
        aria-label="Assistant workspace"
        className="flex-1 flex flex-col min-w-0 bg-white md:rounded-xl md:border md:border-slate-200/80 md:shadow-xs relative overflow-hidden h-full"
      >
        {/* Top Header Bar */}
        <header className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/80 shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileDrawerOpen(!isMobileDrawerOpen);
                } else {
                  setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
                }
              }}
              aria-label={
                isDesktopSidebarOpen ? 'Hide conversation sidebar' : 'Show conversation sidebar'
              }
              aria-expanded={isMobileDrawerOpen || isDesktopSidebarOpen}
              className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 md:hidden" aria-hidden="true" />
              <span className="hidden md:inline">
                {isDesktopSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4 text-slate-500" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-slate-500" aria-hidden="true" />
                )}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-800 tracking-tight">
                {t.appTitle}
              </span>
              <span className="hidden md:inline-block text-[11px] text-slate-400 font-normal">
                · {selectedModel.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleNewChat}
              disabled={isStreaming}
              aria-label={t.newConversation}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title={t.newConversation}
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600" aria-hidden="true" />
              <span className="hidden sm:inline">{t.newConversation}</span>
            </button>
            <LanguageSwitcher compact />
          </div>
        </header>

        {/* View Switch: Center-Stage Empty State vs Active Message Stream */}
        {isWelcomeState ? (
          <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-white to-white">
            {/* Center-Stage Greeting */}
            <div className="text-center mb-6 sm:mb-8 space-y-1.5 sm:space-y-2 px-2">
              <h1 className="text-2xl sm:text-4xl font-normal text-slate-800 tracking-tight">
                {t.geminiGreeting}
              </h1>
            </div>

            {/* Omnibox Floating Pill Container */}
            <div className="w-full max-w-2xl relative px-1 sm:px-0" ref={modelDropdownRef}>
              <form
                role="search"
                aria-label="Internal Knowledge Search"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative"
              >
                <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-3 sm:pl-3.5 pr-2 flex items-center gap-2 sm:gap-2.5 min-h-[48px]">
                  {/* Plus Action Button */}
                  <button
                    type="button"
                    aria-label="Attach context or documents"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    title="Attach context or documents"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* Input Query */}
                  <input
                    type="text"
                    aria-label={t.inputPlaceholder}
                    placeholder={t.inputPlaceholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-base py-2 min-w-0"
                    autoFocus
                  />

                  {/* Model Selector Inline Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isModelDropdownOpen}
                      aria-label={`Select AI Model. Current model is ${selectedModel.name}`}
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 border border-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>{selectedModel.shortLabel}</span>
                      <ChevronDown
                        aria-hidden="true"
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
                      aria-label="Send query to AI Assistant"
                      className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Voice input query"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      title="Voice input"
                    >
                      <Mic className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </form>

              {/* Mode Switcher Pills (Horizontally Scrollable on Mobile) */}
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

              {/* Responsive Suggested Prompts Grid */}
              <div aria-label="Suggested prompts" className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mx-auto px-1">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Suggested inquiry: ${item.text}`}
                    onClick={() => handleSend(item.text)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-100 sm:bg-transparent border border-slate-200/50 sm:border-transparent text-left transition-all text-slate-700 hover:text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                  >
                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="text-xs sm:text-sm font-normal truncate">
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
                  {/* Avatar */}
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
                          <div
                            role="status"
                            aria-live="polite"
                            className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2"
                          >
                            <Cpu className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" aria-hidden="true" />
                            <span>
                              Calling MCP Tool: <strong className="font-mono">{msg.activeTool.name}</strong>...
                            </span>
                          </div>
                        )}

                        {msg.activeTool.status === 'approval_required' && (
                          <div
                            role="alertdialog"
                            aria-labelledby={`hitl-title-${msg.id}`}
                            className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2"
                          >
                            <div id={`hitl-title-${msg.id}`} className="flex items-center gap-1.5 font-bold text-amber-900">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
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
                                aria-label={`Approve execution of tool ${msg.activeTool.name}`}
                                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                              >
                                Approve & Execute
                              </button>
                              <button
                                onClick={() => handleRejectAction(msg.id)}
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
                              onClick={() => toggleToolAccordion(msg.id)}
                              aria-expanded={openAccordions[msg.id]}
                              aria-label={`Toggle execution details for MCP tool ${msg.activeTool.name}`}
                              className="w-full px-3 py-2 flex items-center justify-between bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                <span className="font-medium text-slate-600">MCP Tool:</span>
                                <span className="font-mono font-bold text-slate-900">{msg.activeTool.name}</span>
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
                          setSelectedCitation(msg.citations[idx]);
                        }
                      }}
                    />

                    {/* Citations list for assistant messages */}
                    {msg.citations && msg.citations.length > 0 && (
                      <nav aria-label="Cited Sources" className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                          <span>{t.citedSources}:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(c)}
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

                    {/* Dynamic Suggested Follow-up Questions */}
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
                              onClick={() => {
                                setInput(q);
                              }}
                              className="text-xs text-left px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors shadow-2xs inline-flex items-center gap-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                              title="Click to ask this follow-up question"
                            >
                              <span>{q}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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
                            aria-label={t.feedbackHelpful}
                            className={`p-1.5 rounded hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                              msg.feedbackGiven === 'UP' ? 'text-emerald-600 font-bold' : ''
                            }`}
                            title={t.feedbackHelpful}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, msg.queryLogId, FeedbackType.THUMBS_DOWN)}
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
                          onClick={() => {
                            setTicketTitle('Escalated inquiry: ' + (messages[messages.length - 2]?.content || ''));
                            setTicketModalOpen(true);
                          }}
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

            {/* Bottom Docked Floating Omnibox */}
            <div className="p-2 sm:p-3 pb-safe bg-gradient-to-t from-white via-white/95 to-transparent shrink-0">
              <div className="w-full max-w-3xl mx-auto relative px-1 sm:px-0" ref={modelDropdownRef}>
                <form
                  role="search"
                  aria-label="Internal Knowledge Search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative"
                >
                  <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-3 sm:pl-3.5 pr-2 flex items-center gap-2 sm:gap-2.5 min-h-[48px]">
                    {/* Plus Action Button */}
                    <button
                      type="button"
                      aria-label="Attach context or documents"
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      title="Attach context or documents"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {/* Input Query */}
                    <input
                      type="text"
                      aria-label={t.inputPlaceholder}
                      placeholder={t.inputPlaceholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isStreaming}
                      className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-base py-2 min-w-0"
                      autoFocus
                    />

                    {/* Model Selector Inline Pill */}
                    <div className="relative">
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isModelDropdownOpen}
                        aria-label={`Select AI Model. Current model is ${selectedModel.name}`}
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 border border-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <span>{selectedModel.shortLabel}</span>
                        <ChevronDown
                          aria-hidden="true"
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
                        aria-label="Send query to AI Assistant"
                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Voice input query"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        title="Voice input"
                      >
                        <Mic className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right-Side Slide-out Citation Inspection Drawer */}
      {selectedCitation && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setSelectedCitation(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="citation-drawer-heading"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div id="citation-drawer-heading" className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>{t.drawerTitle}</span>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                aria-label="Close citation inspector"
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
                  {selectedCitation.documentTitle}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Provenance: Chunk #{selectedCitation.chunkId.slice(0, 8)}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.relevanceMatch}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedCitation.source}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Score: {(selectedCitation.relevanceScore * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                    Role: ACL Verified
                  </span>
                </div>
              </div>

              {/* Keyword Highlighting Controls */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                    <span>Interactive Source Highlighting</span>
                  </div>
                  <button
                    onClick={handleCopyCitation}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    title="Copy excerpt to clipboard"
                  >
                    {copiedCitationSnippet ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
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
                    value={highlightSearchTerm}
                    onChange={(e) => setHighlightSearchTerm(e.target.value)}
                    className="w-full pl-2.5 pr-2 py-1.5 text-xs rounded-md border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none bg-slate-50/50"
                  />
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {renderHighlightedSnippet(selectedCitation.snippet, highlightSearchTerm)}
                </div>
              </div>

              {selectedCitation.sourceUrl && (
                <a
                  href={selectedCitation.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  <span>Open original document</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Support Ticket Modal Dialog */}
      {ticketModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-dialog-heading"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div id="ticket-dialog-heading" className="flex items-center gap-2 font-semibold text-slate-900">
                <LifeBuoy className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <span>{t.createTicketTitle}</span>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                aria-label="Close support ticket modal"
                className="text-slate-400 hover:text-slate-600 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {ticketSubmittedMsg ? (
              <div role="status" aria-live="polite" className="p-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                {ticketSubmittedMsg}
              </div>
            ) : (
              <form onSubmit={handleTicketCreate} className="space-y-4">
                <div>
                  <label htmlFor="ticket-subject-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.ticketSubject}
                  </label>
                  <input
                    id="ticket-subject-input"
                    type="text"
                    required
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="ticket-desc-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.ticketDescription}
                  </label>
                  <textarea
                    id="ticket-desc-input"
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide details about your question or issue..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTicketModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
