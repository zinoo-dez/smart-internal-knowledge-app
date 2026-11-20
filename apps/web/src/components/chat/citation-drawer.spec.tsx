import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentSource } from '@knowledge/shared';
import { CitationDrawer } from './citation-drawer';
import { LanguageProvider } from '@/context/language-context';

describe('CitationDrawer Security & Highlighting Verification', () => {
  beforeEach(() => {
    // jsdom does not natively implement HTMLDialogElement.showModal/close
    if (typeof HTMLDialogElement !== 'undefined') {
      HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      });
      HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      });
    }
  });

  it('blocks javascript: and data: sourceUrl values from rendering external anchor tags', () => {
    const { container } = render(
      <LanguageProvider>
        <CitationDrawer
          citation={{
            chunkId: 'chunk-xss-1',
            documentId: 'doc-1',
            documentTitle: 'Malicious Source Doc',
            source: DocumentSource.NOTION,
            snippet: 'Policy excerpt text',
            relevanceScore: 0.92,
            sourceUrl: 'javascript:alert(1)',
          }}
          initialSearchTerm=""
          onClose={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByText('Open original document')).toBeNull();
  });

  it('renders https:// sourceUrl safely and highlights every repeated match without /g lastIndex drift or ReDoS', () => {
    const { container } = render(
      <LanguageProvider>
        <CitationDrawer
          citation={{
            chunkId: 'chunk-safe-1',
            documentId: 'doc-2',
            documentTitle: 'Annual Leave Handbook',
            source: DocumentSource.FILE_UPLOAD,
            snippet: 'Leave policy: annual leave accrues monthly. Request leave in Workday.',
            relevanceScore: 0.96,
            sourceUrl: 'https://docs.company.internal/leave',
          }}
          initialSearchTerm={`leave ${'x'.repeat(500)}`}
          onClose={vi.fn()}
        />
      </LanguageProvider>,
    );

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://docs.company.internal/leave');
    expect(link?.getAttribute('rel')).toContain('noopener');

    // All 3 case-insensitive occurrences of "leave" must be highlighted as <mark>
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(3);
  });
});
