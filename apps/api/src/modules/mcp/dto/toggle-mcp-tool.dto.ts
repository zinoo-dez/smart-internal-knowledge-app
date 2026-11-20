import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleMcpToolDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}
