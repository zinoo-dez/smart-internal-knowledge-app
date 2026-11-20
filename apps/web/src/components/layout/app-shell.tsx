'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  BarChart3,
  Menu,
  X,
  FileText,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Cpu,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { BrandIcon } from '@/components/ui/brand-icon';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { fetchCurrentTenant, subscribeOfflineMode } from '@/lib/api-client';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOfflineDemo, setIsOfflineDemo] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [tenantOrgId, setTenantOrgId] = useState<string>('mock-org-default');
  const [tenantRole, setTenantRole] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    return subscribeOfflineMode((offline) => {
      setIsOfflineDemo(offline);
    });
  }, []);

  useEffect(() => {
    if (pathname === '/') return;
    let cancelled = false;
    fetchCurrentTenant().then((tenant) => {
      if (cancelled || !tenant) return;
      if (tenant.organizationId) setTenantOrgId(tenant.organizationId);
      if (tenant.userRole) setTenantRole(tenant.userRole);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const isLandingPage = pathname === '/';
  const isChatPage = pathname === '/chat' || pathname?.startsWith('/chat');

  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        {children}
      </div>
    );
  }

  const navItems = [
    {
      label: t.navAssistant,
      href: '/chat',
      icon: Bot,
      active: pathname === '/chat',
    },
    {
      label: t.navDocuments,
      href: '/admin/documents',
      icon: FileText,
      active: pathname.startsWith('/admin/documents'),
    },
    {
      label: t.navKnowledgeGaps,
      href: '/admin/knowledge-gaps',
      icon: AlertCircle,
      active: pathname.startsWith('/admin/knowledge-gaps'),
    },
    {
      label: t.navAnalytics,
      href: '/admin/analytics',
      icon: BarChart3,
      active: pathname.startsWith('/admin/analytics'),
    },
    {
      label: t.navAuditLogs,
      href: '/admin/audit-logs',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin/audit-logs'),
    },
    {
      label: t.navBilling,
      href: '/admin/billing',
      icon: CreditCard,
      active: pathname.startsWith('/admin/billing'),
    },
    {
      label: t.navMcp,
      href: '/admin/mcp',
      icon: Cpu,
      active: pathname.startsWith('/admin/mcp'),
    },
    {
      label: t.navDocs,
      href: '/docs',
      icon: HelpCircle,
      active: pathname.startsWith('/docs'),
    },
  ];

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row',
        isChatPage ? 'h-dvh overflow-hidden bg-white md:bg-slate-50' : 'min-h-screen bg-slate-50',
      )}
    >
      {/* Mobile Header Bar (suppressed on /chat to provide dedicated Gemini mobile header) */}
      {!isChatPage && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <BrandIcon className="w-8 h-8" />
            <span className="font-semibold text-slate-900 text-sm">{t.appTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Toggle Navigation"
              aria-expanded={mobileMenuOpen}
              aria-controls="desktop-sidebar-nav"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop overlay for mobile navigation menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Navigation Sidebar */}
      <aside
        id="desktop-sidebar-nav"
        aria-label="Main Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <BrandIcon className="w-9 h-9 shadow-sm" />
          <div>
            <div className="font-semibold text-slate-900 text-sm leading-tight">{t.appTitle}</div>
            <div className="text-xs text-slate-500 font-medium">{t.appSubtitle}</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t.navWorkspace}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  item.active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon className={cn('w-4 h-4', item.active ? 'text-blue-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Language Selection Card */}
        <div className="px-4 py-3 mx-3 mb-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">{t.languageLabel}</span>
          <LanguageSwitcher />
        </div>

        {/* Tenant Organization Context Card */}
        <div className="p-4 m-3 mb-8 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.multiTenantActive}</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            {tenantRole ? `Role: ${tenantRole}` : t.roleAdmin}
          </p>
          <p className="text-slate-400 text-[10px] mt-1 font-mono truncate">
            Org: {tenantOrgId}
          </p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'flex-1 min-h-0 flex flex-col min-w-0 outline-none',
          isChatPage ? 'overflow-hidden p-0' : 'overflow-y-auto',
        )}
      >
        {isOfflineDemo && !bannerDismissed && (
          <div
            role="status"
            aria-live="polite"
            className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-2 shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
              <span className="truncate font-medium">
                Offline Demo Mode — Backend API unreachable; displaying local sample data.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss offline notice"
              className="p-1 rounded hover:bg-amber-100 text-amber-700 shrink-0"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <div
          className={cn(
            'flex-1 min-h-0 w-full',
            isChatPage ? 'p-0 flex flex-col' : 'p-4 md:p-8 max-w-7xl mx-auto',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
