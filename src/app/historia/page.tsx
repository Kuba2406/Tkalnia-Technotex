import type { Metadata } from 'next';
import HistoriaView from '@/components/historia/HistoriaView';

export const metadata: Metadata = { title: 'Historia – Tkalnia Technotex' };

export default function HistoriaPage() {
  return <HistoriaView />;
}
