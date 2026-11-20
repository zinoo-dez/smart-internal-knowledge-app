import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentCitation, DocumentSource } from '@knowledge/shared';
import { RerankService } from './rerank.service';

describe('RerankService (2-Stage Cross-Encoder Precision Engine)', () => {
  let rerankService: RerankService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    rerankService = new RerankService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Tabular & Numerical Policy Prioritization', () => {
    it('should promote tabular policy chunk over generic prose for numerical limit queries', async () => {
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'generic-prose',
          documentId: 'doc-handbook',
          documentTitle: 'Remote Culture & Values',
          source: DocumentSource.FILE_UPLOAD,
          snippet:
            'We value remote flexibility and believe every employee should have a comfortable workspace at home with good ergonomics.',
          relevanceScore: 0.034, // High RRF score from general vocabulary
        },
        {
          chunkId: 'tabular-allowance',
          documentId: 'doc-benefits',
          documentTitle: 'Employee Benefits & Expense Limits 2026',
          source: DocumentSource.NOTION,
          snippet:
            '| Category | Policy Limit | Cadence |\n| Home Office Stipend | $1,200 | Annual |\n| Ergonomic Chair | $500 | One-time |',
          relevanceScore: 0.021, // Lower Stage-1 score due to sparse table keywords
        },
        {
          chunkId: 'unrelated',
          documentId: 'doc-misc',
          documentTitle: 'Company Slack Rules',
          source: DocumentSource.SLACK,
          snippet: 'Please keep conversations respectful in all channels.',
          relevanceScore: 0.012,
        },
      ];

      const query = 'What is the annual home office stipend limit?';
      const reranked = await rerankService.rerank(query, candidates, 2);

      expect(reranked).toHaveLength(2);
      // The tabular allowance chunk must be promoted to #1 position
      expect(reranked[0].chunkId).toBe('tabular-allowance');
      expect(reranked[0].snippet).toContain('$1,200');
      expect(reranked[0].relevanceScore).toBeGreaterThan(reranked[1].relevanceScore);
    });

    it('should boost exact phrase and document title match', async () => {
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'partial-match',
          documentId: 'doc-1',
          documentTitle: 'General IT Guidelines',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'You can configure network tunnels using various software on laptops.',
          relevanceScore: 0.03,
        },
        {
          chunkId: 'exact-match',
          documentId: 'doc-2',
          documentTitle: 'WireGuard VPN macOS Setup',
          source: DocumentSource.NOTION,
          snippet: 'WireGuard VPN macOS setup requires importing the configuration from 1Password.',
          relevanceScore: 0.02,
        },
      ];

      const query = 'WireGuard VPN macOS setup';
      const reranked = await rerankService.rerank(query, candidates, 2);

      expect(reranked[0].chunkId).toBe('exact-match');
      expect(reranked[0].relevanceScore).toBeGreaterThan(0.7);
    });
  });

  describe('Timeout & Resilient Fallback Guardrail', () => {
    it('should gracefully fallback to original candidate order when timeout occurs', async () => {
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'c1',
          documentId: 'd1',
          documentTitle: 'Doc 1',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'Snippet 1',
          relevanceScore: 0.9,
        },
        {
          chunkId: 'c2',
          documentId: 'd2',
          documentTitle: 'Doc 2',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'Snippet 2',
          relevanceScore: 0.8,
        },
      ];

      // Request with timeout of 0ms to force immediate timeout fallback
      const result = await rerankService.rerank('any query', candidates, 2, 0);

      expect(result).toHaveLength(2);
      expect(result[0].chunkId).toBe('c1');
    });
  });

  describe('NDCG@5 Precision Benchmark', () => {
    it('should compute NDCG@5 score verifying ranking quality', () => {
      // Benchmark: Ideal ranking vs Actual cross-encoder ranking
      const idealRelevance = [3, 2, 2, 1, 0];
      const actualRelevance = [3, 2, 2, 1, 0]; // Perfect ranking

      const ndcg = rerankService.calculateNDCG(actualRelevance, idealRelevance, 5);
      expect(ndcg).toBe(1.0);

      const imperfectRelevance = [2, 3, 1, 2, 0];
      const imperfectNdcg = rerankService.calculateNDCG(imperfectRelevance, idealRelevance, 5);
      expect(imperfectNdcg).toBeGreaterThan(0.8);
      expect(imperfectNdcg).toBeLessThan(1.0);
    });
  });

  describe('P1 Cross-Lingual Myanmar Retrieval & External Multilingual Reranker', () => {
    it('preserves valid cross-lingual Myanmar -> English pgvector matches instead of zeroing them out below 0.03 RRF', async () => {
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'c-eng-leave',
          documentId: 'doc-hr-leave',
          documentTitle: 'Global Employee Annual Leave Policy',
          source: DocumentSource.NOTION,
          snippet:
            'Full-time employees are entitled to 20 paid annual leave days and 10 sick leave days per calendar year.',
          relevanceScore: 0.0164, // Top-1 pure pgvector RRF score (1 / (60 + 1)) — previously zeroed out!
        },
        {
          chunkId: 'c-eng-vpn',
          documentId: 'doc-it-vpn',
          documentTitle: 'Remote Access Setup',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'Install WireGuard client and connect to gateway port 51820.',
          relevanceScore: 0.0145,
        },
      ];

      // Pure Myanmar Unicode query with ZERO English words
      const myanmarQuery = 'တစ်နှစ်မှာ နှစ်စဉ်ခွင့်ရက် ဘယ်နှစ်ရက် ခံစားခွင့်ရှိသလဲ?';
      const reranked = await rerankService.rerank(myanmarQuery, candidates, 2);

      expect(reranked).toHaveLength(2);
      expect(reranked[0].chunkId).toBe('c-eng-leave');
      expect(reranked[0].relevanceScore).toBeGreaterThan(0.4);
    });

    it('boosts bilingual Myanmar + English technical term bridge (e.g., VPN) accurately', async () => {
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'c-general',
          documentId: 'd-1',
          documentTitle: 'Office Etiquette',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'Please keep meeting rooms clean after use.',
          relevanceScore: 0.0164,
        },
        {
          chunkId: 'c-vpn',
          documentId: 'd-2',
          documentTitle: 'Corporate VPN Guide',
          source: DocumentSource.NOTION,
          snippet: 'Connect via WireGuard VPN using your 1Password vault config.',
          relevanceScore: 0.0158,
        },
      ];

      const reranked = await rerankService.rerank('ကုမ္ပဏီ VPN ဘယ်လို ချိတ်ဆက်ရမလဲ?', candidates, 2);
      expect(reranked).toHaveLength(2);
      expect(reranked[0].chunkId).toBe('c-vpn');
    });

    it('uses external Cohere multilingual reranker when COHERE_API_KEY is configured and falls back cleanly on API failure', async () => {
      process.env.COHERE_API_KEY = 'cohere-test-key';
      const candidates: DocumentCitation[] = [
        {
          chunkId: 'c1',
          documentId: 'd1',
          documentTitle: 'Doc A',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'General overview.',
          relevanceScore: 0.03,
        },
        {
          chunkId: 'c2',
          documentId: 'd2',
          documentTitle: 'Doc B',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'Exact answer to Myanmar query.',
          relevanceScore: 0.016,
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { index: 1, relevance_score: 0.97 },
            { index: 0, relevance_score: 0.21 },
          ],
        }),
      } as any);

      const externalRanked = await rerankService.rerank('မြန်မာမေးခွန်း', candidates, 2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(externalRanked[0].chunkId).toBe('c2');
      expect(externalRanked[0].relevanceScore).toBe(0.97);

      // Simulate external 500 -> graceful fallback to local cross-lingual reranker
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as any);
      const fallbackRanked = await rerankService.rerank('မြန်မာမေးခွန်း', candidates, 2);
      expect(fallbackRanked).toHaveLength(2);
    });
  });
});
