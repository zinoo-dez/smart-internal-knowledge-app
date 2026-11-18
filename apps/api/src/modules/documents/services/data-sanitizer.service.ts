import { Injectable, Logger } from '@nestjs/common';

export interface SanitizationResult {
  sanitized: string;
  hasRedactions: boolean;
  redactedCount: number;
  redactedTypes: string[];
}

export interface PseudonymizationResult {
  pseudonymizedText: string;
  vaultMap: Record<string, string>; // Maps e.g. "<PATIENT_REF_1>" -> "John Doe"
  entitiesCount: number;
  entityTypes: string[];
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

  // 7. HIPAA Medical Record Numbers (MRN & Patient IDs)
  private readonly mrnPattern = /\b(?:MRN|Medical Record(?: Number)?|Patient ID)[:\s#-]+([A-Z0-9-]{6,16})\b/gi;

  // 8. HIPAA Dates of Birth (DOB)
  private readonly dobPattern = /\b(?:DOB|Date of Birth)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/gi;

  // 9. Healthcare & Legal Contact Phone Numbers
  private readonly phonePattern = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

  // 10. Healthcare & Legal Emails
  private readonly emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;

  // 11. Patient & Client Formal Named Entities
  private readonly entityNamePattern = /\b(?:Patient|Client|Dr\.|Doctor|Mr\.|Ms\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;

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

  /**
   * Enterprise HIPAA / Legal Safe Harbor Pseudonymization Vault.
   * Transforms raw PHI and confidential entities into reversible pseudo-tokens.
   * Zero PII leaves the enterprise boundary while preserving AI reasoning accuracy.
   */
  pseudonymize(text: string): PseudonymizationResult {
    if (!text || typeof text !== 'string') {
      return {
        pseudonymizedText: text || '',
        vaultMap: {},
        entitiesCount: 0,
        entityTypes: [],
      };
    }

    let result = text;
    const vaultMap: Record<string, string> = {};
    const entityTypes = new Set<string>();
    let counter = 1;

    // 1. First redact hard credentials (AWS keys, Private keys, JWTs) destructively
    result = this.sanitizeText(result);

    // 2. SSN Reversible Vault
    result = result.replace(this.ssnPattern, (match) => {
      const token = `<SSN_REF_${counter++}>`;
      vaultMap[token] = match;
      entityTypes.add('SSN');
      return token;
    });

    // 3. Medical Record Numbers (MRN)
    result = result.replace(this.mrnPattern, (fullMatch, mrnValue) => {
      const token = `<MRN_REF_${counter++}>`;
      vaultMap[token] = mrnValue;
      entityTypes.add('MRN');
      return fullMatch.replace(mrnValue, token);
    });

    // 4. Dates of Birth (DOB)
    result = result.replace(this.dobPattern, (fullMatch, dobValue) => {
      const token = `<DOB_REF_${counter++}>`;
      vaultMap[token] = dobValue;
      entityTypes.add('DOB');
      return fullMatch.replace(dobValue, token);
    });

    // 5. Healthcare / Legal Named Entities (e.g. "Patient John Doe", "Client Robert Vance")
    result = result.replace(this.entityNamePattern, (fullMatch, nameValue) => {
      const token = `<ENTITY_REF_${counter++}>`;
      vaultMap[token] = nameValue;
      entityTypes.add('NAMED_ENTITY');
      return fullMatch.replace(nameValue, token);
    });

    // 6. Emails
    result = result.replace(this.emailPattern, (match) => {
      const token = `<EMAIL_REF_${counter++}>`;
      vaultMap[token] = match;
      entityTypes.add('EMAIL');
      return token;
    });

    // 7. Phone Numbers
    result = result.replace(this.phonePattern, (match) => {
      // Avoid replacing pseudo-tokens or short numbers
      if (match.length < 8 || match.startsWith('<')) return match;
      const token = `<PHONE_REF_${counter++}>`;
      vaultMap[token] = match;
      entityTypes.add('PHONE');
      return token;
    });

    return {
      pseudonymizedText: result,
      vaultMap,
      entitiesCount: Object.keys(vaultMap).length,
      entityTypes: Array.from(entityTypes),
    };
  }

  /**
   * Rehydrates pseudonymized AI responses on the secure client/authorized doctor side.
   * Restores original PHI/PII tokens from the session vault.
   */
  rehydrate(text: string, vaultMap: Record<string, string>): string {
    if (!text || !vaultMap || Object.keys(vaultMap).length === 0) {
      return text || '';
    }

    let rehydrated = text;
    for (const [token, originalValue] of Object.entries(vaultMap)) {
      // Global replace token with original value
      rehydrated = rehydrated.split(token).join(originalValue);
    }
    return rehydrated;
  }
}
