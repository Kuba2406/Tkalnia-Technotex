'use client';

import useSWR, { mutate } from 'swr';
import type { Osnowa, Artykul } from '@/types/domain';
import { apiPatch } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

export default function PrzewekalniView() {
  const { data: osnowy = [], isLoading } = useSWR<Osnowa[]>('/api/osnowy', fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);

  // Osnowy that are relevant for threading dept
  const wPrzewlekalnia = osnowy.filter(o => o.lokalizacja === 'przewlekalnia');
  const wMagazynie = osnowy.filter(o => o.lokalizacja === 'magazyn' && o.status_przew === 'nieprzewleczona');

  async function sendToPrzewekalnia(id: number) {
    notifySave('saving');
    try {
      await apiPatch(`/api/osnowy/${id}`, { lokalizacja: 'przewlekalnia', status_przerobki: 'w_kolejce' });
      await mutate('/api/osnowy');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function markDone(id: number) {
    notifySave('saving');
    try {
      await apiPatch(`/api/osnowy/${id}`, {
        status_przew: 'przewleczona',
        lokalizacja: 'magazyn',
        status_przerobki: 'przewleczona',
      });
      await mutate('/api/osnowy');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function changeStatus(id: number, status: string) {
    notifySave('saving');
    try {
      await apiPatch(`/api/osnowy/${id}`, { status_przerobki: status });
      await mutate('/api/osnowy');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  return (
    <div>
      <div className="view-header">
        <h2>Przewlekalnia</h2>
        <p>Zarządzanie przewlekaniem osnów</p>
      </div>

      {/* Queue in threading dept */}
      <div className="card">
        <div className="section-header">
          <h3>W przewlekalni ({wPrzewlekalnia.length})</h3>
        </div>
        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : wPrzewlekalnia.length === 0 ? (
          <div className="empty-state">Brak osnów w przewlekalni.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Artykuł</th>
                  <th>Metry</th>
                  <th>Status przeróbki</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {wPrzewlekalnia.map(o => {
                  const art = artykuly.find(a => a.id === o.art_id);
                  return (
                    <tr key={o.id}>
                      <td className="fw-600">{o.numer}</td>
                      <td>{art?.nazwa || '—'}</td>
                      <td>{o.metry != null ? `${o.metry} m` : '—'}</td>
                      <td>
                        <select
                          className="form-control"
                          style={{ width: 'auto', fontSize: '0.78rem' }}
                          value={o.status_przerobki || ''}
                          onChange={e => changeStatus(o.id, e.target.value)}
                        >
                          <option value="w_kolejce">W kolejce</option>
                          <option value="w_przygotowaniu">W przygotowaniu</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => markDone(o.id)}
                        >
                          ✓ Przewleczona → Magazyn
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send to threading */}
      <div className="card">
        <div className="section-header">
          <h3>Magazyn – do przewleczenia ({wMagazynie.length})</h3>
          <p className="text-muted text-sm">Nieprzewleczone osnowy w magazynie</p>
        </div>
        {wMagazynie.length === 0 ? (
          <div className="empty-state">Brak nieprzewleczonych osnów w magazynie.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Artykuł</th>
                  <th>Metry</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {wMagazynie.map(o => {
                  const art = artykuly.find(a => a.id === o.art_id);
                  return (
                    <tr key={o.id}>
                      <td className="fw-600">{o.numer}</td>
                      <td>{art?.nazwa || '—'}</td>
                      <td>{o.metry != null ? `${o.metry} m` : '—'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => sendToPrzewekalnia(o.id)}
                        >
                          Wyślij do przewlekalni
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
