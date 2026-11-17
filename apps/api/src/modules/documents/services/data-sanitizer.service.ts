import { Injectable, Logger } from '@nestjs/common';

export interface SanitizationResult {
  sanitized: string;
  hasRedactions: boolean;
  redactedCount: number;
  redactedTypes: string[];
}

@Injectable()
export class DataSanitizerService {
  private readonly logger = new Logger(DataSanitizerService.name);

  // 1. AWS Access Keys: AKIA, ASIA, AROA, AIDA followed by 16 alphanumeric characters
  private readonly awsKeyPattern = /\b(AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}\b/g;

  // 2. Private SSH / RSA / EC Keys: -----BEGIN ... PRIVATE KEY----- ... -----END ... PRIVATE KEY-----
  private readonly privateKeyPattern =
    /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g;

  // 3. Social Security Number (SSN): 3 digits - 2 digits - 4 digits
  private readonly ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;

  // 4. Credit Card Numbers (13 to 16 digits, with optional spaces or dashes)
  private readonly creditCardPattern =
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:[0-9]{4}[ -]){3}[0-9]{4})\b/g;

  // 5. Bearer Tokens & Standalone JWTs
  private readonly bearerTokenPattern =
    /\bBearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
  private readonly jwtPattern =
    /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*\b/g;

  // 6. Generic Secret Assignments (e.g. api_key="...", client_secret: '...')
  private readonly genericSecretPattern =
    /\b(api[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token|password)\s*([:=])\s*(?:(['"])([\w\-.~+/]{12,})\3|([\w\-.~+/]{16,})\b)/gi;

  /**
   * Sanitizes sensitive credentials, tokens, private keys, and PII from raw text.
   */
  sanitize(text: string): SanitizationResult {
    if (!text || typeof text !== 'string') {
      return {
        sanitized: text || '',
        hasRedactions: false,
        redactedCount: 0,
        redactedTypes: [],
      };
    }

    let result = text;
    let count = 0;
    const types = new Set<string>();

    // 1. Private Keys
    result = result.replace(this.privateKeyPattern, () => {
      count++;
      types.add('PRIVATE_KEY');
      return '[REDACTED_PRIVATE_KEY]';
    });

    // 2. AWS Access Keys
    result = result.replace(this.awsKeyPattern, () => {
      count++;
      types.add('AWS_ACCESS_KEY');
      return '[REDACTED_AWS_KEY]';
    });

    // 3. Bearer Tokens
    result = result.replace(this.bearerTokenPattern, () => {
      count++;
      types.add('BEARER_TOKEN');
      return 'Bearer [REDACTED_BEARER_TOKEN]';
    });

    // 4. Standalone JWTs
    result = result.replace(this.jwtPattern, () => {
      count++;
      types.add('JWT_TOKEN');
      return '[REDACTED_JWT_TOKEN]';
    });

    // 5. Social Security Numbers
    result = result.replace(this.ssnPattern, () => {
      count++;
      types.add('SSN');
      return '[REDACTED_SSN]';
    });

    // 6. Credit Cards
    result = result.replace(this.creditCardPattern, () => {
      count++;
      types.add('CREDIT_CARD');
      return '[REDACTED_CREDIT_CARD]';
    });

    // 7. Generic API Secrets
    result = result.replace(
      this.genericSecretPattern,
      (_match, keyName, separator, quote) => {
        count++;
        types.add('API_SECRET');
        const q = quote || '';
        return `${keyName}${separator} ${q}[REDACTED_SECRET]${q}`;
      },
    );

    if (count > 0) {
      this.logger.warn(
        `DataSanitizer redacted ${count} sensitive token(s): ${Array.from(types).join(', ')}`,
      );
    }

    return {
      sanitized: result,
      hasRedactions: count > 0,
      redactedCount: count,
      redactedTypes: Array.from(types),
    };
  }

  /**
   * Helper returning just the sanitized text.
   */
  sanitizeText(text: string): string {
    return this.sanitize(text).sanitized;
  }

  /**
   * Quick check to see if text contains sensitive credentials or PII.
   */
  hasSensitiveData(text: string): boolean {
    return this.sanitize(text).hasRedactions;
  }
}
