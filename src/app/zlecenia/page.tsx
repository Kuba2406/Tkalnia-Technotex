import type { Metadata } from 'next';
import ZleceniaView from '@/components/zlecenia/ZleceniaView';

export const metadata: Metadata = { title: 'Zlecenia – Tkalnia Technotex' };

export default function ZleceniaPage() {
  return <ZleceniaView />;
}
