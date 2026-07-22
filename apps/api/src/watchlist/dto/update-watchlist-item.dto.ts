import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WatchlistStatus } from '@prisma/client';

export class UpdateWatchlistItemDto {
  @IsOptional()
  @IsEnum(WatchlistStatus)
  status?: WatchlistStatus;

  // The 1–10 range lives here rather than as a DB check constraint —
  // flagged back in E1-S2 when the schema went in (FR15).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number;
}
