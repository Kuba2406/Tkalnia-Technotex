import type { Metadata } from 'next';
import TkalniaView from '@/components/tkalnia/TkalniaView';

export const metadata: Metadata = { title: 'Tkalnia – Tkalnia Technotex' };

export default function TkalniaPage() {
  return <TkalniaView />;
}
