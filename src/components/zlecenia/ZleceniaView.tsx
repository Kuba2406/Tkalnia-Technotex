'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Zlecenie, Artykul, StatusZlecenia, PriorytetZlecenia, PrzekazaneDo } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import Confirm from '@/components/ui/Confirm';
import ZleceniaFormModal from './ZleceniaFormModal';
import ZleceniaRow from './ZleceniaRow';

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
                    <ZleceniaRow
                      key={z.id}
                      zlecenie={z}
                      artykul={art}
                      onEdit={openEdit}
                      onDelete={(id) => setDeleteId(id)}
                      onPrzekazDo={przekazDo}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      <ZleceniaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        editId={editId}
        form={form}
        setField={setField}
        artykuly={artykuly}
      />

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
