import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SearchQueryResponse, TenantContext } from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { HybridSearchService } from './hybrid-search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('api/search')
@UseGuards(ClerkAuthGuard)
export class SearchController {
  constructor(private readonly hybridSearchService: HybridSearchService) {}

  @Post()
  async search(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SearchQueryDto,
  ): Promise<SearchQueryResponse> {
    return this.hybridSearchService.search(tenant, dto);
  }
}
