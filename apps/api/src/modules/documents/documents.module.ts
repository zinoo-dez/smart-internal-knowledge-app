import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EmbeddingService } from './services/embedding.service';
import { IngestionProcessor } from './workers/ingestion.processor';
import { AuthModule } from '../auth/auth.module';
import { ConnectorsController } from './connectors/connectors.controller';
import { NotionConnector } from './connectors/notion.connector';
import { SlackConnector } from './connectors/slack.connector';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { DataSanitizerService } from './services/data-sanitizer.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController, ConnectorsController],
  providers: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    NotionConnector,
    SlackConnector,
    SyncSchedulerService,
    DataSanitizerService,
  ],
  exports: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    NotionConnector,
    SlackConnector,
    SyncSchedulerService,
    DataSanitizerService,
  ],
})
export class DocumentsModule {}
