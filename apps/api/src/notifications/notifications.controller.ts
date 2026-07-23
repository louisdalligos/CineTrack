import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PushSenderService, type SendResult } from './push-sender.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { UpdateNotificationSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { NotificationSettings } from './types';

// Protected by the global JwtAuthGuard, and every handler takes userId from
// the verified token rather than the request body (FR17).
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly sender: PushSenderService,
  ) {}

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

  /**
   * Sends the caller a notification immediately (FR36). Without this the
   * feature can only be observed by waiting days for the scheduled job, which
   * makes it effectively undemonstrable.
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  sendTest(@CurrentUser('userId') userId: string): Promise<SendResult> {
    return this.sender.sendToUser(userId, {
      title: 'CineTrack',
      body: 'Notifications are working. We will remind you about films you have not got to yet.',
      url: '/watchlist',
      tag: 'cinetrack-test',
    });
  }
}
