import type { Metadata } from 'next';
import ObecnosciView from '@/components/obecnosci/ObecnosciView';

export const metadata: Metadata = { title: 'Obecnosci – Tkalnia Technotex' };

export default function ObecnosciPage() {
  return <ObecnosciView />;
}
