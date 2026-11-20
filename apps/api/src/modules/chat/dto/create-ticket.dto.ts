import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateTicketParams, TicketCategory, TicketPriority } from '@knowledge/shared';

export class CreateTicketDto implements CreateTicketParams {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsEnum(TicketPriority)
  priority!: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsEnum(TicketCategory)
  category!: 'IT' | 'HR' | 'OPS';
}
