import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  DocumentSummary,
  IngestDocumentResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('api/documents')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async createDocument(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateDocumentDto,
  ): Promise<IngestDocumentResponse> {
    return this.documentsService.createDocument(tenant, dto);
  }

  @Get()
  async listDocuments(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<DocumentSummary[]> {
    return this.documentsService.listDocuments(tenant);
  }

  @Get(':id')
  async getDocument(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<DocumentSummary> {
    return this.documentsService.getDocument(tenant, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteDocument(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.documentsService.deleteDocument(tenant, id);
  }
}
