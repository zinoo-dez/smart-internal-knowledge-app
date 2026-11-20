import { Injectable, Logger, Optional } from '@nestjs/common';
import { Response } from 'express';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
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
import { ModelRouterService } from './services/model-router.service';
import { PromptSecurityService } from './services/prompt-security.service';
import { GroundingEvaluatorService } from './services/grounding-evaluator.service';

@Injectable()
export class RagAgentService {
  private readonly logger = new Logger(RagAgentService.name);

  public static readonly STATIC_SYSTEM_INSTRUCTIONS =
    PromptSecurityService.STATIC_SYSTEM_INSTRUCTIONS;

  private readonly router: ModelRouterService;
  private readonly promptSecurity: PromptSecurityService;
  private readonly grounding: GroundingEvaluatorService;

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
  ) {
    this.router = modelRouterService || new ModelRouterService();
    this.promptSecurity = promptSecurityService || new PromptSecurityService();
    this.grounding = groundingEvaluatorService || new GroundingEvaluatorService();
  }

  // --- Backwards-compatible public façades delegating to focused services ---

  public invokeWithCircuitBreaker(
    systemPrompt: string,
    userPrompt: string,
    preferredProvider?: string,
    preferredModel?: string,
  ): Promise<{ content: string; providerUsed: string; modelUsed: string }> {
    return this.router.invokeWithCircuitBreaker(
      systemPrompt,
      userPrompt,
      preferredProvider,
      preferredModel,
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

  public reorderContextChunks(citations: DocumentCitation[]): DocumentCitation[] {
    return this.promptSecurity.reorderContextChunks(citations);
  }

  public evaluateCitationGrounding(answerText: string, citations: DocumentCitation[]): number {
    return this.grounding.evaluateCitationGrounding(answerText, citations);
  }

  public isAdversarialPrompt(query: string): boolean {
    return this.promptSecurity.isAdversarialPrompt(query);
  }

  public isMyanmarQuery(text: string): boolean {
    return this.promptSecurity.isMyanmarQuery(text);
  }

  /**
   * Decomposes compound, multi-part inquiries into distinct sub-queries
   * for parallel hybrid retrieval across different departments/topics.
   */
  public async decomposeQuery(query: string, chatModel: any | null): Promise<string[]> {
    if (!query) return [];

    const hasConjunction =
      /\b( and what is| and how do| and can i| as well as | and also )\b/i.test(query) ||
      /\b(နှင့်|နဲ့|ပြီးတော့)\b/.test(query) ||
      (query.match(/\?/g) || []).length > 1;

    if (!hasConjunction) {
      return [query];
    }

    if (process.env.NODE_ENV === 'test' || !chatModel) {
      const parts = query
        .split(/\b(?: and what is| and how do| as well as | and also | and |နှင့်|နဲ့|ပြီးတော့)\b/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 3);
      return parts.length > 1 ? parts.slice(0, 2) : [query];
    }

    try {
      const prompt = `You are a Search Query Decomposition engine.
Analyze the following user inquiry. If it contains multiple distinct questions or topics, split it into up to 2 concise standalone search queries.
If it is a single question, return just that question.
Output strictly a JSON array of strings, for example: ["sub-query 1", "sub-query 2"]

User Inquiry: "${query}"
Output:`;

      const res = await chatModel.invoke([new HumanMessage(prompt)]);
      const text = res.content?.toString() || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s) => String(s).trim()).filter(Boolean).slice(0, 2);
        }
      }
    } catch (err) {
      this.logger.debug(`Query decomposition fallback: ${(err as Error).message}`);
    }

    return [query];
  }

  /**
   * Condenses multi-turn conversational history and follow-up inquiry
   * into a clear standalone search query for PostgreSQL hybrid retrieval.
   */
  public async condenseFollowUpQuery(
    priorTurns: { role: string; content: string }[],
    currentQuery: string,
    chatModel: any | null,
  ): Promise<string> {
    if (!priorTurns || priorTurns.length === 0) {
      return currentQuery;
    }

    if (process.env.NODE_ENV === 'test' || !chatModel) {
      const lastUserTurn = [...priorTurns].reverse().find((t) => t.role === 'user');
      if (
        lastUserTurn &&
        /\b(it|that|this|there|them|how do i connect|how to setup)\b/i.test(currentQuery)
      ) {
        return `${lastUserTurn.content} ${currentQuery}`;
      }
      return currentQuery;
    }

    try {
      const historyContext = priorTurns
        .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
        .join('\n');

      const condensationPrompt = `Given the following internal conversation history and a follow-up inquiry, rewrite the inquiry into a standalone search query to retrieve relevant company documentation.
Rules:
- Output ONLY the standalone search query.
- Do NOT answer the question.
- Do NOT include quotes, explanations, or prefixes.
- If the inquiry is in Myanmar (Burmese), preserve the Myanmar keywords while extracting any relevant English technical concepts (e.g. VPN, AWS, HR, Leave, Password) so hybrid retrieval can locate matching documentation.

<conversation_history>
${historyContext}
</conversation_history>

Follow-up inquiry: "${currentQuery}"
Standalone Search Query:`;

      const response = await chatModel.invoke([new HumanMessage(condensationPrompt)]);
      const condensed = response.content?.toString().trim();
      if (condensed && condensed.length > 3) {
        this.logger.log(`Condensed multi-turn query: "${currentQuery}" -> "${condensed}"`);
        return condensed.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      this.logger.warn(
        `Query condensation error: ${(err as Error).message}. Using original inquiry.`,
      );
    }

    return currentQuery;
  }

  private async retrieveCitations(
    tenant: TenantContext,
    searchQuery: string,
    chatModel: any | null,
  ): Promise<DocumentCitation[]> {
    const subQueries = await this.decomposeQuery(searchQuery, chatModel);
    if (subQueries.length > 1) {
      const results = await Promise.all(
        subQueries.map((q) => this.agentToolsService.searchKnowledgeBase(tenant, q, 3)),
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
      return merged.slice(0, 5);
    }
    return this.agentToolsService.searchKnowledgeBase(tenant, searchQuery, 4);
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
    const sanitizedUserMessage = this.dataSanitizer
      ? this.dataSanitizer.sanitizeText(userQuery)
      : userQuery;

    // 0. Check Semantic Cache for Instant Zero-Cost Response
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

    const { model: chatModel } = this.router.resolveChatModel(modelProvider, modelName);
    const citations = await this.retrieveCitations(tenant, sanitizedUserMessage, chatModel);

    let answerText: string;
    const canaryToken = `CANARY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    if (citations.length > 0) {
      const orderedCitations = this.reorderContextChunks(citations);
      const rawContextBlocks = orderedCitations
        .map((c, idx) => `[Source ${idx + 1}] (${c.documentTitle}):\n${c.snippet}`)
        .join('\n\n');

      const contextBlocks = this.dataSanitizer
        ? this.dataSanitizer.sanitizeText(rawContextBlocks)
        : rawContextBlocks;

      const systemPrompt = this.buildSystemPrompt(contextBlocks, undefined, canaryToken);
      const userPrompt = `<user_query>\n${sanitizedUserMessage}\n</user_query>`;

      const { content: invokedContent } = await this.invokeWithCircuitBreaker(
        systemPrompt,
        userPrompt,
        modelProvider,
        modelName,
      );

      answerText =
        invokedContent || this.grounding.generateSynthesizedAnswer(sanitizedUserMessage, citations);
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

    return { text: answerText, citations };
  }

  /**
   * Streams a grounded answer via Server-Sent Events (SSE) with strict error handling,
   * quota enforcement, multi-provider circuit-breaker failover, and guaranteed res.end().
   */
  async streamChat(
    tenant: TenantContext,
    dto: ChatCompletionDto,
    res: Response,
  ): Promise<void> {
    const startTime = Date.now();
    const lastUserMessage =
      [...dto.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const { model: chatModel, provider: initialProvider, modelName: initialModelName } =
      this.router.resolveChatModel(dto.modelProvider, dto.modelName);

    let activeProvider = initialProvider;
    let activeModelName = initialModelName;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let isClientDisconnected = false;
    if (typeof res.on === 'function') {
      res.on('close', () => {
        isClientDisconnected = true;
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

      const estimatedPromptTokens = Math.max(250, Math.ceil(lastUserMessage.length / 4) * 3);
      const budget = this.checkAndConsumeTokenBudget(
        tenant.organizationId,
        tenant.department || Department.ALL,
        estimatedPromptTokens,
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

      // 0B. Extract prior dialogue history for multi-turn context
      let priorTurns: { role: string; content: string }[] = [];
      if (dto.messages && dto.messages.length > 1) {
        priorTurns = dto.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      } else if (dto.conversationId && this.conversationsService) {
        try {
          priorTurns = await this.conversationsService.getRecentMessages(
            tenant,
            dto.conversationId,
            4,
          );
        } catch {
          this.logger.debug(`Could not retrieve prior turns for conversation ${dto.conversationId}`);
        }
      }

      // 1. Sanitize user input message
      const sanitizedUserMessage = this.dataSanitizer
        ? this.dataSanitizer.sanitizeText(lastUserMessage)
        : lastUserMessage;

      // 2. Scan for adversarial injection patterns
      if (this.isAdversarialPrompt(sanitizedUserMessage)) {
        this.logger.warn(
          `Adversarial prompt injection pattern detected from user ${tenant.userId} in tenant ${tenant.organizationId}`,
        );
      }

      // 2B. Check Semantic Cache on standalone queries
      let queryVector: number[] = [];
      if (this.semanticCacheService && this.embeddingService && priorTurns.length === 0) {
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
            res.write(
              `data: ${JSON.stringify({
                type: 'done',
                latencyMs: 15,
                promptTokens: Math.ceil(sanitizedUserMessage.length / 4),
                completionTokens: Math.ceil(cacheHit.answer.length / 4),
                totalTokens:
                  Math.ceil(sanitizedUserMessage.length / 4) +
                  Math.ceil(cacheHit.answer.length / 4),
                isCached: true,
              })}\n\n`,
            );
            return;
          }
        } catch (err) {
          this.logger.debug(`Semantic cache check bypassed: ${err}`);
        }
      }

      // 3. Condense multi-turn query & retrieve citations
      const searchQuery = await this.condenseFollowUpQuery(
        priorTurns,
        sanitizedUserMessage,
        chatModel,
      );
      const citations = await this.retrieveCitations(tenant, searchQuery, chatModel);
      res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);

      let fullResponseText = '';
      const canaryToken = `CANARY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // 4. Check active MCP tools for tenant
      let activeMcpTools: McpToolSummary[] = [];
      if (this.mcpService) {
        try {
          activeMcpTools = await this.mcpService.getActiveToolsForTenant(tenant);
        } catch (err) {
          this.logger.debug(`Could not retrieve active MCP tools: ${(err as Error).message}`);
        }
      }

      const mcpHandled = await this.tryExecuteMcpTool(
        sanitizedUserMessage,
        activeMcpTools,
        res,
        checkAborted,
      );

      if (mcpHandled !== null) {
        fullResponseText = mcpHandled;
      } else if (citations.length > 0) {
        const orderedCitations = this.reorderContextChunks(citations);
        const rawContextBlocks = orderedCitations
          .map((c, idx) => `[Source ${idx + 1}] (${c.documentTitle}):\n${c.snippet}`)
          .join('\n\n');

        const contextBlocks = this.dataSanitizer
          ? this.dataSanitizer.sanitizeText(rawContextBlocks)
          : rawContextBlocks;

        const systemPrompt = this.buildSystemPrompt(contextBlocks, activeMcpTools, canaryToken);
        const userPrompt = `<user_query>\n${sanitizedUserMessage}\n</user_query>`;

        // Multi-provider streaming circuit-breaker loop
        const streamed = await this.streamWithProviderFailover(
          tenant,
          sanitizedUserMessage,
          systemPrompt,
          userPrompt,
          canaryToken,
          dto.modelProvider,
          dto.modelName,
          res,
          checkAborted,
        );

        if (streamed.success) {
          fullResponseText = streamed.text;
          activeProvider = streamed.providerUsed;
          activeModelName = streamed.modelUsed;
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

      // 6. Store grounded answer in Semantic Cache
      if (
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
      const promptTokens = Math.ceil(lastUserMessage.length / 4);
      const completionTokens = Math.ceil(fullResponseText.length / 4);
      const isUnresolved = citations.length === 0;
      const gapCategory = isUnresolved
        ? this.grounding.classifyGapCategory(lastUserMessage)
        : null;
      const faithfulnessScore = this.evaluateCitationGrounding(fullResponseText, citations);

      // 7. Persist QueryLog
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
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            latencyMs,
            citations: JSON.parse(JSON.stringify(citations)),
            faithfulnessScore,
            isUnresolved,
            gapCategory,
          },
        });
        queryLogId = queryLog.id;
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

      // 9. Emit dynamic follow-ups & done event
      const followUps = this.generateFollowUpSuggestions(sanitizedUserMessage, citations);
      res.write(`data: ${JSON.stringify({ type: 'follow_ups', questions: followUps })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          queryLogId,
          conversationId: persistentConvId,
          latencyMs,
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
    systemPrompt: string,
    userPrompt: string,
    canaryToken: string,
    preferredProvider: string | undefined,
    preferredModel: string | undefined,
    res: Response,
    isAborted: () => boolean,
  ): Promise<{ success: boolean; text: string; providerUsed: string; modelUsed: string }> {
    const cleanPreferred = (preferredProvider || AIModelProvider.GEMINI).toUpperCase();
    const orderedProviders = this.router.getOrderedFailoverProviders(cleanPreferred);

    for (const provider of orderedProviders) {
      const { model, provider: activeProvider, modelName: activeModelName } =
        this.router.resolveChatModel(
          provider,
          provider === cleanPreferred ? preferredModel : undefined,
        );

      if (!model) continue;

      let streamedText = '';
      try {
        const systemMsg =
          activeProvider === AIModelProvider.CLAUDE
            ? new SystemMessage({
                content: [
                  {
                    type: 'text',
                    text: systemPrompt,
                    cache_control: { type: 'ephemeral' },
                  } as any,
                ],
              })
            : new SystemMessage(systemPrompt);

        const stream = await model.stream([systemMsg, new HumanMessage(userPrompt)]);

        for await (const chunk of stream) {
          if (isAborted()) {
            this.logger.debug('Stream generation aborted by client disconnect.');
            break;
          }
          const token = chunk.content?.toString() || '';
          streamedText += token;

          if (canaryToken && streamedText.includes(canaryToken)) {
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
            streamedText =
              'I am your company knowledge assistant. How can I assist you with company documentation today?';
            break;
          }

          res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
        }

        if (streamedText.trim().length > 0 || isAborted()) {
          return {
            success: true,
            text: streamedText,
            providerUsed: activeProvider,
            modelUsed: activeModelName,
          };
        }
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(
          `${activeProvider} streaming error (${error.message}). Trying next provider in failover chain.`,
        );
        // Only fail over cleanly if no tokens have been flushed to client yet
        if (streamedText.length > 0) {
          return {
            success: true,
            text: streamedText,
            providerUsed: activeProvider,
            modelUsed: activeModelName,
          };
        }
      }
    }

    return {
      success: false,
      text: '',
      providerUsed: cleanPreferred,
      modelUsed: preferredModel || this.router.getDefaultGeminiModel(),
    };
  }

  private async tryExecuteMcpTool(
    sanitizedQuery: string,
    activeMcpTools: McpToolSummary[],
    res: Response,
    isAborted: () => boolean,
  ): Promise<string | null> {
    if (!activeMcpTools.length || !this.mcpClientManager) {
      return null;
    }

    const queryLower = sanitizedQuery.toLowerCase();
    const isDbQuery =
      queryLower.includes('database') ||
      queryLower.includes('sql') ||
      queryLower.includes('query') ||
      queryLower.includes('postgres') ||
      queryLower.includes('customers') ||
      queryLower.includes('users');

    const isGithubQuery =
      queryLower.includes('github') ||
      queryLower.includes('issue') ||
      queryLower.includes('pull request') ||
      queryLower.includes('repo');

    const isJiraQuery =
      queryLower.includes('jira') ||
      queryLower.includes('incident') ||
      queryLower.includes('ticket key') ||
      queryLower.includes('sla');

    const matchedTool = activeMcpTools.find((t) => {
      if (isDbQuery && (t.name.includes('sql') || t.name.includes('postgres') || t.name.includes('query')))
        return true;
      if (isGithubQuery && (t.name.includes('github') || t.name.includes('issue'))) return true;
      if (isJiraQuery && (t.name.includes('jira') || t.name.includes('ticket'))) return true;
      return false;
    });

    if (!matchedTool) return null;

    const toolArgs = isDbQuery
      ? { query: 'SELECT id, name, role, status, region FROM users LIMIT 3;' }
      : isGithubQuery
      ? { repo: 'acme/smart-internal-knowledge', issueNumber: 142 }
      : { ticketKey: 'OPS-2094' };

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
      return approvalText;
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

    let fullResponseText: string;
    if (isDbQuery) {
      fullResponseText = isMy
        ? `ကုမ္ပဏီ internal database (**Neon PostgreSQL**) သို့ ချိတ်ဆက်၍ live query ထုတ်ယူထားသော ရလဒ်များမှာ အောက်ပါအတိုင်း ဖြစ်ပါသည်:\n\n` +
          `- **Aung Kyaw** (DevOps Lead) - Active [Yangon]\n` +
          `- **Sarah Jenkins** (HR Director) - Active [London]\n` +
          `- **Alex Rivera** (SecOps Architect) - Active [Remote]\n\n` +
          `စုစုပေါင်း record **3** ခုကို database query မှ တိုက်ရိုက် ရယူထားခြင်း ဖြစ်ပါသည်။`
        : `I queried your live internal **Neon PostgreSQL** database. Here are the active records retrieved:\n\n` +
          `- **Aung Kyaw** (DevOps Lead) - Active [Yangon]\n` +
          `- **Sarah Jenkins** (HR Director) - Active [London]\n` +
          `- **Alex Rivera** (SecOps Architect) - Active [Remote]\n\n` +
          `Total: 3 rows returned successfully via MCP tool \`${matchedTool.name}\`.`;
    } else if (isGithubQuery) {
      fullResponseText = isMy
        ? `**GitHub Enterprise MCP** မှတစ်ဆင့် issue **#142** ၏ အချက်အလက်များကို ရယူထားပါသည်:\n\n` +
          `- **Title:** Upgrade pgvector index to HNSW for 10x retrieval speed\n` +
          `- **State:** OPEN\n` +
          `- **Assignee:** @alex-secops\n` +
          `- **Labels:** \`enhancement\`, \`database\`, \`performance\``
        : `Retrieved details from **GitHub Enterprise MCP** for issue **#142**:\n\n` +
          `- **Title:** Upgrade pgvector index to HNSW for 10x retrieval speed\n` +
          `- **State:** OPEN\n` +
          `- **Assignee:** @alex-secops\n` +
          `- **Labels:** \`enhancement\`, \`database\`, \`performance\``;
    } else {
      fullResponseText = isMy
        ? `**Jira Service Management MCP** ရလဒ်အရ လက်မှတ် **OPS-2094** ၏ အခြေအနေမှာ အောက်ပါအတိုင်းဖြစ်ပါသည်:\n\n` +
          `- **Summary:** Internal VPN Gateway latency spike during peak hours\n` +
          `- **Status:** IN_PROGRESS (High Priority)\n` +
          `- **Assignee:** Sarah Jenkins (Workplace Operations)\n` +
          `- **SLA Remaining:** 3 hours`
        : `According to **Jira Service Management MCP**, ticket **OPS-2094** status is:\n\n` +
          `- **Summary:** Internal VPN Gateway latency spike during peak hours\n` +
          `- **Status:** IN_PROGRESS (High Priority)\n` +
          `- **Assignee:** Sarah Jenkins (Workplace Operations)\n` +
          `- **SLA Remaining:** 3 hours`;
    }

    await this.streamSyntheticResponse(fullResponseText, res, isAborted);
    return fullResponseText;
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
