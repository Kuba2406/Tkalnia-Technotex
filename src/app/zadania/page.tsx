import type { Metadata } from 'next';
import ZadaniaView from '@/components/zadania/ZadaniaView';

export const metadata: Metadata = { title: 'Zadania – Tkalnia Technotex' };

export default function ZadaniaPage() {
  return <ZadaniaView />;
}
