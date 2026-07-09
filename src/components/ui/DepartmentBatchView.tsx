'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { PartiaSnowalni, Artykul, Zlecenie } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import {
  formatDate, statusPartiiLabel, statusPartiiBadge,
} from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

interface Props {
  apiUrl: string;
  title: string;
  description: string;
}

type PartiaForm = {
  numer: string;
  art_id: number;
  metry: number;
  status: string;
  data_planowana: string;
  uwagi: string;
  zlecenie_id: number | null;
};

function today() { return new Date().toISOString().split('T')[0]; }

export default function DepartmentBatchView({ apiUrl, title, description }: Props) {
  const { data: partie = [], isLoading } = useSWR<PartiaSnowalni[]>(apiUrl, fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);
  const { data: zlecenia = [] } = useSWR<Zlecenie[]>('/api/zlecenia', fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const blank: PartiaForm = {
    numer: '',
    art_id: artykuly[0]?.id || 0,
    metry: 1000,
    status: 'w_kolejce',
    data_planowana: today(),
    uwagi: '',
    zlecenie_id: null,
  };

  const [form, setForm] = useState(blank);
  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setEditId(null);
    const num = `${apiUrl.split('/').pop()?.toUpperCase()}-${String(partie.length + 1).padStart(3, '0')}/${new Date().getFullYear()}`;
    setForm({ ...blank, numer: num, art_id: artykuly[0]?.id || 0 });
    setFormOpen(true);
  }

  function openEdit(p: PartiaSnowalni) {
    setEditId(p.id);
    setForm({
      numer: p.numer,
      art_id: p.art_id,
      metry: p.metry,
      status: p.status,
      data_planowana: p.data_planowana,
      uwagi: p.uwagi,
      zlecenie_id: p.zlecenie_id,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.numer.trim()) return alert('Podaj numer partii.');
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`${apiUrl}/${editId}`, form);
      } else {
        await apiPost(apiUrl, form);
      }
      await mutate(apiUrl);
      setFormOpen(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    notifySave('saving');
    try {
      await apiDelete(`${apiUrl}/${deleteId}`);
      await mutate(apiUrl);
      setDeleteId(null);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function changeStatus(id: number, status: string) {
    notifySave('saving');
    try {
      await apiPatch(`${apiUrl}/${id}`, { status });
      await mutate(apiUrl);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  const visible =
    statusFilter === 'all'
      ? partie
      : statusFilter === 'active'
      ? partie.filter(p => p.status !== 'zarchiwizowane')
      : partie.filter(p => p.status === statusFilter);

  return (
    <div>
      <div className="view-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="flex gap-8 items-center flex-wrap">
            <h3>Partie ({visible.length})</h3>
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="active">Aktywne</option>
              <option value="all">Wszystkie</option>
              <option value="w_kolejce">W kolejce</option>
              <option value="w_trakcie">W trakcie</option>
              <option value="gotowe">Gotowe</option>
              <option value="zarchiwizowane">Zarchiwizowane</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Dodaj partię</button>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : visible.length === 0 ? (
          <div className="empty-state">Brak partii.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Artykuł</th>
                  <th>Metry</th>
                  <th>Data planowana</th>
                  <th>Status</th>
                  <th>Zlecenie</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => {
                  const art = artykuly.find(a => a.id === p.art_id);
                  const zlec = zlecenia.find(z => z.id === p.zlecenie_id);
                  return (
                    <tr key={p.id}>
                      <td className="fw-600">{p.numer}</td>
                      <td>{art?.nazwa || '—'}</td>
                      <td>{p.metry.toLocaleString()} m</td>
                      <td>{formatDate(p.data_planowana)}</td>
                      <td>
                        <span className={`badge ${statusPartiiBadge(p.status)}`}>
                          {statusPartiiLabel(p.status)}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{zlec?.numer || '—'}</td>
                      <td>
                        <div className="btn-group">
                          {p.status === 'w_kolejce' && (
                            <button className="btn btn-sm btn-warning" onClick={() => changeStatus(p.id, 'w_trakcie')}>Rozpocznij</button>
                          )}
                          {p.status === 'w_trakcie' && (
                            <button className="btn btn-sm btn-success" onClick={() => changeStatus(p.id, 'gotowe')}>Gotowe</button>
                          )}
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edytuj</button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(p.id)}>Usuń</button>
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
        title={editId ? 'Edytuj partię' : 'Nowa partia'}
        wide
      >
        <div className="grid-2">
          <div className="form-group">
            <label>Numer partii</label>
            <input className="form-control" value={form.numer} onChange={e => setField('numer', e.target.value)} />
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
            <label>Metry</label>
            <input className="form-control" type="number" value={form.metry} onChange={e => setField('metry', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Data planowana</label>
            <input className="form-control" type="date" value={form.data_planowana} onChange={e => setField('data_planowana', e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="w_kolejce">W kolejce</option>
              <option value="w_trakcie">W trakcie</option>
              <option value="gotowe">Gotowe</option>
              <option value="zarchiwizowane">Zarchiwizowane</option>
            </select>
          </div>
          <div className="form-group">
            <label>Zlecenie (opcjonalne)</label>
            <select className="form-control" value={form.zlecenie_id ?? ''} onChange={e => setField('zlecenie_id', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Brak</option>
              {zlecenia.filter(z => z.status !== 'zrealizowane').map(z => (
                <option key={z.id} value={z.id}>{z.numer}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Uwagi</label>
          <input className="form-control" value={form.uwagi} onChange={e => setField('uwagi', e.target.value)} placeholder="opcjonalnie" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Zapisz' : 'Dodaj'}</button>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message="Usunąć tę partię?"
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
