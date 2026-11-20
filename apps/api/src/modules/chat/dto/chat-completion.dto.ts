import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AIModelProvider, ChatCompletionRequest, ChatMessage } from '@knowledge/shared';

export class ChatMessageDto implements ChatMessage {
  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'assistant', 'system'])
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
  modelName?: string = 'gemini-2.5-flash';

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsIn(['chat', 'tools', 'research'])
  mode?: 'chat' | 'tools' | 'research';

  @IsOptional()
  @IsIn(['normal', 'deep'])
  thinkingLevel?: 'normal' | 'deep';
}
