import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FeedbackSubmissionRequest, FeedbackType } from '@knowledge/shared';

export class SubmitFeedbackDto implements FeedbackSubmissionRequest {
  @IsString()
  @IsNotEmpty()
  queryLogId!: string;

  @IsEnum(FeedbackType)
  feedbackType!: FeedbackType;

  @IsOptional()
  @IsString()
  comment?: string;
}
