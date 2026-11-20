'use client';

import React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { BrandIcon } from '@/components/ui/brand-icon';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ModelOption } from './types';

interface ChatHeaderProps {
  selectedModel: ModelOption;
  isStreaming: boolean;
  isDesktopSidebarOpen: boolean;
  isMobileDrawerOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

export function ChatHeader({
  selectedModel,
  isStreaming,
  isDesktopSidebarOpen,
  isMobileDrawerOpen,
  onToggleSidebar,
  onNewChat,
}: ChatHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/80 shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
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
        <div className="flex items-center gap-2 min-w-0">
          <BrandIcon variant="mark" className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 tracking-tight truncate">
            {t.appTitle}
          </span>
          <span className="hidden md:inline-block text-[11px] text-slate-400 font-normal shrink-0">
            · {selectedModel.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onNewChat}
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
  );
}
