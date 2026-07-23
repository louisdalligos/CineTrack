import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { WatchlistStats } from './types';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser('userId') userId: string): Promise<WatchlistStats> {
    return this.statsService.getStats(userId);
  }
}
