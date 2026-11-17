import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { DocumentSource, IngestDocumentRequest } from '@knowledge/shared';

export class CreateDocumentDto implements IngestDocumentRequest {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(DocumentSource)
  source!: DocumentSource;

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
