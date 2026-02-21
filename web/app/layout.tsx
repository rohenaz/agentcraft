import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentCraft',
  description: 'Assign sounds to AI coding agent lifecycle events',
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
