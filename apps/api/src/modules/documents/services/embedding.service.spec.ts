import { describe, it, expect } from 'vitest';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  const service = new EmbeddingService();

  it('should generate a 768-dimensional deterministic vector for Google Gemini', async () => {
    const vector = await service.embedText('Internal company documentation on VPN');
    expect(vector).toHaveLength(768);

    // Verify vector is normalized to unit length: sqrt(sum(v_i^2)) ≈ 1.0
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 4);
  });

  it('should generate identical vectors for identical text (deterministic fallback)', async () => {
    const v1 = await service.embedText('Quarterly financial summary');
    const v2 = await service.embedText('Quarterly financial summary');
    expect(v1).toEqual(v2);
  });

  it('should generate distinct vectors for distinct inputs', async () => {
    const v1 = await service.embedText('Quarterly financial summary');
    const v2 = await service.embedText('HR dental insurance plan');
    expect(v1).not.toEqual(v2);
  });
});
