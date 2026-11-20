'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BarChart3,
  Cpu,
  CreditCard,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { ConversationSummary } from '@knowledge/shared';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  isStreaming: boolean;
  isDesktopSidebarOpen: boolean;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string, e: React.MouseEvent) => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  isStreaming,
  isDesktopSidebarOpen,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  onNewChat,
  onSelectThread,
  onDeleteThread,
}: ChatSidebarProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobileDrawer}
          aria-hidden="true"
        />
      )}

      {/* Left: Thread History Sidebar (Desktop) / Slide-over Drawer (Mobile) */}
      <aside
        aria-label="Conversation history"
        className={cn(
          'transition-all duration-200 flex flex-col bg-white overflow-hidden',
          'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 shadow-2xl md:shadow-xs md:static md:z-auto md:rounded-xl md:border md:border-slate-200/80',
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
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
              type="button"
              onClick={onCloseMobileDrawer}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={onNewChat}
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
            <span
              className="font-mono text-slate-500"
              aria-label={`${conversations.length} total saved conversations`}
            >
              {conversations.length}
            </span>
          </div>

          {/* Threads List */}
          <nav aria-label="Past conversations" className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">{t.noConversations}</div>
            ) : (
              conversations.map((thread) => {
                const isActive = activeConversationId === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => onSelectThread(thread.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectThread(thread.id);
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
                      type="button"
                      onClick={(e) => onDeleteThread(thread.id, e)}
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
                  onClick={onCloseMobileDrawer}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[38px]"
                >
                  <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Footer */}
          <div className="pt-2 border-t border-slate-100 md:hidden flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Workspace: Demo</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </aside>
    </>
  );
}
