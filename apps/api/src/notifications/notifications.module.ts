import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsConfig } from './notifications.config';
import { SubscriptionsService } from './subscriptions.service';
import { PushSenderService } from './push-sender.service';
import { RemindersService } from './reminders.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsConfig, SubscriptionsService, PushSenderService, RemindersService],
  exports: [NotificationsConfig, SubscriptionsService, PushSenderService],
})
export class NotificationsModule {}
