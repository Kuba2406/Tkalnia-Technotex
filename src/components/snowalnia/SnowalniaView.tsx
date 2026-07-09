'use client';
import DepartmentBatchView from '@/components/ui/DepartmentBatchView';

export default function SnowalniaView() {
  return (
    <DepartmentBatchView
      apiUrl="/api/snowalnia"
      title="Snowalnia"
      description="Partie taśmowe – przygotowanie osnów"
    />
  );
}
