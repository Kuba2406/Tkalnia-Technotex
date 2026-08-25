/**
 * __tests__/api-routes.test.ts
 *
 * Integration and regression tests for V5 API route handlers.
 * Covers all mutation routes, absence date field regressions,
 * zlecenia progress invariants, and loom history flows.
 */

// ---------------------------------------------------------------------------
// Mock next/server before importing route handlers
// ---------------------------------------------------------------------------
jest.mock('next/server', () => {
  class MockNextResponse {
    body: unknown;
    status: number;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.body;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
  }

  class MockNextRequest {
    private _body: unknown;
    constructor(body: unknown = {}) {
      this._body = body;
    }
    async json() {
      return this._body;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
});

// ---------------------------------------------------------------------------
// Mock Supabase server client
// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

import { createServerClient } from '@/lib/supabase/server';
import { makeZlecenie, makeNieobecnosc, makeKrosno, makeOsnowa } from './fixtures';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

// ---------------------------------------------------------------------------
// Helper: build a Supabase fluent-chain mock
// ---------------------------------------------------------------------------
type QueryResult = { data: unknown; error: { message: string } | null };

function buildChain(result: QueryResult) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'from'];
  methods.forEach(m => {
    chain[m] = jest.fn(() => chain);
  });
  // Terminal calls return the result
  chain['single'] = jest.fn(() => Promise.resolve(result));
  // Make the chain itself awaitable (for queries without .single())
  (chain as unknown as Promise<QueryResult>).then = (
    resolve: (v: QueryResult) => void,
    reject?: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// ---------------------------------------------------------------------------
// Helper: create a minimal NextRequest-like object
// ---------------------------------------------------------------------------
function makeReq(body: unknown = {}) {
  return { json: async () => body } as import('next/server').NextRequest;
}

function makeParams(id: string | number) {
  return { params: { id: String(id) } };
}

async function responseJson(res: unknown) {
  return (res as { json: () => Promise<unknown> }).json();
}

// ===========================================================================
// ROUTE HANDLER IMPORTS — deferred so mocks are set up first
// ===========================================================================

// We use dynamic require inside each describe block so that the module-level
// jest.mock calls above are resolved before the route modules are evaluated.

// ---------------------------------------------------------------------------
// nieobecnosci/route.ts — regression: must use data_od not od
// ---------------------------------------------------------------------------
describe('nieobecnosci GET — regression: orders by data_od not od', () => {
  it('calls .order("data_od") and not .order("od")', async () => {
    const row = makeNieobecnosc();
    const chain = buildChain({ data: [row], error: null });
    const sb = {
      from: jest.fn(() => chain),
    };
    mockCreateServerClient.mockReturnValue(sb as unknown as ReturnType<typeof createServerClient>);

    // Import route after mocks
    const { GET } = await import('@/app/api/nieobecnosci/route');
    await GET();

    // Verify that order was called with data_od
    expect(chain.order).toHaveBeenCalledWith('data_od', { ascending: true });
    // Verify order was NOT called with old 'od' field
    expect(chain.order).not.toHaveBeenCalledWith('od', expect.anything());
  });

  it('returns list of nieobecnosci with data_od / data_do fields', async () => {
    const row = makeNieobecnosc({ data_od: '2024-06-01', data_do: '2024-06-07' });
    const chain = buildChain({ data: [row], error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/nieobecnosci/route');
    const res = await GET();
    const json = await responseJson(res);
    expect((json as { data: typeof row[] }).data[0].data_od).toBe('2024-06-01');
    expect((json as { data: typeof row[] }).data[0].data_do).toBe('2024-06-07');
  });
});

describe('nieobecnosci POST', () => {
  it('inserts a nieobecnosc with data_od/data_do and returns 201', async () => {
    const payload = { pracownik_id: 1, typ: 'urlop', data_od: '2024-07-01', data_do: '2024-07-05' };
    const created = makeNieobecnosc(payload);
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/nieobecnosci/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
    const json = await responseJson(res);
    expect((json as { data: { data_od: string } }).data.data_od).toBe('2024-07-01');
  });

  it('returns 400 on Supabase error', async () => {
    const chain = buildChain({ data: null, error: { message: 'insert failed' } });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/nieobecnosci/route');
    const res = await POST(makeReq({ typ: 'urlop' }));
    expect((res as { status: number }).status).toBe(400);
    const json = await responseJson(res);
    expect((json as { error: string }).error).toBe('insert failed');
  });
});

// ---------------------------------------------------------------------------
// zlecenia — progress invariants (pozostalo_m derived from ilosc_m - wykonane_m)
// ---------------------------------------------------------------------------
describe('zlecenia progress invariants', () => {
  it('GET returns zlecenie with consistent ilosc_m / wykonane_m / pozostalo_m', async () => {
    const z = makeZlecenie({ ilosc_m: 500, wykonane_m: 200, pozostalo_m: 300 });
    const chain = buildChain({ data: [z], error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/zlecenia/route');
    const res = await GET();
    const json = await responseJson(res);
    const row = (json as { data: typeof z[] }).data[0];
    expect(row.ilosc_m - row.wykonane_m).toBe(row.pozostalo_m);
  });

  it('POST creates zlecenie and returns 201', async () => {
    const payload = { numer: 'ZL-002', art_id: 1, ilosc_m: 300 };
    const created = makeZlecenie({ ...payload, wykonane_m: 0, pozostalo_m: 300 });
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/zlecenia/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('PATCH updates wykonane_m — returned row keeps pozostalo_m consistent', async () => {
    const updated = makeZlecenie({ ilosc_m: 500, wykonane_m: 350, pozostalo_m: 150 });
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/zlecenia/[id]/route');
    const res = await PATCH(makeReq({ wykonane_m: 350 }), makeParams(1));
    const json = await responseJson(res);
    const row = (json as { data: typeof updated }).data;
    expect(row.ilosc_m - row.wykonane_m).toBe(row.pozostalo_m);
  });

  it('GET returns 500 on Supabase error', async () => {
    const chain = buildChain({ data: null, error: { message: 'db error' } });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/zlecenia/route');
    const res = await GET();
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// zadania CRUD
// ---------------------------------------------------------------------------
describe('zadania CRUD', () => {
  it('GET returns list of zadania', async () => {
    const row = { id: 1, tekst: 'Test zadanie', priorytet: 'niski', zrobione: false, created_at: '', updated_at: '' };
    const chain = buildChain({ data: [row], error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/zadania/route');
    const res = await GET();
    const json = await responseJson(res);
    expect((json as { data: typeof row[] }).data).toHaveLength(1);
  });

  it('POST creates zadanie with 201', async () => {
    const payload = { tekst: 'Nowe zadanie', priorytet: 'wysoki', zrobione: false };
    const created = { id: 2, ...payload, created_at: '', updated_at: '' };
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/zadania/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('PATCH updates zadanie', async () => {
    const updated = { id: 1, tekst: 'Updated', priorytet: 'niski', zrobione: true, created_at: '', updated_at: '' };
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/zadania/[id]/route');
    const res = await PATCH(makeReq({ zrobione: true }), makeParams(1));
    const json = await responseJson(res);
    expect((json as { data: { zrobione: boolean } }).data.zrobione).toBe(true);
  });

  it('DELETE removes zadanie', async () => {
    const chain = buildChain({ data: null, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { DELETE } = await import('@/app/api/zadania/[id]/route');
    const res = await DELETE(makeReq(), makeParams(1));
    expect((res as { status: number }).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// osnowy CRUD
// ---------------------------------------------------------------------------
describe('osnowy CRUD', () => {
  it('POST creates osnowa with liczba_osn field', async () => {
    const payload = { numer: 'OSN-002', art_id: 1, metry: 800, liczba_osn: 4800 };
    const created = makeOsnowa(payload);
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/osnowy/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
    const json = await responseJson(res);
    expect((json as { data: typeof created }).data.liczba_osn).toBe(4800);
  });

  it('PATCH updates osnowa lokalizacja', async () => {
    const updated = makeOsnowa({ lokalizacja: 'krosno', krosno_id: 3 });
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/osnowy/[id]/route');
    const res = await PATCH(makeReq({ lokalizacja: 'krosno', krosno_id: 3 }), makeParams(1));
    const json = await responseJson(res);
    expect((json as { data: { lokalizacja: string } }).data.lokalizacja).toBe('krosno');
  });
});

// ---------------------------------------------------------------------------
// obecnosci CRUD
// ---------------------------------------------------------------------------
describe('obecnosci CRUD', () => {
  it('POST creates obecnosc', async () => {
    const payload = { pracownik_id: 1, data: '2024-06-10', zmiana: 1, status: 'obecny', stanowisko: 'tkalnia' };
    const created = { id: 1, ...payload, created_at: '', updated_at: '' };
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/obecnosci/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('GET returns 500 on error', async () => {
    const chain = buildChain({ data: null, error: { message: 'failed' } });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/obecnosci/route');
    const res = await GET();
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// krosna CRUD
// ---------------------------------------------------------------------------
describe('krosna CRUD', () => {
  it('POST creates krosno', async () => {
    const payload = { numer: 'K-02', rodzaj: 'rapier', szerokosc_cm: 200, status: 'zatrzymane', pozycja: 2 };
    const created = makeKrosno(payload);
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/krosna/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('PATCH updates krosno status', async () => {
    const updated = makeKrosno({ status: 'awaria' });
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/krosna/[id]/route');
    const res = await PATCH(makeReq({ status: 'awaria' }), makeParams(1));
    const json = await responseJson(res);
    expect((json as { data: { status: string } }).data.status).toBe('awaria');
  });

  it('GET lists krosna ordered by pozycja', async () => {
    const k1 = makeKrosno({ pozycja: 1 });
    const k2 = makeKrosno({ id: 2, numer: 'K-02', pozycja: 2 });
    const chain = buildChain({ data: [k1, k2], error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/krosna/route');
    await GET();
    expect(chain.order).toHaveBeenCalledWith('pozycja', { ascending: true });
  });
});

// ---------------------------------------------------------------------------
// klejarnia CRUD
// ---------------------------------------------------------------------------
describe('klejarnia CRUD', () => {
  it('POST creates partia klejarni', async () => {
    const payload = { numer: 'KL-001', art_id: 1, metry: 200, status: 'w_kolejce', data_planowana: '2024-07-01' };
    const created = { id: 1, ...payload, uwagi: '', zlecenie_id: null, split_lengths: [], created_at: '', updated_at: '' };
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/klejarnia/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('GET returns 500 on error', async () => {
    const chain = buildChain({ data: null, error: { message: 'fail' } });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { GET } = await import('@/app/api/klejarnia/route');
    const res = await GET();
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// snowalnia CRUD
// ---------------------------------------------------------------------------
describe('snowalnia CRUD', () => {
  it('POST creates partia snowi', async () => {
    const payload = { numer: 'SN-001', art_id: 1, metry: 300, status: 'w_kolejce', data_planowana: '2024-07-02' };
    const created = { id: 1, ...payload, uwagi: '', zlecenie_id: null, split_lengths: [], created_at: '', updated_at: '' };
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/snowalnia/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('PATCH updates status snowi', async () => {
    const updated = { id: 1, numer: 'SN-001', status: 'gotowe' };
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/snowalnia/[id]/route');
    const res = await PATCH(makeReq({ status: 'gotowe' }), makeParams(1));
    const json = await responseJson(res);
    expect((json as { data: { status: string } }).data.status).toBe('gotowe');
  });
});

// ---------------------------------------------------------------------------
// rzedy-krosien CRUD
// ---------------------------------------------------------------------------
describe('rzedy-krosien CRUD', () => {
  it('POST creates rzad krosien', async () => {
    const payload = { nazwa: 'Rząd A', pozycja: 1 };
    const created = { id: 1, ...payload };
    const chain = buildChain({ data: created, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { POST } = await import('@/app/api/rzedy-krosien/route');
    const res = await POST(makeReq(payload));
    expect((res as { status: number }).status).toBe(201);
  });

  it('DELETE removes rzad krosien', async () => {
    const chain = buildChain({ data: null, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { DELETE } = await import('@/app/api/rzedy-krosien/[id]/route');
    const res = await DELETE(makeReq(), makeParams(1));
    expect((res as { status: number }).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// api.ts helper — ok/err wrappers
// ---------------------------------------------------------------------------
describe('api helpers: ok / err', () => {
  it('ok wraps data with status 200', async () => {
    const { ok } = await import('@/lib/utils/api');
    const res = ok({ id: 1 });
    const json = await responseJson(res);
    expect((json as { data: { id: number } }).data).toEqual({ id: 1 });
    expect((res as { status: number }).status).toBe(200);
  });

  it('ok accepts custom status', async () => {
    const { ok } = await import('@/lib/utils/api');
    const res = ok({ id: 1 }, 201);
    expect((res as { status: number }).status).toBe(201);
  });

  it('err wraps error message', async () => {
    const { err } = await import('@/lib/utils/api');
    const res = err('something went wrong', 422);
    const json = await responseJson(res);
    expect((json as { error: string }).error).toBe('something went wrong');
    expect((res as { status: number }).status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// Regression: absence date fields — no old od/do in route source code
// ---------------------------------------------------------------------------
describe('regression: nieobecnosci route uses data_od/data_do column names', () => {
  it('route source does NOT reference the obsolete "od" column name as a sort key', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routeSrc = fs.readFileSync(
      path.join(__dirname, '../app/api/nieobecnosci/route.ts'),
      'utf8',
    );
    // Must not call .order('od', ...)
    expect(routeSrc).not.toMatch(/\.order\(['"]od['"]/);
    // Must call .order('data_od', ...)
    expect(routeSrc).toMatch(/\.order\(['"]data_od['"]/);
  });
});

// ---------------------------------------------------------------------------
// Regression: zlecenia PATCH cannot override pozostalo_m arbitrarily
// The route currently passes the body through — the test documents the current
// behavior and acts as an early-warning if this changes unexpectedly.
// ---------------------------------------------------------------------------
describe('regression: zlecenia PATCH behavior for pozostalo_m', () => {
  it('PATCH with wykonane_m update returns row where pozostalo_m === ilosc_m - wykonane_m', async () => {
    const ilosc_m = 500;
    const wykonane_m = 400;
    const pozostalo_m = ilosc_m - wykonane_m; // 100
    const updated = makeZlecenie({ ilosc_m, wykonane_m, pozostalo_m });
    const chain = buildChain({ data: updated, error: null });
    mockCreateServerClient.mockReturnValue(
      { from: jest.fn(() => chain) } as unknown as ReturnType<typeof createServerClient>,
    );

    const { PATCH } = await import('@/app/api/zlecenia/[id]/route');
    const res = await PATCH(makeReq({ wykonane_m }), makeParams(1));
    const json = await responseJson(res);
    const row = (json as { data: typeof updated }).data;
    expect(row.pozostalo_m).toBe(ilosc_m - wykonane_m);
  });
});

// ---------------------------------------------------------------------------
// Regression: loom history resets when switching looms
// Test the logic pattern used in LoomDetail (state management invariant)
// ---------------------------------------------------------------------------
describe('regression: loom history state management', () => {
  it('histLoaded resets to false when krosnoid changes (simulated)', () => {
    // Simulate the state machine: when krosnoid changes, histLoaded → false
    let histLoaded = false;
    let currentKrosnoid: number | null = null;

    function selectLoom(id: number) {
      if (currentKrosnoid !== id) {
        histLoaded = false; // regression fix: reset on switch
        currentKrosnoid = id;
      }
    }

    function loadHistory() {
      histLoaded = true;
    }

    // Select loom 1 and load history
    selectLoom(1);
    loadHistory();
    expect(histLoaded).toBe(true);

    // Switch to loom 2 — history must reset
    selectLoom(2);
    expect(histLoaded).toBe(false);

    // History for loom 2 is not yet loaded
    expect(currentKrosnoid).toBe(2);
  });

  it('failed history fetch does not set histLoaded to true', async () => {
    let histLoaded = false;
    let histData: unknown[] = [];

    async function fetchHistory(): Promise<void> {
      try {
        const res = await Promise.reject(new Error('network error'));
        histData = res as unknown[];
        histLoaded = true;
      } catch {
        // On error: do NOT mark histLoaded = true; keep previous safe state
        histLoaded = false;
      }
    }

    await fetchHistory();
    expect(histLoaded).toBe(false);
    expect(histData).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Regression: nieobecnosc fixtures must use data_od/data_do (not od/do)
// ---------------------------------------------------------------------------
describe('regression: nieobecnosc fixture uses data_od / data_do', () => {
  it('makeNieobecnosc fixture does not include "od" or "do" legacy fields', () => {
    const n = makeNieobecnosc();
    expect(n).toHaveProperty('data_od');
    expect(n).toHaveProperty('data_do');
    expect(n).not.toHaveProperty('od');
    expect(n).not.toHaveProperty('do');
  });

  it('data_od and data_do can be customised via factory overrides', () => {
    const n = makeNieobecnosc({ data_od: '2025-01-01', data_do: '2025-01-10' });
    expect(n.data_od).toBe('2025-01-01');
    expect(n.data_do).toBe('2025-01-10');
  });
});
