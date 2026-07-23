import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WatchlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsConfig } from './notifications.config';
import { PushSenderService } from './push-sender.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DueItem {
  id: string;
  tmdbId: number;
  title: string;
  userId: string;
  createdAt: Date;
  lastRemindedAt: Date | null;
  user: { reminderAfterDays: number };
}

export interface ReminderRunResult {
  usersNotified: number;
  itemsReminded: number;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: NotificationsConfig,
    private readonly sender: PushSenderService,
  ) {}

  /**
   * Runs in-process on a single API instance. Scaling to more than one would
   * produce duplicate sends; the fix would be an advisory lock or a dedicated
   * worker, neither of which is warranted at this size.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleScheduledRun(): Promise<void> {
    if (!this.config.isEnabled) return;

    try {
      const result = await this.runReminders(new Date());
      if (result.itemsReminded > 0) {
        this.logger.log(
          `Reminded ${result.usersNotified} user(s) about ${result.itemsReminded} item(s)`,
        );
      }
    } catch (error) {
      // A failed run must not take the process down with it.
      this.logger.error('Reminder run failed', error as Error);
    }
  }

  /**
   * `now` is a parameter rather than read from the clock so the selection
   * rules can be tested at their boundaries without mocking time globally.
   */
  async findDueItems(now: Date): Promise<DueItem[]> {
    const candidates = await this.prisma.watchlistItem.findMany({
      where: {
        status: WatchlistStatus.PLANNED,
        user: {
          remindersEnabled: true,
          // No point selecting a user with nowhere to deliver.
          pushSubscriptions: { some: {} },
        },
      },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        userId: true,
        createdAt: true,
        lastRemindedAt: true,
        user: { select: { reminderAfterDays: true } },
      },
    });

    // The interval is per-user, so the age comparison cannot be expressed as a
    // single fixed cutoff in the query.
    return candidates.filter((item) => this.isDue(item, now));
  }

  private isDue(item: DueItem, now: Date): boolean {
    const threshold = item.user.reminderAfterDays * DAY_MS;

    if (now.getTime() - item.createdAt.getTime() < threshold) {
      return false;
    }

    if (item.lastRemindedAt === null) {
      return true;
    }

    // FR33: having been reminded once, wait out another full interval.
    return now.getTime() - item.lastRemindedAt.getTime() >= threshold;
  }

  async runReminders(now: Date): Promise<ReminderRunResult> {
    const due = await this.findDueItems(now);

    if (due.length === 0) {
      return { usersNotified: 0, itemsReminded: 0 };
    }

    const byUser = new Map<string, DueItem[]>();
    for (const item of due) {
      const existing = byUser.get(item.userId) ?? [];
      existing.push(item);
      byUser.set(item.userId, existing);
    }

    let usersNotified = 0;
    let itemsReminded = 0;

    for (const [userId, items] of byUser) {
      const [first] = items;
      // Cannot happen — the map is only ever populated by pushing — but
      // noUncheckedIndexedAccess makes the guard necessary to prove it.
      if (!first) continue;

      try {
        // One notification per user per run. Sending one per film would turn a
        // neglected watchlist into a wall of notifications.
        await this.sender.sendToUser(userId, this.buildPayload(first, items.length));

        await this.prisma.watchlistItem.updateMany({
          where: { id: { in: items.map((item) => item.id) } },
          data: { lastRemindedAt: now },
        });

        usersNotified += 1;
        itemsReminded += items.length;
      } catch (error) {
        // Leave lastRemindedAt untouched so a failed send is retried tomorrow.
        this.logger.warn(`Could not remind user ${userId}`, error as Error);
      }
    }

    return { usersNotified, itemsReminded };
  }

  private buildPayload(first: DueItem, total: number) {
    const others = total - 1;

    return {
      title: 'Still planning to watch?',
      body:
        others === 0
          ? `${first.title} has been on your watchlist for a while.`
          : `${first.title} and ${others} other${others === 1 ? '' : 's'} have been waiting.`,
      // A single film opens its details page; several open the list.
      url: others === 0 ? `/movies/${first.tmdbId}` : '/watchlist',
      tag: 'cinetrack-reminder',
    };
  }
}
