import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EmbeddingService } from './services/embedding.service';
import { IngestionProcessor } from './workers/ingestion.processor';
import { AuthModule } from '../auth/auth.module';
import { ConnectorsController } from './connectors/connectors.controller';
import { NotionConnector } from './connectors/notion.connector';
import { SlackConnector } from './connectors/slack.connector';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController, ConnectorsController],
  providers: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    NotionConnector,
    SlackConnector,
  ],
  exports: [
    DocumentsService,
    EmbeddingService,
    IngestionProcessor,
    NotionConnector,
    SlackConnector,
  ],
})
export class DocumentsModule {}
