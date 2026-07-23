import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { UpdateNotificationSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { NotificationSettings } from './types';

// Protected by the global JwtAuthGuard, and every handler takes userId from
// the verified token rather than the request body (FR17).
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string): Promise<NotificationSettings> {
    return this.subscriptions.getSettings(userId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    return this.subscriptions.updateSettings(userId, dto);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: SubscribeDto,
  ): Promise<{ id: string }> {
    return this.subscriptions.subscribe(userId, dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(@CurrentUser('userId') userId: string, @Body() dto: UnsubscribeDto): Promise<void> {
    return this.subscriptions.unsubscribe(userId, dto.endpoint);
  }
}
