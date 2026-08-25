'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import type { Pracownik, Nieobecnosc } from '@/types/domain';
import { apiPost, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { formatDate } from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';

interface Props {
  pracownicy: Pracownik[];
  nieobecnosci: Nieobecnosc[];
}

export default function TabNieobecnosci({ pracownicy, nieobecnosci }: Props) {
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
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ pracownik_id: pracownicy[0]?.id || 0, typ: 'urlop', data_od: '', data_do: '', uwagi: '' });
            setFormOpen(true);
          }}
        >
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
