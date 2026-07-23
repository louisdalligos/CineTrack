import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Mirrors the shape the browser's PushSubscription.toJSON() produces, flattened
 * so the keys arrive at the top level rather than nested under `keys`.
 */
export class SubscribeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  endpoint!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  p256dh!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  auth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
