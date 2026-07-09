import type { Metadata } from 'next';
import UstawieniaView from '@/components/ustawienia/UstawieniaView';

export const metadata: Metadata = { title: 'Ustawienia – Tkalnia Technotex' };

export default function UstawieniaPage() {
  return <UstawieniaView />;
}
