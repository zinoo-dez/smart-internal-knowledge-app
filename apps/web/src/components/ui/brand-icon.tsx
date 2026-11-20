'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface BrandIconProps {
  /** 'badge' renders the rounded-square blue brand mark; 'mark' renders the glyph inheriting currentColor. */
  variant?: 'badge' | 'mark';
  className?: string;
  /** Provide an accessible title when the icon is not purely decorative. */
  title?: string;
}

const SPARK_PATH =
  'M16 5.8C16.55 8.75 17.65 9.85 20.6 10.4C17.65 10.95 16.55 12.05 16 15C15.45 12.05 14.35 10.95 11.4 10.4C14.35 9.85 15.45 8.75 16 5.8Z';
const LEFT_PAGE_PATH =
  'M7 15.3C9.8 15 12.8 15.9 15.2 17.7V26C12.8 24.4 9.8 23.7 7 24C6.6 24 6.3 23.7 6.3 23.3V16C6.3 15.6 6.6 15.3 7 15.3Z';
const RIGHT_PAGE_PATH =
  'M25 15.3C22.2 15 19.2 15.9 16.8 17.7V26C19.2 24.4 22.2 23.7 25 24C25.4 24 25.7 23.7 25.7 23.3V16C25.7 15.6 25.4 15.3 25 15.3Z';

/** Custom Knowledge Spark SVG brand icon matching the application favicon. */
export function BrandIcon({ variant = 'badge', className, title }: BrandIconProps) {
  const gradientId = useId().replace(/:/g, '');
  const isDecorative = !title;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative ? 'true' : undefined}
      aria-label={title || undefined}
      className={cn('shrink-0', variant === 'badge' ? 'w-9 h-9 rounded-lg' : 'w-5 h-5', className)}
    >
      {title ? <title>{title}</title> : null}
      {variant === 'badge' ? (
        <>
          <defs>
            <linearGradient
              id={`ks-bg-${gradientId}`}
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill={`url(#ks-bg-${gradientId})`} />
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="7.5"
            stroke="#60A5FA"
            strokeOpacity="0.35"
          />
          <path d={SPARK_PATH} fill="#FFFFFF" />
          <path d={LEFT_PAGE_PATH} fill="#FFFFFF" />
          <path d={RIGHT_PAGE_PATH} fill="#DBEAFE" />
        </>
      ) : (
        <>
          <path d={SPARK_PATH} fill="currentColor" />
          <path d={LEFT_PAGE_PATH} fill="currentColor" />
          <path d={RIGHT_PAGE_PATH} fill="currentColor" fillOpacity="0.72" />
        </>
      )}
    </svg>
  );
}
