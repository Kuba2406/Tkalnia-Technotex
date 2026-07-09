import type { Metadata } from 'next';
import PrzewlekalniaView from '@/components/przewlekalnia/PrzewlekalniaView';

export const metadata: Metadata = { title: 'Przewlekalnia – Tkalnia Technotex' };

export default function PrzewlekalniaPage() {
  return <PrzewlekalniaView />;
}
