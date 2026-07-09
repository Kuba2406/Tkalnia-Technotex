'use client';
import DepartmentBatchView from '@/components/ui/DepartmentBatchView';

export default function KlejarniaView() {
  return (
    <DepartmentBatchView
      apiUrl="/api/klejarnia"
      title="Klejarnia"
      description="Partie zespołowe – klejenie osnów"
    />
  );
}
