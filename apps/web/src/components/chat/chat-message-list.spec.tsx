import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DocumentSource, FeedbackType } from '@knowledge/shared';
import { LanguageProvider } from '@/context/language-context';
import { ChatMessageList } from './chat-message-list';
import { ChatMessage } from './types';

function renderMessageList(
  messages: ChatMessage[],
  overrides?: Partial<React.ComponentProps<typeof ChatMessageList>>,
) {
  const props: React.ComponentProps<typeof ChatMessageList> = {
    messages,
    isStreaming: false,
    openAccordions: {},
    messagesEndRef: { current: null },
    onToggleToolAccordion: vi.fn(),
    onApproveAction: vi.fn(),
    onRejectAction: vi.fn(),
    onSelectCitation: vi.fn(),
    onFollowUpClick: vi.fn(),
    onFeedback: vi.fn(),
    onOpenTicket: vi.fn(),
    ...overrides,
  };

  render(
    <LanguageProvider>
      <ChatMessageList {...props} />
    </LanguageProvider>,
  );

  return props;
}

describe('ChatMessageList', () => {
  it('displays animated thinking status while streaming empty assistant content and hides ghost action bar', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'How do I get VPN access?' },
      { id: 'a1', role: 'assistant', content: '' },
    ];

    renderMessageList(messages, { isStreaming: true });

    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /helpful/i })).not.toBeInTheDocument();
  });

  it('renders citations, follow-up suggestions, and feedback confirmation callbacks', () => {
    const citation = {
      chunkId: 'c1',
      documentId: 'd1',
      documentTitle: 'VPN Setup Handbook',
      source: DocumentSource.FILE_UPLOAD,
      snippet: 'Install WireGuard client.',
      relevanceScore: 0.95,
    };

    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'How do I get VPN access?' },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Install the WireGuard VPN client [1].',
        citations: [citation],
        queryLogId: 'qlog-1',
        followUpQuestions: ['Where is the WireGuard config?'],
      },
    ];

    const props = renderMessageList(messages);

    fireEvent.click(screen.getByRole('button', { name: /Inspect source citation 1/i }));
    expect(props.onSelectCitation).toHaveBeenCalledWith(citation);

    fireEvent.click(screen.getByRole('button', { name: /Ask follow-up question/i }));
    expect(props.onFollowUpClick).toHaveBeenCalledWith('Where is the WireGuard config?');

    fireEvent.click(screen.getByRole('button', { name: 'Helpful' }));
    expect(props.onFeedback).toHaveBeenCalledWith('a1', 'qlog-1', FeedbackType.THUMBS_UP);
  });

  it('disables feedback buttons and shows confirmation text once feedbackGiven is set', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: 'Annual leave is 20 days.',
        queryLogId: 'qlog-2',
        feedbackGiven: 'UP',
      },
    ];

    renderMessageList(messages);

    expect(screen.getByRole('button', { name: 'Helpful' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Needs improvement' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Thank you for feedback!');
  });

  it('supports HITL MCP tool approval/cancel and completed MCP accordion toggling', () => {
    const approvalMessages: ChatMessage[] = [
      {
        id: 'a-hitl',
        role: 'assistant',
        content: '',
        activeTool: {
          name: 'github_create_issue',
          status: 'approval_required',
          arguments: { repo: 'acme/web', title: 'Fix VPN doc' },
        },
      },
    ];

    const hitlProps = renderMessageList(approvalMessages);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Approve execution of tool github_create_issue/i }));
    expect(hitlProps.onApproveAction).toHaveBeenCalledWith('a-hitl');

    fireEvent.click(screen.getByRole('button', { name: /Cancel execution of tool github_create_issue/i }));
    expect(hitlProps.onRejectAction).toHaveBeenCalledWith('a-hitl');

    const completedMessages: ChatMessage[] = [
      {
        id: 'a-done',
        role: 'assistant',
        content: 'Issue created.',
        activeTool: {
          name: 'neon_run_sql',
          status: 'completed',
          latencyMs: 42,
          arguments: { query: 'SELECT 1' },
          result: { rows: 1 },
        },
      },
    ];

    const doneProps = renderMessageList(completedMessages, { openAccordions: { 'a-done': true } });
    const toggleBtn = screen.getByRole('button', { name: /Toggle execution details for MCP tool neon_run_sql/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Execution Result')).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(doneProps.onToggleToolAccordion).toHaveBeenCalledWith('a-done');
  });
});
