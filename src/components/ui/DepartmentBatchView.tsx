'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { PartiaSnowalni, Artykul, Zlecenie, Krosno, LokalizacjaOsnowy, StatusPrzew, StatusZlecenia } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { saveHistory } from '@/lib/utils/history';
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
  const { data: krosna = [] } = useSWR<Krosno[]>('/api/krosna', fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<PartiaSnowalni | null>(null);
  const [completionMode, setCompletionMode] = useState<'all' | 'partial'>('all');
  const [completedMeters, setCompletedMeters] = useState('');
  const [warpNumber, setWarpNumber] = useState('');
  const [warpMeters, setWarpMeters] = useState('');
  const [warpCount, setWarpCount] = useState('');
  const [warpLocation, setWarpLocation] = useState<LokalizacjaOsnowy>('magazyn');
  const [warpStatus, setWarpStatus] = useState<StatusPrzew>('nieprzewleczona');
  const [warpLoomId, setWarpLoomId] = useState<number | null>(null);

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
        await saveHistory({
          encja: 'partia',
          encja_id: editId,
          typ: 'edycja_partii',
          opis: `Zmieniono partię ${form.numer} (${title}).`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: form.art_id,
          zlecenie_id: form.zlecenie_id,
        });
      } else {
        const created = await apiPost<PartiaSnowalni>(apiUrl, form);
        await saveHistory({
          encja: 'partia',
          encja_id: created.id,
          typ: 'utworzenie_partii',
          opis: `Dodano partię ${created.numer} w oddziale ${title}.`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: created.art_id,
          zlecenie_id: created.zlecenie_id,
        });
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
      const deleted = partie.find(p => p.id === deleteId);
      await apiDelete(`${apiUrl}/${deleteId}`);
      if (deleted) {
        await saveHistory({
          encja: 'partia',
          encja_id: deleted.id,
          typ: 'usuniecie_partii',
          opis: `Usunięto partię ${deleted.numer} z oddziału ${title}.`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: deleted.art_id,
          zlecenie_id: deleted.zlecenie_id,
        });
      }
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
      const partia = partie.find(p => p.id === id);
      if (partia) {
        await saveHistory({
          encja: 'partia',
          encja_id: partia.id,
          typ: 'zmiana_statusu_partii',
          opis: `Partia ${partia.numer} zmieniła status na ${status.replace(/_/g, ' ')}.`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: partia.art_id,
          zlecenie_id: partia.zlecenie_id,
        });
      }
      await mutate(apiUrl);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  function openCompleteFlow(partia: PartiaSnowalni) {
    const zlecenie = zlecenia.find(z => z.id === partia.zlecenie_id);
    const suggestedMeters = zlecenie?.ilosc_pozostala_m ?? partia.metry;
    setCompletionTarget(partia);
    setCompletionMode('all');
    setCompletedMeters(String(suggestedMeters));
    setWarpNumber(`${partia.numer}-O`);
    setWarpMeters(String(partia.metry));
    setWarpCount('');
    setWarpLocation('magazyn');
    setWarpStatus('nieprzewleczona');
    setWarpLoomId(null);
    setCompletionOpen(true);
  }

  async function confirmCompletion() {
    if (!completionTarget) return;
    const zlecenie = zlecenia.find(z => z.id === completionTarget.zlecenie_id);
    const batchStatusPatch = apiPatch(`${apiUrl}/${completionTarget.id}`, { status: 'gotowe' });
    const completedValue = completionMode === 'all'
      ? (zlecenie?.ilosc_pozostala_m ?? completionTarget.metry)
      : parseFloat(completedMeters);
    if (!Number.isFinite(completedValue) || completedValue <= 0) {
      alert('Podaj poprawną ilość wykonaną.');
      return;
    }
    if (warpLocation === 'krosno' && !warpLoomId) {
      alert('Wybierz krosno dla osnowy kierowanej bezpośrednio na tkalnię.');
      return;
    }
    if (zlecenie && completedValue > zlecenie.ilosc_pozostala_m) {
      alert('Ilość wykonana nie może być większa niż pozostała ilość zlecenia.');
      return;
    }

    notifySave('saving');
    try {
      await batchStatusPatch;

      if (zlecenie) {
        const nextCompleted = zlecenie.ilosc_wykonana_m + completedValue;
        const nextRemaining = Math.max(0, zlecenie.ilosc_m - nextCompleted);
        const nextStatus: StatusZlecenia = nextRemaining === 0 ? 'zrealizowane' : 'w_trakcie';
        await apiPatch(`/api/zlecenia/${zlecenie.id}`, {
          ilosc_wykonana_m: nextCompleted,
          ilosc_pozostala_m: nextRemaining,
          status: nextStatus,
        });
        await saveHistory({
          encja: 'zlecenie',
          encja_id: zlecenie.id,
          typ: 'rozliczenie_zlecenia',
          opis: completionMode === 'all'
            ? `Operator zakończył całe zlecenie ${zlecenie.numer}. Wykonano ${completedValue} m, pozostało ${nextRemaining} m.`
            : `Operator ręcznie rozliczył ${completedValue} m w zleceniu ${zlecenie.numer}. Pozostało ${nextRemaining} m.`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: zlecenie.art_id,
          zlecenie_id: zlecenie.id,
        });
      }

      if (warpNumber.trim()) {
        const warpPayload = {
          numer: warpNumber.trim(),
          art_id: completionTarget.art_id,
          metry: warpMeters ? parseFloat(warpMeters) : null,
          liczba_osnow: warpCount ? parseInt(warpCount, 10) : null,
          status_przew: warpStatus,
          lokalizacja: warpLocation,
          krosno_id: warpLocation === 'krosno' ? warpLoomId : null,
          status_przerobki: warpLocation === 'przewlekalnia' ? 'w_kolejce' : null,
          zlecenie_id: completionTarget.zlecenie_id,
        };
        const createdWarp = await apiPost('/api/osnowy', warpPayload);
        if (warpLocation === 'krosno' && warpLoomId) {
          await apiPatch(`/api/krosna/${warpLoomId}`, { osnow_id: (createdWarp as { id: number }).id, art_id_override: null });
        }
        await saveHistory({
          encja: 'osnowa',
          encja_id: (createdWarp as { id: number }).id,
          typ: 'utworzenie_osnowy',
          opis: `Po zakończeniu partii ${completionTarget.numer} utworzono osnowę ${warpNumber.trim()} (${warpMeters || '—'} m) i skierowano ją do ${warpLocation}.`,
          oddzial: apiUrl.split('/').pop() || null,
          art_id: completionTarget.art_id,
          zlecenie_id: completionTarget.zlecenie_id,
          krosno_id: warpLocation === 'krosno' ? warpLoomId : null,
          osnowa_id: (createdWarp as { id: number }).id,
        });
      }

      await saveHistory({
        encja: 'partia',
        encja_id: completionTarget.id,
        typ: 'zakonczenie_partii',
        opis: `Zakończono partię ${completionTarget.numer}. Decyzja operatora: ${completionMode === 'all' ? 'całe zlecenie wykonane' : `${completedValue} m wykonane ręcznie`}.`,
        oddzial: apiUrl.split('/').pop() || null,
        art_id: completionTarget.art_id,
        zlecenie_id: completionTarget.zlecenie_id,
      });

      await Promise.all([mutate(apiUrl), mutate('/api/zlecenia'), mutate('/api/osnowy'), mutate('/api/krosna')]);
      setCompletionOpen(false);
      setCompletionTarget(null);
      notifySave('saved');
    } catch (e: unknown) {
      notifySave('error');
      alert((e as Error).message);
    }
  }

  const availableLooms = krosna.filter(k => !k.osnow_id);

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
                            <button className="btn btn-sm btn-success" onClick={() => openCompleteFlow(p)}>Zakończ snucie</button>
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

      <Modal
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        title={completionTarget ? `Zakończenie partii ${completionTarget.numer}` : 'Zakończenie partii'}
        wide
      >
        {completionTarget && (
          <>
            <div className="form-group">
              <label>Decyzja operatora dla zlecenia</label>
              <div className="flex gap-8 flex-wrap">
                <button
                  className={`btn ${completionMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCompletionMode('all')}
                  type="button"
                >
                  Całość zlecenia wykonana
                </button>
                <button
                  className={`btn ${completionMode === 'partial' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCompletionMode('partial')}
                  type="button"
                >
                  Wpisz wykonane metry
                </button>
              </div>
            </div>

            {completionMode === 'partial' && (
              <div className="form-group">
                <label>Wykonano (m)</label>
                <input
                  className="form-control"
                  type="number"
                  value={completedMeters}
                  onChange={e => setCompletedMeters(e.target.value)}
                />
              </div>
            )}

            <div className="detail-section">
              <div className="detail-section-title">Utwórz osnowę po zakończeniu</div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Numer osnowy</label>
                  <input className="form-control" value={warpNumber} onChange={e => setWarpNumber(e.target.value)} placeholder="np. O-501" />
                </div>
                <div className="form-group">
                  <label>Metry osnowy</label>
                  <input className="form-control" type="number" value={warpMeters} onChange={e => setWarpMeters(e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Liczba osnów</label>
                  <input className="form-control" type="number" value={warpCount} onChange={e => setWarpCount(e.target.value)} placeholder="opcjonalnie" />
                </div>
                <div className="form-group">
                  <label>Status przewleczenia</label>
                  <select className="form-control" value={warpStatus} onChange={e => setWarpStatus(e.target.value as StatusPrzew)}>
                    <option value="nieprzewleczona">Nieprzewleczona</option>
                    <option value="przewleczona">Przewleczona</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Skieruj osnowę do</label>
                  <select className="form-control" value={warpLocation} onChange={e => setWarpLocation(e.target.value as LokalizacjaOsnowy)}>
                    <option value="magazyn">Magazyn</option>
                    <option value="przewlekalnia">Przewlekalnia</option>
                    <option value="krosno">Bezpośrednio na krosno</option>
                  </select>
                </div>
                {warpLocation === 'krosno' && (
                  <div className="form-group">
                    <label>Wolne krosno</label>
                    <select
                      className="form-control"
                      value={warpLoomId ?? ''}
                      onChange={e => setWarpLoomId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    >
                      <option value="">Wybierz krosno</option>
                      {availableLooms.map(k => <option key={k.id} value={k.id}>{k.numer}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setCompletionOpen(false)}>Anuluj</button>
              <button className="btn btn-success" onClick={confirmCompletion}>Potwierdź zakończenie</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
