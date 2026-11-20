import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LanguageProvider } from '@/context/language-context';
import { markOfflineDemoMode } from '@/lib/api-client';
import { AppShell } from './app-shell';

const mockUsePathname = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    markOfflineDemoMode(false);
  });

  it('uses h-dvh and flex-1 min-h-0 flex chain on /chat so mobile omnibox stays bottom-docked', () => {
    mockUsePathname.mockReturnValue('/chat');

    const { container } = render(
      <LanguageProvider>
        <AppShell>
          <div data-testid="chat-child">Chat content</div>
        </AppShell>
      </LanguageProvider>,
    );

    const outerShell = container.firstElementChild;
    const main = screen.getByRole('main');
    const innerWrap = main.firstElementChild;

    expect(outerShell).toHaveClass('h-dvh', 'overflow-hidden');
    expect(main).toHaveClass('flex-1', 'min-h-0', 'flex', 'flex-col', 'overflow-hidden');
    expect(innerWrap).toHaveClass('flex-1', 'min-h-0', 'flex', 'flex-col');
    expect(screen.getByTestId('chat-child')).toBeInTheDocument();
  });

  it('renders navigation sidebar with active link state on admin routes', () => {
    mockUsePathname.mockReturnValue('/admin/documents');

    render(
      <LanguageProvider>
        <AppShell>
          <div>Admin Documents</div>
        </AppShell>
      </LanguageProvider>,
    );

    const docsLink = screen.getByRole('link', { name: /Document Knowledge/i });
    expect(docsLink).toHaveAttribute('aria-current', 'page');
  });

  it('displays dismissible Offline Demo Mode banner when offline fallback is active', () => {
    mockUsePathname.mockReturnValue('/admin/documents');
    markOfflineDemoMode(true);

    render(
      <LanguageProvider>
        <AppShell>
          <div>Admin Documents</div>
        </AppShell>
      </LanguageProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Offline Demo Mode/i);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss offline notice' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
