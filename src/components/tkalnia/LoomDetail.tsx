'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Krosno, Osnowa, Artykul, StatusKrosna } from '@/types/domain';
import { apiPatch } from '@/lib/utils/api';
import { saveHistory } from '@/lib/utils/history';
import { notifySave } from '@/components/ui/SaveStatus';
import { statusKrosnaLabel, statusKrosnaLamp, formatDate } from '@/lib/utils/formatting';
import Modal from '@/components/ui/Modal';
import Confirm from '@/components/ui/Confirm';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

interface Props {
  krosnoid: number;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export default function LoomDetail({ krosnoid, onClose, onDelete }: Props) {
  const { data: krosna = [] } = useSWR<Krosno[]>('/api/krosna', fetcher);
  const { data: osnowy = [] } = useSWR<Osnowa[]>('/api/osnowy', fetcher);
  const { data: artykuly = [] } = useSWR<Artykul[]>('/api/artykuly', fetcher);

  const k = krosna.find(x => x.id === krosnoid);

  const [statusEditing, setStatusEditing] = useState(false);
  const [newStatus, setNewStatus] = useState<StatusKrosna>(k?.status || 'brak');
  const [zalozOpen, setZalozOpen] = useState(false);
  const [zalozOsnId, setZalozOsnId] = useState<number | null>(null);
  const [zdejmijOpen, setZdejmijOpen] = useState(false);
  const [zdejmijMetry, setZdejmijMetry] = useState<string>('');
  const [zdejmijPrzew, setZdejmijPrzew] = useState<string>('przewleczona');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [artOpen, setArtOpen] = useState(false);
  const [newArtId, setNewArtId] = useState<number>(artykuly[0]?.id || 0);
  const [loomDensity, setLoomDensity] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [histData, setHistData] = useState<{ id: number; typ: string; opis: string; uzytkownik: string; created_at: string }[]>([]);
  const [histLoaded, setHistLoaded] = useState(false);

  useEffect(() => {
    setLoomDensity(k?.gestosc_na_krosnie?.toString() || '');
  }, [k?.gestosc_na_krosnie, k?.id]);

  if (!k) return null;

  const osnowa = k.osnow_id ? osnowy.find(o => o.id === k.osnow_id) : null;
  const artykul = k.art_id_override
    ? artykuly.find(a => a.id === k.art_id_override)
    : osnowa
    ? artykuly.find(a => a.id === osnowa.art_id)
    : null;
  const previousLoomDensity = k.gestosc_na_krosnie;

  // Available warps that can be loaded onto this loom
  // Rule: przewleczona warps in magazyn, OR (V2 rule) warps with same art as existing on some loom
  const availableOsnowy = osnowy.filter(o => {
    if (o.lokalizacja !== 'magazyn') return false;
    return true;
  });

  async function saveStatus() {
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { status: newStatus });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zmiana_statusu',
        opis: `Status zmieniony: ${statusKrosnaLabel(k!.status)} → ${statusKrosnaLabel(newStatus)}.`,
        oddzial: 'tkalnia',
        art_id: artykul?.id ?? osnowa?.art_id ?? null,
        zlecenie_id: osnowa?.zlecenie_id ?? null,
        krosno_id: krosnoid,
        osnowa_id: osnowa?.id ?? null,
      });
      await mutate('/api/krosna');
      setStatusEditing(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function zalozOsnowe() {
    if (!zalozOsnId) return;
    const o = osnowy.find(x => x.id === zalozOsnId);
    if (!o) return;
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { osnow_id: zalozOsnId, art_id_override: null });
      await apiPatch(`/api/osnowy/${zalozOsnId}`, { lokalizacja: 'krosno', krosno_id: krosnoid });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zalozenie_osnowy',
        opis: `Założono osnowę ${o.numer}${o.status_przew === 'nieprzewleczona' ? ' (manualny bypass bez przewlekalni)' : ''}.`,
        oddzial: 'tkalnia',
        art_id: o.art_id,
        zlecenie_id: o.zlecenie_id,
        krosno_id: krosnoid,
        osnowa_id: o.id,
      });
      await mutate('/api/krosna');
      await mutate('/api/osnowy');
      setZalozOpen(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function zdejmijOsnowe() {
    if (!osnowa) return;
    const metrVal = zdejmijMetry ? parseFloat(zdejmijMetry) : null;
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { osnow_id: null, art_id_override: null });
      await apiPatch(`/api/osnowy/${osnowa.id}`, {
        lokalizacja: 'magazyn',
        krosno_id: null,
        metry: metrVal,
        status_przew: zdejmijPrzew,
        status_przerobki: null,
      });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zdjecie_osnowy',
        opis: `Zdjęto osnowę ${osnowa.numer}${metrVal != null ? `, ${metrVal} m pozostałych` : ''}. Operator oznaczył ją jako ${zdejmijPrzew}.`,
        oddzial: 'tkalnia',
        art_id: osnowa.art_id,
        zlecenie_id: osnowa.zlecenie_id,
        krosno_id: krosnoid,
        osnowa_id: osnowa.id,
      });
      await mutate('/api/krosna');
      await mutate('/api/osnowy');
      setZdejmijOpen(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function zmienArtykul() {
    if (!newArtId) return;
    const old = artykul?.nazwa || '—';
    const newA = artykuly.find(a => a.id === newArtId);
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { art_id_override: newArtId });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zmiana_artykulu',
        opis: `Ręczna zmiana artykułu: ${old} → ${newA?.nazwa || '—'}.`,
       oddzial: 'tkalnia',
       art_id: newArtId,
       zlecenie_id: osnowa?.zlecenie_id ?? null,
       krosno_id: krosnoid,
       osnowa_id: osnowa?.id ?? null,
      });
      await mutate('/api/krosna');
      setArtOpen(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  async function resetArtykul() {
    const osnArt = osnowa ? artykuly.find(a => a.id === osnowa.art_id) : null;
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { art_id_override: null });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zmiana_artykulu',
        opis: `Przywrócono artykuł z osnowy: ${osnArt?.nazwa || '—'}.`,
        oddzial: 'tkalnia',
        art_id: osnowa?.art_id ?? null,
        zlecenie_id: osnowa?.zlecenie_id ?? null,
        krosno_id: krosnoid,
        osnowa_id: osnowa?.id ?? null,
      });
      await mutate('/api/krosna');
      setConfirmReset(false);
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  // History for this loom
  function loadHistory() {
    if (histLoaded) return;
    fetch(`/api/historia?encja=krosno&encja_id=${krosnoid}&limit=20`)
      .then(r => r.json())
      .then(r => { setHistData(r.data || []); setHistLoaded(true); });
  }

  async function saveLoomDensity() {
    const nextDensity = loomDensity.trim() ? parseFloat(loomDensity) : null;
    if (loomDensity.trim() && !Number.isFinite(nextDensity)) {
      alert('Podaj poprawną gęstość na krośnie lub zostaw pole puste.');
      return;
    }
    notifySave('saving');
    try {
      await apiPatch(`/api/krosna/${krosnoid}`, { gestosc_na_krosnie: nextDensity });
      await saveHistory({
        encja: 'krosno',
        encja_id: krosnoid,
        typ: 'zmiana_gestosci_krosna',
        opis: `Zmieniono informacyjną gęstość na krośnie: ${previousLoomDensity ?? 'brak'} → ${nextDensity ?? 'brak'} wątków/cm.`,
        oddzial: 'tkalnia',
        art_id: artykul?.id ?? osnowa?.art_id ?? null,
        zlecenie_id: osnowa?.zlecenie_id ?? null,
        krosno_id: krosnoid,
        osnowa_id: osnowa?.id ?? null,
      });
      await mutate('/api/krosna');
      notifySave('saved');
    } catch {
      notifySave('error');
    }
  }

  return (
    <>
      <div className="slide-panel open" style={{ zIndex: 500 }}>
        <button className="close-panel" onClick={onClose}>×</button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div className="flex items-center gap-8 mb-4">
            <span className={`status-lamp ${statusKrosnaLamp(k.status)}`} />
            <strong style={{ fontSize: '1.1rem' }}>{k.numer}</strong>
            <span className="badge badge-grey">{k.rodzaj}</span>
            {k.art_id_override && <span className="badge badge-purple">Ręczny artykuł</span>}
          </div>
          <div className="flex gap-6 flex-wrap text-sm text-muted">
            <span>{k.szerokosc_cm} cm</span>
          </div>
        </div>

        {/* Status */}
        <div className="detail-section">
          <div className="detail-section-title">Status krosna</div>
          {statusEditing ? (
            <div className="flex gap-8 items-center">
              <select
                className="form-control"
                style={{ maxWidth: 180 }}
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as StatusKrosna)}
              >
                {(['pracuje','awaria','zatrzymane','wiazanie','brak'] as const).map(s => (
                  <option key={s} value={s}>{statusKrosnaLabel(s)}</option>
                ))}
              </select>
              <button className="btn btn-sm btn-primary" onClick={() => setConfirmStatus(true)}>Zapisz</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setStatusEditing(false)}>Anuluj</button>
            </div>
          ) : (
            <div className="flex gap-8 items-center">
              <span className={`status-lamp ${statusKrosnaLamp(k.status)}`} />
              <span>{statusKrosnaLabel(k.status)}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => { setNewStatus(k.status); setStatusEditing(true); }}>Zmień status</button>
            </div>
          )}
        </div>

        {/* Osnowa */}
        <div className="detail-section">
          <div className="detail-section-title">Osnowa</div>
          {osnowa ? (
            <>
              <div className="info-grid" style={{ marginBottom: 10 }}>
                <div className="info-item"><div className="lbl">Numer</div><div className="val">{osnowa.numer}</div></div>
                <div className="info-item"><div className="lbl">Metry</div><div className="val">{osnowa.metry != null ? `${osnowa.metry} m` : '—'}</div></div>
                <div className="info-item">
                  <div className="lbl">Przewleczenie</div>
                  <div className="val">
                    <span className={`badge ${osnowa.status_przew === 'przewleczona' ? 'badge-success' : 'badge-grey'}`}>
                      {osnowa.status_przew === 'przewleczona' ? 'Przewleczona' : 'Nieprzewleczona'}
                    </span>
                  </div>
                </div>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => setZdejmijOpen(true)}>Zdejmij osnowę</button>
            </>
          ) : (
            <>
              <p className="text-muted text-sm mb-8">Brak osnowy na krośnie.</p>
              <button className="btn btn-sm btn-primary" onClick={() => { setZalozOsnId(availableOsnowy[0]?.id || null); setZalozOpen(true); }}>
                Załóż osnowę
              </button>
            </>
          )}
        </div>

        {/* Artykuł */}
        <div className="detail-section">
          <div className="detail-section-title">Artykuł</div>
          {artykul ? (
            <>
              <div className="info-grid" style={{ marginBottom: 10 }}>
                <div className="info-item"><div className="lbl">Artykuł</div><div className="val">{artykul.nazwa}</div></div>
                <div className="info-item"><div className="lbl">Gęstość bazowa</div><div className="val">{artykul.watki_na_cm} wątków/cm</div></div>
                <div className="info-item"><div className="lbl">Typ snucia</div><div className="val">{artykul.rodzaj_snucia}</div></div>
                {artykul.szerokosc_tkaniny && (
                  <div className="info-item"><div className="lbl">Szer. tkaniny</div><div className="val">{artykul.szerokosc_tkaniny} cm</div></div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Gęstość na krośnie (informacyjnie)</label>
                <div className="flex gap-8 items-center">
                  <input
                    className="form-control"
                    type="number"
                    value={loomDensity}
                    onChange={e => setLoomDensity(e.target.value)}
                    placeholder={String(artykul.watki_na_cm)}
                  />
                  <button className="btn btn-sm btn-secondary" onClick={saveLoomDensity}>Zapisz</button>
                </div>
              </div>
              <div className="btn-group">
                <button className="btn btn-sm btn-warning" onClick={() => { setNewArtId(artykul.id); setArtOpen(true); }}>Zmień artykuł</button>
                {k.art_id_override && (
                  <button className="btn btn-sm btn-secondary" onClick={() => setConfirmReset(true)}>Przywróć z osnowy</button>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted text-sm">Brak danych artykułu.</p>
          )}
        </div>

        {/* Akcje krosna */}
        <div className="detail-section">
          <div className="detail-section-title">Akcje</div>
          <div className="btn-group">
            <button className="btn btn-sm btn-danger" onClick={() => onDelete(krosnoid)}>Usuń krosno</button>
          </div>
        </div>

        {/* Historia */}
        <div className="detail-section">
          <div className="detail-section-title">
            Historia{' '}
            {!histLoaded && (
              <button className="btn btn-xs btn-secondary" style={{ marginLeft: 8 }} onClick={loadHistory}>Pokaż</button>
            )}
          </div>
          {histLoaded ? (
            histData.length === 0 ? (
              <p className="text-muted text-sm">Brak historii.</p>
            ) : (
              <div className="timeline">
                {histData.map(h => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">{formatDate(h.created_at.split('T')[0])}</div>
                    <div>
                      <div className="timeline-type">{h.typ.replace(/_/g, ' ')}</div>
                      <div className="timeline-opis">{h.opis}</div>
                      <div className="timeline-user">{h.uzytkownik}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Overlay backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 490, background: 'transparent' }}
        onClick={onClose}
      />

      {/* Modals */}
      <Modal open={zalozOpen} onClose={() => setZalozOpen(false)} title={`Załóż osnowę – ${k.numer}`}>
        {availableOsnowy.length === 0 ? (
          <p className="text-muted text-sm mb-16">Brak dostępnych osnów. Sprawdź magazyn i przewlekalnię.</p>
        ) : (
          <div className="form-group">
            <label>Wybierz osnowę</label>
            <select
              className="form-control"
              value={zalozOsnId ?? ''}
              onChange={e => setZalozOsnId(parseInt(e.target.value))}
            >
              {availableOsnowy.map(o => {
                const a = artykuly.find(x => x.id === o.art_id);
                const isDow = o.status_przew === 'nieprzewleczona';
                return (
                  <option key={o.id} value={o.id}>
                    {o.numer} – {a?.nazwa || '?'} {o.metry != null ? `(${o.metry} m)` : ''}{isDow ? ' [dowiązanie]' : ''}
                  </option>
                );
              })}
            </select>
            {zalozOsnId && osnowy.find(o => o.id === zalozOsnId)?.status_przew === 'nieprzewleczona' && (
              <p className="text-muted text-sm mt-8">
                ⚠ Ta osnowa jest nieprzewleczona. Operator świadomie omija przewlekalnię i zakłada ją bezpośrednio na krosno.
              </p>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setZalozOpen(false)}>Anuluj</button>
          {availableOsnowy.length > 0 && (
            <button className="btn btn-primary" onClick={zalozOsnowe}>Załóż osnowę</button>
          )}
        </div>
      </Modal>

      <Modal open={zdejmijOpen} onClose={() => setZdejmijOpen(false)} title={`Zdejmij osnowę – ${k.numer}`}>
        <p className="text-muted text-sm mb-16">Osnowa: <strong>{osnowa?.numer}</strong></p>
        <div className="form-group">
          <label>Pozostałe metry (opcjonalnie)</label>
          <input
            className="form-control"
            type="number"
            value={zdejmijMetry}
            onChange={e => setZdejmijMetry(e.target.value)}
            placeholder="Pozostaw puste jeśli nieznane"
          />
        </div>
        <div className="form-group">
          <label>Status przewleczenia po zdjęciu</label>
          <select className="form-control" value={zdejmijPrzew} onChange={e => setZdejmijPrzew(e.target.value)}>
            <option value="przewleczona">Przewleczona</option>
            <option value="nieprzewleczona">Nieprzewleczona</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setZdejmijOpen(false)}>Anuluj</button>
          <button className="btn btn-danger" onClick={zdejmijOsnowe}>Zdejmij i zwróć do magazynu</button>
        </div>
      </Modal>

      <Modal open={artOpen} onClose={() => setArtOpen(false)} title={`Zmień artykuł – ${k.numer}`}>
        <p className="text-muted text-sm mb-16">Aktualny: <strong>{artykul?.nazwa || '—'}</strong></p>
        <div className="form-group">
          <label>Nowy artykuł</label>
          <select className="form-control" value={newArtId} onChange={e => setNewArtId(parseInt(e.target.value))}>
            {artykuly.map(a => <option key={a.id} value={a.id}>{a.nazwa}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setArtOpen(false)}>Anuluj</button>
          <button className="btn btn-warning" onClick={zmienArtykul}>Zmień artykuł</button>
        </div>
      </Modal>

      <Confirm
        open={confirmStatus}
        message={`Zmienić status krosna ${k.numer} na "${statusKrosnaLabel(newStatus)}"?`}
        onConfirm={() => { setConfirmStatus(false); saveStatus(); }}
        onCancel={() => setConfirmStatus(false)}
      />

      <Confirm
        open={confirmReset}
        message="Przywrócić artykuł z osnowy?"
        detail={`Artykuł zostanie ustawiony na: ${osnowa ? artykuly.find(a => a.id === osnowa.art_id)?.nazwa || '—' : '—'}`}
        onConfirm={() => { setConfirmReset(false); resetArtykul(); }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
