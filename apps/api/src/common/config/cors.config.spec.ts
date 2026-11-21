import { describe, expect, it } from 'vitest';
import { createCorsOriginValidator, parseAllowedOrigins } from './cors.config';

function evaluateOrigin(
  validator: ReturnType<typeof createCorsOriginValidator>,
  origin: string | undefined,
): { err: Error | null; allow?: boolean } {
  let result: { err: Error | null; allow?: boolean } = { err: null };
  validator(origin, (err, allow) => {
    result = { err, allow };
  });
  return result;
}

describe('CORS Configuration', () => {
  it('strips trailing slashes and whitespace from configured origins', () => {
    const origins = parseAllowedOrigins(
      ' https://knowledgehelper.vercel.app/ , https://smart-internal-knowledge-app.vercel.app/// ',
    );
    expect(origins).toEqual([
      'https://knowledgehelper.vercel.app',
      'https://smart-internal-knowledge-app.vercel.app',
    ]);
  });

  it('allows matching origins even when configured with trailing slashes', () => {
    const validator = createCorsOriginValidator(
      'https://knowledgehelper.vercel.app/',
      'production',
    );
    expect(evaluateOrigin(validator, 'https://knowledgehelper.vercel.app')).toEqual({
      err: null,
      allow: true,
    });
  });

  it('rejects disallowed origins cleanly with allow=false and no HTTP 500 error', () => {
    const validator = createCorsOriginValidator(
      'https://knowledgehelper.vercel.app',
      'production',
    );
    expect(evaluateOrigin(validator, 'https://evil.example.com')).toEqual({
      err: null,
      allow: false,
    });
  });

  it('never permits wildcard * origin in production mode', () => {
    const validator = createCorsOriginValidator('*', 'production');
    expect(evaluateOrigin(validator, 'https://attacker.example.com')).toEqual({
      err: null,
      allow: false,
    });
  });

  it('permits wildcard * origin in non-production development mode', () => {
    const validator = createCorsOriginValidator('*', 'development');
    expect(evaluateOrigin(validator, 'http://localhost:3001')).toEqual({
      err: null,
      allow: true,
    });
  });

  it('allows server-to-server requests with no Origin header', () => {
    const validator = createCorsOriginValidator(
      'https://knowledgehelper.vercel.app',
      'production',
    );
    expect(evaluateOrigin(validator, undefined)).toEqual({
      err: null,
      allow: true,
    });
  });
});
