import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { HybridSearchService } from './hybrid-search.service';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, DocumentsModule],
  controllers: [SearchController],
  providers: [HybridSearchService],
  exports: [HybridSearchService],
})
export class SearchModule {}
