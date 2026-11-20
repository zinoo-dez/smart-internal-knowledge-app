import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LanguageProvider } from '@/context/language-context';
import { ChatOmnibox } from './chat-omnibox';
import { AVAILABLE_MODELS } from './types';

function renderOmnibox(overrides?: Partial<React.ComponentProps<typeof ChatOmnibox>>) {
  const props: React.ComponentProps<typeof ChatOmnibox> = {
    input: '',
    isStreaming: false,
    selectedModel: AVAILABLE_MODELS[0]!,
    thinkingLevel: 'normal',
    dropdownDirection: 'down',
    onInputChange: vi.fn(),
    onSelectModel: vi.fn(),
    onToggleThinkingLevel: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };

  render(
    <LanguageProvider>
      <ChatOmnibox {...props} />
    </LanguageProvider>,
  );

  return props;
}

describe('ChatOmnibox', () => {
  it('submits non-empty inquiry and displays send button instead of mic', () => {
    const props = renderOmnibox({ input: 'What is our PTO carryover limit?' });

    const sendButton = screen.getByRole('button', { name: 'Send query to AI Assistant' });
    expect(sendButton).toBeEnabled();

    fireEvent.click(sendButton);
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables text input and send button while streaming', () => {
    renderOmnibox({ input: 'Streaming query', isStreaming: true });

    const textInput = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: 'Send query to AI Assistant' });

    expect(textInput).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('selects unlocked model, blocks locked Enterprise model with notice, and toggles thinking level', () => {
    const props = renderOmnibox();

    const trigger = screen.getByRole('button', { name: /Select AI Model/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Attempt locked model -> shows Enterprise notice and does NOT switch model
    const lockedOption = screen.getByRole('option', { name: /Enterprise Plan Required/i });
    fireEvent.click(lockedOption);
    expect(props.onSelectModel).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/requires an Enterprise plan/i);

    // Toggle thinking level inside dropdown
    const thinkingBtn = screen.getByRole('button', { name: /Thinking level/i });
    fireEvent.click(thinkingBtn);
    expect(props.onToggleThinkingLevel).toHaveBeenCalledTimes(1);

    // Select unlocked Claude Sonnet 4
    const claudeOption = screen.getByRole('option', { name: /Claude Sonnet 4/i });
    fireEvent.click(claudeOption);
    expect(props.onSelectModel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'claude-sonnet-4' }),
    );
  });

  it('closes model dropdown when pressing Escape', () => {
    renderOmnibox();

    const trigger = screen.getByRole('button', { name: /Select AI Model/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox', { name: 'AI Model Options' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'AI Model Options' })).not.toBeInTheDocument();
  });

  it('opens quick-context attach menu with document upload and MCP links', () => {
    renderOmnibox();

    const attachBtn = screen.getByRole('button', { name: 'Attach context or documents' });
    expect(attachBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(attachBtn);
    expect(attachBtn).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByRole('menuitem', { name: /Upload Knowledge Doc/i })).toHaveAttribute(
      'href',
      '/admin/documents',
    );
    expect(screen.getByRole('menuitem', { name: /Connect Live MCP Tool/i })).toHaveAttribute(
      'href',
      '/admin/mcp',
    );
  });

  it('displays clear status message when voice input is unsupported in current browser', () => {
    renderOmnibox({ input: '' });

    const micBtn = screen.getByRole('button', { name: 'Voice input query' });
    fireEvent.click(micBtn);

    expect(screen.getByRole('status')).toHaveTextContent(/Voice input is not supported/i);
  });
});
