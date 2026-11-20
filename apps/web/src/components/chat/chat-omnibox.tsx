'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight, Cpu, FileUp, Lock, Mic, MicOff, Plus, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { AVAILABLE_MODELS, ModelOption } from './types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

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
  const { language, t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!isDropdownOpen && !isAttachMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsAttachMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen, isAttachMenuOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleVoiceToggle = () => {
    if (isStreaming) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setVoiceNotice('Voice input is not supported in this browser.');
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechCtor();
      recognition.lang = language === 'my' ? 'my-MM' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) {
          onInputChange(input ? `${input} ${transcript}` : transcript);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        setVoiceNotice('Could not capture voice input. Check microphone permissions.');
        setTimeout(() => setVoiceNotice(null), 3000);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Voice recognition failed to start.');
      setTimeout(() => setVoiceNotice(null), 3000);
    }
  };

  const dropdownPosition =
    dropdownDirection === 'up' ? 'right-0 bottom-full mb-2' : 'right-0 top-full mt-2';
  const attachMenuPosition =
    dropdownDirection === 'up' ? 'left-0 bottom-full mb-2' : 'left-0 top-full mt-2';

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
        <div className="rounded-full bg-white border border-slate-200/90 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-slate-300 transition-all p-1.5 pl-2 sm:pl-3.5 pr-1.5 sm:pr-2 flex items-center gap-1.5 sm:gap-2.5 min-h-[48px]">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsAttachMenuOpen((prev) => !prev);
                setIsDropdownOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={isAttachMenuOpen}
              aria-label="Attach context or documents"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Attach context or documents"
            >
              <Plus
                className={`w-4 h-4 transition-transform ${isAttachMenuOpen ? 'rotate-45 text-blue-600' : ''}`}
                aria-hidden="true"
              />
            </button>

            {isAttachMenuOpen && (
              <div
                role="menu"
                aria-label="Context sources"
                className={`absolute ${attachMenuPosition} z-40 w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 p-1.5 text-xs space-y-0.5`}
              >
                <Link
                  href="/admin/documents"
                  role="menuitem"
                  onClick={() => setIsAttachMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <FileUp className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>Upload Knowledge Doc</span>
                </Link>
                <Link
                  href="/admin/mcp"
                  role="menuitem"
                  onClick={() => setIsAttachMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <Cpu className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>Connect Live MCP Tool</span>
                </Link>
              </div>
            )}
          </div>

          <input
            type="text"
            aria-label={t.inputPlaceholder}
            placeholder={t.inputPlaceholder}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isStreaming}
            className="flex-1 w-0 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm sm:text-base py-2 pr-1 truncate min-w-0"
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
              onClick={handleVoiceToggle}
              disabled={isStreaming}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop voice input' : 'Voice input query'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isListening
                  ? 'bg-rose-50 text-rose-600 animate-pulse'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Mic className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        {voiceNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mt-1.5 px-3 text-[11px] text-amber-700 font-medium text-center"
          >
            {voiceNotice}
          </div>
        )}
      </form>
    </div>
  );
}
