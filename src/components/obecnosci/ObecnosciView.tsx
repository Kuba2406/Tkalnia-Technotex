'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Pracownik, Obecnosc, Nieobecnosc, Stanowisko } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { formatDate, stanowiskoLabel, statusObecnosciBadge, statusObecnosciLabel } from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';
import ObecnoscKalendarz from './ObecnoscKalendarz';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

function today() { return new Date().toISOString().split('T')[0]; }

type Tab = 'pracownicy' | 'zmiany' | 'obecnosc' | 'nieobecnosci' | 'kalendarz';

export default function ObecnosciView() {
  const [tab, setTab] = useState<Tab>('pracownicy');
  const { data: pracownicy = [] } = useSWR<Pracownik[]>('/api/pracownicy', fetcher);
  const { data: obecnosci = [] } = useSWR<Obecnosc[]>('/api/obecnosci', fetcher);
  const { data: nieobecnosci = [] } = useSWR<Nieobecnosc[]>('/api/nieobecnosci', fetcher);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'pracownicy',   label: 'Pracownicy' },
    { id: 'zmiany',       label: 'Plan zmian' },
    { id: 'obecnosc',     label: 'Obecność dzienna' },
    { id: 'nieobecnosci', label: 'Nieobecności' },
    { id: 'kalendarz',    label: 'Kalendarz' },
  ];

  return (
    <div>
      <div className="view-header">
        <h2>Obecności</h2>
        <p>Pracownicy, zmiany i codzienne sprawdzanie obecności</p>
      </div>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pracownicy'   && <TabPracownicy pracownicy={pracownicy} nieobecnosci={nieobecnosci} obecnosci={obecnosci} />}
      {tab === 'zmiany'       && <TabPlanZmian pracownicy={pracownicy} />}
      {tab === 'obecnosc'     && <TabObecnosc pracownicy={pracownicy} obecnosci={obecnosci} nieobecnosci={nieobecnosci} />}
      {tab === 'nieobecnosci' && <TabNieobecnosci pracownicy={pracownicy} nieobecnosci={nieobecnosci} />}
      {tab === 'kalendarz'    && <ObecnoscKalendarz pracownicy={pracownicy} nieobecnosci={nieobecnosci} />}
    </div>
  );
}

// ============================================================
// Tab: Pracownicy
// ============================================================
function TabPracownicy({ pracownicy, nieobecnosci, obecnosci }: { pracownicy: Pracownik[], nieobecnosci: Nieobecnosc[], obecnosci: Obecnosc[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const blank = { imie: '', nazwisko: '', stanowisko: 'tkalnia' as Stanowisko, zmiana: 1 as (1 | 2) };
  const [form, setForm] = useState(blank);
  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openEdit(p: Pracownik) {
    setEditId(p.id);
    setForm({ imie: p.imie, nazwisko: p.nazwisko, stanowisko: p.stanowisko, zmiana: p.zmiana });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.imie.trim() || !form.nazwisko.trim()) return alert('Podaj imię i nazwisko.');
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`/api/pracownicy/${editId}`, form);
      } else {
        await apiPost('/api/pracownicy', form);
      }
      await mutate('/api/pracownicy');
      setFormOpen(false);
      notifySave('saved');
    } catch (e: unknown) { notifySave('error'); alert((e as Error).message); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    notifySave('saving');
    try {
      await apiDelete(`/api/pracownicy/${deleteId}`);
      await mutate('/api/pracownicy');
      setDeleteId(null);
      notifySave('saved');
    } catch (e: unknown) { notifySave('error'); alert((e as Error).message); }
  }

  const detailP = pracownicy.find(p => p.id === detailId);

  return (
    <div className="card">
      <div className="section-header">
        <h3>Lista pracowników ({pracownicy.length})</h3>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(blank); setFormOpen(true); }}>+ Dodaj pracownika</button>
      </div>
      <div className="table-wrapper">
        <table className="table table-clickable">
          <thead>
            <tr><th>Imię i nazwisko</th><th>Stanowisko</th><th>Zmiana</th><th>Akcje</th></tr>
          </thead>
          <tbody>
            {pracownicy.map(p => (
              <tr key={p.id} onClick={() => setDetailId(p.id)}>
                <td className="fw-600">{p.imie} {p.nazwisko}</td>
                <td>{stanowiskoLabel(p.stanowisko)}</td>
                <td>Zmiana {p.zmiana}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edytuj</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(p.id)}>Usuń</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edytuj pracownika' : 'Nowy pracownik'}>
        <div className="grid-2">
          <div className="form-group"><label>Imię</label>
            <input className="form-control" value={form.imie} onChange={e => setField('imie', e.target.value)} /></div>
          <div className="form-group"><label>Nazwisko</label>
            <input className="form-control" value={form.nazwisko} onChange={e => setField('nazwisko', e.target.value)} /></div>
        </div>
        <div className="grid-2">
          <div className="form-group"><label>Stanowisko</label>
            <select className="form-control" value={form.stanowisko} onChange={e => setField('stanowisko', e.target.value)}>
              <option value="tkalnia">Tkalnia</option>
              <option value="snowalnia">Snowalnia</option>
              <option value="klejarnia">Klejarnia</option>
              <option value="przewlekalnia">Przewlekalnia</option>
            </select></div>
          <div className="form-group"><label>Zmiana</label>
            <select className="form-control" value={form.zmiana} onChange={e => setField('zmiana', parseInt(e.target.value))}>
              <option value={1}>Zmiana 1</option>
              <option value={2}>Zmiana 2</option>
            </select></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Zapisz' : 'Dodaj'}</button>
        </div>
      </Modal>

      <Confirm open={!!deleteId} message={`Usunąć pracownika?`} confirmLabel="Usuń" confirmClass="btn-danger"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      {/* Detail modal */}
      <Modal open={!!detailP} onClose={() => setDetailId(null)} title={detailP ? `${detailP.imie} ${detailP.nazwisko}` : ''} wide>
        {detailP && <WorkerDetail p={detailP} obecnosci={obecnosci} nieobecnosci={nieobecnosci} />}
      </Modal>
    </div>
  );
}

function WorkerDetail({ p, obecnosci, nieobecnosci }: { p: Pracownik, obecnosci: Obecnosc[], nieobecnosci: Nieobecnosc[] }) {
  const myNieo = nieobecnosci.filter(n => n.pracownik_id === p.id);
  const myObs = obecnosci.filter(o => o.pracownik_id === p.id)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 10);

  return (
    <>
      <div className="info-grid mb-16">
        <div className="info-item"><div className="lbl">Stanowisko</div><div className="val">{stanowiskoLabel(p.stanowisko)}</div></div>
        <div className="info-item"><div className="lbl">Zmiana</div><div className="val">Zmiana {p.zmiana}</div></div>
      </div>
      <div className="detail-section">
        <div className="detail-section-title">Planowane nieobecności</div>
        {myNieo.length === 0 ? (
          <p className="text-muted text-sm">Brak nieobecności.</p>
        ) : myNieo.map(n => (
          <div key={n.id} className="absence-row">
            <span className={`badge ${n.typ === 'urlop' ? 'badge-info' : 'badge-warning'}`}>
              {n.typ === 'urlop' ? 'Urlop' : 'Chory / L4'}
            </span>
            <span className="absence-period">{formatDate(n.data_od)} – {formatDate(n.data_do)}</span>
          </div>
        ))}
      </div>
      <div className="detail-section">
        <div className="detail-section-title">Ostatnie obecności</div>
        {myObs.length === 0 ? (
          <p className="text-muted text-sm">Brak historii obecności.</p>
        ) : (
          <div className="timeline">
            {myObs.map(o => (
              <div key={o.id} className="timeline-item">
                <div className="timeline-date">{formatDate(o.data)}</div>
                <div>
                  <div className="timeline-type">Zmiana {o.zmiana}</div>
                  <div className="timeline-opis">
                    <span className={`badge ${statusObecnosciBadge(o.status)}`}>{statusObecnosciLabel(o.status)}</span>
                    &nbsp;{stanowiskoLabel(o.stanowisko)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// Tab: Plan zmian
// ============================================================
function TabPlanZmian({ pracownicy }: { pracownicy: Pracownik[] }) {
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

// ============================================================
// Tab: Obecność dzienna
// ============================================================
function TabObecnosc({
  pracownicy,
  obecnosci,
  nieobecnosci,
}: {
  pracownicy: Pracownik[];
  obecnosci: Obecnosc[];
  nieobecnosci: Nieobecnosc[];
}) {
  const [date, setDate] = useState(today());
  const [zmiana, setZmiana] = useState<1 | 2>(1);
  const [attOpen, setAttOpen] = useState(false);

  // For the daily attendance modal: local state per worker
  const [attState, setAttState] = useState<Record<number, { status: string; stanowisko: string }>>({});

  // Summary for current date
  const summary1 = obecnosci.filter(o => o.data === date && o.zmiana === 1);
  const summary2 = obecnosci.filter(o => o.data === date && o.zmiana === 2);

  function getPlannedAbsence(pracownikId: number) {
    return nieobecnosci.find(n => n.pracownik_id === pracownikId && n.data_od <= date && n.data_do >= date);
  }

  function openAttendance(zm: 1 | 2) {
    setZmiana(zm);
    // Initialize attState from existing records or planned absences
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

  // FIX for V1 bug: use local React state for immediate UI update
  // instead of manipulating global state which caused display issues
  function setStatus(pracownikId: number, status: string) {
    setAttState(prev => ({
      ...prev,
      [pracownikId]: { ...prev[pracownikId], status },
    }));
  }

  function setStanowisko(pracownikId: number, stan: string) {
    setAttState(prev => ({
      ...prev,
      [pracownikId]: { ...prev[pracownikId], stanowisko: stan },
    }));
  }

  async function saveAttendance() {
    const workers = pracownicy.filter(p => p.zmiana === zmiana);
    notifySave('saving');
    try {
      await Promise.all(workers.map(async p => {
        const rec = attState[p.id];
        if (!rec) return;
        // Check if record exists
        const existing = obecnosci.find(o => o.pracownik_id === p.id && o.data === date && o.zmiana === zmiana);
        if (existing) {
          await apiPatch(`/api/obecnosci/${existing.id}`, { status: rec.status, stanowisko: rec.stanowisko });
        } else {
          await apiPost('/api/obecnosci', {
            pracownik_id: p.id,
            data: date,
            zmiana,
            status: rec.status,
            stanowisko: rec.stanowisko,
          });
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

      {/* Summary */}
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

      {/* Attendance modal */}
      <Modal open={attOpen} onClose={() => setAttOpen(false)} title={`Obecność – Zmiana ${zmiana} – ${formatDate(date)}`} wide>
        <p className="text-muted text-sm mb-16">{workers.length} pracowników w tej zmianie</p>
        {workers.map(p => {
          const rec = attState[p.id] || { status: 'obecny', stanowisko: p.stanowisko };
          const planned = getPlannedAbsence(p.id);
          const isAuto = planned && !obecnosci.find(o => o.pracownik_id === p.id && o.data === date && o.zmiana === zmiana);
          return (
            <div key={p.id} className="att-row">
              <div className="att-name">{p.imie} {p.nazwisko}</div>
              {/* FIX: Controlled React component – no vanilla JS DOM manipulation */}
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

// ============================================================
// Tab: Nieobecności
// ============================================================
function TabNieobecnosci({ pracownicy, nieobecnosci }: { pracownicy: Pracownik[], nieobecnosci: Nieobecnosc[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ pracownik_id: 0, typ: 'urlop', data_od: '', data_do: '', uwagi: '' });
  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.data_od || !form.data_do) return alert('Podaj daty.');
    if (form.data_od > form.data_do) return alert('Data od musi być przed datą do.');
    if (!form.pracownik_id) return alert('Wybierz pracownika.');
    notifySave('saving');
    try {
      await apiPost('/api/nieobecnosci', form);
      await mutate('/api/nieobecnosci');
      setFormOpen(false);
      notifySave('saved');
    } catch (e: unknown) { notifySave('error'); alert((e as Error).message); }
  }

  async function handleDelete(id: number) {
    notifySave('saving');
    try {
      await apiDelete(`/api/nieobecnosci/${id}`);
      await mutate('/api/nieobecnosci');
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  const sorted = [...nieobecnosci].sort((a, b) => b.data_od.localeCompare(a.data_od));

  return (
    <div className="card">
      <div className="section-header">
        <h3>Planowane nieobecności ({nieobecnosci.length})</h3>
        <button className="btn btn-primary" onClick={() => { setForm({ pracownik_id: pracownicy[0]?.id || 0, typ: 'urlop', data_od: '', data_do: '', uwagi: '' }); setFormOpen(true); }}>
          + Dodaj nieobecność
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-state">Brak planowanych nieobecności.</div>
      ) : sorted.map(n => {
        const p = pracownicy.find(x => x.id === n.pracownik_id);
        return (
          <div key={n.id} className="absence-row">
            <div className="absence-name">{p ? `${p.imie} ${p.nazwisko}` : '—'}</div>
            <span className={`badge ${n.typ === 'urlop' ? 'badge-info' : 'badge-warning'}`}>
              {n.typ === 'urlop' ? 'Urlop' : 'Chory / L4'}
            </span>
            <div className="absence-period">{formatDate(n.data_od)} – {formatDate(n.data_do)}</div>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)}>Usuń</button>
          </div>
        );
      })}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Dodaj nieobecność">
        <div className="form-group"><label>Pracownik</label>
          <select className="form-control" value={form.pracownik_id} onChange={e => setField('pracownik_id', parseInt(e.target.value))}>
            {pracownicy.map(p => <option key={p.id} value={p.id}>{p.imie} {p.nazwisko}</option>)}
          </select></div>
        <div className="form-group"><label>Typ</label>
          <select className="form-control" value={form.typ} onChange={e => setField('typ', e.target.value)}>
            <option value="urlop">Urlop</option>
            <option value="chory">Chory / L4</option>
            <option value="inne">Inne</option>
          </select></div>
        <div className="grid-2">
          <div className="form-group"><label>Od</label>
            <input className="form-control" type="date" value={form.data_od} onChange={e => setField('data_od', e.target.value)} /></div>
          <div className="form-group"><label>Do</label>
            <input className="form-control" type="date" value={form.data_do} onChange={e => setField('data_do', e.target.value)} /></div>
        </div>
        <div className="form-group"><label>Uwagi (opcjonalnie)</label>
          <input className="form-control" value={form.uwagi} onChange={e => setField('uwagi', e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>Zapisz</button>
        </div>
      </Modal>
    </div>
  );
}
