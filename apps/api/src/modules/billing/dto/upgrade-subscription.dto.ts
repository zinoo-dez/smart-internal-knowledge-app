import { IsEnum } from 'class-validator';
import { SubscriptionTier } from '@knowledge/shared';

export class UpgradeSubscriptionDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}
