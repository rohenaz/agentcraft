import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoundForge',
  description: 'Assign sounds to Claude Code lifecycle events',
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
