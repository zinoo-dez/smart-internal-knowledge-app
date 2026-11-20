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
});
