import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsConfig } from './notifications.config';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsConfig, SubscriptionsService],
  exports: [NotificationsConfig, SubscriptionsService],
})
export class NotificationsModule {}
