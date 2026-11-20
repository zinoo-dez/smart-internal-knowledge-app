import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LanguageProvider, useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from './language-switcher';

function LanguageProbe() {
  const { language, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang-code">{language}</span>
      <span data-testid="nav-assistant">{t.navAssistant}</span>
      <LanguageSwitcher />
    </div>
  );
}

describe('LanguageSwitcher & LanguageContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to English (en) and updates aria-pressed & localStorage when toggled to Myanmar', () => {
    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    const enButton = screen.getByRole('button', { name: /switch language to english/i });
    const myButton = screen.getByRole('button', { name: /switch language to myanmar/i });

    expect(enButton).toHaveAttribute('aria-pressed', 'true');
    expect(myButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('lang-code')).toHaveTextContent('en');

    fireEvent.click(myButton);

    expect(enButton).toHaveAttribute('aria-pressed', 'false');
    expect(myButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lang-code')).toHaveTextContent('my');
    expect(window.localStorage.getItem('knowledge_assistant_lang')).toBe('my');
    expect(screen.getByTestId('nav-assistant')).not.toHaveTextContent('AI Assistant');
  });

  it('restores saved Myanmar preference from localStorage on initial render', () => {
    window.localStorage.setItem('knowledge_assistant_lang', 'my');

    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    const myButton = screen.getByRole('button', { name: /switch language to myanmar/i });
    expect(myButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lang-code')).toHaveTextContent('my');
  });
});
