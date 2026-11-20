import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('should generate a 768-dimensional deterministic vector for Google Gemini in test/dev mode', async () => {
    const service = new EmbeddingService();
    const vector = await service.embedText('Internal company documentation on VPN');
    expect(vector).toHaveLength(768);

    // Verify vector is normalized to unit length: sqrt(sum(v_i^2)) ≈ 1.0
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 4);
  });

  it('should generate identical vectors for identical text (deterministic fallback)', async () => {
    const service = new EmbeddingService();
    const v1 = await service.embedText('Quarterly financial summary');
    const v2 = await service.embedText('Quarterly financial summary');
    expect(v1).toEqual(v2);
  });

  it('should generate distinct vectors for distinct inputs', async () => {
    const service = new EmbeddingService();
    const v1 = await service.embedText('Quarterly financial summary');
    const v2 = await service.embedText('HR dental insurance plan');
    expect(v1).not.toEqual(v2);
  });

  describe('P1 Production Fail-Closed Vector Integrity Guardrail', () => {
    it('throws in NODE_ENV=production when GEMINI_API_KEY is missing instead of silently persisting SHA-256 vectors', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GEMINI_API_KEY;
      delete process.env.ALLOW_SYNTHETIC_EMBEDDINGS;

      const prodService = new EmbeddingService();
      expect(prodService.isStrictProductionMode()).toBe(true);

      await expect(prodService.embedDocuments(['Sensitive HR policy chunk'])).rejects.toThrow(
        /Refusing to persist synthetic vectors/,
      );
      await expect(prodService.embedText('VPN policy')).rejects.toThrow(/GEMINI_API_KEY missing/);
    });

    it('re-throws Gemini API errors during embedDocuments in strict production so BullMQ retries cleanly', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_SYNTHETIC_EMBEDDINGS;

      const prodService = new EmbeddingService();
      (prodService as any).geminiEmbedder = {
        embedDocuments: vi.fn().mockRejectedValue(new Error('HTTP 429 Resource Exhausted')),
      };

      await expect(prodService.embedDocuments(['Chunk 1', 'Chunk 2'])).rejects.toThrow(
        /HTTP 429 Resource Exhausted/,
      );
    });

    it('allows explicit synthetic opt-in when ALLOW_SYNTHETIC_EMBEDDINGS=true for keyless demos', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_SYNTHETIC_EMBEDDINGS = 'true';
      delete process.env.GEMINI_API_KEY;

      const demoService = new EmbeddingService();
      expect(demoService.isStrictProductionMode()).toBe(false);

      const vectors = await demoService.embedDocuments(['Demo chunk']);
      expect(vectors).toHaveLength(1);
      expect(vectors[0]).toHaveLength(768);
    });
  });
});
