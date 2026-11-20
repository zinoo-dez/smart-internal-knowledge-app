'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Lock, Mic, Plus, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { AVAILABLE_MODELS, ModelOption } from './types';

interface ChatOmniboxProps {
  input: string;
  isStreaming: boolean;
  selectedModel: ModelOption;
  thinkingLevel: 'normal' | 'deep';
  dropdownDirection: 'down' | 'up';
  onInputChange: (value: string) => void;
  onSelectModel: (model: ModelOption) => void;
  onToggleThinkingLevel: () => void;
  onSubmit: () => void;
}

export function ChatOmnibox({
  input,
  isStreaming,
  selectedModel,
  thinkingLevel,
  dropdownDirection,
  onInputChange,
  onSelectModel,
  onToggleThinkingLevel,
  onSubmit,
}: ChatOmniboxProps) {
  const { t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const dropdownPosition =
    dropdownDirection === 'up' ? 'right-0 bottom-full mb-2' : 'right-0 top-full mt-2';

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        aria-label="Internal Knowledge Search"
        onSubmit={(e) => {
          e.preventDefault();
          setIsDropdownOpen(false);
          onSubmit();
        }}
        className="relative"
      >
        <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-3 sm:pl-3.5 pr-2 flex items-center gap-2 sm:gap-2.5 min-h-[48px]">
          <button
            type="button"
            aria-label="Attach context or documents"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title="Attach context or documents"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>

          <input
            type="text"
            aria-label={t.inputPlaceholder}
            placeholder={t.inputPlaceholder}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isStreaming}
            className="flex-1 w-0 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm sm:text-base py-2 min-w-0"
            autoFocus
          />

          <div className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-label={`Select AI Model. Current model is ${selectedModel.name}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 border border-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span className="max-w-[44px] sm:max-w-none truncate">{selectedModel.shortLabel}</span>
              <ChevronDown
                aria-hidden="true"
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                role="listbox"
                aria-label="AI Model Options"
                className={`absolute ${dropdownPosition} z-40 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150`}
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
                        aria-label={`${model.purposeTitle}, ${model.subtitle}${
                          model.isLocked ? ' (Enterprise Plan Required)' : ''
                        }`}
                        onClick={() => {
                          if (model.isLocked) {
                            setLockedNotice(
                              `${model.name} requires an Enterprise plan. Upgrade in Plans & Billing.`,
                            );
                            setTimeout(() => setLockedNotice(null), 3000);
                            return;
                          }
                          onSelectModel(model);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          isSelected
                            ? 'bg-slate-100/90 font-semibold text-slate-900 border border-slate-200/70'
                            : 'hover:bg-slate-50 text-slate-700'
                        } ${model.isLocked ? 'opacity-70' : ''}`}
                      >
                        <div
                          className="w-4 h-4 flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4 text-slate-900" />
                          ) : model.isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          ) : null}
                        </div>
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
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg font-medium leading-tight my-1"
                  >
                    {lockedNotice}
                  </div>
                )}

                <div className="pt-2 pb-1 px-1">
                  <button
                    type="button"
                    aria-label={`Thinking level: currently set to ${
                      thinkingLevel === 'deep' ? 'Deep' : 'Standard'
                    }. Click to toggle.`}
                    onClick={onToggleThinkingLevel}
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
            )}
          </div>

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
  );
}
