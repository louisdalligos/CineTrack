import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CineTrack',
  description: 'Track what you watch, and what you meant to.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
