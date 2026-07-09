'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Zadanie } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import { priorytetZadaniaBadge, priorytetZadaniaLabel } from '@/lib/utils/formatting';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

export default function ZadaniaView() {
  const { data: zadania = [], isLoading } = useSWR<Zadanie[]>('/api/zadania', fetcher);

  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<'niski' | 'sredni' | 'wysoki'>('sredni');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [showDone, setShowDone] = useState(false);

  async function handleAdd() {
    if (!newText.trim()) return;
    notifySave('saving');
    try {
      await apiPost('/api/zadania', { tekst: newText.trim(), priorytet: newPriority, zrobione: false });
      await mutate('/api/zadania');
      setNewText('');
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  async function toggleDone(z: Zadanie) {
    notifySave('saving');
    try {
      await apiPatch(`/api/zadania/${z.id}`, { zrobione: !z.zrobione });
      await mutate('/api/zadania');
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    notifySave('saving');
    try {
      await apiDelete(`/api/zadania/${deleteId}`);
      await mutate('/api/zadania');
      setDeleteId(null);
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  const sorted = [...zadania].sort((a, b) => {
    if (a.zrobione !== b.zrobione) return a.zrobione ? 1 : -1;
    const pri = { wysoki: 0, sredni: 1, niski: 2 };
    return (pri[a.priorytet as keyof typeof pri] || 1) - (pri[b.priorytet as keyof typeof pri] || 1);
  });

  const filtered = sorted.filter(z => {
    if (!showDone && z.zrobione) return false;
    if (filterPriority !== 'all' && z.priorytet !== filterPriority) return false;
    return true;
  });

  const pendingCount = zadania.filter(z => !z.zrobione).length;
  const doneCount = zadania.filter(z => z.zrobione).length;

  return (
    <div>
      <div className="view-header">
        <h2>Zadania</h2>
        <p>Notatki i rzeczy do zrobienia</p>
      </div>

      {/* Stats */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 12 }}>
        <div className="flex gap-12 items-center">
          <div className="info-item">
            <div className="lbl">Do zrobienia</div>
            <div className="val" style={{ color: 'var(--info)' }}>{pendingCount}</div>
          </div>
          <div className="info-item">
            <div className="lbl">Zrobione</div>
            <div className="val" style={{ color: 'var(--success)' }}>{doneCount}</div>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className="card">
        <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 12 }}>Nowe zadanie</h3>
        <div className="flex gap-8 items-center flex-wrap">
          <input
            className="form-control"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Treść zadania…"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as 'niski' | 'sredni' | 'wysoki')}
          >
            <option value="niski">Niski priorytet</option>
            <option value="sredni">Średni priorytet</option>
            <option value="wysoki">Wysoki priorytet</option>
          </select>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!newText.trim()}>
            + Dodaj
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="flex gap-8 items-center flex-wrap">
          <select
            className="form-control"
            style={{ width: 'auto', fontSize: '0.82rem' }}
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="all">Wszystkie priorytety</option>
            <option value="wysoki">Wysoki</option>
            <option value="sredni">Średni</option>
            <option value="niski">Niski</option>
          </select>
          <label className="flex items-center gap-6" style={{ cursor: 'pointer', fontSize: '0.82rem' }}>
            <input
              type="checkbox"
              checked={showDone}
              onChange={e => setShowDone(e.target.checked)}
            />
            Pokaż ukończone
          </label>
        </div>
      </div>

      {/* Task list */}
      <div className="card">
        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {zadania.length === 0
              ? 'Brak zadań. Dodaj pierwsze zadanie powyżej.'
              : 'Brak zadań spełniających kryteria filtrowania.'}
          </div>
        ) : (
          filtered.map(z => (
            <div key={z.id} className={`task-card${z.zrobione ? ' done' : ''}`}>
              {/* Checkbox */}
              <button
                className={`task-checkbox${z.zrobione ? ' checked' : ''}`}
                onClick={() => toggleDone(z)}
                aria-label={z.zrobione ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
              />
              {/* Text */}
              <div className="task-text">{z.tekst}</div>
              {/* Priority badge */}
              <span className={`badge ${priorytetZadaniaBadge(z.priorytet)}`}>
                {priorytetZadaniaLabel(z.priorytet)}
              </span>
              {/* Delete */}
              <button
                className="btn-icon"
                onClick={() => setDeleteId(z.id)}
                aria-label="Usuń zadanie"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <Confirm
        open={!!deleteId}
        message="Usunąć to zadanie?"
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
