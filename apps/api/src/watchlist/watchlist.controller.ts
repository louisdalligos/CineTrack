import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WatchlistItem } from '@prisma/client';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { UpdateWatchlistItemDto } from './dto/update-watchlist-item.dto';
import { WatchlistQueryDto } from './dto/watchlist-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Every handler takes userId from the verified JWT via @CurrentUser and
// passes it into the service — no route or body ever supplies it (FR17).
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: WatchlistQueryDto,
  ): Promise<WatchlistItem[]> {
    return this.watchlistService.findAll(userId, query.status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWatchlistItemDto,
  ): Promise<WatchlistItem> {
    return this.watchlistService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWatchlistItemDto,
  ): Promise<WatchlistItem> {
    return this.watchlistService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.watchlistService.remove(userId, id);
  }
}
