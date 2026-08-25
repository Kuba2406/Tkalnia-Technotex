'use client';

import type { TypKrosna, RzadKrosien } from '@/types/domain';
import Modal from '@/components/ui/Modal';

interface AddLoomForm {
  numer: string;
  typ_id: number | null;
  rodzaj: 'pneumatyk' | 'rapier';
  szerokosc_cm: number;
  status: 'pracuje' | 'awaria' | 'zatrzymane' | 'wiazanie' | 'brak';
  rzad_id: number | null;
  pozycja: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  form: AddLoomForm;
  setField: (k: string, v: unknown) => void;
  typy: TypKrosna[];
  rzedy: RzadKrosien[];
}

export default function AddLoomModal({ open, onClose, onAdd, form, setField, typy, rzedy }: Props) {
  const rowsSorted = [...rzedy].sort((a, b) => a.pozycja - b.pozycja);

  return (
    <Modal open={open} onClose={onClose} title="Dodaj krosno">
      <div className="grid-2">
        <div className="form-group">
          <label>Numer krosna</label>
          <input className="form-control" value={form.numer} onChange={e => setField('numer', e.target.value)} placeholder="np. K-11" />
        </div>
        <div className="form-group">
          <label>Typ krosna</label>
          <select className="form-control" value={form.typ_id ?? ''} onChange={e => setField('typ_id', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Brak</option>
            {typy.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>Rodzaj</label>
          <select className="form-control" value={form.rodzaj} onChange={e => setField('rodzaj', e.target.value)}>
            <option value="pneumatyk">Pneumatyk</option>
            <option value="rapier">Rapier</option>
          </select>
        </div>
        <div className="form-group">
          <label>Szerokość (cm)</label>
          <input className="form-control" type="number" value={form.szerokosc_cm} onChange={e => setField('szerokosc_cm', parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>Status</label>
          <select className="form-control" value={form.status} onChange={e => setField('status', e.target.value)}>
            <option value="pracuje">Pracuje</option>
            <option value="awaria">Awaria</option>
            <option value="zatrzymane">Zatrzymane</option>
            <option value="wiazanie">Wiązanie</option>
            <option value="brak">Brak statusu</option>
          </select>
        </div>
        <div className="form-group">
          <label>Rząd</label>
          <select className="form-control" value={form.rzad_id ?? ''} onChange={e => setField('rzad_id', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Bez rzędu</option>
            {rowsSorted.map(r => <option key={r.id} value={r.id}>{r.nazwa || `Rząd ${r.id}`}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" onClick={onAdd}>Dodaj</button>
      </div>
    </Modal>
  );
}
