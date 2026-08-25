/**
 * Shared test fixtures – deterministic API stubs for all E2E tests.
 * Every route mock returns the minimal shape the UI needs.
 */

import type { Page, Route } from '@playwright/test';

// ---------- raw payload shapes ----------

export const PRACOWNICY = [
  { id: 1, imie: 'Anna', nazwisko: 'Kowalska', stanowisko: 'tkacz', zmiana: 'I', aktywny: true },
  { id: 2, imie: 'Jan',  nazwisko: 'Nowak',    stanowisko: 'tkacz', zmiana: 'II', aktywny: true },
];

export const ARTYKULY = [
  { id: 10, nazwa: 'Tkanina A', watki_na_cm: 20, rozpinka: 'nie', rodzaj_snucia: 'taśmowe', szerokosc_tkaniny: 160, uwagi: '' },
];

export const ZLECENIA = [
  {
    id: 100,
    numer: 'ZP-001/2024',
    art_id: 10,
    ilosc_m: 1000,
    wykonane_m: 200,
    pozostalo_m: 800,
    status: 'w_trakcie',
    data_utworzenia: '2024-01-01',
    termin_realizacji: '2024-03-01',
    priorytet: 'standard',
    uwagi: '',
    przekazane_do: null,
    split_lengths: [],
    artykul: { id: 10, nazwa: 'Tkanina A' },
  },
];

export const NIEOBECNOSCI = [
  {
    id: 50,
    pracownik_id: 1,
    typ: 'urlop',
    data_od: '2024-06-01',
    data_do: '2024-06-14',
    uwagi: '',
    // the view still uses od/do in some places – include both to keep tests stable
    od: '2024-06-01',
    do: '2024-06-14',
    pracownik: PRACOWNICY[0],
  },
];

export const KROSNA = [
  {
    id: 200,
    numer: 'K-01',
    typ_id: null,
    rodzaj: 'pneumatyk',
    szerokosc_cm: 170,
    status: 'pracuje',
    osnow_id: null,
    art_id_override: null,
    rzad_id: 1,
    pozycja: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const RZEDY = [{ id: 1, nazwa: 'Rząd A', pozycja: 1 }];
export const TYPY = [{ id: 1, nazwa: 'Picanol', kolor: '#4a90d9' }];
export const OSNOWY: unknown[] = [];

export const ZADANIA = [
  { id: 300, tekst: 'Sprawdzić zapas nitek', priorytet: 'sredni', zrobione: false, created_at: '2024-01-01T00:00:00Z' },
];

export const OBECNOSCI: unknown[] = [];

// ---------- helper: mock a GET endpoint ----------

function mockGet(page: Page, urlPattern: string | RegExp, payload: unknown) {
  return page.route(urlPattern, (route: Route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: payload }) });
  });
}

/**
 * Register all API stubs on the given page.
 * Mutations (POST/PATCH/DELETE) return a minimal success payload so the
 * SWR revalidation re-fetches the mocked GET.
 */
export async function mockAllApis(page: Page) {
  // GET endpoints
  await mockGet(page, '**/api/pracownicy', PRACOWNICY);
  await mockGet(page, '**/api/artykuly', ARTYKULY);
  await mockGet(page, '**/api/zlecenia', ZLECENIA);
  await mockGet(page, '**/api/nieobecnosci', NIEOBECNOSCI);
  await mockGet(page, '**/api/krosna', KROSNA);
  await mockGet(page, '**/api/rzedy-krosien', RZEDY);
  await mockGet(page, '**/api/typy-krosien', TYPY);
  await mockGet(page, '**/api/osnowy', OSNOWY);
  await mockGet(page, '**/api/zadania', ZADANIA);
  await mockGet(page, '**/api/obecnosci', OBECNOSCI);
  await mockGet(page, '**/api/historia', []);

  // Mutation stubs – return minimal valid shapes
  await page.route('**/api/zadania', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 999, tekst: 'nowe', priorytet: 'sredni', zrobione: false } }),
      });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/zadania/**', (route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 999 } }) });
    } else if (method === 'DELETE') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/zlecenia', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 101, numer: 'ZP-002/2024', ilosc_m: 500, wykonane_m: 0, pozostalo_m: 500 } }),
      });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/zlecenia/**', (route) => {
    if (route.request().method() === 'PATCH') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 100, wykonane_m: 400, pozostalo_m: 600 } }),
      });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/nieobecnosci', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 51, pracownik_id: 1, typ: 'urlop', data_od: '2024-07-01', data_do: '2024-07-07', od: '2024-07-01', do: '2024-07-07' } }),
      });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/krosna', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 201, numer: 'K-02', status: 'brak' } }),
      });
    } else {
      route.continue();
    }
  });
}
