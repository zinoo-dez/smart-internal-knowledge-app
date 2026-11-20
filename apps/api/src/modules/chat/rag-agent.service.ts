import { Injectable, Logger, Optional } from '@nestjs/common';
import { Response } from 'express';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  AgentAnswer,
  AIModelProvider,
  Department,
  DocumentCitation,
  McpToolSummary,
  ModelComplexityTier,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ConversationsService } from './conversations.service';
import { DataSanitizerService } from '../documents/services/data-sanitizer.service';
import { SemanticCacheService } from '../search/semantic-cache.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { McpService } from '../mcp/services/mcp.service';
import { McpClientManagerService } from '../mcp/services/mcp-client-manager.service';
import { AuditLogService } from '../audit/audit-log.service';
import { BillingService } from '../billing/billing.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import {
  CircuitBreakerInvocationResult,
  ModelRouterService,
  ResolveModelOptions,
  TokenUsageMetrics,
} from './services/model-router.service';
import {
  FormattedContextResult,
  PromptSecurityService,
  SanitizedContextResult,
} from './services/prompt-security.service';
import { GroundingEvaluatorService } from './services/grounding-evaluator.service';
import { QueryRewriterService } from './services/query-rewriter.service';
import { McpToolLoopService } from './services/mcp-tool-loop.service';
import { FollowUpStreamFilter } from './utils/follow-up-stream-filter';

const RESEARCH_MODE_DIRECTIVE = `<research_mode_directive>
Deep Research Mode is ACTIVE:
- Synthesize across ALL relevant retrieved sources thoroughly, highlighting comparisons, exceptions, SLAs, or policy edge cases.
- Use clear markdown headings and comparison tables when synthesizing multi-document findings.
- Cite every factual claim with exact inline [Source N] markers and explicitly note any gaps across documents.
</research_mode_directive>`;

export interface ChatExecutionPlan {
  mode: 'chat' | 'tools' | 'research';
  thinkingLevel: 'normal' | 'deep';
  preferredProvider: string;
  preferredModel?: string;
  complexityTier: ModelComplexityTier;
  routingReason: string;
  retrievalTopK: number;
  maxMergedCitations: number;
  maxSubQueries: number;
}

@Injectable()
export class RagAgentService {
  private readonly logger = new Logger(RagAgentService.name);

  public static readonly STATIC_SYSTEM_INSTRUCTIONS =
    PromptSecurityService.STATIC_SYSTEM_INSTRUCTIONS;

  private readonly MAX_HISTORY_TURNS = 6;
  private readonly MAX_HISTORY_TURN_CHARS = 1000;

  private readonly router: ModelRouterService;
  private readonly promptSecurity: PromptSecurityService;
  private readonly grounding: GroundingEvaluatorService;
  private readonly queryRewriter: QueryRewriterService;
  private readonly mcpToolLoop: McpToolLoopService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentToolsService: AgentToolsService,
    @Optional() private readonly conversationsService?: ConversationsService,
    @Optional() private readonly dataSanitizer?: DataSanitizerService,
    @Optional() private readonly semanticCacheService?: SemanticCacheService,
    @Optional() private readonly embeddingService?: EmbeddingService,
    @Optional() private readonly mcpService?: McpService,
    @Optional() private readonly mcpClientManager?: McpClientManagerService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly billingService?: BillingService,
    @Optional() modelRouterService?: ModelRouterService,
    @Optional() promptSecurityService?: PromptSecurityService,
    @Optional() groundingEvaluatorService?: GroundingEvaluatorService,
    @Optional() queryRewriterService?: QueryRewriterService,
    @Optional() mcpToolLoopService?: McpToolLoopService,
  ) {
    this.router = modelRouterService || new ModelRouterService();
    this.promptSecurity = promptSecurityService || new PromptSecurityService();
    this.grounding =
      groundingEvaluatorService ||
      new GroundingEvaluatorService(this.router, this.promptSecurity);
    this.queryRewriter =
      queryRewriterService || new QueryRewriterService(this.router, this.promptSecurity);
    this.mcpToolLoop =
      mcpToolLoopService || new McpToolLoopService(this.router, this.promptSecurity);
  }

  // --- Backwards-compatible public façades delegating to focused services ---

  public invokeWithCircuitBreaker(
    systemPrompt: string | SystemMessage,
    userPrompt: string,
    preferredProvider?: string,
    preferredModel?: string,
    options?: ResolveModelOptions,
  ): Promise<CircuitBreakerInvocationResult> {
    return this.router.invokeWithCircuitBreaker(
      systemPrompt,
      userPrompt,
      preferredProvider,
      preferredModel,
      options,
    );
  }

  public classifyQueryComplexity(query: string): {
    tier: ModelComplexityTier;
    recommendedProvider: string;
    recommendedModel: string;
    reason: string;
  } {
    return this.router.classifyQueryComplexity(query);
  }

  public checkAndConsumeTokenBudget(
    organizationId: string,
    department: Department = Department.ALL,
    estimatedTokens: number = 1000,
  ): { allowed: boolean; remainingTokens: number; limit: number; resetInSeconds: number } {
    return this.router.checkAndConsumeTokenBudget(organizationId, department, estimatedTokens);
  }

  public parseStructuredAnswer(rawText: string, citations: DocumentCitation[]): AgentAnswer {
    return this.grounding.parseStructuredAnswer(rawText, citations);
  }

  public generateFollowUpSuggestions(query: string, citations: DocumentCitation[]): string[] {
    return this.grounding.generateFollowUpSuggestions(query, citations);
  }

  public buildSystemPrompt(
    contextBlocks: string,
    activeTools: McpToolSummary[] = [],
    canaryToken?: string,
  ): string {
    return this.promptSecurity.buildSystemPrompt(contextBlocks, activeTools, canaryToken);
  }

  public buildCacheableSystemMessage(
    contextBlocks: string,
    activeTools: McpToolSummary[] = [],
    canaryToken?: string,
    provider: string = AIModelProvider.GEMINI,
  ): SystemMessage {
    return this.promptSecurity.buildCacheableSystemMessage(
      contextBlocks,
      activeTools,
      canaryToken,
      provider,
    );
  }

  public formatReorderedContextBlocks(citations: DocumentCitation[]): FormattedContextResult {
    return this.promptSecurity.formatReorderedContextBlocks(
      citations,
      this.dataSanitizer ? (s) => this.dataSanitizer!.sanitizeText(s) : undefined,
    );
  }

  public escapeXmlDelimiters(text: string): string {
    return this.promptSecurity.escapeXmlDelimiters(text);
  }

  public sanitizeContextChunk(snippet: string): SanitizedContextResult {
    return this.promptSecurity.sanitizeContextChunk(snippet);
  }

  public reorderContextChunks(citations: DocumentCitation[]): DocumentCitation[] {
    return this.promptSecurity.reorderContextChunks(citations);
  }

  public evaluateCitationGrounding(answerText: string, citations: DocumentCitation[]): number {
    return this.grounding.evaluateCitationGrounding(answerText, citations);
  }

  public isAdversarialPrompt(query: string): boolean {
    return this.promptSecurity.isAdversarialPrompt(query);
  }

  public isHighConfidenceJailbreak(query: string): boolean {
    return this.promptSecurity.isHighConfidenceJailbreak(query);
  }

  public isMyanmarQuery(text: string): boolean {
    return this.promptSecurity.isMyanmarQuery(text);
  }

  /**
   * Resolves routing, retrieval depth, and thinking configuration from `dto.mode`, `dto.thinkingLevel`,
   * explicit model selection, and automatic complexity classification.
   */
  public resolveExecutionPlan(dto: ChatCompletionDto, query: string): ChatExecutionPlan {
    const mode = dto.mode || 'chat';
    const isResearch = mode === 'research';
    const defaultGemini = this.router.getDefaultGeminiModel?.() || 'gemini-2.5-flash';

    const complexity =
      typeof this.router.classifyQueryComplexity === 'function'
        ? this.router.classifyQueryComplexity(query)
        : {
            tier: ModelComplexityTier.FLASH,
            recommendedProvider: AIModelProvider.GEMINI,
            recommendedModel: defaultGemini,
            reason: 'Standard direct lookup',
          };

    const hasExplicitProvider = Boolean(dto.modelProvider && dto.modelProvider.trim().length > 0);
    const preferredProvider = hasExplicitProvider
      ? dto.modelProvider!.toUpperCase()
      : complexity.recommendedProvider;
    const preferredModel = hasExplicitProvider
      ? dto.modelName
      : dto.modelName || complexity.recommendedModel;

    const thinkingLevel: 'normal' | 'deep' =
      dto.thinkingLevel ||
      (isResearch || complexity.tier === ModelComplexityTier.REASONING ? 'deep' : 'normal');

    return {
      mode,
      thinkingLevel,
      preferredProvider,
      preferredModel,
      complexityTier: complexity.tier,
      routingReason: hasExplicitProvider
        ? `Explicit provider (${preferredProvider}) with ${thinkingLevel} thinking in ${mode} mode`
        : complexity.reason,
      retrievalTopK: isResearch ? 8 : 4,
      maxMergedCitations: isResearch ? 8 : 5,
      maxSubQueries: isResearch ? 3 : 2,
    };
  }

  /**
   * Builds bounded, XML-escaped multi-turn LangChain messages for the answering LLM.
   * Strips any client-supplied `system` roles to prevent privilege/instruction spoofing.
   */
  public buildConversationMessages(
    systemMsg: SystemMessage,
    priorTurns: { role: string; content: string }[],
    userPrompt: string,
  ): BaseMessage[] {
    const messages: BaseMessage[] = [systemMsg];

    if (Array.isArray(priorTurns) && priorTurns.length > 0) {
      const boundedTurns = priorTurns.slice(-this.MAX_HISTORY_TURNS);
      for (const turn of boundedTurns) {
        if (!turn || typeof turn.content !== 'string') continue;
        const trimmed = turn.content.trim();
        if (!trimmed) continue;

        const safeContent = this.promptSecurity
          .escapeXmlDelimiters(trimmed)
          .slice(0, this.MAX_HISTORY_TURN_CHARS);

        if (turn.role === 'user') {
          messages.push(new HumanMessage(safeContent));
        } else if (turn.role === 'assistant') {
          messages.push(new AIMessage(safeContent));
        }
        // Explicitly ignore 'system' role from client history to block prompt injection spoofing
      }
    }

    messages.push(new HumanMessage(userPrompt));
    return messages;
  }

  private estimateMessagesCharLength(messages: BaseMessage[]): number {
    let chars = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        chars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block && typeof block === 'object' && 'text' in block) {
            chars += String((block as { text?: unknown }).text || '').length;
          } else {
            chars += JSON.stringify(block).length;
          }
        }
      }
    }
    return chars;
  }

  private extractUsageSafe(
    usageMetadata: Record<string, any> | null | undefined,
    inputChars: number,
    outputChars: number,
  ): TokenUsageMetrics {
    if (typeof this.router.extractUsageMetadata === 'function') {
      return this.router.extractUsageMetadata(usageMetadata, inputChars, outputChars);
    }
    const promptTokens =
      typeof usageMetadata?.input_tokens === 'number' && usageMetadata.input_tokens > 0
        ? Math.round(usageMetadata.input_tokens)
        : Math.max(1, Math.ceil(inputChars / 4));
    const completionTokens =
      typeof usageMetadata?.output_tokens === 'number' && usageMetadata.output_tokens > 0
        ? Math.round(usageMetadata.output_tokens)
        : Math.max(0, Math.ceil(outputChars / 4));
    const totalTokens =
      typeof usageMetadata?.total_tokens === 'number' && usageMetadata.total_tokens > 0
        ? Math.round(usageMetadata.total_tokens)
        : promptTokens + completionTokens;
    const cacheReadTokens =
      typeof usageMetadata?.input_token_details?.cache_read === 'number'
        ? Math.round(usageMetadata.input_token_details.cache_read)
        : 0;
    return {
      promptTokens,
      completionTokens,
      totalTokens,
      cacheReadTokens,
      source:
        typeof usageMetadata?.input_tokens === 'number' && usageMetadata.input_tokens > 0
          ? 'provider'
          : 'estimated',
    };
  }

  private resolveHelperChatModel(fallbackModel: any | null = null): any | null {
    if (typeof this.router.resolveHelperModel === 'function') {
      const resolved = this.router.resolveHelperModel();
      if (resolved?.model) {
        return resolved.model;
      }
    }
    return fallbackModel;
  }

  private async invokeWithTimeout<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    if (typeof this.router.createTimeoutController === 'function') {
      const { controller, cleanup } = this.router.createTimeoutController(timeoutMs);
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            'abort',
            () =>
              reject(
                controller.signal.reason instanceof Error
                  ? controller.signal.reason
                  : new Error(`Operation timed out after ${timeoutMs}ms`),
              ),
            { once: true },
          );
        });
        return await Promise.race([operation(controller.signal), timeoutPromise]);
      } finally {
        cleanup();
      }
    }
    return operation(undefined);
  }

  private buildJailbreakRefusal(query: string): string {
    if (this.isMyanmarQuery(query)) {
      return 'စနစ်လုံခြုံရေး စည်းမျဉ်းများကို ကျော်လွှားရန် သို့မဟုတ် အတွင်းပိုင်းညွှန်ကြားချက်များကို ဖော်ပြရန် တောင်းဆိုချက်များကို လုပ်ဆောင်ပေးနိုင်ခြင်း မရှိပါ။ ကုမ္ပဏီမှတ်တမ်းများနှင့်ပတ်သက်၍ မည်သို့ကူညီပေးရမလဲခင်ဗျာ။';
    }
    return 'I cannot follow instructions that attempt to override system safeguards or disclose internal instructions. How can I assist you with verified company documentation today?';
  }

  private async handleDirectJailbreakIfDetected(
    tenant: TenantContext,
    sanitizedQuery: string,
    resource: string,
  ): Promise<string | null> {
    if (!this.isHighConfidenceJailbreak(sanitizedQuery)) {
      return null;
    }

    this.logger.warn(
      `High-confidence prompt injection blocked for user ${tenant.userId} in tenant ${tenant.organizationId} (${resource})`,
    );

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: 'PROMPT_INJECTION_BLOCKED' as any,
        resource,
        details: {
          query: sanitizedQuery.slice(0, 300),
          trigger: 'High-confidence prompt override or delimiter breakout blocked pre-LLM',
        },
      });
    }

    return this.buildJailbreakRefusal(sanitizedQuery);
  }

  /**
   * Decomposes compound or deep-research inquiries into distinct sub-queries
   * for parallel hybrid retrieval across different departments/topics.
   * Uses role-separated SystemMessage/HumanMessage + Zod structured output + helper timeout.
   */
  public decomposeQuery(
    query: string,
    chatModel: any | null,
    maxSubQueries: number = 2,
    forceResearchExpansion: boolean = false,
  ): Promise<string[]> {
    return this.queryRewriter.decomposeQuery(query, chatModel, maxSubQueries, forceResearchExpansion);
  }

  public condenseFollowUpQuery(
    priorTurns: { role: string; content: string }[],
    currentQuery: string,
    chatModel: any | null,
  ): Promise<string> {
    return this.queryRewriter.condenseFollowUpQuery(priorTurns, currentQuery, chatModel);
  }

  private async retrieveCitations(
    tenant: TenantContext,
    searchQuery: string,
    helperModel: any | null,
    options?: {
      topK?: number;
      maxMerged?: number;
      maxSubQueries?: number;
      forceResearchExpansion?: boolean;
    },
  ): Promise<DocumentCitation[]> {
    const topK = options?.topK ?? 4;
    const maxMerged = options?.maxMerged ?? 5;
    const maxSubQueries = options?.maxSubQueries ?? 2;
    const forceResearchExpansion = options?.forceResearchExpansion ?? false;

    const subQueries = await this.decomposeQuery(
      searchQuery,
      helperModel,
      maxSubQueries,
      forceResearchExpansion,
    );
    if (subQueries.length > 1) {
      const perSubQueryTopK = forceResearchExpansion ? 4 : 3;
      const results = await Promise.all(
        subQueries.map((q) => this.agentToolsService.searchKnowledgeBase(tenant, q, perSubQueryTopK)),
      );
      const seen = new Set<string>();
      const merged: DocumentCitation[] = [];
      for (const batch of results) {
        for (const c of batch) {
          if (!seen.has(c.chunkId)) {
            seen.add(c.chunkId);
            merged.push(c);
          }
        }
      }
      return merged.slice(0, maxMerged);
    }
    return this.agentToolsService.searchKnowledgeBase(tenant, searchQuery, topK);
  }

  private async buildNoCitationsFallback(
    rawQuery: string,
    sanitizedQuery: string,
  ): Promise<string> {
    const isMy = this.isMyanmarQuery(sanitizedQuery);
    const teamContact = await this.agentToolsService.lookupTeamContact(sanitizedQuery);
    if (isMy) {
      return (
        `ကုမ္ပဏီမှတ်တမ်းများတွင် "${rawQuery}" နှင့်ပတ်သက်သော အချက်အလက်များ မတွေ့ရှိပါ။\n\n` +
        `ဤကိစ္စနှင့်ပတ်သက်၍ မေးမြန်းစုံစမ်းလိုပါက **${teamContact.name}** (${teamContact.role}) ထံသို့ အီးမေးလ် \`${teamContact.email}\` သို့မဟုတ် Slack \`${teamContact.slackHandle}\` ဖြင့် ဆက်သွယ်နိုင်ပါသည်။\n\n` +
        `ဤမေးမြန်းမှုအတွက် သက်ဆိုင်ရာဌာနသို့ အကူအညီတောင်းခံလွှာ (Support Ticket) ဖွင့်ပေးရမလားခင်ဗျာ။`
      );
    }
    return (
      `I could not find direct information about "${rawQuery}" in your company's indexed documents.\n\n` +
      `For questions regarding this topic, you can contact **${teamContact.name}** (${teamContact.role}) at \`${teamContact.email}\` or Slack \`${teamContact.slackHandle}\`.\n\n` +
      `Would you like me to open an internal support ticket for this inquiry?`
    );
  }

  /**
   * Generates a non-streaming grounded answer with citations.
   * Used for Slack Bot, Teams, and programmatic background workflows.
   */
  async generateAnswer(
    tenant: TenantContext,
    userQuery: string,
    modelProvider?: string,
    modelName?: string,
  ): Promise<{ text: string; citations: DocumentCitation[] }> {
    const startTime = Date.now();
    const sanitizedUserMessage = this.dataSanitizer
      ? this.dataSanitizer.sanitizeText(userQuery)
      : userQuery;

    // 0A. Block high-confidence prompt injection / extraction before touching cache or LLM
    const jailbreakRefusal = await this.handleDirectJailbreakIfDetected(
      tenant,
      sanitizedUserMessage,
      'RagAgentService:generateAnswer',
    );
    if (jailbreakRefusal) {
      return { text: jailbreakRefusal, citations: [] };
    }

    // 0B. Check Semantic Cache for Instant Zero-Cost Response (language-partitioned)
    let queryVector: number[] = [];
    if (this.semanticCacheService && this.embeddingService) {
      try {
        queryVector = await this.embeddingService.embedText(sanitizedUserMessage);
        const match = await this.semanticCacheService.get(tenant, sanitizedUserMessage, queryVector);
        if (match) {
          return { text: match.answer, citations: match.citations };
        }
      } catch (err) {
        this.logger.debug(`Semantic cache check error: ${err}`);
      }
    }

    const plan = this.resolveExecutionPlan(
      {
        messages: [{ role: 'user', content: sanitizedUserMessage }],
        modelProvider,
        modelName,
      },
      sanitizedUserMessage,
    );

    const helperModel = this.resolveHelperChatModel();
    const citations = await this.retrieveCitations(tenant, sanitizedUserMessage, helperModel, {
      topK: plan.retrievalTopK,
      maxMerged: plan.maxMergedCitations,
      maxSubQueries: plan.maxSubQueries,
    });

    let answerText: string;
    let activeProvider = plan.preferredProvider;
    let activeModelName = plan.preferredModel || this.router.getDefaultGeminiModel();
    let invokedUsage: TokenUsageMetrics | undefined;
    let estimatedInputChars = sanitizedUserMessage.length;
    const canaryToken = `CANARY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    if (citations.length > 0) {
      const formatted = this.formatReorderedContextBlocks(citations);
      if (formatted.hadIndirectInjection && this.auditLogService) {
        await this.auditLogService.recordEvent({
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: 'INDIRECT_PROMPT_INJECTION_NEUTRALIZED' as any,
          resource: 'RagAgentService:generateAnswer',
          details: { query: sanitizedUserMessage.slice(0, 300) },
        });
      }

      const systemPrompt = this.buildSystemPrompt(formatted.contextBlocks, undefined, canaryToken);
      const safeUserQuery = this.promptSecurity.escapeXmlDelimiters(sanitizedUserMessage);
      const userPrompt = `<user_query>\n${safeUserQuery}\n</user_query>`;
      estimatedInputChars = systemPrompt.length + userPrompt.length;

      const invoked = await this.invokeWithCircuitBreaker(
        systemPrompt,
        userPrompt,
        plan.preferredProvider,
        plan.preferredModel,
        { thinkingLevel: plan.thinkingLevel },
      );

      if (invoked?.providerUsed) activeProvider = invoked.providerUsed;
      if (invoked?.modelUsed) activeModelName = invoked.modelUsed;
      if (invoked?.usage) invokedUsage = invoked.usage;

      const rawAnswer =
        invoked?.content ||
        this.grounding.generateSynthesizedAnswer(sanitizedUserMessage, citations);
      answerText = FollowUpStreamFilter.stripAndExtract(rawAnswer).cleanText;
    } else {
      answerText = await this.buildNoCitationsFallback(userQuery, sanitizedUserMessage);
    }

    if (this.promptSecurity.containsCanaryOrPromptLeak(answerText, canaryToken)) {
      this.logger.error(
        'Canary alert: Model response contained internal prompt instructions or canary token. Redacting response.',
      );
      if (this.auditLogService) {
        await this.auditLogService.recordEvent({
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: 'PROMPT_LEAK_PREVENTED' as any,
          resource: 'RagAgentService:generateAnswer',
          details: { query: sanitizedUserMessage, trigger: 'Canary token breach detected' },
        });
      }
      answerText =
        'I am your company knowledge assistant. How can I assist you with company documentation today?';
    }

    if (
      this.semanticCacheService &&
      queryVector.length > 0 &&
      citations.length > 0 &&
      answerText
    ) {
      await this.semanticCacheService.set(
        tenant,
        sanitizedUserMessage,
        queryVector,
        answerText,
        citations,
      );
    }

    // Persist unified telemetry for non-streaming channels (Slack Bot / workflows) & trigger async judge
    const latencyMs = Date.now() - startTime;
    const finalUsage =
      invokedUsage || this.extractUsageSafe(null, estimatedInputChars, answerText.length);
    const isUnresolved = citations.length === 0;
    const gapCategory = isUnresolved
      ? this.grounding.classifyGapCategory(sanitizedUserMessage)
      : null;
    const faithfulnessScore = this.evaluateCitationGrounding(answerText, citations);

    try {
      const createLog = this.prisma?.client?.queryLog?.create;
      if (typeof createLog === 'function') {
        const queryLog = await createLog({
          data: {
            organizationId: tenant.organizationId,
            userId: tenant.userId,
            conversationId: `channel-${tenant.userId}-${Date.now()}`,
            query: userQuery,
            response: answerText,
            modelProvider: activeProvider,
            modelName: activeModelName,
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
            totalTokens: finalUsage.totalTokens,
            latencyMs,
            citations: JSON.parse(JSON.stringify(citations)),
            faithfulnessScore,
            isUnresolved,
            gapCategory,
          },
        });
        if (queryLog?.id) {
          this.scheduleBackgroundFaithfulnessJudge(
            tenant.organizationId,
            queryLog.id,
            sanitizedUserMessage,
            answerText,
            citations,
          );
        }
      }
    } catch (err) {
      this.logger.debug(`Prisma queryLog.create offline in generateAnswer: ${(err as Error).message}`);
    }

    return { text: answerText, citations };
  }

  /**
   * Streams a grounded answer via Server-Sent Events (SSE) with strict error handling,
   * mode & thinkingLevel routing, bounded multi-turn memory, Flash-Lite internal helpers,
   * half-open circuit-breaker failover, real usage_metadata token accounting, and guaranteed res.end().
   */
  async streamChat(
    tenant: TenantContext,
    dto: ChatCompletionDto,
    res: Response,
  ): Promise<void> {
    const startTime = Date.now();
    const lastUserMessage =
      [...dto.messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientAbortController = new AbortController();
    let isClientDisconnected = false;
    if (typeof res.on === 'function') {
      res.on('close', () => {
        isClientDisconnected = true;
        clientAbortController.abort(new Error('Client disconnected'));
      });
    }
    const checkAborted = () => isClientDisconnected;

    try {
      // 0A. Enforce tenant monthly subscription quota & hourly token budget
      if (this.billingService && process.env.NODE_ENV !== 'test') {
        const quota = await this.billingService.checkQuota(tenant);
        if (!quota.allowed) {
          await this.streamSyntheticResponse(
            quota.reason || 'Monthly quota exceeded. Please upgrade your workspace plan.',
            res,
            checkAborted,
          );
          res.write(`data: ${JSON.stringify({ type: 'done', latencyMs: Date.now() - startTime })}\n\n`);
          return;
        }
      }

      // 0B. Extract prior dialogue history for multi-turn context (up to 6 turns)
      let priorTurns: { role: string; content: string }[] = [];
      if (dto.messages && dto.messages.length > 1) {
        priorTurns = dto.messages
          .slice(0, -1)
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-this.MAX_HISTORY_TURNS)
          .map((m) => ({ role: m.role, content: m.content }));
      } else if (dto.conversationId && this.conversationsService) {
        try {
          priorTurns = await this.conversationsService.getRecentMessages(
            tenant,
            dto.conversationId,
            this.MAX_HISTORY_TURNS,
          );
        } catch {
          this.logger.debug(`Could not retrieve prior turns for conversation ${dto.conversationId}`);
        }
      }

      // Pre-flight budget check including base system prompt + history estimate
      const historyChars = priorTurns.reduce((sum, t) => sum + (t.content?.length || 0), 0);
      const estimatedPreFlightTokens = Math.max(
        600,
        Math.ceil((lastUserMessage.length + historyChars + 2400) / 4),
      );
      const budget = this.checkAndConsumeTokenBudget(
        tenant.organizationId,
        tenant.department || Department.ALL,
        estimatedPreFlightTokens,
      );
      if (!budget.allowed) {
        await this.streamSyntheticResponse(
          `Hourly token rate limit reached for your department. Quota resets in ${budget.resetInSeconds}s.`,
          res,
          checkAborted,
        );
        res.write(`data: ${JSON.stringify({ type: 'done', latencyMs: Date.now() - startTime })}\n\n`);
        return;
      }

      // 1. Sanitize user input message
      const sanitizedUserMessage = this.dataSanitizer
        ? this.dataSanitizer.sanitizeText(lastUserMessage)
        : lastUserMessage;

      // 2. Scan & short-circuit high-confidence direct prompt injection / extraction attacks
      const jailbreakRefusal = await this.handleDirectJailbreakIfDetected(
        tenant,
        sanitizedUserMessage,
        'RagAgentService:streamChat',
      );
      if (jailbreakRefusal) {
        await this.streamSyntheticResponse(jailbreakRefusal, res, checkAborted);
        res.write(
          `data: ${JSON.stringify({ type: 'done', latencyMs: Date.now() - startTime })}\n\n`,
        );
        return;
      }

      if (this.isAdversarialPrompt(sanitizedUserMessage)) {
        this.logger.warn(
          `Adversarial prompt pattern detected from user ${tenant.userId} in tenant ${tenant.organizationId}`,
        );
      }

      // Resolve execution strategy (mode, thinkingLevel, auto vs explicit provider, retrieval depth)
      const plan = this.resolveExecutionPlan(dto, sanitizedUserMessage);
      const isToolsMode = plan.mode === 'tools';
      const isResearchMode = plan.mode === 'research';

      const {
        model: primaryChatModel,
        provider: initialProvider,
        modelName: initialModelName,
      } = this.router.resolveChatModel(plan.preferredProvider, plan.preferredModel, {
        thinkingLevel: plan.thinkingLevel,
      });

      let activeProvider = initialProvider;
      let activeModelName = initialModelName;

      // 2B. Check Semantic Cache on standalone standard chat queries (bypass on tools, research, or multi-turn)
      let queryVector: number[] = [];
      if (
        !isToolsMode &&
        !isResearchMode &&
        this.semanticCacheService &&
        this.embeddingService &&
        priorTurns.length === 0
      ) {
        try {
          queryVector = await this.embeddingService.embedText(sanitizedUserMessage);
          const cacheHit = await this.semanticCacheService.get(
            tenant,
            sanitizedUserMessage,
            queryVector,
          );
          if (cacheHit) {
            res.write(
              `data: ${JSON.stringify({ type: 'citations', citations: cacheHit.citations })}\n\n`,
            );
            await this.streamSyntheticResponse(cacheHit.answer, res, checkAborted);
            const cachedPromptTokens = Math.max(1, Math.ceil(sanitizedUserMessage.length / 4));
            const cachedCompletionTokens = Math.ceil(cacheHit.answer.length / 4);
            res.write(
              `data: ${JSON.stringify({
                type: 'done',
                latencyMs: 15,
                promptTokens: cachedPromptTokens,
                completionTokens: cachedCompletionTokens,
                totalTokens: cachedPromptTokens + cachedCompletionTokens,
                cacheReadTokens: cachedPromptTokens,
                isCached: true,
                mode: plan.mode,
                thinkingLevel: plan.thinkingLevel,
              })}\n\n`,
            );
            return;
          }
        } catch (err) {
          this.logger.debug(`Semantic cache check bypassed: ${err}`);
        }
      }

      // 3. Pin internal helpers (condensation & decomposition) to Flash-Lite tier & retrieve citations
      const helperModel = this.resolveHelperChatModel();
      const searchQuery = await this.condenseFollowUpQuery(
        priorTurns,
        sanitizedUserMessage,
        helperModel,
      );
      const citations = await this.retrieveCitations(tenant, searchQuery, helperModel, {
        topK: plan.retrievalTopK,
        maxMerged: plan.maxMergedCitations,
        maxSubQueries: plan.maxSubQueries,
        forceResearchExpansion: isResearchMode,
      });
      res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);

      let fullResponseText = '';
      let llmFollowUps: string[] = [];
      let usageMetrics: TokenUsageMetrics | null = null;
      let dynamicPromptChars = PromptSecurityService.STATIC_SYSTEM_INSTRUCTIONS.length + historyChars + sanitizedUserMessage.length;
      const canaryToken = `CANARY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // 4. Mode-gated native MCP tool calling (ONLY when dto.mode === 'tools')
      let activeMcpTools: McpToolSummary[] = [];
      let mcpHandled: {
        text: string;
        followUpQuestions: string[];
        usage?: TokenUsageMetrics;
        providerUsed?: string;
        modelUsed?: string;
      } | null = null;
      if (isToolsMode && this.mcpService) {
        try {
          activeMcpTools = await this.mcpService.getActiveToolsForTenant(tenant);
        } catch (err) {
          this.logger.debug(`Could not retrieve active MCP tools: ${(err as Error).message}`);
        }

        if (activeMcpTools.length > 0 && this.mcpClientManager) {
          mcpHandled = await this.executeNativeMcpToolLoop(
            tenant,
            sanitizedUserMessage,
            priorTurns,
            activeMcpTools,
            primaryChatModel,
            canaryToken,
            plan.preferredProvider,
            plan.preferredModel,
            plan.thinkingLevel,
            res,
            checkAborted,
            clientAbortController.signal,
          );
        }
      }

      if (mcpHandled !== null) {
        fullResponseText = mcpHandled.text;
        llmFollowUps = mcpHandled.followUpQuestions;
        if (mcpHandled.usage) usageMetrics = mcpHandled.usage;
        if (mcpHandled.providerUsed) activeProvider = mcpHandled.providerUsed;
        if (mcpHandled.modelUsed) activeModelName = mcpHandled.modelUsed;
      } else if (citations.length > 0) {
        const formatted = this.formatReorderedContextBlocks(citations);
        if (formatted.hadIndirectInjection && this.auditLogService) {
          await this.auditLogService.recordEvent({
            organizationId: tenant.organizationId,
            userId: tenant.userId,
            action: 'INDIRECT_PROMPT_INJECTION_NEUTRALIZED' as any,
            resource: 'RagAgentService:streamChat',
            details: { query: sanitizedUserMessage.slice(0, 300) },
          });
        }

        const contextPayload = isResearchMode
          ? `${formatted.contextBlocks}\n\n${RESEARCH_MODE_DIRECTIVE}`
          : formatted.contextBlocks;
        dynamicPromptChars += contextPayload.length;

        const safeUserQuery = this.promptSecurity.escapeXmlDelimiters(sanitizedUserMessage);
        const userPrompt = `<user_query>\n${safeUserQuery}\n</user_query>`;

        // Multi-provider streaming circuit-breaker loop with split Prompt Caching, multi-turn history & real usage tracking
        const streamed = await this.streamWithProviderFailover(
          tenant,
          sanitizedUserMessage,
          contextPayload,
          activeMcpTools,
          priorTurns,
          userPrompt,
          canaryToken,
          plan.preferredProvider,
          plan.preferredModel,
          plan.thinkingLevel,
          res,
          checkAborted,
          clientAbortController.signal,
        );

        if (streamed.success) {
          fullResponseText = streamed.text;
          llmFollowUps = streamed.followUpQuestions;
          activeProvider = streamed.providerUsed;
          activeModelName = streamed.modelUsed;
          usageMetrics = streamed.usage;
        } else {
          fullResponseText = this.grounding.generateSynthesizedAnswer(
            sanitizedUserMessage,
            citations,
          );
          await this.streamSyntheticResponse(fullResponseText, res, checkAborted);
        }
      } else {
        fullResponseText = await this.buildNoCitationsFallback(
          lastUserMessage,
          sanitizedUserMessage,
        );
        await this.streamSyntheticResponse(fullResponseText, res, checkAborted);
      }

      // 5. Post-stream Canary & Prompt Leak Audit Defense
      if (this.promptSecurity.containsCanaryOrPromptLeak(fullResponseText, canaryToken)) {
        this.logger.error(
          'Canary alert: Model response contained internal prompt instructions or canary token. Redacting response.',
        );
        if (this.auditLogService) {
          await this.auditLogService.recordEvent({
            organizationId: tenant.organizationId,
            userId: tenant.userId,
            action: 'PROMPT_LEAK_PREVENTED' as any,
            resource: 'RagAgentService:streamChat',
            details: { query: sanitizedUserMessage, trigger: 'Prompt extraction attack detected' },
          });
        }
        fullResponseText =
          'I am your company knowledge assistant. How can I assist you with company documentation today?';
      }

      // 6. Store clean grounded answer in Semantic Cache (standalone non-tool/non-research queries only)
      if (
        !isToolsMode &&
        !isResearchMode &&
        priorTurns.length === 0 &&
        this.semanticCacheService &&
        queryVector.length > 0 &&
        citations.length > 0 &&
        fullResponseText
      ) {
        await this.semanticCacheService.set(
          tenant,
          sanitizedUserMessage,
          queryVector,
          fullResponseText,
          citations,
        );
      }

      if (isClientDisconnected) {
        this.logger.debug(`Stream aborted by user ${tenant.userId}: skipping DB persistence.`);
        return;
      }

      const latencyMs = Date.now() - startTime;
      const finalUsage =
        usageMetrics ||
        this.extractUsageSafe(null, dynamicPromptChars, fullResponseText.length);

      // Reconcile excess actual token usage against rolling hourly department budget
      const excessTokens = finalUsage.totalTokens - estimatedPreFlightTokens;
      if (excessTokens > 0) {
        this.checkAndConsumeTokenBudget(
          tenant.organizationId,
          tenant.department || Department.ALL,
          excessTokens,
        );
      }

      const isUnresolved = citations.length === 0 && mcpHandled === null;
      const gapCategory = isUnresolved
        ? this.grounding.classifyGapCategory(lastUserMessage)
        : null;
      const faithfulnessScore = this.evaluateCitationGrounding(fullResponseText, citations);

      // 7. Persist QueryLog with real provider usage_metadata (or full-prompt fallback estimate)
      let queryLogId = `log-${Date.now()}`;
      try {
        const queryLog = await this.prisma.client.queryLog.create({
          data: {
            organizationId: tenant.organizationId,
            userId: tenant.userId,
            conversationId: dto.conversationId || `conv-${tenant.userId}-${Date.now()}`,
            query: lastUserMessage,
            response: fullResponseText,
            modelProvider: activeProvider,
            modelName: activeModelName,
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
            totalTokens: finalUsage.totalTokens,
            latencyMs,
            citations: JSON.parse(JSON.stringify(citations)),
            faithfulnessScore,
            isUnresolved,
            gapCategory,
          },
        });
        queryLogId = queryLog.id;
        this.scheduleBackgroundFaithfulnessJudge(
          tenant.organizationId,
          queryLogId,
          sanitizedUserMessage,
          fullResponseText,
          citations,
        );
      } catch (err) {
        this.logger.debug(`Prisma queryLog.create offline: ${(err as Error).message}`);
      }

      // 8. Persist conversation turn
      let persistentConvId = dto.conversationId;
      if (this.conversationsService) {
        try {
          persistentConvId = await this.conversationsService.saveTurn(
            tenant,
            dto.conversationId,
            lastUserMessage,
            fullResponseText,
            citations,
            queryLogId,
          );
        } catch (err) {
          this.logger.debug(`Failed to persist conversation turn: ${(err as Error).message}`);
        }
      }

      // 9. Emit LLM-extracted follow-ups (falling back to contextual templates) & done event
      const followUps =
        llmFollowUps.length > 0
          ? llmFollowUps
          : this.generateFollowUpSuggestions(sanitizedUserMessage, citations);
      res.write(`data: ${JSON.stringify({ type: 'follow_ups', questions: followUps })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          queryLogId,
          conversationId: persistentConvId,
          latencyMs,
          promptTokens: finalUsage.promptTokens,
          completionTokens: finalUsage.completionTokens,
          totalTokens: finalUsage.totalTokens,
          cacheReadTokens: finalUsage.cacheReadTokens,
          usageSource: finalUsage.source,
          modelProvider: activeProvider,
          modelName: activeModelName,
          mode: plan.mode,
          thinkingLevel: plan.thinkingLevel,
        })}\n\n`,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Unhandled error during SSE streamChat: ${error.message}`, error.stack);
      if (!isClientDisconnected && !res.writableEnded) {
        const safeMsg =
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred while generating the response.'
            : error.message;
        res.write(`data: ${JSON.stringify({ type: 'error', message: safeMsg })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private async streamWithProviderFailover(
    tenant: TenantContext,
    sanitizedQuery: string,
    contextBlocks: string,
    activeMcpTools: McpToolSummary[],
    priorTurns: { role: string; content: string }[],
    userPrompt: string,
    canaryToken: string,
    preferredProvider: string | undefined,
    preferredModel: string | undefined,
    thinkingLevel: 'normal' | 'deep',
    res: Response,
    isAborted: () => boolean,
    clientSignal?: AbortSignal,
  ): Promise<{
    success: boolean;
    text: string;
    followUpQuestions: string[];
    providerUsed: string;
    modelUsed: string;
    usage: TokenUsageMetrics;
  }> {
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    const orderedProviders = this.router.getOrderedFailoverProviders(cleanPreferred);
    const streamTimeoutMs = this.router.DEFAULT_STREAM_TIMEOUT_MS || 30000;

    let lastInputChars = contextBlocks.length + userPrompt.length;

    for (const provider of orderedProviders) {
      const { model, provider: activeProvider, modelName: activeModelName } =
        this.router.resolveChatModel(
          provider,
          provider === cleanPreferred ? preferredModel : undefined,
          { thinkingLevel, timeoutMs: streamTimeoutMs },
        );

      if (!model) continue;

      let rawStreamedText = '';
      let visibleStreamedText = '';
      const followUpFilter = new FollowUpStreamFilter();
      const observedUsage: Record<string, any> = {};

      const timeoutCtx =
        typeof this.router.createTimeoutController === 'function'
          ? this.router.createTimeoutController(streamTimeoutMs, clientSignal)
          : null;

      try {
        const systemMsg = this.promptSecurity.buildCacheableSystemMessage(
          contextBlocks,
          activeMcpTools,
          canaryToken,
          activeProvider,
        );
        const conversationMessages = this.buildConversationMessages(
          systemMsg,
          priorTurns,
          userPrompt,
        );
        lastInputChars = this.estimateMessagesCharLength(conversationMessages);

        const stream = timeoutCtx
          ? await model.stream(conversationMessages, { signal: timeoutCtx.controller.signal })
          : await model.stream(conversationMessages);

        for await (const chunk of stream) {
          if (isAborted() || timeoutCtx?.controller.signal.aborted) {
            if (!isAborted() && timeoutCtx?.controller.signal.aborted) {
              throw new Error(`Provider ${activeProvider} stream timed out after ${streamTimeoutMs}ms`);
            }
            this.logger.debug('Stream generation aborted by client disconnect.');
            break;
          }

          // Accumulate real LangChain usage_metadata emitted across chunks
          const meta = chunk?.usage_metadata;
          if (meta && typeof meta === 'object') {
            if (typeof meta.input_tokens === 'number' && meta.input_tokens > 0) {
              observedUsage.input_tokens = Math.max(
                observedUsage.input_tokens || 0,
                meta.input_tokens,
              );
            }
            if (typeof meta.output_tokens === 'number' && meta.output_tokens > 0) {
              observedUsage.output_tokens = Math.max(
                observedUsage.output_tokens || 0,
                meta.output_tokens,
              );
            }
            if (typeof meta.total_tokens === 'number' && meta.total_tokens > 0) {
              observedUsage.total_tokens = Math.max(
                observedUsage.total_tokens || 0,
                meta.total_tokens,
              );
            }
            if (
              typeof meta.input_token_details?.cache_read === 'number' &&
              meta.input_token_details.cache_read > 0
            ) {
              observedUsage.input_token_details = {
                ...(observedUsage.input_token_details || {}),
                cache_read: Math.max(
                  observedUsage.input_token_details?.cache_read || 0,
                  meta.input_token_details.cache_read,
                ),
              };
            }
          }

          const token = chunk?.content?.toString() || '';
          if (!token) continue;
          rawStreamedText += token;

          if (canaryToken && rawStreamedText.includes(canaryToken)) {
            this.logger.error(
              'Canary alert during streaming: Model emitted canary token! Aborting and redacting.',
            );
            if (this.auditLogService) {
              await this.auditLogService.recordEvent({
                organizationId: tenant.organizationId,
                userId: tenant.userId,
                action: 'PROMPT_LEAK_PREVENTED' as any,
                resource: 'RagAgentService:streamChat',
                details: { query: sanitizedQuery, trigger: 'Canary token stream breach' },
              });
            }
            res.write(
              `data: ${JSON.stringify({
                type: 'token',
                content: '\n\n[Security Notice: Response redacted to protect system integrity]',
              })}\n\n`,
            );
            return {
              success: true,
              text: 'I am your company knowledge assistant. How can I assist you with company documentation today?',
              followUpQuestions: [],
              providerUsed: activeProvider,
              modelUsed: activeModelName,
              usage: this.extractUsageSafe(observedUsage, lastInputChars, rawStreamedText.length),
            };
          }

          const safeVisible = followUpFilter.push(token);
          if (safeVisible) {
            visibleStreamedText += safeVisible;
            res.write(`data: ${JSON.stringify({ type: 'token', content: safeVisible })}\n\n`);
          }
        }

        const { visibleRemainder, followUpQuestions } = followUpFilter.flush();
        if (visibleRemainder && !isAborted()) {
          visibleStreamedText += visibleRemainder;
          res.write(`data: ${JSON.stringify({ type: 'token', content: visibleRemainder })}\n\n`);
        }

        const finalCleanText = visibleStreamedText.trim();
        if (finalCleanText.length > 0 || isAborted()) {
          this.router.recordProviderSuccess?.(activeProvider);
          return {
            success: true,
            text: finalCleanText,
            followUpQuestions,
            providerUsed: activeProvider,
            modelUsed: activeModelName,
            usage: this.extractUsageSafe(observedUsage, lastInputChars, rawStreamedText.length),
          };
        }
        this.router.recordProviderFailure?.(activeProvider, 'Empty streamed response');
      } catch (err: unknown) {
        const error = err as Error;
        if (!isAborted()) {
          this.router.recordProviderFailure?.(activeProvider, error.message);
        }
        this.logger.warn(
          `${activeProvider} streaming error (${error.message}). Trying next provider in failover chain.`,
        );
        if (visibleStreamedText.length > 0) {
          return {
            success: true,
            text: visibleStreamedText.trim(),
            followUpQuestions: [],
            providerUsed: activeProvider,
            modelUsed: activeModelName,
            usage: this.extractUsageSafe(observedUsage, lastInputChars, rawStreamedText.length),
          };
        }
      } finally {
        timeoutCtx?.cleanup();
      }
    }

    return {
      success: false,
      text: '',
      followUpQuestions: [],
      providerUsed: cleanPreferred,
      modelUsed: preferredModel || this.router.getDefaultGeminiModel(),
      usage: this.extractUsageSafe(null, lastInputChars, 0),
    };
  }

  /**
   * Mode-gated native MCP tool calling using LangChain model.bindTools() with schema validation,
   * approval gating, timeout enforcement, and grounded synthesis of actual tool execution results.
   */
  private async executeNativeMcpToolLoop(
    tenant: TenantContext,
    sanitizedQuery: string,
    priorTurns: { role: string; content: string }[],
    activeMcpTools: McpToolSummary[],
    chatModel: any | null,
    canaryToken: string,
    preferredProvider: string | undefined,
    preferredModel: string | undefined,
    thinkingLevel: 'normal' | 'deep',
    res: Response,
    isAborted: () => boolean,
    clientSignal?: AbortSignal,
  ): Promise<{
    text: string;
    followUpQuestions: string[];
    usage?: TokenUsageMetrics;
    providerUsed?: string;
    modelUsed?: string;
  } | null> {
    if (!activeMcpTools.length || !this.mcpClientManager) {
      return null;
    }

    const selection = await this.mcpToolLoop.selectToolForExecution(
      sanitizedQuery,
      activeMcpTools,
      chatModel,
      (systemMsg, userPrompt) => this.buildConversationMessages(systemMsg, priorTurns, userPrompt),
    );
    if (!selection) {
      return null;
    }
    const { tool: matchedTool, args: toolArgs } = selection;

    res.write(
      `data: ${JSON.stringify({
        type: 'tool_start',
        toolName: matchedTool.name,
        serverName: matchedTool.serverId,
        arguments: toolArgs,
      })}\n\n`,
    );

    const isMy = this.isMyanmarQuery(sanitizedQuery);

    if (matchedTool.requireApproval) {
      res.write(
        `data: ${JSON.stringify({
          type: 'tool_approval_required',
          serverId: matchedTool.serverId,
          toolName: matchedTool.name,
          actionId: `action-${Date.now()}`,
          arguments: toolArgs,
          message: `Tool "${matchedTool.name}" requires user authorization before executing mutating operation.`,
        })}\n\n`,
      );
      const approvalText = isMy
        ? `ဤ action သည် \`${matchedTool.name}\` tool ဖြင့် အချက်အလက်များ ပြောင်းလဲစေနိုင်သော state-changing action ဖြစ်သဖြင့် လုပ်ဆောင်ရန် အတည်ပြုချက် လိုအပ်ပါသည်:`
        : `This action requires confirmation before executing mutating tool \`${matchedTool.name}\`:`;
      await this.streamSyntheticResponse(approvalText, res, isAborted);
      return { text: approvalText, followUpQuestions: [] };
    }

    const execResult = await this.mcpClientManager.executeTool({
      serverId: matchedTool.serverId,
      toolName: matchedTool.name,
      arguments: toolArgs,
    });

    res.write(
      `data: ${JSON.stringify({
        type: 'tool_result',
        toolName: matchedTool.name,
        result: execResult.result,
        latencyMs: execResult.latencyMs,
      })}\n\n`,
    );

    // Synthesize grounded natural-language answer strictly from actual execResult.result
    const serializedResult = this.promptSecurity.escapeXmlDelimiters(
      JSON.stringify(execResult.result, null, 2).slice(0, 6000),
    );
    const toolContextBlock = `<tool_output tool="${this.promptSecurity.escapeXmlDelimiters(matchedTool.name)}" server="${this.promptSecurity.escapeXmlDelimiters(matchedTool.serverId)}">\n${serializedResult}\n</tool_output>`;
    const safeUserQuery = this.promptSecurity.escapeXmlDelimiters(sanitizedQuery);
    const synthesisUserPrompt = `<user_query>\n${safeUserQuery}\n</user_query>`;

    // Omit activeMcpTools schemas during final <tool_output> synthesis so Block 1 reuses the warm default cache prefix
    const streamed = await this.streamWithProviderFailover(
      tenant,
      sanitizedQuery,
      toolContextBlock,
      [],
      priorTurns,
      synthesisUserPrompt,
      canaryToken,
      preferredProvider,
      preferredModel,
      thinkingLevel,
      res,
      isAborted,
      clientSignal,
    );

    if (streamed.success && streamed.text.length > 0) {
      return {
        text: streamed.text,
        followUpQuestions: streamed.followUpQuestions,
        usage: streamed.usage,
        providerUsed: streamed.providerUsed,
        modelUsed: streamed.modelUsed,
      };
    }

    // Dynamic offline formatting of actual execResult.result (zero hardcoded fake entities)
    const formattedOffline = this.mcpToolLoop.formatDynamicToolResult(
      matchedTool.name,
      execResult.result,
      isMy,
    );
    await this.streamSyntheticResponse(formattedOffline, res, isAborted);
    return { text: formattedOffline, followUpQuestions: [] };
  }

  /**
   * Non-blocking async LLM-as-a-Judge faithfulness refinement executed after QueryLog creation.
   * Zero SSE latency impact: runs cross-lingual NLI verification on sampled queries (100% on Myanmar synthesis).
   */
  public scheduleBackgroundFaithfulnessJudge(
    organizationId: string,
    queryLogId: string,
    query: string,
    answerText: string,
    citations: DocumentCitation[],
    options?: { forceRun?: boolean; overrideModel?: any | null },
  ): Promise<void> | void {
    if (!options?.forceRun) {
      if (process.env.NODE_ENV === 'test') return;
      if (!citations || citations.length === 0) return;
      if (!queryLogId || queryLogId.startsWith('log-')) return;

      const configuredRate = Number(process.env.FAITHFULNESS_JUDGE_SAMPLE_RATE ?? '0.25');
      if (Number.isNaN(configuredRate) || configuredRate <= 0) return;

      const effectiveRate = this.isMyanmarQuery(query) ? 1.0 : configuredRate;
      if (Math.random() > effectiveRate) return;
    }

    const executeJudge = async () => {
      try {
        const verdict = await this.grounding.evaluateWithLlmJudge(
          query,
          answerText,
          citations,
          options?.overrideModel,
        );
        if (!verdict) return;

        const repo = this.prisma.client.queryLog as any;
        if (typeof repo?.updateMany === 'function') {
          await repo.updateMany({
            where: { id: queryLogId, organizationId },
            data: { faithfulnessScore: verdict.faithfulnessScore },
          });
        } else {
          await repo.update({
            where: { id: queryLogId },
            data: { faithfulnessScore: verdict.faithfulnessScore },
          });
        }
      } catch (err) {
        this.logger.debug(`Background faithfulness judge skipped: ${(err as Error).message}`);
      }
    };

    if (options?.forceRun) {
      return executeJudge();
    }

    setImmediate(() => {
      void executeJudge();
    });
  }

  private async streamSyntheticResponse(
    text: string,
    res: Response,
    isAborted?: () => boolean,
  ): Promise<void> {
    const words = text.split(' ');
    for (const word of words) {
      if (isAborted && isAborted()) break;
      res.write(`data: ${JSON.stringify({ type: 'token', content: word + ' ' })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
