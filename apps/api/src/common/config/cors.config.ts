export const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
] as const;

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function parseAllowedOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins) {
    return [...DEFAULT_LOCAL_ORIGINS];
  }
  const parsed = rawOrigins
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [...DEFAULT_LOCAL_ORIGINS];
}

export function createCorsOriginValidator(rawOrigins?: string, nodeEnv?: string) {
  const allowedOrigins = parseAllowedOrigins(rawOrigins);
  const allowWildcard = nodeEnv !== 'production' && allowedOrigins.includes('*');

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (allowWildcard || allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }

    // Return false without throwing so CORS rejections do not surface as HTTP 500
    callback(null, false);
  };
}
