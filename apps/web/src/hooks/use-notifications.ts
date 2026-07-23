'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { isIos, isPushSupported, isStandalone, urlBase64ToUint8Array } from '@/lib/push';
import type { NotificationSettings, NotificationState } from '@/types/notifications';

const SETTINGS_QUERY_KEY = ['notifications', 'settings'] as const;

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);

  const { data: settings } = useQuery<NotificationSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => apiClient<NotificationSettings>('/notifications/settings'),
  });

  // Capability detection has to run after mount: none of these APIs exist
  // during server rendering.
  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      setChecking(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => setSubscribed(false))
      .finally(() => setChecking(false));
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.publicKey) {
        throw new Error('Notifications are not configured on the server.');
      }

      // Must be reached from a user gesture — browsers reject a permission
      // request that is not tied to one.
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      const registration = await getRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(settings.publicKey),
      });

      const json = subscription.toJSON();
      await apiClient('/notifications/subscribe', {
        method: 'POST',
        body: {
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          userAgent: navigator.userAgent,
        },
      });

      setSubscribed(true);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Tell the server first: if the browser unsubscribe succeeded but the
        // request failed, the server would keep pushing to a dead endpoint.
        await apiClient('/notifications/subscribe', {
          method: 'DELETE',
          body: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }

      setSubscribed(false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (input: { remindersEnabled?: boolean; reminderAfterDays?: number }) =>
      apiClient<NotificationSettings>('/notifications/settings', {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (data) => queryClient.setQueryData(SETTINGS_QUERY_KEY, data),
  });

  const sendTestMutation = useMutation({
    mutationFn: () => apiClient('/notifications/test', { method: 'POST' }),
  });

  const state: NotificationState = useCallback((): NotificationState => {
    if (!supported) return 'unsupported';
    if (settings && !settings.available) return 'unavailable';
    if (isIos() && !isStandalone()) return 'requires-install';
    if (permission === 'denied') return 'denied';
    return subscribed ? 'active' : 'inactive';
  }, [supported, settings, permission, subscribed])();

  return {
    state,
    checking,
    settings,
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    subscribeError: subscribeMutation.error as Error | null,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isUnsubscribing: unsubscribeMutation.isPending,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdatingSettings: updateSettingsMutation.isPending,
    sendTest: sendTestMutation.mutateAsync,
    isSendingTest: sendTestMutation.isPending,
    sendTestError: sendTestMutation.error as Error | null,
  };
}
