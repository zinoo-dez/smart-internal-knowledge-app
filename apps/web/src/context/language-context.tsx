'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Language,
  Translations,
  TRANSLATIONS,
  getTranslations,
  LANG_COOKIE_NAME,
} from '@/i18n/translations';

export type { Language, Translations };
export { TRANSLATIONS };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isMyanmar: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: TRANSLATIONS.en,
  isMyanmar: false,
});

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  let refreshServer = () => {};
  try {
    // Safely acquire Next.js router when inside App Router, no-op in test environments
    const router = useRouter();
    if (router && typeof router.refresh === 'function') {
      refreshServer = () => {
        try {
          router.refresh();
        } catch {
          // ignore
        }
      };
    }
  } catch {
    // Not inside Next.js App Router context (e.g. unit test runner)
  }

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('knowledge_assistant_lang') ||
        localStorage.getItem('knowledge_app_lang');
      if (saved === 'my' || saved === 'en') {
        if (saved !== initialLanguage) {
          setLanguageState(saved);
          document.cookie = `${LANG_COOKIE_NAME}=${saved}; path=/; max-age=31536000; SameSite=Lax`;
          refreshServer();
        }
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, [initialLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('knowledge_assistant_lang', lang);
      localStorage.setItem('knowledge_app_lang', lang);
    } catch {
      // Ignore localStorage access restrictions
    }

    try {
      document.cookie = `${LANG_COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore cookie write errors
    }

    refreshServer();
  };

  const t = getTranslations(language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isMyanmar: language === 'my',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
