'use client';

import { mutate } from 'swr';
import type { Pracownik } from '@/types/domain';
import { apiPatch } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { stanowiskoLabel } from '@/lib/utils/formatting';

interface Props {
  pracownicy: Pracownik[];
}

export default function TabPlanZmian({ pracownicy }: Props) {
  async function toggle(p: Pracownik, checked: boolean) {
    notifySave('saving');
    try {
      await apiPatch(`/api/pracownicy/${p.id}`, { zmiana: checked ? 2 : 1 });
      await mutate('/api/pracownicy');
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  return (
    <div className="card">
      <div className="section-header">
        <h3>Tygodniowy plan zmian</h3>
        <span className="text-muted text-sm">Przełącznik: Z1 / Z2</span>
      </div>
      {pracownicy.length === 0 ? (
        <div className="empty-state">Brak pracowników.</div>
      ) : pracownicy.map(p => (
        <div key={p.id} className="shift-row">
          <div>
            <div className="shift-name">{p.imie} {p.nazwisko}</div>
            <div className="shift-stanowisko">{stanowiskoLabel(p.stanowisko)}</div>
          </div>
          <div className="shift-toggle-wrap">
            <span className="shift-z1">Z1</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={p.zmiana === 2}
                onChange={e => toggle(p, e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="shift-z2">Z2</span>
          </div>
        </div>
      ))}
    </div>
  );
}
