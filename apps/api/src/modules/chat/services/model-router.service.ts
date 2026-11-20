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

export interface ResolveModelOptions {
  thinkingLevel?: 'normal' | 'deep';
  maxRetries?: number;
  timeoutMs?: number;
  temperature?: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ProviderCircuitSnapshot {
  state: CircuitState;
  failures: number;
  openedAt: number;
  lastError?: string;
}

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  source: 'provider' | 'estimated';
}

export interface CircuitBreakerInvocationResult {
  content: string;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics;
}

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);

  // Rolling-window token quota ledger per organization/department
  private readonly tokenUsageLedger = new Map<string, { used: number; resetAt: number }>();
  private readonly DEFAULT_HOURLY_TOKEN_LIMIT = 500000;
  private readonly MAX_LEDGER_ENTRIES = 5000;

  // Stateful per-provider half-open circuit breaker registry
  private readonly circuitStates = new Map<string, ProviderCircuitSnapshot>();
  public readonly CIRCUIT_FAILURE_THRESHOLD =
    Number(process.env.LLM_CIRCUIT_FAILURE_THRESHOLD) || 3;
  public readonly CIRCUIT_COOLDOWN_MS =
    Number(process.env.LLM_CIRCUIT_COOLDOWN_MS) || 60000;
  public readonly DEFAULT_INVOKE_TIMEOUT_MS =
    Number(process.env.LLM_INVOKE_TIMEOUT_MS) || 20000;
  public readonly DEFAULT_STREAM_TIMEOUT_MS =
    Number(process.env.LLM_STREAM_TIMEOUT_MS) || 30000;
  public readonly HELPER_TIMEOUT_MS =
    Number(process.env.LLM_HELPER_TIMEOUT_MS) || 5000;

  public getDefaultGeminiModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  public getHelperGeminiModel(): string {
    return process.env.GEMINI_HELPER_MODEL || 'gemini-2.5-flash-lite';
  }

  public getDefaultClaudeModel(): string {
    return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  }

  public getDefaultOpenAIModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o';
  }

  public normalizeModelName(provider: string, modelName?: string): string {
    const cleanProvider = (provider || AIModelProvider.GEMINI).toUpperCase();
    if (cleanProvider === AIModelProvider.OPENAI) {
      return modelName || this.getDefaultOpenAIModel();
    }
    if (cleanProvider === AIModelProvider.CLAUDE) {
      const requested = modelName || this.getDefaultClaudeModel();
      // Normalize retired Claude 3.5 snapshot aliases to the configured current Claude model
      if (
        requested === 'claude-3-5-sonnet-20241022' ||
        requested === 'claude-3-5-sonnet-20240620'
      ) {
        return this.getDefaultClaudeModel();
      }
      return requested;
    }

    const requested = modelName || this.getDefaultGeminiModel();
    if (
      requested === 'gemini-1.5-flash' ||
      requested === 'gemini-2.0-flash' ||
      requested === 'gemini-3.5-flash-lite'
    ) {
      return this.getDefaultGeminiModel();
    }
    return requested;
  }

  public resolveChatModel(
    provider?: string,
    modelName?: string,
    options?: ResolveModelOptions,
  ): ResolvedChatModel {
    const cleanProvider = (provider || AIModelProvider.GEMINI).toUpperCase();
    const activeModel = this.normalizeModelName(cleanProvider, modelName);
    const thinkingLevel = options?.thinkingLevel;
    const maxRetries = options?.maxRetries ?? 1;
    const temperature = options?.temperature ?? 0.2;

    // In unit/integration test mode, avoid outbound network calls to external LLM endpoints
    if (process.env.NODE_ENV === 'test') {
      return { model: null, provider: cleanProvider, modelName: activeModel };
    }

    if (cleanProvider === AIModelProvider.OPENAI) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && !apiKey.startsWith('sk-test') && !apiKey.startsWith('sk-...')) {
        return {
          model: new ChatOpenAI({
            model: activeModel,
            apiKey,
            temperature,
            maxRetries,
            streamUsage: true,
            timeout: options?.timeoutMs ?? this.DEFAULT_STREAM_TIMEOUT_MS,
          }),
          provider: AIModelProvider.OPENAI,
          modelName: activeModel,
        };
      }
      return { model: null, provider: AIModelProvider.OPENAI, modelName: activeModel };
    }

    if (cleanProvider === AIModelProvider.CLAUDE) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && !apiKey.startsWith('sk-ant-...')) {
        const isDeepThinking = thinkingLevel === 'deep';
        const anthropicConfig: Record<string, unknown> = {
          model: activeModel,
          apiKey,
          maxRetries,
        };
        if (isDeepThinking) {
          // Anthropic extended thinking requires omitting temperature (< 1 is rejected)
          anthropicConfig.maxTokens = 4096;
          anthropicConfig.thinking = { type: 'enabled', budget_tokens: 2048 };
        } else {
          anthropicConfig.temperature = temperature;
        }
        return {
          model: new ChatAnthropic(anthropicConfig as any),
          provider: AIModelProvider.CLAUDE,
          modelName: activeModel,
        };
      }
      return { model: null, provider: AIModelProvider.CLAUDE, modelName: activeModel };
    }

    // Default: Google Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.startsWith('AIzaSy...')) {
      const geminiConfig: Record<string, unknown> = {
        model: activeModel,
        apiKey,
        temperature,
        maxRetries,
      };
      if (thinkingLevel === 'deep') {
        geminiConfig.thinkingConfig = { thinkingBudget: 2048 };
      } else if (thinkingLevel === 'normal') {
        geminiConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      return {
        model: new ChatGoogleGenerativeAI(geminiConfig as any),
        provider: AIModelProvider.GEMINI,
        modelName: activeModel,
      };
    }
    return { model: null, provider: AIModelProvider.GEMINI, modelName: activeModel };
  }

  /**
   * Resolves a low-latency, cost-efficient Flash-Lite tier model dedicated to internal RAG helpers
   * (query condensation, sub-query decomposition) so heavyweight user models aren't burned on pre-steps.
   */
  public resolveHelperModel(): ResolvedChatModel {
    const helperGeminiModel = this.getHelperGeminiModel();
    if (process.env.NODE_ENV === 'test') {
      return { model: null, provider: AIModelProvider.GEMINI, modelName: helperGeminiModel };
    }

    const geminiResolved = this.resolveChatModel(AIModelProvider.GEMINI, helperGeminiModel, {
      thinkingLevel: 'normal',
      temperature: 0,
      maxRetries: 0,
      timeoutMs: this.HELPER_TIMEOUT_MS,
    });
    if (geminiResolved.model) {
      return geminiResolved;
    }

    // Fallback to OpenAI mini tier if only OpenAI credentials are configured
    const openAiMini = process.env.OPENAI_HELPER_MODEL || 'gpt-4o-mini';
    const openAiResolved = this.resolveChatModel(AIModelProvider.OPENAI, openAiMini, {
      thinkingLevel: 'normal',
      temperature: 0,
      maxRetries: 0,
      timeoutMs: this.HELPER_TIMEOUT_MS,
    });
    if (openAiResolved.model) {
      return openAiResolved;
    }

    return { model: null, provider: AIModelProvider.GEMINI, modelName: helperGeminiModel };
  }

  // --- Half-Open Circuit Breaker State Machine ---

  public getProviderCircuitState(provider: string): ProviderCircuitSnapshot {
    const key = provider.toUpperCase();
    const existing = this.circuitStates.get(key);
    if (!existing) {
      return { state: 'CLOSED', failures: 0, openedAt: 0 };
    }
    return { ...existing };
  }

  public resetCircuitStates(): void {
    this.circuitStates.clear();
  }

  public isProviderAvailable(provider: string, now: number = Date.now()): boolean {
    const key = provider.toUpperCase();
    const record = this.circuitStates.get(key);
    if (!record || record.state === 'CLOSED' || record.state === 'HALF_OPEN') {
      return true;
    }

    // OPEN state: check if cooldown window has elapsed to transition into HALF_OPEN probe
    if (now - record.openedAt >= this.CIRCUIT_COOLDOWN_MS) {
      record.state = 'HALF_OPEN';
      this.circuitStates.set(key, record);
      this.logger.log(`Circuit breaker for ${key} entering HALF_OPEN probe state.`);
      return true;
    }

    return false;
  }

  public recordProviderSuccess(provider: string): void {
    const key = provider.toUpperCase();
    const previous = this.circuitStates.get(key);
    if (previous && previous.state !== 'CLOSED') {
      this.logger.log(`Circuit breaker for ${key} recovered -> CLOSED.`);
    }
    this.circuitStates.set(key, { state: 'CLOSED', failures: 0, openedAt: 0 });
  }

  public recordProviderFailure(
    provider: string,
    errorMessage?: string,
    now: number = Date.now(),
  ): ProviderCircuitSnapshot {
    const key = provider.toUpperCase();
    const existing = this.circuitStates.get(key) || {
      state: 'CLOSED' as CircuitState,
      failures: 0,
      openedAt: 0,
    };

    const failures = existing.failures + 1;
    const shouldOpen =
      existing.state === 'HALF_OPEN' || failures >= this.CIRCUIT_FAILURE_THRESHOLD;

    const updated: ProviderCircuitSnapshot = {
      state: shouldOpen ? 'OPEN' : 'CLOSED',
      failures,
      openedAt: shouldOpen ? now : existing.openedAt,
      lastError: errorMessage,
    };

    this.circuitStates.set(key, updated);
    if (shouldOpen) {
      this.logger.warn(
        `Circuit breaker OPENED for ${key} after ${failures} failure(s) (cooldown ${this.CIRCUIT_COOLDOWN_MS}ms): ${errorMessage || 'unknown error'}`,
      );
    }

    return { ...updated };
  }

  public getOrderedFailoverProviders(preferredProvider?: string): string[] {
    const fallbackChain: string[] = [
      AIModelProvider.GEMINI,
      AIModelProvider.CLAUDE,
      AIModelProvider.OPENAI,
    ];
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    const fullOrder = [cleanPreferred, ...fallbackChain.filter((p) => p !== cleanPreferred)];

    const now = Date.now();
    const available = fullOrder.filter((p) => this.isProviderAvailable(p, now));

    // If every single provider circuit is open, return full order so we still attempt a probe
    return available.length > 0 ? available : fullOrder;
  }

  /**
   * Creates an AbortController that aborts after `timeoutMs` (and optionally when `parentSignal` aborts),
   * returning a cleanup handle so timers never leak.
   */
  public createTimeoutController(
    timeoutMs: number,
    parentSignal?: AbortSignal,
  ): { controller: AbortController; cleanup: () => void } {
    const controller = new AbortController();
    const onParentAbort = () => controller.abort(parentSignal?.reason ?? new Error('Client aborted'));

    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort(parentSignal.reason ?? new Error('Client aborted'));
      } else {
        parentSignal.addEventListener('abort', onParentAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      controller.abort(new Error(`LLM provider timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    return {
      controller,
      cleanup: () => {
        clearTimeout(timer);
        if (parentSignal) {
          parentSignal.removeEventListener('abort', onParentAbort);
        }
      },
    };
  }

  /**
   * Extracts real token usage metrics from LangChain `usage_metadata` (across Gemini, Claude, OpenAI),
   * falling back to full-prompt + output character estimation when running offline or without metadata.
   */
  public extractUsageMetadata(
    usageMetadata: Record<string, any> | null | undefined,
    fallbackInputChars: number,
    fallbackOutputChars: number,
  ): TokenUsageMetrics {
    const inputTokens =
      typeof usageMetadata?.input_tokens === 'number' && usageMetadata.input_tokens > 0
        ? Math.round(usageMetadata.input_tokens)
        : 0;
    const outputTokens =
      typeof usageMetadata?.output_tokens === 'number' && usageMetadata.output_tokens > 0
        ? Math.round(usageMetadata.output_tokens)
        : 0;
    const totalTokens =
      typeof usageMetadata?.total_tokens === 'number' && usageMetadata.total_tokens > 0
        ? Math.round(usageMetadata.total_tokens)
        : inputTokens + outputTokens;
    const cacheReadTokens =
      typeof usageMetadata?.input_token_details?.cache_read === 'number' &&
      usageMetadata.input_token_details.cache_read > 0
        ? Math.round(usageMetadata.input_token_details.cache_read)
        : 0;

    if (inputTokens > 0 || outputTokens > 0) {
      const resolvedInput =
        inputTokens > 0 ? inputTokens : Math.max(1, Math.ceil(fallbackInputChars / 4));
      const resolvedOutput =
        outputTokens > 0 ? outputTokens : Math.max(1, Math.ceil(fallbackOutputChars / 4));
      return {
        promptTokens: resolvedInput,
        completionTokens: resolvedOutput,
        totalTokens: totalTokens > 0 ? totalTokens : resolvedInput + resolvedOutput,
        cacheReadTokens,
        source: 'provider',
      };
    }

    const estimatedPrompt = Math.max(1, Math.ceil(Math.max(0, fallbackInputChars) / 4));
    const estimatedCompletion = Math.max(0, Math.ceil(Math.max(0, fallbackOutputChars) / 4));
    return {
      promptTokens: estimatedPrompt,
      completionTokens: estimatedCompletion,
      totalTokens: estimatedPrompt + estimatedCompletion,
      cacheReadTokens: 0,
      source: 'estimated',
    };
  }

  /**
   * Multi-Model Circuit Breaker: Attempts execution on preferred provider with per-provider timeout
   * and half-open circuit tracking, failing over across Gemini, Claude, and OpenAI on errors.
   */
  public async invokeWithCircuitBreaker(
    systemPrompt: string | SystemMessage,
    userPrompt: string,
    preferredProvider?: string,
    preferredModel?: string,
    options?: ResolveModelOptions,
  ): Promise<CircuitBreakerInvocationResult> {
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    const orderedProviders = this.getOrderedFailoverProviders(cleanPreferred);
    const timeoutMs = options?.timeoutMs ?? this.DEFAULT_INVOKE_TIMEOUT_MS;

    const systemChars =
      typeof systemPrompt === 'string'
        ? systemPrompt.length
        : JSON.stringify(systemPrompt.content).length;
    const inputChars = systemChars + (userPrompt || '').length;

    for (const provider of orderedProviders) {
      const { model, provider: activeProvider, modelName: activeModel } = this.resolveChatModel(
        provider,
        provider === cleanPreferred ? preferredModel : undefined,
        options,
      );

      if (model) {
        const { controller, cleanup } = this.createTimeoutController(timeoutMs);
        try {
          const systemMessage =
            systemPrompt instanceof SystemMessage
              ? systemPrompt
              : this.buildProviderSystemMessage(systemPrompt, activeProvider);

          const invokePromise = model.invoke(
            [systemMessage, new HumanMessage(userPrompt)],
            { signal: controller.signal },
          );
          const timeoutPromise = new Promise<never>((_, reject) => {
            controller.signal.addEventListener(
              'abort',
              () =>
                reject(
                  controller.signal.reason instanceof Error
                    ? controller.signal.reason
                    : new Error(`Provider ${activeProvider} timed out after ${timeoutMs}ms`),
                ),
              { once: true },
            );
          });

          const response = await Promise.race([invokePromise, timeoutPromise]);
          const content = response?.content?.toString() || '';
          if (content.trim().length > 0) {
            this.recordProviderSuccess(activeProvider);
            const usage = this.extractUsageMetadata(
              response?.usage_metadata,
              inputChars,
              content.length,
            );
            return { content, providerUsed: activeProvider, modelUsed: activeModel, usage };
          }
          this.recordProviderFailure(activeProvider, 'Empty completion response');
        } catch (err: unknown) {
          const error = err as Error;
          this.recordProviderFailure(activeProvider, error.message);
          this.logger.warn(
            `Circuit breaker: ${activeProvider} invocation failed (${error.message}). Failing over to next provider.`,
          );
        } finally {
          cleanup();
        }
      }
    }

    return {
      content: '',
      providerUsed: 'FALLBACK',
      modelUsed: 'deterministic-synthesizer',
      usage: this.extractUsageMetadata(null, inputChars, 0),
    };
  }

  private buildProviderSystemMessage(systemPrompt: string, provider: string): SystemMessage {
    if (provider.toUpperCase() === AIModelProvider.CLAUDE) {
      const dynamicBoundary = systemPrompt.indexOf('<knowledge_base_context>');
      if (dynamicBoundary > 0) {
        const staticPrefix = systemPrompt.slice(0, dynamicBoundary).trimEnd();
        const dynamicPayload = systemPrompt.slice(dynamicBoundary);
        return new SystemMessage({
          content: [
            {
              type: 'text',
              text: staticPrefix,
              cache_control: { type: 'ephemeral' },
            } as any,
            {
              type: 'text',
              text: dynamicPayload,
            },
          ],
        });
      }
    }
    return new SystemMessage(systemPrompt);
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
    const reasoningModel = this.getDefaultClaudeModel();

    // 1. Multi-part compound queries (2+ question marks)
    const questionMarks = (query.match(/\?/g) || []).length;
    if (questionMarks >= 2) {
      return {
        tier: ModelComplexityTier.REASONING,
        recommendedProvider: AIModelProvider.CLAUDE,
        recommendedModel: reasoningModel,
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
        recommendedModel: reasoningModel,
        reason: `Analytical domain keyword "${matchedKeyword}" requires deep reasoning tier`,
      };
    }

    // 3. Extended prompt length (> 160 characters)
    if (trimmed.length > 160) {
      return {
        tier: ModelComplexityTier.REASONING,
        recommendedProvider: AIModelProvider.CLAUDE,
        recommendedModel: reasoningModel,
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
