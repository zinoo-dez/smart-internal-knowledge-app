import { Module, forwardRef } from '@nestjs/common';
import { SearchController } from './search.controller';
import { HybridSearchService } from './hybrid-search.service';
import { RerankService } from './rerank.service';
import { SemanticCacheService } from './semantic-cache.service';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, forwardRef(() => DocumentsModule)],
  controllers: [SearchController],
  providers: [HybridSearchService, RerankService, SemanticCacheService],
  exports: [HybridSearchService, RerankService, SemanticCacheService],
})
export class SearchModule {}
