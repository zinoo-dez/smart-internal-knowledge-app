import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { RagAgentService } from './rag-agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ConversationsService } from './conversations.service';
import { ModelRouterService } from './services/model-router.service';
import { PromptSecurityService } from './services/prompt-security.service';
import { GroundingEvaluatorService } from './services/grounding-evaluator.service';
import { QueryRewriterService } from './services/query-rewriter.service';
import { McpToolLoopService } from './services/mcp-tool-loop.service';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { McpModule } from '../mcp/mcp.module';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    AuthModule,
    SearchModule,
    forwardRef(() => DocumentsModule),
    McpModule,
    AuditModule,
    BillingModule,
  ],
  controllers: [ChatController],
  providers: [
    ModelRouterService,
    PromptSecurityService,
    GroundingEvaluatorService,
    QueryRewriterService,
    McpToolLoopService,
    RagAgentService,
    AgentToolsService,
    ConversationsService,
  ],
  exports: [
    ModelRouterService,
    PromptSecurityService,
    GroundingEvaluatorService,
    QueryRewriterService,
    McpToolLoopService,
    RagAgentService,
    AgentToolsService,
    ConversationsService,
  ],
})
export class ChatModule {}
