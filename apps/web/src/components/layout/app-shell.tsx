'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  BarChart3,
  Menu,
  X,
  FileText,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      label: 'AI Assistant',
      href: '/chat',
      icon: Bot,
      active: pathname === '/chat' || pathname === '/',
    },
    {
      label: 'Document Knowledge',
      href: '/admin/documents',
      icon: FileText,
      active: pathname.startsWith('/admin/documents'),
    },
    {
      label: 'Knowledge Gaps',
      href: '/admin/knowledge-gaps',
      icon: AlertCircle,
      active: pathname.startsWith('/admin/knowledge-gaps'),
    },
    {
      label: 'Usage & Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      active: pathname.startsWith('/admin/analytics'),
    },
    {
      label: 'Audit & Compliance',
      href: '/admin/audit-logs',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin/audit-logs'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            KA
          </div>
          <span className="font-semibold text-slate-900 text-sm">Knowledge Assistant</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Navigation Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-base shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm leading-tight">Internal Knowledge</div>
            <div className="text-xs text-slate-500 font-medium">Enterprise Assistant</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
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

        {/* Tenant Organization Context Card */}
        <div className="p-4 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-Tenant Active</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Role: <span className="font-semibold text-slate-700">ADMIN</span>
          </p>
          <p className="text-slate-400 text-[10px] mt-1 font-mono truncate">
            Org: mock-org-default
          </p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
