'use client';

import useSWR, { mutate } from 'swr';
import type { Osnowa, Artykul } from '@/types/domain';
import { apiPatch } from '@/lib/utils/api';
import { saveHistory } from '@/lib/utils/history';
import { notifySave } from '@/components/ui/SaveStatus';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

export default function PrzewlekalniaView() {
  const { data: osnowy = [], isLoading } = useSWR<Osnowa[]>('/api/osnowy', fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);

  // Osnowy that are relevant for threading dept
  const wPrzewlekalnia = osnowy.filter(o => o.lokalizacja === 'przewlekalnia');
  const wMagazynie = osnowy.filter(o => o.lokalizacja === 'magazyn' && o.status_przew === 'nieprzewleczona');

  async function sendToPrzewekalnia(id: number) {
    notifySave('saving');
    try {
      await apiPatch(`/api/osnowy/${id}`, { lokalizacja: 'przewlekalnia', status_przerobki: 'w_kolejce' });
      const osnowa = osnowy.find(o => o.id === id);
      if (osnowa) {
        await saveHistory({
          encja: 'osnowa',
          encja_id: osnowa.id,
          typ: 'przekazanie_do_przewlekalni',
          opis: `Osnowę ${osnowa.numer} przekazano do przewlekalni.`,
          oddzial: 'przewlekalnia',
          art_id: osnowa.art_id,
          zlecenie_id: osnowa.zlecenie_id,
          osnowa_id: osnowa.id,
        });
      }
      await mutate('/api/osnowy');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function returnToMagazyn(id: number, statusPrzew: 'przewleczona' | 'nieprzewleczona') {
    notifySave('saving');
    try {
      await apiPatch(`/api/osnowy/${id}`, {
        status_przew: statusPrzew,
        lokalizacja: 'magazyn',
        status_przerobki: statusPrzew === 'przewleczona' ? 'przewleczona' : null,
      });
      const osnowa = osnowy.find(o => o.id === id);
      if (osnowa) {
        await saveHistory({
          encja: 'osnowa',
          encja_id: osnowa.id,
          typ: 'powrot_z_przewlekalni',
          opis: `Osnowa ${osnowa.numer} wróciła do magazynu jako ${statusPrzew}.`,
          oddzial: 'przewlekalnia',
          art_id: osnowa.art_id,
          zlecenie_id: osnowa.zlecenie_id,
          osnowa_id: osnowa.id,
        });
      }
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
      const osnowa = osnowy.find(o => o.id === id);
      if (osnowa) {
        await saveHistory({
          encja: 'osnowa',
          encja_id: osnowa.id,
          typ: 'zmiana_statusu_przewlekalni',
          opis: `Status przygotowania osnowy ${osnowa.numer} zmieniono na ${status.replace(/_/g, ' ')}.`,
          oddzial: 'przewlekalnia',
          art_id: osnowa.art_id,
          zlecenie_id: osnowa.zlecenie_id,
          osnowa_id: osnowa.id,
        });
      }
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
                        <div className="btn-group">
                          <button className="btn btn-sm btn-success" onClick={() => returnToMagazyn(o.id, 'przewleczona')}>
                            Zwróć jako przewleczoną
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => returnToMagazyn(o.id, 'nieprzewleczona')}>
                            Zwróć jako nieprzewleczoną
                          </button>
                        </div>
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
