'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LandingContent } from '@/content/landing-content';

interface MobileNavProps {
  nav: LandingContent['nav'];
}

export function MobileNav({ nav }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="mobile-landing-nav"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div
          id="mobile-landing-nav"
          className="absolute top-16 left-0 right-0 border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg z-50 md:hidden"
        >
          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
          >
            {nav.features}
          </a>
          <a
            href="#architecture"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
          >
            {nav.architecture}
          </a>
          <a
            href="#use-cases"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
          >
            {nav.useCases}
          </a>
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
          >
            {nav.pricing}
          </a>
          <Link
            href="/docs"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
          >
            {nav.docs}
          </Link>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {nav.launch}
            </Link>
            <Link
              href="/admin/documents"
              onClick={() => setOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
            >
              {nav.admin}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
