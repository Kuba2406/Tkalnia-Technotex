import type { Metadata } from 'next';
import KlejarniaView from '@/components/klejarnia/KlejarniaView';

export const metadata: Metadata = { title: 'Klejarnia – Tkalnia Technotex' };

export default function KlejarniaPage() {
  return <KlejarniaView />;
}
