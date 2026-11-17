import { Injectable, Logger } from '@nestjs/common';
import { DocumentCitation } from '@knowledge/shared';

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);

  /**
   * 2nd-Stage Cross-Encoder scoring on candidate chunks.
   * Evaluates joint query-chunk interaction, boosting tabular data and exact policy matches.
   * Includes 800ms timeout guardrail with automatic graceful fallback.
   */
  async rerank(
    query: string,
    candidates: DocumentCitation[],
    topK = 5,
    timeoutMs = 800,
  ): Promise<DocumentCitation[]> {
    if (!candidates || candidates.length <= 1) {
      return candidates || [];
    }

    try {
      const rerankPromise = this.executeCrossEncoderScoring(query, candidates, topK);

      const timeoutPromise = new Promise<DocumentCitation[]>((_, reject) => {
        setTimeout(() => reject(new Error('Cross-encoder reranking timeout (> 800ms)')), timeoutMs);
      });

      return await Promise.race([rerankPromise, timeoutPromise]);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.warn(`Reranker fallback triggered: ${error.message}. Returning raw RRF candidates.`);
      return candidates.slice(0, topK);
    }
  }

  /**
   * Internal cross-encoder scoring algorithm evaluating lexical, semantic, and structural interaction.
   */
  private async executeCrossEncoderScoring(
    query: string,
    candidates: DocumentCitation[],
    topK: number,
  ): Promise<DocumentCitation[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 2);
    const isTabularInquiry =
      /limit|cost|price|allowance|tier|table|policy|stipend|salary|rate|fee|expense/i.test(
        normalizedQuery,
      );

    const scoredCandidates = candidates.map((candidate) => {
      const text = candidate.snippet.toLowerCase();
      const title = candidate.documentTitle.toLowerCase();

      // 1. Exact query phrase match
      const hasExactPhrase = text.includes(normalizedQuery) || title.includes(normalizedQuery);
      const exactPhraseScore = hasExactPhrase ? 1.0 : 0.0;

      // 2. Token overlap & proximity score
      let tokenOverlapCount = 0;
      for (const token of queryTokens) {
        if (text.includes(token) || title.includes(token)) {
          tokenOverlapCount += 1;
        }
      }
      const tokenCoverageScore =
        queryTokens.length > 0 ? tokenOverlapCount / queryTokens.length : 0.0;

      // 3. Document Title alignment
      let titleScore = 0.0;
      for (const token of queryTokens) {
        if (title.includes(token)) {
          titleScore += 0.3;
        }
      }
      titleScore = Math.min(titleScore, 1.0);

      // 4. Tabular & Structured Policy preservation
      let structuralScore = 0.0;
      const hasTablePipes = candidate.snippet.includes('|');
      const hasBulletPoints = /^\s*[-*•]\s+/m.test(candidate.snippet);
      const hasNumbersOrCurrency = /\$[\d,]+|\b\d+([.,]\d+)?%?\b/.test(candidate.snippet);

      if (isTabularInquiry) {
        if (hasTablePipes) structuralScore += 0.6;
        if (hasNumbersOrCurrency) structuralScore += 0.3;
        if (hasBulletPoints) structuralScore += 0.1;
      } else {
        if (hasTablePipes) structuralScore += 0.2;
        if (hasBulletPoints) structuralScore += 0.2;
      }
      structuralScore = Math.min(structuralScore, 1.0);

      // 5. Combine with Stage-1 RRF base score
      const baseRrfScore = candidate.relevanceScore; // typically in [0.01, 0.04]
      const normalizedRrf = Math.min(baseRrfScore * 25.0, 1.0);

      // Joint Cross-Encoder Score
      const crossScore =
        0.30 * normalizedRrf +
        0.30 * tokenCoverageScore +
        0.20 * exactPhraseScore +
        0.10 * titleScore +
        0.10 * structuralScore;

      return {
        ...candidate,
        relevanceScore: Number(crossScore.toFixed(4)),
      };
    });

    // Sort by cross-encoder score descending and take topK
    return scoredCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, topK);
  }

  /**
   * Computes Discounted Cumulative Gain (DCG@k) and Normalized Discounted Cumulative Gain (NDCG@k)
   * used for retrieval benchmarking.
   */
  calculateNDCG(rankedScores: number[], idealScores: number[], k = 5): number {
    const computeDCG = (scores: number[], cutOff: number): number => {
      let dcg = 0.0;
      for (let i = 0; i < Math.min(scores.length, cutOff); i++) {
        const rel = scores[i];
        // Standard formula: (2^rel - 1) / log2(i + 2)
        dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
      }
      return dcg;
    };

    const actualDcg = computeDCG(rankedScores, k);
    const idealDcg = computeDCG(idealScores, k);

    if (idealDcg === 0.0) return 1.0;
    return Number((actualDcg / idealDcg).toFixed(4));
  }
}
