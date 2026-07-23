import { NotificationSettings } from '@/components/NotificationSettings';

export const metadata = {
  title: 'Settings · CineTrack',
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Control how CineTrack reaches you.</p>
      </div>
      <NotificationSettings />
    </main>
  );
}
