import { IsEnum, IsOptional } from 'class-validator';
import { WatchlistStatus } from '@prisma/client';

export class WatchlistQueryDto {
  @IsOptional()
  @IsEnum(WatchlistStatus)
  status?: WatchlistStatus;
}
