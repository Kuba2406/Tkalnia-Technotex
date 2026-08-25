'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import type { Pracownik, Obecnosc, Nieobecnosc, Stanowisko } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { formatDate, stanowiskoLabel, statusObecnosciBadge, statusObecnosciLabel } from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

interface Props {
  pracownicy: Pracownik[];
  nieobecnosci: Nieobecnosc[];
  obecnosci: Obecnosc[];
}

function WorkerDetail({ p, obecnosci, nieobecnosci }: { p: Pracownik; obecnosci: Obecnosc[]; nieobecnosci: Nieobecnosc[] }) {
  const myNieo = nieobecnosci.filter(n => n.pracownik_id === p.id);
  const myObs = obecnosci
    .filter(o => o.pracownik_id === p.id)
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

export default function TabPracownicy({ pracownicy, nieobecnosci, obecnosci }: Props) {
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

      <Confirm open={!!deleteId} message="Usunąć pracownika?" confirmLabel="Usuń" confirmClass="btn-danger"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      <Modal open={!!detailP} onClose={() => setDetailId(null)} title={detailP ? `${detailP.imie} ${detailP.nazwisko}` : ''} wide>
        {detailP && <WorkerDetail p={detailP} obecnosci={obecnosci} nieobecnosci={nieobecnosci} />}
      </Modal>
    </div>
  );
}
