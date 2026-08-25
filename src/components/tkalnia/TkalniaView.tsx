'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { Krosno, TypKrosna, RzadKrosien } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import {
  statusKrosnaLabel, statusKrosnaLamp, loomWidth,
} from '@/lib/utils/formatting';
import Confirm from '@/components/ui/Confirm';
import LoomDetail from './LoomDetail';
import TkalniaStats from './TkalniaStats';
import AddLoomModal from './AddLoomModal';

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

  // Counters now computed inside TkalniaStats

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
      <TkalniaStats krosna={krosna} onAddClick={() => setAddOpen(true)} />

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
      <AddLoomModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        form={addForm}
        setField={setAF}
        typy={typy}
        rzedy={rzedy}
      />

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
