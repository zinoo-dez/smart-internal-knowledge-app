'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium',
        className,
      )}
      role="group"
      aria-label="Language selector"
    >
      {!compact && (
        <span className="flex items-center gap-1 px-2 text-slate-500 font-semibold text-[11px]">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
        </span>
      )}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        aria-label="Switch language to English"
        className={cn(
          'px-2.5 py-1 rounded-md transition-all font-medium text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
          language === 'en'
            ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('my')}
        aria-pressed={language === 'my'}
        aria-label="မြန်မာဘာသာသို့ ပြောင်းရန် (Switch language to Myanmar)"
        className={cn(
          'px-2.5 py-1 rounded-md transition-all font-medium text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
          language === 'my'
            ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
        )}
      >
        မြန်မာ
      </button>
    </div>
  );
}
