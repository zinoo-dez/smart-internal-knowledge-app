import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { McpTransport, TestMcpConnectionRequest } from '@knowledge/shared';

export class TestMcpConnectionDto implements TestMcpConnectionRequest {
  @IsEnum(McpTransport)
  transport!: McpTransport;

  @IsString()
  @IsOptional()
  endpointUrl?: string;

  @IsString()
  @IsOptional()
  command?: string;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}
