import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AssignGapRequest, ResolveGapRequest } from '@knowledge/shared';

export class ResolveGapDto implements ResolveGapRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolutionNote!: string;
}

export class AssignGapDto implements AssignGapRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  assignedTo!: string;
}
