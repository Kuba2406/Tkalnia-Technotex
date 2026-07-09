'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { TypKrosna, RzadKrosien } from '@/types/domain';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/api';
import { notifySave } from '@/components/ui/SaveStatus';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

const PALETA = ['#2980b9', '#27ae60', '#d4a017', '#8e44ad', '#16a085', '#2c3e50', '#c0392b', '#d35400', '#5d4037', '#0f766e'];

export default function UstawieniaView() {
  const { data: typy = [] } = useSWR<TypKrosna[]>('/api/typy-krosien', fetcher);
  const { data: rzedy = [] } = useSWR<RzadKrosien[]>('/api/rzedy-krosien', fetcher);

  const [typForm, setTypForm] = useState({ nazwa: '', kolor: '#2980b9' });
  const [typEditId, setTypEditId] = useState<number | null>(null);
  const [typOpen, setTypOpen] = useState(false);
  const [deleteTypId, setDeleteTypId] = useState<number | null>(null);

  const [rzadForm, setRzadForm] = useState({ nazwa: '', pozycja: 0 });
  const [rzadEditId, setRzadEditId] = useState<number | null>(null);
  const [rzadOpen, setRzadOpen] = useState(false);
  const [deleteRzadId, setDeleteRzadId] = useState<number | null>(null);

  // ---- Typy krosien ----
  async function saveTyp() {
    if (!typForm.nazwa.trim()) return alert('Podaj nazwę.');
    notifySave('saving');
    try {
      if (typEditId) await apiPatch(`/api/typy-krosien/${typEditId}`, typForm);
      else await apiPost('/api/typy-krosien', typForm);
      await mutate('/api/typy-krosien');
      setTypOpen(false);
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  async function deleteTyp() {
    if (!deleteTypId) return;
    notifySave('saving');
    try {
      await apiDelete(`/api/typy-krosien/${deleteTypId}`);
      await mutate('/api/typy-krosien');
      setDeleteTypId(null);
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  // ---- Rzedy krosien ----
  const sortedRzedy = [...rzedy].sort((a, b) => a.pozycja - b.pozycja);

  async function saveRzad() {
    notifySave('saving');
    try {
      if (rzadEditId) await apiPatch(`/api/rzedy-krosien/${rzadEditId}`, rzadForm);
      else await apiPost('/api/rzedy-krosien', { ...rzadForm, pozycja: rzedy.length });
      await mutate('/api/rzedy-krosien');
      setRzadOpen(false);
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  async function deleteRzad() {
    if (!deleteRzadId) return;
    notifySave('saving');
    try {
      await apiDelete(`/api/rzedy-krosien/${deleteRzadId}`);
      await mutate('/api/rzedy-krosien');
      setDeleteRzadId(null);
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  async function moveRzad(rz: RzadKrosien, dir: 'up' | 'down') {
    const idx = sortedRzedy.findIndex(r => r.id === rz.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedRzedy.length) return;
    const swapWith = sortedRzedy[swapIdx];
    notifySave('saving');
    try {
      await Promise.all([
        apiPatch(`/api/rzedy-krosien/${rz.id}`, { pozycja: swapWith.pozycja }),
        apiPatch(`/api/rzedy-krosien/${swapWith.id}`, { pozycja: rz.pozycja }),
      ]);
      await mutate('/api/rzedy-krosien');
      notifySave('saved');
    } catch { notifySave('error'); }
  }

  return (
    <div>
      <div className="view-header">
        <h2>Ustawienia</h2>
        <p>Konfiguracja typów krosien, rzędów i układu tkalni</p>
      </div>

      {/* Typy krosien */}
      <div className="card">
        <div className="section-header">
          <h3>Typy krosien</h3>
          <button className="btn btn-primary" onClick={() => { setTypEditId(null); setTypForm({ nazwa: '', kolor: '#2980b9' }); setTypOpen(true); }}>
            + Dodaj typ
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Kolor</th><th>Nazwa</th><th>Akcje</th></tr>
            </thead>
            <tbody>
              {typy.map(t => (
                <tr key={t.id}>
                  <td><span className="color-chip" style={{ background: t.kolor }} /></td>
                  <td className="fw-600">{t.nazwa}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-secondary" onClick={() => {
                        setTypEditId(t.id);
                        setTypForm({ nazwa: t.nazwa, kolor: t.kolor });
                        setTypOpen(true);
                      }}>Edytuj</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTypId(t.id)}>Usuń</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rzedy krosien */}
      <div className="card">
        <div className="section-header">
          <h3>Rzędy krosien (układ tkalni)</h3>
          <button className="btn btn-primary" onClick={() => { setRzadEditId(null); setRzadForm({ nazwa: '', pozycja: rzedy.length }); setRzadOpen(true); }}>
            + Dodaj rząd
          </button>
        </div>
        <p className="text-muted text-sm mb-12">
          Skonfiguruj rzędy krosien odpowiadające rzeczywistemu układowi hali tkalni.
          Każde krosno może być przypisane do rzędu.
        </p>
        {sortedRzedy.length === 0 ? (
          <div className="empty-state">Brak rzędów. Dodaj rzędy odpowiadające układowi tkalni.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Kolejność</th><th>Nazwa rzędu</th><th>Akcje</th></tr>
              </thead>
              <tbody>
                {sortedRzedy.map((rz, idx) => (
                  <tr key={rz.id}>
                    <td>
                      <div className="flex gap-4 items-center">
                        <button className="btn-icon" onClick={() => moveRzad(rz, 'up')} disabled={idx === 0}>↑</button>
                        <button className="btn-icon" onClick={() => moveRzad(rz, 'down')} disabled={idx === sortedRzedy.length - 1}>↓</button>
                        <span className="text-muted text-sm">{idx + 1}</span>
                      </div>
                    </td>
                    <td className="fw-600">{rz.nazwa || `Rząd ${idx + 1}`}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-secondary" onClick={() => {
                          setRzadEditId(rz.id);
                          setRzadForm({ nazwa: rz.nazwa, pozycja: rz.pozycja });
                          setRzadOpen(true);
                        }}>Edytuj</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteRzadId(rz.id)}>Usuń</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Typ modal */}
      <Modal open={typOpen} onClose={() => setTypOpen(false)} title={typEditId ? 'Edytuj typ krosna' : 'Nowy typ krosna'}>
        <div className="form-group">
          <label>Nazwa</label>
          <input className="form-control" value={typForm.nazwa} onChange={e => setTypForm(f => ({ ...f, nazwa: e.target.value }))} placeholder="np. PICANOL GTM-A" />
        </div>
        <div className="form-group">
          <label>Kolor (kliknij aby wybrać)</label>
          <div className="flex gap-6 flex-wrap" style={{ marginBottom: 8 }}>
            {PALETA.map(c => (
              <button
                key={c}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: typForm.kolor === c ? '3px solid #1e293b' : '2px solid transparent', cursor: 'pointer',
                }}
                onClick={() => setTypForm(f => ({ ...f, kolor: c }))}
              />
            ))}
          </div>
          <input
            type="color"
            className="form-control"
            value={typForm.kolor}
            onChange={e => setTypForm(f => ({ ...f, kolor: e.target.value }))}
            style={{ height: 40, padding: '2px 4px', width: 80 }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setTypOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={saveTyp}>{typEditId ? 'Zapisz' : 'Dodaj'}</button>
        </div>
      </Modal>

      {/* Rzad modal */}
      <Modal open={rzadOpen} onClose={() => setRzadOpen(false)} title={rzadEditId ? 'Edytuj rząd' : 'Nowy rząd'}>
        <div className="form-group">
          <label>Nazwa rzędu</label>
          <input className="form-control" value={rzadForm.nazwa} onChange={e => setRzadForm(f => ({ ...f, nazwa: e.target.value }))} placeholder="np. Rząd A, Lewa strona…" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setRzadOpen(false)}>Anuluj</button>
          <button className="btn btn-primary" onClick={saveRzad}>{rzadEditId ? 'Zapisz' : 'Dodaj'}</button>
        </div>
      </Modal>

      <Confirm open={!!deleteTypId} message="Usunąć ten typ krosna?" confirmLabel="Usuń" confirmClass="btn-danger" onConfirm={deleteTyp} onCancel={() => setDeleteTypId(null)} />
      <Confirm open={!!deleteRzadId} message="Usunąć ten rząd?" confirmLabel="Usuń" confirmClass="btn-danger" onConfirm={deleteRzad} onCancel={() => setDeleteRzadId(null)} />
    </div>
  );
}
