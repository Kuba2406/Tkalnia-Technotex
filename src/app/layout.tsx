import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Tkalnia Technotex – Plan produkcji',
  description: 'System planowania produkcji dla tkalni',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
