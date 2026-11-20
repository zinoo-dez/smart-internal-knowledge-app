import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIModelProvider, ModelComplexityTier } from '@knowledge/shared';
import { ModelRouterService } from './model-router.service';

describe('ModelRouterService (P1 Tiered Routing, Half-Open Circuit Breaker, Timeouts & Real Token Usage)', () => {
  let router: ModelRouterService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    router = new ModelRouterService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Env-Configurable Model IDs & Legacy Snapshot Normalization', () => {
    it('uses current default model IDs and normalizes retired legacy aliases', () => {
      expect(router.getDefaultGeminiModel()).toBe('gemini-2.5-flash');
      expect(router.getHelperGeminiModel()).toBe('gemini-2.5-flash-lite');
      expect(router.getDefaultClaudeModel()).toBe('claude-sonnet-4-20250514');
      expect(router.getDefaultOpenAIModel()).toBe('gpt-4o');

      expect(router.normalizeModelName(AIModelProvider.CLAUDE, 'claude-3-5-sonnet-20241022')).toBe(
        'claude-sonnet-4-20250514',
      );
      expect(router.normalizeModelName(AIModelProvider.GEMINI, 'gemini-2.0-flash')).toBe(
        'gemini-2.5-flash',
      );
      expect(router.normalizeModelName(AIModelProvider.GEMINI, 'gemini-1.5-flash')).toBe(
        'gemini-2.5-flash',
      );
    });

    it('honors env-configured model overrides for Gemini, Helper, Claude, and OpenAI', () => {
      process.env.GEMINI_MODEL = 'gemini-2.5-pro';
      process.env.GEMINI_HELPER_MODEL = 'gemini-2.5-flash-lite-preview';
      process.env.ANTHROPIC_MODEL = 'claude-opus-4-20250514';
      process.env.OPENAI_MODEL = 'gpt-4.1';

      expect(router.getDefaultGeminiModel()).toBe('gemini-2.5-pro');
      expect(router.getHelperGeminiModel()).toBe('gemini-2.5-flash-lite-preview');
      expect(router.getDefaultClaudeModel()).toBe('claude-opus-4-20250514');
      expect(router.getDefaultOpenAIModel()).toBe('gpt-4.1');

      const helper = router.resolveHelperModel();
      expect(helper.provider).toBe(AIModelProvider.GEMINI);
      expect(helper.modelName).toBe('gemini-2.5-flash-lite-preview');

      const complexity = router.classifyQueryComplexity(
        'Compare our SOC2 and ISO27001 compliance policies.',
      );
      expect(complexity.tier).toBe(ModelComplexityTier.REASONING);
      expect(complexity.recommendedModel).toBe('claude-opus-4-20250514');
    });

    it('returns configured default Gemini model in test mode instead of hardcoded gemini-2.0-flash', () => {
      process.env.NODE_ENV = 'test';
      const resolved = router.resolveChatModel(AIModelProvider.GEMINI);
      expect(resolved.model).toBeNull();
      expect(resolved.modelName).toBe('gemini-2.5-flash');
    });
  });

  describe('Half-Open Circuit Breaker State Machine', () => {
    it('transitions CLOSED -> OPEN after threshold failures, skips OPEN provider, probes HALF_OPEN after cooldown, and recovers to CLOSED', () => {
      const t0 = 1_000_000;

      expect(router.getProviderCircuitState(AIModelProvider.GEMINI).state).toBe('CLOSED');
      expect(router.isProviderAvailable(AIModelProvider.GEMINI, t0)).toBe(true);

      // 2 failures stay CLOSED
      router.recordProviderFailure(AIModelProvider.GEMINI, 'HTTP 429', t0);
      router.recordProviderFailure(AIModelProvider.GEMINI, 'HTTP 429', t0 + 100);
      expect(router.getProviderCircuitState(AIModelProvider.GEMINI).state).toBe('CLOSED');

      // 3rd failure opens the circuit
      router.recordProviderFailure(AIModelProvider.GEMINI, 'HTTP 503', t0 + 200);
      expect(router.getProviderCircuitState(AIModelProvider.GEMINI).state).toBe('OPEN');

      // Inside cooldown window: provider is skipped in failover chain
      expect(router.isProviderAvailable(AIModelProvider.GEMINI, t0 + 10_000)).toBe(false);
      vi.spyOn(Date, 'now').mockReturnValue(t0 + 10_000);
      const orderDuringCooldown = router.getOrderedFailoverProviders(AIModelProvider.GEMINI);
      expect(orderDuringCooldown).toEqual([AIModelProvider.CLAUDE, AIModelProvider.OPENAI]);

      // After cooldown window elapses: transitions to HALF_OPEN probe
      const afterCooldown = t0 + router.CIRCUIT_COOLDOWN_MS + 500;
      expect(router.isProviderAvailable(AIModelProvider.GEMINI, afterCooldown)).toBe(true);
      expect(router.getProviderCircuitState(AIModelProvider.GEMINI).state).toBe('HALF_OPEN');

      // Successful probe closes circuit and resets failure counter
      router.recordProviderSuccess(AIModelProvider.GEMINI);
      const recovered = router.getProviderCircuitState(AIModelProvider.GEMINI);
      expect(recovered.state).toBe('CLOSED');
      expect(recovered.failures).toBe(0);
    });

    it('immediately re-opens circuit if a HALF_OPEN probe fails', () => {
      const t0 = 2_000_000;
      for (let i = 0; i < router.CIRCUIT_FAILURE_THRESHOLD; i++) {
        router.recordProviderFailure(AIModelProvider.CLAUDE, 'timeout', t0 + i * 10);
      }
      const probeTime = t0 + router.CIRCUIT_COOLDOWN_MS + 1000;
      expect(router.isProviderAvailable(AIModelProvider.CLAUDE, probeTime)).toBe(true);
      expect(router.getProviderCircuitState(AIModelProvider.CLAUDE).state).toBe('HALF_OPEN');

      router.recordProviderFailure(AIModelProvider.CLAUDE, 'still down', probeTime + 50);
      expect(router.getProviderCircuitState(AIModelProvider.CLAUDE).state).toBe('OPEN');
    });

    it('still returns full failover order if ALL providers are OPEN to avoid permanent deadlock', () => {
      const t0 = Date.now();
      for (const provider of [AIModelProvider.GEMINI, AIModelProvider.CLAUDE, AIModelProvider.OPENAI]) {
        for (let i = 0; i < router.CIRCUIT_FAILURE_THRESHOLD; i++) {
          router.recordProviderFailure(provider, 'outage', t0);
        }
      }
      const order = router.getOrderedFailoverProviders(AIModelProvider.GEMINI);
      expect(order).toEqual([
        AIModelProvider.GEMINI,
        AIModelProvider.CLAUDE,
        AIModelProvider.OPENAI,
      ]);
    });
  });

  describe('Per-Provider Timeout & Failover with Real usage_metadata', () => {
    it('aborts hung primary provider on timeout and fails over to secondary provider returning real usage_metadata', async () => {
      const hungPrimary = {
        invoke: vi.fn().mockImplementation(
          (_msgs: unknown, opts?: { signal?: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              opts?.signal?.addEventListener('abort', () => reject(new Error('Primary aborted')));
            }),
        ),
      };
      const healthySecondary = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Grounded failover response [1].',
          usage_metadata: {
            input_tokens: 1840,
            output_tokens: 92,
            total_tokens: 1932,
            input_token_details: { cache_read: 1200 },
          },
        }),
      };

      vi.spyOn(router, 'resolveChatModel').mockImplementation((provider?: string) => {
        if (provider === AIModelProvider.GEMINI) {
          return { model: hungPrimary, provider: AIModelProvider.GEMINI, modelName: 'gemini-2.5-flash' };
        }
        if (provider === AIModelProvider.CLAUDE) {
          return {
            model: healthySecondary,
            provider: AIModelProvider.CLAUDE,
            modelName: 'claude-sonnet-4-20250514',
          };
        }
        return { model: null, provider: AIModelProvider.OPENAI, modelName: 'gpt-4o' };
      });

      const result = await router.invokeWithCircuitBreaker(
        'System instructions',
        'User question',
        AIModelProvider.GEMINI,
        undefined,
        { timeoutMs: 40 },
      );

      expect(result.providerUsed).toBe(AIModelProvider.CLAUDE);
      expect(result.content).toBe('Grounded failover response [1].');
      expect(result.usage).toEqual({
        promptTokens: 1840,
        completionTokens: 92,
        totalTokens: 1932,
        cacheReadTokens: 1200,
        source: 'provider',
      });
      expect(router.getProviderCircuitState(AIModelProvider.GEMINI).failures).toBe(1);
      expect(router.getProviderCircuitState(AIModelProvider.CLAUDE).failures).toBe(0);
    });

    it('falls back to full-prompt character estimation when usage_metadata is unavailable', () => {
      const estimated = router.extractUsageMetadata(undefined, 8000, 400);
      expect(estimated).toEqual({
        promptTokens: 2000,
        completionTokens: 100,
        totalTokens: 2100,
        cacheReadTokens: 0,
        source: 'estimated',
      });
    });
  });
});
