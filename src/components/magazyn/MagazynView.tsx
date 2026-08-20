'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Osnowa, Artykul, Krosno, StatusPrzew, LokalizacjaOsnowy } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

const LOK_LABELS: Record<string, string> = {
  magazyn: 'Magazyn',
  przewlekalnia: 'Przewlekalnia',
  krosno: 'Krosno',
  snowalnia: 'Snowalnia',
  klejarnia: 'Klejarnia',
};

const LOK_BADGE: Record<string, string> = {
  magazyn: 'badge-grey',
  przewlekalnia: 'badge-warning',
  krosno: 'badge-success',
  snowalnia: 'badge-info',
  klejarnia: 'badge-purple',
};

const BLANK = {
  numer: '',
  art_id: 0,
  metry: null as number | null,
  liczba_osn: null as number | null,
  status_przew: 'nieprzewleczona' as StatusPrzew,
  lokalizacja: 'magazyn' as LokalizacjaOsnowy,
  status_przerobki: null as string | null,
  zlecenie_id: null as number | null,
};

export default function MagazynView() {
  const { data: osnowy = [], isLoading } = useSWR<Osnowa[]>('/api/osnowy', fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);
  const { data: krosna = [] } = useSWR<Krosno[]>('/api/krosna', fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [lokFilter, setLokFilter] = useState('all');
  const [form, setForm] = useState({ ...BLANK });

  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setEditId(null);
    setForm({ ...BLANK, art_id: artykuly[0]?.id || 0 });
    setFormOpen(true);
  }

  function openEdit(o: Osnowa) {
    setEditId(o.id);
    setForm({
      numer: o.numer,
      art_id: o.art_id,
      metry: o.metry,
      liczba_osn: o.liczba_osn,
      status_przew: o.status_przew,
      lokalizacja: o.lokalizacja,
      status_przerobki: o.status_przerobki,
      zlecenie_id: o.zlecenie_id,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.numer.trim()) return alert('Podaj numer osnowy.');
    if (!form.art_id) return alert('Wybierz artykuł.');
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`/api/osnowy/${editId}`, form);
      } else {
        await apiPost('/api/osnowy', form);
      }
      await mutate('/api/osnowy');
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
      await apiDelete(`/api/osnowy/${deleteId}`);
      await mutate('/api/osnowy');
      setDeleteId(null);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const visible = lokFilter === 'all' ? osnowy : osnowy.filter(o => o.lokalizacja === lokFilter);

  return (
    <div>
      <div className="view-header">
        <h2>Magazyn osnów</h2>
        <p>Stan i lokalizacja osnów w zakładzie</p>
      </div>

      {/* Stats bar */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="flex gap-12 flex-wrap">
          {Object.entries(LOK_LABELS).map(([lok, lbl]) => {
            const count = osnowy.filter(o => o.lokalizacja === lok).length;
            return (
              <div key={lok} className="info-item">
                <div className="lbl">{lbl}</div>
                <div className="val" style={{ fontSize: '1.2rem' }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="flex gap-8 items-center flex-wrap">
            <h3>Osnowy ({visible.length})</h3>
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem' }}
              value={lokFilter}
              onChange={e => setLokFilter(e.target.value)}
            >
              <option value="all">Wszystkie lokalizacje</option>
              {Object.entries(LOK_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Dodaj osnowę</button>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : visible.length === 0 ? (
          <div className="empty-state">Brak osnów.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Artykuł</th>
                  <th>Metry</th>
                  <th>Liczba osnów</th>
                  <th>Przewleczenie</th>
                  <th>Lokalizacja</th>
                  <th>Krosno</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(o => {
                  const art = artykuly.find(a => a.id === o.art_id);
                  const krosno = krosna.find(k => k.id === o.krosno_id);
                  return (
                    <tr key={o.id}>
                      <td className="fw-600">{o.numer}</td>
                      <td>{art?.nazwa || '—'}</td>
                      <td>{o.metry != null ? `${o.metry} m` : '—'}</td>
                      <td>{o.liczba_osn ?? '—'}</td>
                      <td>
                        <span className={`badge ${o.status_przew === 'przewleczona' ? 'badge-success' : 'badge-grey'}`}>
                          {o.status_przew === 'przewleczona' ? 'Przewleczona' : 'Nieprzewleczona'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${LOK_BADGE[o.lokalizacja] || 'badge-grey'}`}>
                          {LOK_LABELS[o.lokalizacja] || o.lokalizacja}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{krosno?.numer || '—'}</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(o)}>Edytuj</button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(o.id)}>Usuń</button>
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
        title={editId ? 'Edytuj osnowę' : 'Nowa osnowa'}
        wide
      >
        <div className="grid-2">
          <div className="form-group">
            <label>Numer osnowy</label>
            <input className="form-control" value={form.numer} onChange={e => setField('numer', e.target.value)} placeholder="np. O-001" />
          </div>
          <div className="form-group">
            <label>Artykuł</label>
            <select className="form-control" value={form.art_id} onChange={e => setField('art_id', parseInt(e.target.value))}>
              {artykuly.map(a => <option key={a.id} value={a.id}>{a.nazwa}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Metry (opcjonalnie)</label>
            <input
              className="form-control"
              type="number"
              value={form.metry ?? ''}
              onChange={e => setField('metry', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div className="form-group">
            <label>Liczba osnów (opcjonalnie)</label>
            <input
              className="form-control"
              type="number"
              value={form.liczba_osn ?? ''}
              onChange={e => setField('liczba_osn', e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Przewleczenie</label>
            <select className="form-control" value={form.status_przew} onChange={e => setField('status_przew', e.target.value)}>
              <option value="nieprzewleczona">Nieprzewleczona</option>
              <option value="przewleczona">Przewleczona</option>
            </select>
          </div>
          <div className="form-group">
            <label>Lokalizacja</label>
            <select className="form-control" value={form.lokalizacja} onChange={e => setField('lokalizacja', e.target.value)}>
              {Object.entries(LOK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Status przeróbki</label>
          <select className="form-control" value={form.status_przerobki || ''} onChange={e => setField('status_przerobki', e.target.value || null)}>
            <option value="">Brak</option>
            <option value="w_kolejce">W kolejce</option>
            <option value="w_przygotowaniu">W przygotowaniu</option>
            <option value="przewleczona">Przewleczona</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Zapisz' : 'Dodaj'}</button>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message="Usunąć tę osnowę?"
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
