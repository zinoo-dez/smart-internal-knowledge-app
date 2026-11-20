import { Injectable, Logger } from '@nestjs/common';
import { DocumentCitation } from '@knowledge/shared';

interface ExternalRerankResultItem {
  index: number;
  relevance_score: number;
}

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);
  private static readonly NON_LATIN_SCRIPT_REGEX =
    /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF\u4E00-\u9FFF\u3040-\u30FF\u0E00-\u0E7F]/;

  /**
   * 2nd-Stage Multilingual Cross-Encoder scoring on candidate chunks.
   * Uses external Cohere/Jina multilingual reranker when configured, with automatic fallback to
   * a cross-lingual-safe local cross-encoder that preserves Myanmar -> English pgvector matches.
   * Includes strict timeout guardrail with graceful fallback to Stage-1 RRF order.
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

    const hasExternalProvider =
      process.env.NODE_ENV !== 'test' &&
      Boolean(process.env.COHERE_API_KEY || process.env.JINA_API_KEY);
    const effectiveTimeoutMs =
      hasExternalProvider && timeoutMs === 800 ? 1500 : timeoutMs;

    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const rerankPromise = this.executeRerankPipeline(
        query,
        candidates,
        topK,
        controller.signal,
      );

      const timeoutPromise = new Promise<DocumentCitation[]>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort(new Error(`Cross-encoder reranking timeout (> ${effectiveTimeoutMs}ms)`));
          reject(new Error(`Cross-encoder reranking timeout (> ${effectiveTimeoutMs}ms)`));
        }, effectiveTimeoutMs);
      });

      return await Promise.race([rerankPromise, timeoutPromise]);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.warn(`Reranker fallback triggered: ${error.message}. Returning raw RRF candidates.`);
      return candidates.slice(0, topK);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async executeRerankPipeline(
    query: string,
    candidates: DocumentCitation[],
    topK: number,
    signal?: AbortSignal,
  ): Promise<DocumentCitation[]> {
    const external = await this.tryExternalMultilingualRerank(query, candidates, topK, signal);
    if (external) {
      return external;
    }

    return this.executeLocalCrossLingualScoring(query, candidates, topK);
  }

  /**
   * Optional Tier-1 External Multilingual Cross-Encoder (Cohere Rerank v3.5 or Jina Multilingual v2).
   * Enabled purely via COHERE_API_KEY or JINA_API_KEY with zero extra runtime dependencies.
   */
  public async tryExternalMultilingualRerank(
    query: string,
    candidates: DocumentCitation[],
    topK: number,
    signal?: AbortSignal,
  ): Promise<DocumentCitation[] | null> {
    const cohereKey = process.env.COHERE_API_KEY;
    const jinaKey = process.env.JINA_API_KEY;
    if (!cohereKey && !jinaKey) {
      return null;
    }

    const documents = candidates.map((c) => `${c.documentTitle}\n${c.snippet}`);

    try {
      const endpoint = cohereKey
        ? 'https://api.cohere.com/v2/rerank'
        : 'https://api.jina.ai/v1/rerank';
      const apiKey = cohereKey || jinaKey!;
      const model = cohereKey
        ? process.env.COHERE_RERANK_MODEL || 'rerank-v3.5'
        : process.env.JINA_RERANK_MODEL || 'jina-reranker-v2-base-multilingual';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: Math.min(topK, candidates.length),
        }),
        signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `External reranker returned HTTP ${response.status}. Falling back to local cross-lingual reranker.`,
        );
        return null;
      }

      const payload = (await response.json()) as { results?: ExternalRerankResultItem[] };
      if (!Array.isArray(payload?.results) || payload.results.length === 0) {
        return null;
      }

      const ranked: DocumentCitation[] = [];
      for (const item of payload.results) {
        const candidate = candidates[item.index];
        if (!candidate) continue;
        ranked.push({
          ...candidate,
          relevanceScore: Number(Number(item.relevance_score || 0).toFixed(4)),
        });
      }

      return ranked.length > 0 ? ranked.slice(0, topK) : null;
    } catch (err: unknown) {
      if (signal?.aborted) {
        throw err;
      }
      this.logger.warn(
        `External reranker failed (${(err as Error).message}). Falling back to local cross-lingual reranker.`,
      );
      return null;
    }
  }

  public hasNonLatinScript(text: string): boolean {
    if (!text) return false;
    return RerankService.NON_LATIN_SCRIPT_REGEX.test(text);
  }

  private tokenizeMultilingual(text: string): {
    allTokens: string[];
    latinTechTokens: string[];
  } {
    const rawTokens = text
      .toLowerCase()
      .split(/[\s,၊။:;?!()[\]{}|/\\"'`]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const allTokens = rawTokens.filter(
      (t) => t.length > 2 || /^[a-z0-9]{2}$/i.test(t) || this.hasNonLatinScript(t),
    );
    const latinTechTokens = rawTokens.filter((t) => /^[a-z0-9][a-z0-9._-]{1,}$/i.test(t));

    return { allTokens, latinTechTokens };
  }

  /**
   * Tier-2 Cross-Lingual-Safe Local Cross-Encoder scoring algorithm.
   * Evaluates lexical, semantic RRF, script-aware cross-lingual signals, and tabular structure
   * WITHOUT zeroing out high-cosine Myanmar -> English semantic matches.
   */
  private async executeLocalCrossLingualScoring(
    query: string,
    candidates: DocumentCitation[],
    topK: number,
  ): Promise<DocumentCitation[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const queryIsNonLatin = this.hasNonLatinScript(normalizedQuery);
    const { allTokens: queryTokens, latinTechTokens } = this.tokenizeMultilingual(normalizedQuery);

    const isTabularInquiry =
      /limit|cost|price|allowance|tier|table|policy|stipend|salary|rate|fee|expense|လစာ|ခွင့်|စရိတ်|နှုန်း/i.test(
        normalizedQuery,
      );

    const scoredCandidates = candidates.map((candidate) => {
      const text = candidate.snippet.toLowerCase();
      const title = candidate.documentTitle.toLowerCase();
      const combinedText = `${title}\n${text}`;
      const candidateIsNonLatin = this.hasNonLatinScript(combinedText);
      const isCrossLingualPair = queryIsNonLatin !== candidateIsNonLatin;

      // 1. Exact query phrase match
      const hasExactPhrase =
        normalizedQuery.length > 0 &&
        (text.includes(normalizedQuery) || title.includes(normalizedQuery));
      const exactPhraseScore = hasExactPhrase ? 1.0 : 0.0;

      // 2. Token overlap & coverage score (multilingual + short Latin technical terms like VPN/HR/AWS)
      let tokenOverlapCount = 0;
      for (const token of queryTokens) {
        if (text.includes(token) || title.includes(token)) {
          tokenOverlapCount += 1;
        }
      }
      const tokenCoverageScore =
        queryTokens.length > 0 ? tokenOverlapCount / queryTokens.length : 0.0;

      // Technical acronym/term bridge score for bilingual queries (e.g., "ကုမ္ပဏီ VPN ဘယ်လိုချိတ်မလဲ?")
      let techMatchCount = 0;
      for (const techToken of latinTechTokens) {
        if (text.includes(techToken) || title.includes(techToken)) {
          techMatchCount += 1;
        }
      }
      const techTermScore =
        latinTechTokens.length > 0 ? techMatchCount / latinTechTokens.length : 0.0;

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

      // 5. Combine with Stage-1 RRF base score (single-channel top-1 = 1/61 ≈ 0.0164, dual = 0.0328)
      const baseRrfScore = candidate.relevanceScore;
      const hasAnyLexicalMatch =
        tokenCoverageScore > 0 || techTermScore > 0 || hasExactPhrase || titleScore > 0;

      let crossScore: number;
      if (isCrossLingualPair || queryIsNonLatin) {
        // Cross-lingual / Myanmar script path: trust semantic vector RRF rank and technical bridge terms;
        // NEVER zero out valid cross-lingual pgvector hits due to absent English lexical overlap.
        const semanticRrfNormalized = Math.min(baseRrfScore * 45.0, 1.0);
        crossScore =
          0.65 * semanticRrfNormalized +
          0.15 * Math.max(tokenCoverageScore, techTermScore) +
          0.10 * Math.max(exactPhraseScore, titleScore) +
          0.10 * structuralScore;
      } else {
        const normalizedRrf = Math.min(baseRrfScore * 25.0, 1.0);
        crossScore =
          0.30 * normalizedRrf +
          0.30 * tokenCoverageScore +
          0.20 * exactPhraseScore +
          0.10 * titleScore +
          0.10 * structuralScore;

        // Monolingual Latin noise filter: zero out weak non-matching hits to avoid hallucinated citations
        if (!hasAnyLexicalMatch && baseRrfScore < 0.03) {
          crossScore = 0.0;
        }
      }

      return {
        ...candidate,
        relevanceScore: Number(Math.min(1.0, crossScore).toFixed(4)),
      };
    });

    // Sort by cross-encoder score descending and take topK, filtering out zero-relevance noise
    return scoredCandidates
      .filter((c) => c.relevanceScore > 0.01)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);
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
