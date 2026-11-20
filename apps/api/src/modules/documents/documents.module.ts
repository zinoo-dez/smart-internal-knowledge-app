import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EmbeddingService } from './services/embedding.service';
import { IngestionProcessor } from './workers/ingestion.processor';
import { IngestionQueueService } from './workers/ingestion-queue.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ChatModule } from '../chat/chat.module';
import { SearchModule } from '../search/search.module';
import { ConnectorsController } from './connectors/connectors.controller';
import { SlackEventsController } from './connectors/slack-events.controller';
import { NotionConnector } from './connectors/notion.connector';
import { ConfluenceConnector } from './connectors/confluence.connector';
import { SlackConnector } from './connectors/slack.connector';
import { SlackBotService } from './connectors/slack-bot.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { DataSanitizerService } from './services/data-sanitizer.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    forwardRef(() => ChatModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [DocumentsController, ConnectorsController, SlackEventsController],
  providers: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    IngestionQueueService,
    NotionConnector,
    ConfluenceConnector,
    SlackConnector,
    SlackBotService,
    SyncSchedulerService,
    DataSanitizerService,
  ],
  exports: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    IngestionQueueService,
    NotionConnector,
    ConfluenceConnector,
    SlackConnector,
    SlackBotService,
    SyncSchedulerService,
    DataSanitizerService,
  ],
})
export class DocumentsModule {}
