import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DocumentSource, SearchQueryRequest } from '@knowledge/shared';

export class SearchQueryDto implements SearchQueryRequest {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number = 5;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number = 0.0;

  @IsOptional()
  @IsArray()
  @IsEnum(DocumentSource, { each: true })
  sourceFilter?: DocumentSource[];
}
