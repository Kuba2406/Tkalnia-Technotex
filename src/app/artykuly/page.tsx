import type { Metadata } from 'next';
import ArtykulyView from '@/components/artykuly/ArtykulyView';

export const metadata: Metadata = { title: 'Artykuły – Tkalnia Technotex' };

export default function ArtykulyPage() {
  return <ArtykulyView />;
}
