import { describe, it, expect, beforeEach } from 'vitest';
import { DataSanitizerService } from './data-sanitizer.service';

describe('DataSanitizerService (PII & Secret Redaction Guardrail)', () => {
  let sanitizer: DataSanitizerService;

  beforeEach(() => {
    sanitizer = new DataSanitizerService();
  });

  describe('Secret & Credential Masking', () => {
    it('should detect and redact AWS Access Key IDs', () => {
      const input = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nexport REGION=us-east-1';
      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedTypes).toContain('AWS_ACCESS_KEY');
      expect(result.sanitized).toContain('export AWS_ACCESS_KEY_ID=[REDACTED_AWS_KEY]');
      expect(result.sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result.sanitized).toContain('export REGION=us-east-1');
    });

    it('should detect and redact RSA and SSH private keys', () => {
      const input = `Here is the deployment key:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0r1n+8iC...EXAMPLE...KEY
-----END RSA PRIVATE KEY-----
Keep this safe.`;

      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedTypes).toContain('PRIVATE_KEY');
      expect(result.sanitized).toContain('[REDACTED_PRIVATE_KEY]');
      expect(result.sanitized).not.toContain('MIIEowIBAAKCAQEA0r1n');
      expect(result.sanitized).toContain('Here is the deployment key:');
      expect(result.sanitized).toContain('Keep this safe.');
    });

    it('should detect and redact Bearer tokens and JWTs', () => {
      const input =
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.sanitized).toBe('Authorization: Bearer [REDACTED_BEARER_TOKEN]');
      expect(result.sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should detect and redact generic API secrets in config strings', () => {
      const input = 'client_secret: "prod_live_secret_key_9876543210"';
      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedTypes).toContain('API_SECRET');
      expect(result.sanitized).toContain('client_secret: "[REDACTED_SECRET]"');
      expect(result.sanitized).not.toContain('prod_live_secret_key_9876543210');
    });
  });

  describe('PII Masking', () => {
    it('should detect and redact Social Security Numbers (SSN)', () => {
      const input = 'Employee John Doe (SSN: 987-65-4321) joined engineering.';
      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedTypes).toContain('SSN');
      expect(result.sanitized).toBe('Employee John Doe (SSN: [REDACTED_SSN]) joined engineering.');
      expect(result.sanitized).not.toContain('987-65-4321');
    });

    it('should detect and redact Credit Card numbers', () => {
      const input = 'Corporate card for billing: 4532-1234-5678-9012 (expires 12/28)';
      const result = sanitizer.sanitize(input);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedTypes).toContain('CREDIT_CARD');
      expect(result.sanitized).toBe('Corporate card for billing: [REDACTED_CREDIT_CARD] (expires 12/28)');
      expect(result.sanitized).not.toContain('4532-1234-5678-9012');
    });
  });

  describe('Adversarial Multi-Payload & Edge Cases', () => {
    it('should redact multiple distinct sensitive categories in a single document', () => {
      const maliciousDocument = `
# Emergency Infrastructure Runbook
- AWS Root: AKIAIOSFODNN7EXAMPLE
- Master Card: 5105-1051-0510-5100
- Admin SSN: 000-12-3456
- Deployment Auth: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.xyzSignature123456
Normal paragraph with general instructions about restarting services.
`;

      const result = sanitizer.sanitize(maliciousDocument);

      expect(result.hasRedactions).toBe(true);
      expect(result.redactedCount).toBeGreaterThanOrEqual(4);
      expect(result.redactedTypes).toEqual(
        expect.arrayContaining(['AWS_ACCESS_KEY', 'CREDIT_CARD', 'SSN', 'BEARER_TOKEN']),
      );

      // Verify no sensitive tokens survived
      expect(result.sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result.sanitized).not.toContain('5105-1051-0510-5100');
      expect(result.sanitized).not.toContain('000-12-3456');
      expect(result.sanitized).not.toContain('xyzSignature123456');

      // Verify normal content is preserved
      expect(result.sanitized).toContain('# Emergency Infrastructure Runbook');
      expect(result.sanitized).toContain('Normal paragraph with general instructions about restarting services.');
    });

    it('should return unchanged text when no sensitive data is present', () => {
      const cleanText = 'The quick brown fox jumps over the lazy dog. Standard documentation with no secrets.';
      const result = sanitizer.sanitize(cleanText);

      expect(result.hasRedactions).toBe(false);
      expect(result.redactedCount).toBe(0);
      expect(result.redactedTypes).toEqual([]);
      expect(result.sanitized).toBe(cleanText);
    });

    it('should handle empty or null values gracefully', () => {
      expect(sanitizer.sanitize('').sanitized).toBe('');
      expect(sanitizer.hasSensitiveData('')).toBe(false);
      expect(sanitizer.sanitizeText('')).toBe('');
    });
  });

  describe('HIPAA & Legal Safe Harbor Pseudonymization Vault', () => {
    it('should pseudonymize clinical health record and allow 100% accurate rehydration', () => {
      const clinicalChart = `
Clinical Note:
Patient John Doe (DOB: 12/04/1982) was admitted to cardiology.
Medical Record: MRN-984721.
Contact emergency contact at 555-432-8899 or email care@hospital.org.
Diagnosed with acute pericarditis.
`;

      const result = sanitizer.pseudonymize(clinicalChart);

      expect(result.entitiesCount).toBeGreaterThanOrEqual(4);
      expect(result.entityTypes).toContain('NAMED_ENTITY');
      expect(result.entityTypes).toContain('MRN');
      expect(result.entityTypes).toContain('DOB');
      expect(result.entityTypes).toContain('EMAIL');

      // Ensure PHI never appears in the pseudonymized text sent to LLM
      expect(result.pseudonymizedText).not.toContain('John Doe');
      expect(result.pseudonymizedText).not.toContain('12/04/1982');
      expect(result.pseudonymizedText).not.toContain('984721');
      expect(result.pseudonymizedText).not.toContain('care@hospital.org');

      // Clinical diagnosis is preserved for AI reasoning
      expect(result.pseudonymizedText).toContain('Diagnosed with acute pericarditis');

      // Simulate LLM answering using pseudo-tokens
      const patientToken = Object.keys(result.vaultMap).find((k) => result.vaultMap[k] === 'John Doe');
      expect(patientToken).toBeDefined();

      const mockLlmAnswer = `Based on the record, ${patientToken} was admitted with acute pericarditis.`;
      const rehydrated = sanitizer.rehydrate(mockLlmAnswer, result.vaultMap);

      expect(rehydrated).toContain('John Doe');
    });
  });
});
