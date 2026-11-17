import { beforeEach, describe, expect, it } from 'vitest';
import { DocumentCitation, DocumentSource } from '@knowledge/shared';
import { RerankService } from './rerank.service';

describe('RerankService (2-Stage Cross-Encoder Precision Engine)', () => {
  let rerankService: RerankService;

  beforeEach(() => {
    rerankService = new RerankService();
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
});
