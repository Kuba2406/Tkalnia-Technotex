'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import type { Pracownik, Obecnosc, Nieobecnosc } from '@/types/domain';
import { apiPost, apiPatch } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { formatDate, stanowiskoLabel, statusObecnosciBadge, statusObecnosciLabel } from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';

function today() { return new Date().toISOString().split('T')[0]; }

interface Props {
  pracownicy: Pracownik[];
  obecnosci: Obecnosc[];
  nieobecnosci: Nieobecnosc[];
}

export default function TabObecnosc({ pracownicy, obecnosci, nieobecnosci }: Props) {
  const [date, setDate] = useState(today());
  const [zmiana, setZmiana] = useState<1 | 2>(1);
  const [attOpen, setAttOpen] = useState(false);
  const [attState, setAttState] = useState<Record<number, { status: string; stanowisko: string }>>({});

  const summary1 = obecnosci.filter(o => o.data === date && o.zmiana === 1);
  const summary2 = obecnosci.filter(o => o.data === date && o.zmiana === 2);

  function getPlannedAbsence(pracownikId: number) {
    return nieobecnosci.find(n => n.pracownik_id === pracownikId && n.data_od <= date && n.data_do >= date);
  }

  function openAttendance(zm: 1 | 2) {
    setZmiana(zm);
    const workers = pracownicy.filter(p => p.zmiana === zm);
    const init: Record<number, { status: string; stanowisko: string }> = {};
    workers.forEach(p => {
      const existing = obecnosci.find(o => o.pracownik_id === p.id && o.data === date && o.zmiana === zm);
      const planned = getPlannedAbsence(p.id);
      init[p.id] = {
        status: existing?.status || (planned ? planned.typ : 'obecny'),
        stanowisko: existing?.stanowisko || p.stanowisko,
      };
    });
    setAttState(init);
    setAttOpen(true);
  }

  function setStatus(pracownikId: number, status: string) {
    setAttState(prev => ({ ...prev, [pracownikId]: { ...prev[pracownikId], status } }));
  }

  function setStanowisko(pracownikId: number, stan: string) {
    setAttState(prev => ({ ...prev, [pracownikId]: { ...prev[pracownikId], stanowisko: stan } }));
  }

  async function saveAttendance() {
    const workers = pracownicy.filter(p => p.zmiana === zmiana);
    notifySave('saving');
    try {
      await Promise.all(workers.map(async p => {
        const rec = attState[p.id];
        if (!rec) return;
        const existing = obecnosci.find(o => o.pracownik_id === p.id && o.data === date && o.zmiana === zmiana);
        if (existing) {
          await apiPatch(`/api/obecnosci/${existing.id}`, { status: rec.status, stanowisko: rec.stanowisko });
        } else {
          await apiPost('/api/obecnosci', { pracownik_id: p.id, data: date, zmiana, status: rec.status, stanowisko: rec.stanowisko });
        }
      }));
      await mutate('/api/obecnosci');
      setAttOpen(false);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const workers = pracownicy.filter(p => p.zmiana === zmiana);

  return (
    <div className="card">
      <div className="section-header">
        <h3>Sprawdź obecność</h3>
      </div>
      <div className="flex gap-8 items-center mb-16 flex-wrap">
        <div className="flex gap-6 items-center">
          <label style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data:</label>
          <input
            className="form-control"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => openAttendance(1)}>Sprawdź – Zmiana 1</button>
        <button className="btn btn-warning" onClick={() => openAttendance(2)}>Sprawdź – Zmiana 2</button>
      </div>

      {[{ records: summary1, zm: 1 }, { records: summary2, zm: 2 }].map(({ records, zm }) => {
        if (!records.length) return null;
        return (
          <div key={zm} className="mt-12">
            <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 8 }}>Zmiana {zm}</div>
            {records.map(r => {
              const p = pracownicy.find(x => x.id === r.pracownik_id);
              return (
                <div key={r.id} className="flex gap-8 items-center mb-6 flex-wrap">
                  <span style={{ minWidth: 160, fontWeight: 600 }}>{p ? `${p.imie} ${p.nazwisko}` : '?'}</span>
                  <span className={`badge ${statusObecnosciBadge(r.status)}`}>{statusObecnosciLabel(r.status)}</span>
                  <span className="text-muted text-sm">{stanowiskoLabel(r.stanowisko)}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <Modal open={attOpen} onClose={() => setAttOpen(false)} title={`Obecność – Zmiana ${zmiana} – ${formatDate(date)}`} wide>
        <p className="text-muted text-sm mb-16">{workers.length} pracowników w tej zmianie</p>
        {workers.map(p => {
          const rec = attState[p.id] || { status: 'obecny', stanowisko: p.stanowisko };
          const planned = getPlannedAbsence(p.id);
          const isAuto = planned && !obecnosci.find(o => o.pracownik_id === p.id && o.data === date && o.zmiana === zmiana);
          return (
            <div key={p.id} className="att-row">
              <div className="att-name">{p.imie} {p.nazwisko}</div>
              <div className="att-status-btns">
                {(['obecny', 'nieobecny', 'chory', 'urlop'] as const).map(s => (
                  <button
                    key={s}
                    className={`status-btn${rec.status === s ? ` sel-${s}` : ''}`}
                    onClick={() => setStatus(p.id, s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="att-stanowisko">
                <select
                  className="form-control"
                  style={{ fontSize: '.78rem', padding: '4px 7px' }}
                  value={rec.stanowisko}
                  onChange={e => setStanowisko(p.id, e.target.value)}
                >
                  <option value="tkalnia">Tkalnia</option>
                  <option value="snowalnia">Snowalnia</option>
                  <option value="klejarnia">Klejarnia</option>
                  <option value="przewlekalnia">Przewlekalnia</option>
                </select>
              </div>
              {isAuto && <span className="att-auto-badge">Auto ({planned!.typ})</span>}
            </div>
          );
        })}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setAttOpen(false)}>Zamknij</button>
          <button className="btn btn-primary" onClick={saveAttendance}>Zapisz obecność</button>
        </div>
      </Modal>
    </div>
  );
}
