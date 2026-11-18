import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { ExecuteMcpToolRequest } from '@knowledge/shared';

export class ExecuteMcpToolDto implements ExecuteMcpToolRequest {
  @IsString()
  @IsNotEmpty()
  serverId!: string;

  @IsString()
  @IsNotEmpty()
  toolName!: string;

  @IsObject()
  arguments!: Record<string, unknown>;
}
