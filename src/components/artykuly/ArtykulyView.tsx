'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Artykul } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

const BLANK: Omit<Artykul, 'id' | 'created_at' | 'updated_at'> = {
  nazwa: '',
  watki_na_cm: 18,
  rozpinka: 'nie',
  rodzaj_snucia: 'taśmowe',
  szerokosc_tkaniny: null,
  uwagi: '',
};

export default function ArtykulyView() {
  const { data: artykuly = [], isLoading } = useSWR<Artykul[]>('/api/artykuly', fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function openAdd() {
    setEditId(null);
    setForm({ ...BLANK });
    setFormOpen(true);
  }

  function openEdit(a: Artykul) {
    setEditId(a.id);
    setForm({
      nazwa: a.nazwa,
      watki_na_cm: a.watki_na_cm,
      rozpinka: a.rozpinka,
      rodzaj_snucia: a.rodzaj_snucia,
      szerokosc_tkaniny: a.szerokosc_tkaniny,
      uwagi: a.uwagi,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.nazwa.trim()) return alert('Podaj nazwę artykułu.');
    notifySave('saving');
    try {
      if (editId) {
        await apiPatch(`/api/artykuly/${editId}`, form);
      } else {
        await apiPost('/api/artykuly', form);
      }
      await mutate('/api/artykuly');
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
      await apiDelete(`/api/artykuly/${deleteId}`);
      await mutate('/api/artykuly');
      setDeleteId(null);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="view-header">
        <h2>Artykuły</h2>
        <p>Definicje artykułów produkowanych na tkalni</p>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Lista artykułów ({artykuly.length})</h3>
          <button className="btn btn-primary" onClick={openAdd}>+ Dodaj artykuł</button>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : artykuly.length === 0 ? (
          <div className="empty-state">Brak artykułów. Dodaj pierwszy artykuł.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Wątki/cm</th>
                  <th>Rozpinka</th>
                  <th>Rodzaj snucia</th>
                  <th>Szer. tkaniny</th>
                  <th>Uwagi</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {artykuly.map(a => (
                  <tr key={a.id}>
                    <td className="fw-600">{a.nazwa}</td>
                    <td>{a.watki_na_cm}</td>
                    <td>{a.rozpinka === 'tak' ? 'Tak' : 'Nie'}</td>
                    <td>{a.rodzaj_snucia}</td>
                    <td>{a.szerokosc_tkaniny ? `${a.szerokosc_tkaniny} cm` : '—'}</td>
                    <td className="text-muted text-sm">{a.uwagi || '—'}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(a)}>Edytuj</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(a.id)}>Usuń</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edytuj artykuł' : 'Nowy artykuł'}
      >
        <div className="form-group">
          <label>Nazwa artykułu</label>
          <input
            className="form-control"
            value={form.nazwa}
            onChange={e => setField('nazwa', e.target.value)}
            placeholder="np. BT 367"
          />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Wątki na cm</label>
            <input
              className="form-control"
              type="number"
              value={form.watki_na_cm}
              onChange={e => setField('watki_na_cm', parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Rozpinka</label>
            <select
              className="form-control"
              value={form.rozpinka}
              onChange={e => setField('rozpinka', e.target.value)}
            >
              <option value="tak">Tak</option>
              <option value="nie">Nie</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Rodzaj snucia</label>
            <select
              className="form-control"
              value={form.rodzaj_snucia}
              onChange={e => setField('rodzaj_snucia', e.target.value)}
            >
              <option value="taśmowe">Taśmowe → Snowalnia</option>
              <option value="zespołowe">Zespołowe → Klejarnia</option>
            </select>
          </div>
          <div className="form-group">
            <label>Szerokość tkaniny (cm)</label>
            <input
              className="form-control"
              type="number"
              value={form.szerokosc_tkaniny ?? ''}
              onChange={e => setField('szerokosc_tkaniny', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="opcjonalnie"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Uwagi</label>
          <input
            className="form-control"
            value={form.uwagi}
            onChange={e => setField('uwagi', e.target.value)}
            placeholder="opcjonalnie"
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editId ? 'Zapisz zmiany' : 'Dodaj artykuł'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Confirm
        open={!!deleteId}
        message={`Usunąć artykuł "${artykuly.find(a => a.id === deleteId)?.nazwa}"?`}
        detail="Tej operacji nie można cofnąć. Artykuł nie może mieć powiązanych osnów ani zleceń."
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
