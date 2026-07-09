import type { Metadata } from 'next';
import MagazynView from '@/components/magazyn/MagazynView';

export const metadata: Metadata = { title: 'Magazyn – Tkalnia Technotex' };

export default function MagazynPage() {
  return <MagazynView />;
}
