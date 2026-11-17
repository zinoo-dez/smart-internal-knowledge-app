import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EmbeddingService } from './services/embedding.service';
import { IngestionProcessor } from './workers/ingestion.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, EmbeddingService, IngestionProcessor],
  exports: [DocumentsService, EmbeddingService, IngestionProcessor],
})
export class DocumentsModule {}
