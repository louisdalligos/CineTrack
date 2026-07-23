import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'CineTrack',
  description: 'Track what you watch, and what you meant to.',
  // Required for iOS: web push is only delivered once the site has been
  // installed to the Home Screen, which needs a manifest and a touch icon.
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CineTrack',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes: it sets the theme
    // class on <html> before React hydrates, which would otherwise mismatch.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <AppShell>{children}</AppShell>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
