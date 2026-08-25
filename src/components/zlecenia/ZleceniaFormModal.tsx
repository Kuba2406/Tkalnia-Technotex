'use client';

import type { Artykul, StatusZlecenia, PriorytetZlecenia, PrzekazaneDo } from '@/types/domain';
import Modal from '@/components/ui/Modal';

export interface ZleceniaFormData {
  numer: string;
  art_id: number;
  ilosc_m: number;
  status: StatusZlecenia;
  data_utworzenia: string;
  termin_realizacji: string;
  priorytet: PriorytetZlecenia;
  uwagi: string;
  przekazane_do: PrzekazaneDo | null;
  split_lengths: number[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editId: number | null;
  form: ZleceniaFormData;
  setField: (k: string, v: unknown) => void;
  artykuly: Artykul[];
}

export default function ZleceniaFormModal({ open, onClose, onSave, editId, form, setField, artykuly }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
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
        <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" onClick={onSave}>{editId ? 'Zapisz zmiany' : 'Dodaj zlecenie'}</button>
      </div>
    </Modal>
  );
}
