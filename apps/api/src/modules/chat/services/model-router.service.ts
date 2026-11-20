import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AIModelProvider, Department, ModelComplexityTier } from '@knowledge/shared';

export interface ResolvedChatModel {
  model: any | null;
  provider: string;
  modelName: string;
}

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);

  // Rolling-window token quota ledger per organization/department
  private readonly tokenUsageLedger = new Map<string, { used: number; resetAt: number }>();
  private readonly DEFAULT_HOURLY_TOKEN_LIMIT = 500000;
  private readonly MAX_LEDGER_ENTRIES = 5000;

  public getDefaultGeminiModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  public resolveChatModel(provider?: string, modelName?: string): ResolvedChatModel {
    const cleanProvider = (provider || AIModelProvider.GEMINI).toUpperCase();

    // In unit/integration test mode, avoid outbound network calls to external LLM endpoints
    if (process.env.NODE_ENV === 'test') {
      const defaultName =
        cleanProvider === AIModelProvider.OPENAI
          ? 'gpt-4o'
          : cleanProvider === AIModelProvider.CLAUDE
          ? 'claude-3-5-sonnet-20241022'
          : 'gemini-2.0-flash';
      return { model: null, provider: cleanProvider, modelName: modelName || defaultName };
    }

    if (cleanProvider === AIModelProvider.OPENAI) {
      const activeModel = modelName || 'gpt-4o';
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && !apiKey.startsWith('sk-test') && !apiKey.startsWith('sk-...')) {
        return {
          model: new ChatOpenAI({
            model: activeModel,
            apiKey,
            temperature: 0.2,
          }),
          provider: AIModelProvider.OPENAI,
          modelName: activeModel,
        };
      }
      return { model: null, provider: AIModelProvider.OPENAI, modelName: activeModel };
    }

    if (cleanProvider === AIModelProvider.CLAUDE) {
      const activeModel = modelName || 'claude-3-5-sonnet-20241022';
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && !apiKey.startsWith('sk-ant-...')) {
        return {
          model: new ChatAnthropic({
            model: activeModel,
            apiKey,
            temperature: 0.2,
          }),
          provider: AIModelProvider.CLAUDE,
          modelName: activeModel,
        };
      }
      return { model: null, provider: AIModelProvider.CLAUDE, modelName: activeModel };
    }

    // Default: Google Gemini (sanitize deprecated / non-existent aliases to configured model)
    let activeModel = modelName || this.getDefaultGeminiModel();
    if (activeModel === 'gemini-1.5-flash' || activeModel === 'gemini-3.5-flash-lite') {
      activeModel = this.getDefaultGeminiModel();
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.startsWith('AIzaSy...')) {
      return {
        model: new ChatGoogleGenerativeAI({
          model: activeModel,
          apiKey,
          temperature: 0.2,
        }),
        provider: AIModelProvider.GEMINI,
        modelName: activeModel,
      };
    }
    return { model: null, provider: AIModelProvider.GEMINI, modelName: activeModel };
  }

  public getOrderedFailoverProviders(preferredProvider?: string): string[] {
    const fallbackChain: string[] = [
      AIModelProvider.GEMINI,
      AIModelProvider.CLAUDE,
      AIModelProvider.OPENAI,
    ];
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    return [cleanPreferred, ...fallbackChain.filter((p) => p !== cleanPreferred)];
  }

  /**
   * Multi-Model Circuit Breaker: Attempts execution on preferred provider,
   * failing over across Gemini, Claude, and OpenAI if rate limits or errors occur.
   */
  public async invokeWithCircuitBreaker(
    systemPrompt: string,
    userPrompt: string,
    preferredProvider?: string,
    preferredModel?: string,
  ): Promise<{ content: string; providerUsed: string; modelUsed: string }> {
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    const orderedProviders = this.getOrderedFailoverProviders(cleanPreferred);

    for (const provider of orderedProviders) {
      const { model, provider: activeProvider, modelName: activeModel } = this.resolveChatModel(
        provider,
        provider === cleanPreferred ? preferredModel : undefined,
      );

      if (model) {
        try {
          const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
          ]);
          const content = response.content?.toString() || '';
          if (content.trim().length > 0) {
            return { content, providerUsed: activeProvider, modelUsed: activeModel };
          }
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.warn(
            `Circuit breaker: ${activeProvider} invocation failed (${error.message}). Failing over to next provider.`,
          );
        }
      }
    }

    return { content: '', providerUsed: 'FALLBACK', modelUsed: 'deterministic-synthesizer' };
  }

  /**
   * Enterprise Multi-Tier Model Router.
   * Analyzes query complexity and selects between Fast Flash Tier and Deep Reasoning Tier.
   */
  public classifyQueryComplexity(query: string): {
    tier: ModelComplexityTier;
    recommendedProvider: string;
    recommendedModel: string;
    reason: string;
  } {
    const trimmed = (query || '').trim();
    const lower = trimmed.toLowerCase();

    // 1. Multi-part compound queries (2+ question marks)
    const questionMarks = (query.match(/\?/g) || []).length;
    if (questionMarks >= 2) {
      return {
        tier: ModelComplexityTier.REASONING,
        recommendedProvider: AIModelProvider.CLAUDE,
        recommendedModel: 'claude-3-5-sonnet-20241022',
        reason: 'Multi-part compound question requires multi-hop contextual synthesis',
      };
    }

    // 2. Analytical, legal, clinical, or architectural domain keywords
    const reasoningKeywords = [
      'compare', 'contrast', 'analyze', 'analysis', 'evaluate', 'statute',
      'liability', 'indemnity', 'contract', 'cross-reference', 'diagnosis',
      'differential', 'contraindication', 'synthesis', 'trade-off', 'architecture',
      'compliance', 'ethical wall', 'breach', 'regulation', 'gdpr', 'hipaa',
    ];
    const matchedKeyword = reasoningKeywords.find((kw) => lower.includes(kw));
    if (matchedKeyword) {
      return {
        tier: ModelComplexityTier.REASONING,
        recommendedProvider: AIModelProvider.CLAUDE,
        recommendedModel: 'claude-3-5-sonnet-20241022',
        reason: `Analytical domain keyword "${matchedKeyword}" requires deep reasoning tier`,
      };
    }

    // 3. Extended prompt length (> 160 characters)
    if (trimmed.length > 160) {
      return {
        tier: ModelComplexityTier.REASONING,
        recommendedProvider: AIModelProvider.CLAUDE,
        recommendedModel: 'claude-3-5-sonnet-20241022',
        reason: 'Extended query length indicates multi-clause context requiring reasoning model',
      };
    }

    return {
      tier: ModelComplexityTier.FLASH,
      recommendedProvider: AIModelProvider.GEMINI,
      recommendedModel: this.getDefaultGeminiModel(),
      reason: 'Standard direct lookup optimized for ultra-low latency Flash tier',
    };
  }

  /**
   * Enforces rolling hourly token budget quota limits per organization / department
   * with automatic expired-window eviction to prevent unbounded memory growth.
   */
  public checkAndConsumeTokenBudget(
    organizationId: string,
    department: Department = Department.ALL,
    estimatedTokens: number = 1000,
  ): { allowed: boolean; remainingTokens: number; limit: number; resetInSeconds: number } {
    const key = `${organizationId}:${department}`;
    const now = Date.now();
    const hourWindowMs = 3600000;

    // Periodic expired entry eviction to cap memory footprint
    if (this.tokenUsageLedger.size >= this.MAX_LEDGER_ENTRIES) {
      for (const [k, rec] of this.tokenUsageLedger.entries()) {
        if (now > rec.resetAt) {
          this.tokenUsageLedger.delete(k);
        }
      }
    }

    let record = this.tokenUsageLedger.get(key);
    if (!record || now > record.resetAt) {
      record = { used: 0, resetAt: now + hourWindowMs };
      this.tokenUsageLedger.set(key, record);
    }

    const resetInSeconds = Math.max(0, Math.round((record.resetAt - now) / 1000));

    if (record.used + estimatedTokens > this.DEFAULT_HOURLY_TOKEN_LIMIT) {
      this.logger.warn(
        `Token budget quota reached for ${key}: ${record.used}/${this.DEFAULT_HOURLY_TOKEN_LIMIT}`,
      );
      return {
        allowed: false,
        remainingTokens: 0,
        limit: this.DEFAULT_HOURLY_TOKEN_LIMIT,
        resetInSeconds,
      };
    }

    record.used += estimatedTokens;
    return {
      allowed: true,
      remainingTokens: Math.max(0, this.DEFAULT_HOURLY_TOKEN_LIMIT - record.used),
      limit: this.DEFAULT_HOURLY_TOKEN_LIMIT,
      resetInSeconds,
    };
  }
}
