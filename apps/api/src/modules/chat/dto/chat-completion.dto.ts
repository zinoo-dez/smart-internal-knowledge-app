import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AIModelProvider, ChatCompletionRequest, ChatMessage } from '@knowledge/shared';

export class ChatMessageDto implements ChatMessage {
  @IsString()
  @IsNotEmpty()
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ChatCompletionDto implements ChatCompletionRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsEnum(AIModelProvider)
  modelProvider?: string = AIModelProvider.GEMINI;

  @IsOptional()
  @IsString()
  modelName?: string = 'gemini-1.5-flash';

  @IsOptional()
  @IsString()
  conversationId?: string;
}
