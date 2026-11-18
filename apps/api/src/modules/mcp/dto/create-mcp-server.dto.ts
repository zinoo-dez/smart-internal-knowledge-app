import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { CreateMcpServerRequest, McpTransport } from '@knowledge/shared';

export class CreateMcpServerDto implements CreateMcpServerRequest {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsObject()
  @IsOptional()
  envSecrets?: Record<string, string>;
}
