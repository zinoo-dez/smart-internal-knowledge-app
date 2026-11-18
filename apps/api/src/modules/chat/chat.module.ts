import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { RagAgentService } from './rag-agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ConversationsService } from './conversations.service';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { McpModule } from '../mcp/mcp.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, SearchModule, forwardRef(() => DocumentsModule), McpModule, AuditModule],
  controllers: [ChatController],
  providers: [RagAgentService, AgentToolsService, ConversationsService],
  exports: [RagAgentService, AgentToolsService, ConversationsService],
})
export class ChatModule {}
