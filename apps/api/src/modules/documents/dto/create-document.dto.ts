import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Department, DocumentSource, IngestDocumentRequest } from '@knowledge/shared';

export class CreateDocumentDto implements IngestDocumentRequest {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(DocumentSource)
  source!: DocumentSource;

  @IsOptional()
  @IsEnum(Department)
  department?: Department = Department.ALL;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
