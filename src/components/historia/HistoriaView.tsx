'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { WpisHistorii, Artykul, Zlecenie, Krosno } from '@/types/domain';
import { formatDate, oddzialLabel } from '@/lib/utils/formatting';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

const ENCJA_LABELS: Record<string, string> = {
  krosno: 'Krosno',
  osnowa: 'Osnowa',
  zlecenie: 'Zlecenie',
  artykul: 'Artykuł',
  pracownik: 'Pracownik',
  partia: 'Partia',
};

export default function HistoriaView() {
  const [encjaFilter, setEncjaFilter] = useState('all');
  const [oddzialFilter, setOddzialFilter] = useState('all');
  const [artFilter, setArtFilter] = useState('');
  const [zlecenieFilter, setZlecenieFilter] = useState('');
  const [krosnoFilter, setKrosnoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(50);

  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);
  const { data: zlecenia = [] } = useSWR<Zlecenie[]>('/api/zlecenia', fetcher);
  const { data: krosna = [] } = useSWR<Krosno[]>('/api/krosna', fetcher);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (encjaFilter !== 'all') params.set('encja', encjaFilter);
    if (oddzialFilter !== 'all') params.set('oddzial', oddzialFilter);
    if (artFilter) params.set('art_id', artFilter);
    if (zlecenieFilter) params.set('zlecenie_id', zlecenieFilter);
    if (krosnoFilter) params.set('krosno_id', krosnoFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return `/api/historia?${params.toString()}`;
  }, [artFilter, dateFrom, dateTo, encjaFilter, krosnoFilter, limit, oddzialFilter, zlecenieFilter]);

  const { data: historia = [], isLoading } = useSWR<WpisHistorii[]>(query, fetcher);

  const sections = useMemo(() => {
    const map = new Map<string, WpisHistorii[]>();
    historia.forEach(entry => {
      const day = entry.created_at.split('T')[0];
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(entry);
    });
    return Array.from(map.entries());
  }, [historia]);

  return (
    <div>
      <div className="view-header">
        <h2>Historia zmian</h2>
        <p>Czytelny dziennik decyzji operatora, korekt i ruchów produkcyjnych</p>
      </div>

      <div className="card">
        <div className="section-header flex-wrap">
          <h3>Filtry historii</h3>
          <div className="flex gap-8 items-center flex-wrap">
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={encjaFilter} onChange={e => setEncjaFilter(e.target.value)}>
              <option value="all">Wszystkie encje</option>
              {Object.entries(ENCJA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={oddzialFilter} onChange={e => setOddzialFilter(e.target.value)}>
              <option value="all">Wszystkie oddziały</option>
              <option value="snowalnia">Snowalnia</option>
              <option value="klejarnia">Klejarnia</option>
              <option value="przewlekalnia">Przewlekalnia</option>
              <option value="magazyn">Magazyn</option>
              <option value="tkalnia">Tkalnia</option>
              <option value="artykuly">Artykuły</option>
              <option value="zlecenia">Zlecenia</option>
            </select>
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={artFilter} onChange={e => setArtFilter(e.target.value)}>
              <option value="">Wszystkie artykuły</option>
              {artykuly.map(a => <option key={a.id} value={a.id}>{a.nazwa}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={zlecenieFilter} onChange={e => setZlecenieFilter(e.target.value)}>
              <option value="">Wszystkie zlecenia</option>
              {zlecenia.map(z => <option key={z.id} value={z.id}>{z.numer}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={krosnoFilter} onChange={e => setKrosnoFilter(e.target.value)}>
              <option value="">Wszystkie krosna</option>
              {krosna.map(k => <option key={k.id} value={k.id}>{k.numer}</option>)}
            </select>
            <input className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem' }} value={limit} onChange={e => setLimit(parseInt(e.target.value, 10))}>
              <option value={25}>25 wpisów</option>
              <option value={50}>50 wpisów</option>
              <option value={100}>100 wpisów</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Ostatnie zdarzenia ({historia.length})</h3>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : historia.length === 0 ? (
          <div className="empty-state">Brak wpisów historii dla wybranych filtrów.</div>
        ) : (
          sections.map(([day, entries]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{formatDate(day)}</div>
              <div className="timeline">
                {entries.map(h => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">
                      {h.created_at.split('T')[1]?.slice(0, 5)}
                    </div>
                    <div className="timeline-body">
                      <div className="flex gap-6 items-center mb-4 flex-wrap">
                        <span className="badge badge-grey" style={{ textTransform: 'none', fontWeight: 600 }}>
                          {ENCJA_LABELS[h.encja] || h.encja} #{h.encja_id}
                        </span>
                        {h.oddzial && (
                          <span className="badge badge-info" style={{ textTransform: 'none' }}>
                            {oddzialLabel(h.oddzial)}
                          </span>
                        )}
                        <span className="timeline-type" style={{ color: 'var(--accent)' }}>
                          {h.typ.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="timeline-opis">{h.opis}</div>
                      <div className="flex gap-8 flex-wrap text-sm text-muted" style={{ marginTop: 6 }}>
                        {h.art_id && <span>Artykuł #{h.art_id}</span>}
                        {h.zlecenie_id && <span>Zlecenie #{h.zlecenie_id}</span>}
                        {h.krosno_id && <span>Krosno #{h.krosno_id}</span>}
                      </div>
                      <div className="timeline-user">{h.uzytkownik}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
