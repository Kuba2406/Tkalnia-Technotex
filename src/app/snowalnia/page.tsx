import type { Metadata } from 'next';
import SnowalniaView from '@/components/snowalnia/SnowalniaView';

export const metadata: Metadata = { title: 'Snowalnia – Tkalnia Technotex' };

export default function SnowalniaPage() {
  return <SnowalniaView />;
}
