'use client';

import { Bell, BellOff, Share, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/use-notifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const INTERVALS = [
  { value: '7', label: 'After a week' },
  { value: '14', label: 'After two weeks' },
  { value: '30', label: 'After a month' },
  { value: '60', label: 'After two months' },
];

export function NotificationSettings() {
  const {
    state,
    checking,
    settings,
    subscribe,
    isSubscribing,
    unsubscribe,
    isUnsubscribing,
    updateSettings,
    isUpdatingSettings,
    sendTest,
    isSendingTest,
  } = useNotifications();

  if (checking) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  async function handleEnable() {
    try {
      await subscribe();
      toast.success('Notifications on', {
        description: 'We will remind you about films you have been meaning to watch.',
      });
    } catch (error) {
      toast.error('Could not turn on notifications', {
        description: (error as Error).message,
      });
    }
  }

  async function handleDisable() {
    try {
      await unsubscribe();
      toast.success('Notifications off for this device');
    } catch (error) {
      toast.error('Could not turn off notifications', {
        description: (error as Error).message,
      });
    }
  }

  async function handleTest() {
    try {
      await sendTest();
      toast.success('Test notification sent');
    } catch (error) {
      toast.error('Could not send a test notification', {
        description: (error as Error).message,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminders</CardTitle>
        <CardDescription>Get a nudge about films still sitting in Planned.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {state === 'unsupported' && (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle>This browser cannot receive notifications</AlertTitle>
            <AlertDescription>
              Reminders need a browser that supports web push, such as Chrome, Edge, or Firefox.
            </AlertDescription>
          </Alert>
        )}

        {state === 'unavailable' && (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle>Notifications are not configured</AlertTitle>
            <AlertDescription>
              This deployment has no push keys set, so reminders are switched off. Everything else
              works as usual.
            </AlertDescription>
          </Alert>
        )}

        {state === 'requires-install' && (
          <Alert>
            <Share className="size-4" />
            <AlertTitle>Add CineTrack to your Home Screen first</AlertTitle>
            <AlertDescription>
              On iPhone and iPad, notifications only reach installed apps. Tap the Share button,
              choose Add to Home Screen, then open CineTrack from there and return to this page.
            </AlertDescription>
          </Alert>
        )}

        {state === 'denied' && (
          <Alert variant="destructive">
            <BellOff className="size-4" />
            <AlertTitle>Notifications are blocked</AlertTitle>
            <AlertDescription>
              This site is blocked from sending notifications. Allow them in your browser&apos;s
              site settings, then reload this page.
            </AlertDescription>
          </Alert>
        )}

        {(state === 'inactive' || state === 'active') && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="reminders-toggle" className="text-sm font-medium">
                  Reminders on this device
                </Label>
                <p className="text-sm text-muted-foreground">
                  {state === 'active'
                    ? `Active on ${settings?.subscriptionCount ?? 1} ${
                        (settings?.subscriptionCount ?? 1) === 1 ? 'device' : 'devices'
                      }.`
                    : 'Turning this on will ask for notification permission.'}
                </p>
              </div>
              <Switch
                id="reminders-toggle"
                checked={state === 'active'}
                disabled={isSubscribing || isUnsubscribing}
                onCheckedChange={(checked) => (checked ? handleEnable() : handleDisable())}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reminder-interval">Remind me about a planned film</Label>
              <Select
                value={String(settings?.reminderAfterDays ?? 14)}
                disabled={isUpdatingSettings}
                onValueChange={(value) => updateSettings({ reminderAfterDays: Number(value) })}
              >
                <SelectTrigger id="reminder-interval" className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Counted from when you added it. Each film is only mentioned once per period.
              </p>
            </div>
          </>
        )}
      </CardContent>

      {state === 'active' && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-6">
          <Button variant="outline" onClick={handleTest} disabled={isSendingTest}>
            <Bell className="size-4" />
            {isSendingTest ? 'Sending…' : 'Send a test notification'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Checks delivery without waiting for a scheduled reminder.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
