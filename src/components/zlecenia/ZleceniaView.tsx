'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Zlecenie, Artykul, StatusZlecenia, PriorytetZlecenia, PrzekazaneDo } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { saveHistory } from '@/lib/utils/history';
import { notifySave } from '@/components/ui/SaveStatus';
import {
  formatDate, statusZleceniaLabel, statusZleceniaBadge,
  priorytetLabel, priorytetBadge,
} from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

function today() { return new Date().toISOString().split('T')[0]; }
function nextMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

export default function ZleceniaView() {
  const { data: zlecenia = [], isLoading } = useSWR<Zlecenie[]>('/api/zlecenia', fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [tab, setTab] = useState<'aktywne' | 'historia'>('aktywne');

  const blank = {
    numer: '',
    art_id: artykuly[0]?.id || 0,
    ilosc_m: 1000,
    ilosc_wykonana_m: 0,
    ilosc_pozostala_m: 1000,
    status: 'nowe' as StatusZlecenia,
    data_utworzenia: today(),
    termin_realizacji: nextMonth(),
    priorytet: 'standard' as PriorytetZlecenia,
    uwagi: '',
    przekazane_do: null as PrzekazaneDo | null,
    split_lengths: [] as number[],
  };

  const [form, setForm] = useState(blank);
  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setEditId(null);
    setForm({ ...blank, numer: `ZP-${String(zlecenia.length + 1).padStart(3, '0')}/${new Date().getFullYear()}` });
    setFormOpen(true);
  }

  function openEdit(z: Zlecenie) {
    setEditId(z.id);
    setForm({
      numer: z.numer,
      art_id: z.art_id,
      ilosc_m: z.ilosc_m,
      ilosc_wykonana_m: z.ilosc_wykonana_m,
      ilosc_pozostala_m: z.ilosc_pozostala_m,
      status: z.status,
      data_utworzenia: z.data_utworzenia,
      termin_realizacji: z.termin_realizacji,
      priorytet: z.priorytet,
      uwagi: z.uwagi,
      przekazane_do: z.przekazane_do,
      split_lengths: z.split_lengths,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.numer.trim()) return alert('Podaj numer zlecenia.');
    if (!form.art_id) return alert('Wybierz artykuł.');
    if (form.ilosc_m <= 0) return alert('Ilość całkowita musi być większa od zera.');
    if (form.ilosc_wykonana_m < 0) return alert('Ilość wykonana nie może być ujemna.');
    const remaining = Math.max(0, form.ilosc_m - form.ilosc_wykonana_m);
    const payload = {
      ...form,
      ilosc_pozostala_m: remaining,
      status: remaining === 0 ? 'zrealizowane' : (form.ilosc_wykonana_m > 0 || form.przekazane_do ? 'w_trakcie' : 'nowe'),
    };
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`/api/zlecenia/${editId}`, payload);
        await saveHistory({
          encja: 'zlecenie',
          encja_id: editId,
          typ: 'edycja_zlecenia',
          opis: `Zaktualizowano zlecenie ${payload.numer}. Ilość całkowita: ${payload.ilosc_m} m, wykonano: ${payload.ilosc_wykonana_m} m, pozostało: ${payload.ilosc_pozostala_m} m.`,
          oddzial: 'zlecenia',
          art_id: payload.art_id,
          zlecenie_id: editId,
        });
      } else {
        const created = await apiPost<Zlecenie>('/api/zlecenia', payload);
        await saveHistory({
          encja: 'zlecenie',
          encja_id: created.id,
          typ: 'utworzenie_zlecenia',
          opis: `Dodano zlecenie ${created.numer} na ${created.ilosc_m} m.`,
          oddzial: 'zlecenia',
          art_id: created.art_id,
          zlecenie_id: created.id,
        });
      }
      await mutate('/api/zlecenia');
      setFormOpen(false);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    notifySave('saving');
    try {
      const deleted = zlecenia.find(z => z.id === deleteId);
      await apiDelete(`/api/zlecenia/${deleteId}`);
      if (deleted) {
        await saveHistory({
          encja: 'zlecenie',
          encja_id: deleted.id,
          typ: 'usuniecie_zlecenia',
          opis: `Usunięto zlecenie ${deleted.numer}.`,
          oddzial: 'zlecenia',
          art_id: deleted.art_id,
          zlecenie_id: deleted.id,
        });
      }
      await mutate('/api/zlecenia');
      setDeleteId(null);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  async function przekazDo(z: Zlecenie, target: 'snowalnia' | 'klejarnia') {
    notifySave('saving');
    try {
      await apiPatch(`/api/zlecenia/${z.id}`, { przekazane_do: target, status: 'w_trakcie' });
      await saveHistory({
        encja: 'zlecenie',
        encja_id: z.id,
        typ: 'przekazanie_zlecenia',
        opis: `Operator przekazał zlecenie ${z.numer} do oddziału ${target === 'snowalnia' ? 'Snowalnia' : 'Klejarnia'}.`,
        oddzial: target,
        art_id: z.art_id,
        zlecenie_id: z.id,
      });
      await mutate('/api/zlecenia');
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const visible = zlecenia.filter(z => tab === 'aktywne' ? z.status !== 'zrealizowane' : z.status === 'zrealizowane');

  return (
    <div>
      <div className="view-header">
        <h2>Zlecenia produkcyjne</h2>
        <p>1 zlecenie = 1 artykuł, z ręcznym rozliczaniem wykonania</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'aktywne' ? ' active' : ''}`} onClick={() => setTab('aktywne')}>
          Aktywne zlecenia
        </button>
        <button className={`tab-btn${tab === 'historia' ? ' active' : ''}`} onClick={() => setTab('historia')}>
          Historia zakończonych
        </button>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>{tab === 'aktywne' ? 'Aktywne zlecenia' : 'Zakończone zlecenia'} ({visible.length})</h3>
          <button className="btn btn-primary" onClick={openAdd}>+ Dodaj zlecenie</button>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : visible.length === 0 ? (
          <div className="empty-state">Brak zleceń.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Artykuł</th>
                  <th>Ilość całkowita</th>
                  <th>Wykonano</th>
                  <th>Pozostało</th>
                  <th>Termin</th>
                  <th>Priorytet</th>
                  <th>Status</th>
                  <th>Oddział</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(z => {
                  const art = artykuly.find(a => a.id === z.art_id);
                  return (
                    <tr key={z.id}>
                      <td className="fw-600">{z.numer}</td>
                      <td>{art?.nazwa || '—'}</td>
                      <td>{z.ilosc_m.toLocaleString()} m</td>
                      <td>{z.ilosc_wykonana_m.toLocaleString()} m</td>
                      <td>{z.ilosc_pozostala_m.toLocaleString()} m</td>
                      <td>{formatDate(z.termin_realizacji)}</td>
                      <td>
                        <span className={`badge ${priorytetBadge(z.priorytet)}`}>
                          {priorytetLabel(z.priorytet)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusZleceniaBadge(z.status)}`}>
                          {statusZleceniaLabel(z.status)}
                        </span>
                      </td>
                      <td>
                        {z.przekazane_do ? (
                          <span className="badge badge-purple">{z.przekazane_do === 'snowalnia' ? 'Snowalnia' : 'Klejarnia'}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(z)}>Edytuj</button>
                          {!z.przekazane_do && z.status !== 'zrealizowane' && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => przekazDo(z, 'snowalnia')}>
                                Przekaż → Snowalnia
                              </button>
                              <button className="btn btn-sm btn-warning" onClick={() => przekazDo(z, 'klejarnia')}>
                                Przekaż → Klejarnia
                              </button>
                            </>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(z.id)}>Usuń</button>
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

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edytuj zlecenie' : 'Nowe zlecenie'}
        wide
      >
        <div className="grid-2">
          <div className="form-group">
            <label>Numer zlecenia</label>
            <input className="form-control" value={form.numer} onChange={e => setField('numer', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Artykuł</label>
            <select className="form-control" value={form.art_id} onChange={e => setField('art_id', parseInt(e.target.value))}>
              {artykuly.map(a => (
                <option key={a.id} value={a.id}>{a.nazwa}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Ilość całkowita (m)</label>
            <input
              className="form-control"
              type="number"
              value={form.ilosc_m}
              onChange={e => {
                const total = parseFloat(e.target.value) || 0;
                setForm(f => ({
                  ...f,
                  ilosc_m: total,
                  ilosc_pozostala_m: Math.max(0, total - f.ilosc_wykonana_m),
                }));
              }}
            />
          </div>
          <div className="form-group">
            <label>Priorytet</label>
            <select className="form-control" value={form.priorytet} onChange={e => setField('priorytet', e.target.value)}>
              <option value="niski">Niski</option>
              <option value="standard">Standard</option>
              <option value="wysoki">Wysoki</option>
              <option value="krytyczny">Krytyczny</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Wykonano (m)</label>
            <input
              className="form-control"
              type="number"
              value={form.ilosc_wykonana_m}
              onChange={e => {
                const completed = parseFloat(e.target.value) || 0;
                setForm(f => ({
                  ...f,
                  ilosc_wykonana_m: completed,
                  ilosc_pozostala_m: Math.max(0, f.ilosc_m - completed),
                }));
              }}
            />
          </div>
          <div className="form-group">
            <label>Pozostało (m)</label>
            <input className="form-control" type="number" value={form.ilosc_pozostala_m} readOnly />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Data utworzenia</label>
            <input className="form-control" type="date" value={form.data_utworzenia} onChange={e => setField('data_utworzenia', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Termin realizacji</label>
            <input className="form-control" type="date" value={form.termin_realizacji} onChange={e => setField('termin_realizacji', e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Status (wyliczany)</label>
            <select
              className="form-control"
              value={form.ilosc_pozostala_m === 0 ? 'zrealizowane' : (form.ilosc_wykonana_m > 0 || form.przekazane_do ? 'w_trakcie' : 'nowe')}
              onChange={e => setField('status', e.target.value)}
              disabled
            >
              <option value="nowe">Nowe</option>
              <option value="w_trakcie">W trakcie</option>
              <option value="zrealizowane">Zrealizowane</option>
            </select>
          </div>
          <div className="form-group">
            <label>Uwagi</label>
            <input className="form-control" value={form.uwagi} onChange={e => setField('uwagi', e.target.value)} placeholder="opcjonalnie" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Zapisz zmiany' : 'Dodaj zlecenie'}</button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Confirm
        open={!!deleteId}
        message={`Usunąć zlecenie "${zlecenia.find(z => z.id === deleteId)?.numer}"?`}
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
