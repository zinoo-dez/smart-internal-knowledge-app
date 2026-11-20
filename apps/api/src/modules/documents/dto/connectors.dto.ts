import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ConfluenceSyncRequest,
  Department,
  NotionSyncRequest,
  SlackWebhookPayload,
} from '@knowledge/shared';

export class NotionSyncDto implements NotionSyncRequest {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  databaseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  pageTitle?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}

export class ConfluenceSyncDto implements ConfluenceSyncRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  spaceKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  pageTitle?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}

export class SlackWebhookDto implements SlackWebhookPayload {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  channel?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  user?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}
