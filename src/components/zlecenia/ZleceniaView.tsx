'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Zlecenie, Artykul, StatusZlecenia, PriorytetZlecenia, PrzekazaneDo } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const blank = {
    numer: '',
    art_id: artykuly[0]?.id || 0,
    ilosc_m: 1000,
    wykonane_m: 0,
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
      wykonane_m: z.wykonane_m,
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
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`/api/zlecenia/${editId}`, form);
      } else {
        await apiPost('/api/zlecenia', form);
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
      await apiDelete(`/api/zlecenia/${deleteId}`);
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
      await mutate('/api/zlecenia');
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const visible = statusFilter === 'all'
    ? zlecenia
    : zlecenia.filter(z => z.status === statusFilter);

  return (
    <div>
      <div className="view-header">
        <h2>Zlecenia produkcyjne</h2>
        <p>Zarządzanie zleceniami produkcji</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="flex gap-8 items-center flex-wrap">
            <h3>Zlecenia ({visible.length})</h3>
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Wszystkie</option>
              <option value="nowe">Nowe</option>
              <option value="w_trakcie">W trakcie</option>
              <option value="zrealizowane">Zrealizowane</option>
            </select>
          </div>
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
                  <th>Ilość</th>
                  <th>Wykonane</th>
                  <th>Pozostało</th>
                  <th>Termin</th>
                  <th>Priorytet</th>
                  <th>Status</th>
                  <th>Przekazane do</th>
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
                      <td>{z.wykonane_m.toLocaleString()} m</td>
                      <td>{z.pozostalo_m.toLocaleString()} m</td>
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
                          {!z.przekazane_do && z.status !== 'zrealizowane' && art && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => przekazDo(z, art.rodzaj_snucia === 'zespołowe' ? 'klejarnia' : 'snowalnia')}
                            >
                              Przekaż → {art.rodzaj_snucia === 'zespołowe' ? 'Klejarnia' : 'Snowalnia'}
                            </button>
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
            <label>Ilość (m)</label>
            <input className="form-control" type="number" value={form.ilosc_m} onChange={e => setField('ilosc_m', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Wykonane (m)</label>
            <input className="form-control" type="number" value={form.wykonane_m} onChange={e => setField('wykonane_m', parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="grid-2">
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
            <label>Status</label>
            <select className="form-control" value={form.status} onChange={e => setField('status', e.target.value)}>
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
