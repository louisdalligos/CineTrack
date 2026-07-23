import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WatchlistStatus } from '@prisma/client';

export class CreateWatchlistItemDto {
  @IsInt()
  @Min(1)
  tmdbId!: number;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  posterPath?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @IsOptional()
  @IsEnum(WatchlistStatus)
  status?: WatchlistStatus;
}
