/**
 * __tests__/fixtures.ts
 * Reusable test fixtures and factory helpers for domain entities.
 */

import type { Artykul, Osnowa, Krosno, Zlecenie, Nieobecnosc } from '@/types/domain';

export function makeArtykul(overrides: Partial<Artykul> = {}): Artykul {
  return {
    id: 1,
    nazwa: 'Artykuł testowy',
    watki_na_cm: 10,
    rozpinka: 'tak',
    rodzaj_snucia: 'taśmowe',
    szerokosc_tkaniny: 160,
    uwagi: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeOsnowa(overrides: Partial<Osnowa> = {}): Osnowa {
  return {
    id: 1,
    numer: 'OSN-001',
    art_id: 1,
    metry: 1000,
    liczba_osn: 3600,
    status_przew: 'nieprzewleczona',
    lokalizacja: 'magazyn',
    krosno_id: null,
    status_przerobki: null,
    zlecenie_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeKrosno(overrides: Partial<Krosno> = {}): Krosno {
  return {
    id: 1,
    numer: 'K-01',
    typ_id: null,
    rodzaj: 'rapier',
    szerokosc_cm: 180,
    status: 'pracuje',
    osnow_id: null,
    art_id_override: null,
    rzad_id: null,
    pozycja: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeZlecenie(overrides: Partial<Zlecenie> = {}): Zlecenie {
  return {
    id: 1,
    numer: 'ZL-001',
    art_id: 1,
    ilosc_m: 500,
    wykonane_m: 0,
    pozostalo_m: 500,
    status: 'nowe',
    data_utworzenia: '2024-01-01',
    termin_realizacji: '2024-12-31',
    priorytet: 'standard',
    uwagi: '',
    przekazane_do: null,
    split_lengths: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeNieobecnosc(overrides: Partial<Nieobecnosc> = {}): Nieobecnosc {
  return {
    id: 1,
    pracownik_id: 1,
    typ: 'urlop',
    data_od: '2024-06-01',
    data_do: '2024-06-07',
    uwagi: '',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a mock Supabase chain that resolves with given data/error */
export function mockSupabaseChain(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const terminal = () => Promise.resolve(resolved);
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'];
  methods.forEach(m => {
    chain[m] = () => {
      // .single() is terminal
      if (m === 'single') return terminal();
      return chain;
    };
  });
  // Make the chain itself thenable so await sb.from(...).select(...).order(...) works
  (chain as Promise<unknown> & Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolved).then(resolve);
  return chain;
}
