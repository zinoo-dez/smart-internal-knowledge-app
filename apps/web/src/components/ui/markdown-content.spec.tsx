import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownContent } from './markdown-content';

describe('MarkdownContent UI Component', () => {
  it('renders user messages as plain pre-wrapped text', () => {
    render(<MarkdownContent content="How do I configure WireGuard?" isUser />);
    expect(screen.getByText('How do I configure WireGuard?')).toBeTruthy();
  });

  it('converts inline [1] markers into interactive citation buttons and invokes callback with zero-based index', () => {
    const onCitationClick = vi.fn();
    render(
      <MarkdownContent
        content="Employees receive **20 days** of annual leave [1] and health coverage [2]."
        onCitationClick={onCitationClick}
      />,
    );

    const firstCiteBtn = screen.getByTitle('View citation [1]');
    const secondCiteBtn = screen.getByTitle('View citation [2]');
    expect(firstCiteBtn).toBeTruthy();
    expect(secondCiteBtn).toBeTruthy();

    fireEvent.click(firstCiteBtn);
    fireEvent.click(secondCiteBtn);

    expect(onCitationClick).toHaveBeenNthCalledWith(1, 0);
    expect(onCitationClick).toHaveBeenNthCalledWith(2, 1);
  });

  it('neutralizes unsafe javascript:, data:, and protocol-relative markdown links while preserving https links', () => {
    const { container } = render(
      <MarkdownContent
        content={
          'Try [JS XSS](javascript:alert(1)), [Data XSS](data:text/html,xss), [Proto](//evil.example/x), and [Safe Docs](https://docs.company.internal/leave).'
        }
      />,
    );

    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('https://docs.company.internal/leave');
    expect(anchors[0].getAttribute('rel')).toContain('noopener');
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('data:text/html');
  });
});
