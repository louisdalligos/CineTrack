import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { Providers } from './providers';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'CineTrack',
  description: 'Track what you watch, and what you meant to.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
        {/* FR23 — page views across every screen. No-ops outside Vercel, so
            it is safe to leave enabled in local and Docker runs. */}
        <Analytics />
      </body>
    </html>
  );
}
