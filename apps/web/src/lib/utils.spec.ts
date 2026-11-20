import { describe, expect, it } from 'vitest';
import { isSafeExternalUrl } from './utils';

describe('Web URL Sanitization Utility (isSafeExternalUrl - SEC-14)', () => {
  it('blocks javascript:, data:, vbscript:, malformed, and protocol-relative // URLs', () => {
    expect(isSafeExternalUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeExternalUrl('  JAVASCRIPT:alert(1)  ')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeExternalUrl('//evil.example/phish')).toBe(false);
    expect(isSafeExternalUrl('/relative/path')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
  });

  it('allows valid https:// and http:// external document URLs', () => {
    expect(isSafeExternalUrl('https://notion.so/engineering/vpn-guide')).toBe(true);
    expect(isSafeExternalUrl('http://intranet.company.internal/docs/onboarding')).toBe(true);
  });
});
