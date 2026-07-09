'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { Krosno, TypKrosna, RzadKrosien } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import {
  statusKrosnaLabel, statusKrosnaLamp, loomWidth,
} from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';
import LoomDetail from './LoomDetail';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

export default function TkalniaView() {
  const { data: krosna = [], isLoading } = useSWR<Krosno[]>('/api/krosna', fetcher);
  const { data: typy = [] } = useSWR<TypKrosna[]>('/api/typy-krosien', fetcher);
  const { data: rzedy = [] } = useSWR<RzadKrosien[]>('/api/rzedy-krosien', fetcher);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const blank = {
    numer: '',
    typ_id: typy[0]?.id || null,
    rodzaj: 'pneumatyk' as const,
    szerokosc_cm: 170,
    status: 'brak' as const,
    rzad_id: rzedy[0]?.id || null,
    pozycja: 0,
  };

  const [addForm, setAddForm] = useState(blank);
  const setAF = (k: string, v: unknown) => setAddForm(f => ({ ...f, [k]: v }));

  // Group looms by row
  const sorted = [...krosna].sort((a, b) => {
    const ra = a.rzad_id ?? 0;
    const rb = b.rzad_id ?? 0;
    if (ra !== rb) return ra - rb;
    return a.pozycja - b.pozycja;
  });

  const rowMap = new Map<number | null, Krosno[]>();
  sorted.forEach(k => {
    const rid = k.rzad_id;
    if (!rowMap.has(rid)) rowMap.set(rid, []);
    rowMap.get(rid)!.push(k);
  });

  // Counters
  const counts = {
    pracuje:    krosna.filter(k => k.status === 'pracuje').length,
    awaria:     krosna.filter(k => k.status === 'awaria').length,
    zatrzymane: krosna.filter(k => k.status === 'zatrzymane').length,
    wiazanie:   krosna.filter(k => k.status === 'wiazanie').length,
    brak:       krosna.filter(k => k.status === 'brak').length,
  };

  async function handleAdd() {
    if (!addForm.numer.trim()) return alert('Podaj numer krosna.');
    notifySave('saving');
    try {
      await apiPost('/api/krosna', addForm);
      await mutate('/api/krosna');
      setAddOpen(false);
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
      await apiDelete(`/api/krosna/${deleteId}`);
      await mutate('/api/krosna');
      setDeleteId(null);
      if (selectedId === deleteId) setSelectedId(null);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  // Drag and drop between rows
  const [dragging, setDragging] = useState<number | null>(null);

  const handleDrop = useCallback(async (targetId: number) => {
    if (dragging == null || dragging === targetId) return;
    const dk = krosna.find(k => k.id === dragging);
    const tk = krosna.find(k => k.id === targetId);
    if (!dk || !tk) return;
    // Swap positions and rows
    notifySave('saving');
    try {
      await Promise.all([
        apiPatch(`/api/krosna/${dragging}`, { pozycja: tk.pozycja, rzad_id: tk.rzad_id }),
        apiPatch(`/api/krosna/${targetId}`, { pozycja: dk.pozycja, rzad_id: dk.rzad_id }),
      ]);
      await mutate('/api/krosna');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
    setDragging(null);
  }, [dragging, krosna]);

  const rowsSorted = [...rzedy].sort((a, b) => a.pozycja - b.pozycja);
  const noRowLooms = rowMap.get(null) || [];

  return (
    <div>
      <div className="view-header">
        <h2>Tkalnia – Plan hali</h2>
        <p>{krosna.length} krosien · kliknij krosno aby zobaczyć szczegóły</p>
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: 12, padding: '14px 20px' }}>
        <div className="flex gap-12 flex-wrap" style={{ marginBottom: 12 }}>
          {[
            ['Pracuje', counts.pracuje, 'var(--success)'],
            ['Awaria', counts.awaria, 'var(--danger)'],
            ['Zatrzymane', counts.zatrzymane, 'var(--warning)'],
            ['Wiązanie', counts.wiazanie, 'var(--info)'],
            ['Brak statusu', counts.brak, 'var(--grey)'],
          ].map(([lbl, val, color]) => (
            <div key={String(lbl)} className="info-item">
              <div className="lbl">{lbl}</div>
              <div className="val" style={{ color: String(color), fontSize: '1.3rem' }}>{val}</div>
            </div>
          ))}
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ Dodaj krosno</button>
        </div>
      </div>

      {/* Loom hall */}
      <div className="card">
        {/* Type legend */}
        <div className="loom-legend">
          {typy.map(t => (
            <div key={t.id} className="legend-item">
              <div className="legend-color" style={{ background: t.kolor }} />
              <span>{t.nazwa}</span>
            </div>
          ))}
        </div>

        {/* Status legend */}
        <div className="loom-legend" style={{ marginBottom: 16 }}>
          {(['pracuje','awaria','zatrzymane','wiazanie','brak'] as const).map(s => (
            <div key={s} className="legend-item">
              <span className={`status-lamp ${statusKrosnaLamp(s)}`} />
              <span>{statusKrosnaLabel(s)}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Ładowanie…</p>
        ) : (
          <div className="loom-hall">
            {/* Rows with names */}
            {rowsSorted.map(rz => {
              const rowLooms = rowMap.get(rz.id) || [];
              return (
                <div key={rz.id}>
                  {rz.nazwa && (
                    <div className="loom-row-label">{rz.nazwa}</div>
                  )}
                  <div className="loom-row">
                    {rowLooms.map(k => (
                      <LoomBlock
                        key={k.id}
                        krosno={k}
                        typy={typy}
                        onClick={() => setSelectedId(k.id)}
                        dragging={dragging === k.id}
                        onDragStart={() => setDragging(k.id)}
                        onDrop={() => handleDrop(k.id)}
                        onDragEnd={() => setDragging(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Looms without a row */}
            {noRowLooms.length > 0 && (
              <div>
                <div className="loom-row-label">Bez rzędu</div>
                <div className="loom-row">
                  {noRowLooms.map(k => (
                    <LoomBlock
                      key={k.id}
                      krosno={k}
                      typy={typy}
                      onClick={() => setSelectedId(k.id)}
                      dragging={dragging === k.id}
                      onDragStart={() => setDragging(k.id)}
                      onDrop={() => handleDrop(k.id)}
                      onDragEnd={() => setDragging(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loom detail slide-in panel */}
      {selectedId && (
        <LoomDetail
          krosnoid={selectedId}
          onClose={() => setSelectedId(null)}
          onDelete={(id) => { setDeleteId(id); setSelectedId(null); }}
        />
      )}

      {/* Add loom modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Dodaj krosno">
        <div className="grid-2">
          <div className="form-group">
            <label>Numer krosna</label>
            <input className="form-control" value={addForm.numer} onChange={e => setAF('numer', e.target.value)} placeholder="np. K-11" />
          </div>
          <div className="form-group">
            <label>Typ krosna</label>
            <select className="form-control" value={addForm.typ_id ?? ''} onChange={e => setAF('typ_id', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Brak</option>
              {typy.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Rodzaj</label>
            <select className="form-control" value={addForm.rodzaj} onChange={e => setAF('rodzaj', e.target.value)}>
              <option value="pneumatyk">Pneumatyk</option>
              <option value="rapier">Rapier</option>
            </select>
          </div>
          <div className="form-group">
            <label>Szerokość (cm)</label>
            <input className="form-control" type="number" value={addForm.szerokosc_cm} onChange={e => setAF('szerokosc_cm', parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={addForm.status} onChange={e => setAF('status', e.target.value)}>
              <option value="pracuje">Pracuje</option>
              <option value="awaria">Awaria</option>
              <option value="zatrzymane">Zatrzymane</option>
              <option value="wiazanie">Wiązanie</option>
              <option value="brak">Brak statusu</option>
            </select>
          </div>
          <div className="form-group">
            <label>Rząd</label>
            <select className="form-control" value={addForm.rzad_id ?? ''} onChange={e => setAF('rzad_id', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Bez rzędu</option>
              {rowsSorted.map(r => <option key={r.id} value={r.id}>{r.nazwa || `Rząd ${r.id}`}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={handleAdd}>Dodaj</button>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message={`Usunąć krosno "${krosna.find(k => k.id === deleteId)?.numer}"?`}
        confirmLabel="Usuń"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ---- Loom Block ----
interface LoomBlockProps {
  krosno: Krosno;
  typy: TypKrosna[];
  onClick: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function LoomBlock({ krosno: k, typy, onClick, dragging, onDragStart, onDrop, onDragEnd }: LoomBlockProps) {
  const typ = typy.find(t => t.id === k.typ_id);
  const color = typ?.kolor || '#666';
  const w = loomWidth(k.szerokosc_cm);

  // Resolve artykul name from joined data
  const artName = k.art_id_override
    ? k.artykul?.nazwa ?? null
    : k.osnowa?.artykul?.nazwa ?? null;
  const isOverride = !!k.art_id_override;

  return (
    <div
      className={`loom-block${dragging ? ' dragging' : ''}`}
      style={{ background: color, width: w }}
      draggable
      onClick={onClick}
      onDragStart={e => { e.stopPropagation(); onDragStart(); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
      onDragEnd={onDragEnd}
      title={`${k.numer} | ${statusKrosnaLabel(k.status)}`}
    >
      <div>
        <div className="loom-header">
          <div className="loom-num">{k.numer}</div>
          <span className={`status-lamp ${statusKrosnaLamp(k.status)}`} />
        </div>
        <div className="loom-kind">{k.rodzaj}</div>
      </div>
      <div>
        {artName
          ? <div className="loom-article">{isOverride ? '✏ ' : ''}{artName}</div>
          : <div className="loom-no-article">brak osnowy</div>
        }
      </div>
    </div>
  );
}
