import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Department, DocumentSource, IngestDocumentRequest } from '@knowledge/shared';

export class CreateDocumentDto implements IngestDocumentRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
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
  @MaxLength(2048)
  @Matches(/^https?:\/\/[^\s]+$/i, {
    message: 'sourceUrl must use http:// or https:// protocol (javascript:/data: URIs prohibited)',
  })
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mimeType?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
