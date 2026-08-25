'use client';

import type { Krosno } from '@/types/domain';

interface Counts {
  pracuje: number;
  awaria: number;
  zatrzymane: number;
  wiazanie: number;
  brak: number;
}

interface Props {
  krosna: Krosno[];
  onAddClick: () => void;
}

function computeCounts(krosna: Krosno[]): Counts {
  return {
    pracuje:    krosna.filter(k => k.status === 'pracuje').length,
    awaria:     krosna.filter(k => k.status === 'awaria').length,
    zatrzymane: krosna.filter(k => k.status === 'zatrzymane').length,
    wiazanie:   krosna.filter(k => k.status === 'wiazanie').length,
    brak:       krosna.filter(k => k.status === 'brak').length,
  };
}

export default function TkalniaStats({ krosna, onAddClick }: Props) {
  const counts = computeCounts(krosna);

  return (
    <div className="card" style={{ marginBottom: 12, padding: '14px 20px' }}>
      <div className="flex gap-12 flex-wrap" style={{ marginBottom: 12 }}>
        {[
          ['Pracuje',     counts.pracuje,    'var(--success)'],
          ['Awaria',      counts.awaria,     'var(--danger)'],
          ['Zatrzymane',  counts.zatrzymane, 'var(--warning)'],
          ['Wiązanie',    counts.wiazanie,   'var(--info)'],
          ['Brak statusu',counts.brak,       'var(--grey)'],
        ].map(([lbl, val, color]) => (
          <div key={String(lbl)} className="info-item">
            <div className="lbl">{lbl}</div>
            <div className="val" style={{ color: String(color), fontSize: '1.3rem' }}>{val}</div>
          </div>
        ))}
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={onAddClick}>+ Dodaj krosno</button>
      </div>
    </div>
  );
}
