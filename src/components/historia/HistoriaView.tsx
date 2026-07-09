'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { WpisHistorii } from '@/types/domain';
import { formatDate } from '@/lib/utils/formatting';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

const ENCJA_LABELS: Record<string, string> = {
  krosno: 'Krosno',
  osnowa: 'Osnowa',
  zlecenie: 'Zlecenie',
  artykul: 'Artykuł',
  pracownik: 'Pracownik',
};

export default function HistoriaView() {
  const [encjaFilter, setEncjaFilter] = useState('all');
  const [limit, setLimit] = useState(50);

  const url = `/api/historia?limit=${limit}${encjaFilter !== 'all' ? `&encja=${encjaFilter}` : ''}`;
  const { data: historia = [], isLoading } = useSWR<WpisHistorii[]>(url, fetcher);

  return (
    <div>
      <div className="view-header">
        <h2>Historia zmian</h2>
        <p>Dziennik wszystkich kluczowych operacji w systemie</p>
      </div>

      <div className="card">
        <div className="section-header flex-wrap">
          <h3>Ostatnie zdarzenia ({historia.length})</h3>
          <div className="flex gap-8 items-center flex-wrap">
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem' }}
              value={encjaFilter}
              onChange={e => setEncjaFilter(e.target.value)}
            >
              <option value="all">Wszystkie typy</option>
              {Object.entries(ENCJA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem' }}
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value))}
            >
              <option value={25}>25 wpisów</option>
              <option value={50}>50 wpisów</option>
              <option value={100}>100 wpisów</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : historia.length === 0 ? (
          <div className="empty-state">Brak wpisów historii.</div>
        ) : (
          <div className="timeline">
            {historia.map(h => (
              <div key={h.id} className="timeline-item">
                <div className="timeline-date">
                  {formatDate(h.created_at.split('T')[0])}
                  <div style={{ fontSize: '0.68rem', marginTop: 2, color: 'var(--text-muted)' }}>
                    {h.created_at.split('T')[1]?.slice(0, 5)}
                  </div>
                </div>
                <div className="timeline-body">
                  <div className="flex gap-6 items-center mb-4">
                    <span className="badge badge-grey" style={{ textTransform: 'none', fontWeight: 600 }}>
                      {ENCJA_LABELS[h.encja] || h.encja} #{h.encja_id}
                    </span>
                    <span className="timeline-type" style={{ color: 'var(--accent)' }}>
                      {h.typ.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="timeline-opis">{h.opis}</div>
                  <div className="timeline-user">{h.uzytkownik}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
