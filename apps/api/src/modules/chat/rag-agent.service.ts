import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  DocumentCitation,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';

@Injectable()
export class RagAgentService {
  private readonly logger = new Logger(RagAgentService.name);
  private geminiChat: ChatGoogleGenerativeAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentToolsService: AgentToolsService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.startsWith('AIzaSy...')) {
      this.geminiChat = new ChatGoogleGenerativeAI({
        model: 'gemini-1.5-flash',
        apiKey,
        temperature: 0.2,
      });
    }
  }

  async streamChat(
    tenant: TenantContext,
    dto: ChatCompletionDto,
    res: Response,
  ): Promise<void> {
    const startTime = Date.now();
    const lastUserMessage = [...dto.messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // 1. Retrieve relevant knowledge base citations
    const citations: DocumentCitation[] = await this.agentToolsService.searchKnowledgeBase(
      tenant,
      lastUserMessage,
      4,
    );

    // Emit citations metadata event early so frontend can render sources preview drawer
    res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);

    let fullResponseText = '';

    // 2. Format Context Prompt
    if (citations.length > 0) {
      const contextBlocks = citations.map(
        (c, idx) => `[Source ${idx + 1}] (${c.documentTitle}):\n${c.snippet}`,
      ).join('\n\n');

      const systemPrompt = `You are the company's Smart Internal Knowledge Assistant.
Answer the employee's inquiry strictly and accurately based on the internal documentation provided below.
Rules:
1. Always cite sources inline using [1], [2], etc., corresponding to [Source 1], [Source 2].
2. If the answer is not contained in the provided documentation, explicitly state: "I could not find information about this in company documentation." and offer to create a support ticket.
3. Keep answers concise, factual, and professional.

Company Documentation Context:
${contextBlocks}`;

      if (this.geminiChat) {
        try {
          const stream = await this.geminiChat.stream([
            new SystemMessage(systemPrompt),
            new HumanMessage(lastUserMessage),
          ]);

          for await (const chunk of stream) {
            const token = chunk.content.toString();
            fullResponseText += token;
            res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
          }
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.warn(`Gemini streaming error: ${error.message}. Using synthetic response generator.`);
          fullResponseText = this.generateSynthesizedAnswer(lastUserMessage, citations);
          await this.streamSyntheticResponse(fullResponseText, res);
        }
      } else {
        fullResponseText = this.generateSynthesizedAnswer(lastUserMessage, citations);
        await this.streamSyntheticResponse(fullResponseText, res);
      }
    } else {
      // No citations found: Low confidence fallback with automatic tool assistance
      const teamContact = await this.agentToolsService.lookupTeamContact(lastUserMessage);
      fullResponseText = `I could not find direct information about "${lastUserMessage}" in your company's indexed documents.\n\n` +
        `For questions regarding this topic, you can contact **${teamContact.name}** (${teamContact.role}) at \`${teamContact.email}\` or Slack \`${teamContact.slackHandle}\`.\n\n` +
        `Would you like me to open an internal support ticket for this inquiry?`;

      await this.streamSyntheticResponse(fullResponseText, res);
    }

    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.ceil(lastUserMessage.length / 4);
    const completionTokens = Math.ceil(fullResponseText.length / 4);

    // 3. Persist turn to QueryLog for observability, analytics & user feedback
    const queryLog = await this.prisma.client.queryLog.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        conversationId: dto.conversationId || `conv-${tenant.userId}-${Date.now()}`,
        query: lastUserMessage,
        response: fullResponseText,
        modelProvider: 'GEMINI',
        modelName: 'gemini-1.5-flash',
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        citations: JSON.parse(JSON.stringify(citations)),
      },
    });

    // 4. Emit done event with queryLogId
    res.write(`data: ${JSON.stringify({ type: 'done', queryLogId: queryLog.id, latencyMs })}\n\n`);
    res.end();
  }

  private generateSynthesizedAnswer(query: string, citations: DocumentCitation[]): string {
    const primary = citations[0];
    return `Based on **${primary.documentTitle}** [1], ${primary.snippet.slice(0, 250)}...\n\n` +
      `For additional details, please refer to the referenced company documentation.`;
  }

  private async streamSyntheticResponse(text: string, res: Response): Promise<void> {
    const words = text.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ type: 'token', content: word + ' ' })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
