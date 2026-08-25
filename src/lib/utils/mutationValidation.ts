const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ZADANIE_PRIORYTET = ['niski', 'sredni', 'wysoki'] as const;
const ZLECENIE_STATUS = ['nowe', 'w_trakcie', 'zrealizowane'] as const;
const ZLECENIE_PRIORYTET = ['niski', 'standard', 'wysoki', 'krytyczny'] as const;
const ZLECENIE_PRZEKAZANE_DO = ['snowalnia', 'klejarnia'] as const;
const STATUS_PRZEW = ['przewleczona', 'nieprzewleczona'] as const;
const LOKALIZACJA_OSNOWY = ['magazyn', 'przewlekalnia', 'krosno', 'snowalnia', 'klejarnia'] as const;
const STATUS_PRZEROBKI = ['w_kolejce', 'w_przygotowaniu', 'przewleczona'] as const;
const ZMIANA = [1, 2] as const;
const STATUS_OBECNOSCI = ['obecny', 'nieobecny', 'chory', 'urlop'] as const;
const STANOWISKO = ['tkalnia', 'snowalnia', 'klejarnia', 'przewlekalnia'] as const;
const TYP_NIEOBECNOSCI = ['urlop', 'chory', 'inne'] as const;
const STATUS_KROSNA = ['pracuje', 'awaria', 'zatrzymane', 'wiazanie', 'brak'] as const;
const RODZAJ_KROSNA = ['pneumatyk', 'rapier'] as const;
const STATUS_PARTII = ['w_kolejce', 'w_trakcie', 'gotowe', 'zarchiwizowane'] as const;

function validationError(message: string): never {
  throw new Error(message);
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    validationError('Payload musi być obiektem JSON.');
  }
  return payload as Record<string, unknown>;
}

function assertAllowedKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  const invalid = Object.keys(record).filter(key => !allowedSet.has(key));
  if (invalid.length) {
    validationError(`Nieobsługiwane pola: ${invalid.join(', ')}`);
  }
}

function assertPatchNotEmpty(record: Record<string, unknown>) {
  if (Object.keys(record).length === 0) {
    validationError('Brak pól do aktualizacji.');
  }
}

function parseString(value: unknown, field: string, { required = true, max = 500 }: { required?: boolean; max?: number } = {}): string {
  if (value == null || value === '') {
    if (!required) return '';
    validationError(`Pole "${field}" jest wymagane.`);
  }
  if (typeof value !== 'string') validationError(`Pole "${field}" musi być tekstem.`);
  const trimmed = value.trim();
  if (!trimmed && required) validationError(`Pole "${field}" nie może być puste.`);
  if (trimmed.length > max) validationError(`Pole "${field}" jest za długie (max ${max}).`);
  return trimmed;
}

function parseNumber(value: unknown, field: string, { min, allowNull = false }: { min?: number; allowNull?: boolean } = {}): number | null {
  if (value == null || value === '') {
    if (allowNull) return null;
    validationError(`Pole "${field}" jest wymagane.`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) validationError(`Pole "${field}" musi być liczbą.`);
  if (min != null && parsed < min) validationError(`Pole "${field}" musi być >= ${min}.`);
  return parsed;
}

function parseIntNumber(value: unknown, field: string, { min, allowNull = false }: { min?: number; allowNull?: boolean } = {}): number | null {
  const parsed = parseNumber(value, field, { min, allowNull });
  if (parsed == null) return null;
  if (!Number.isInteger(parsed)) validationError(`Pole "${field}" musi być liczbą całkowitą.`);
  return parsed;
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') validationError(`Pole "${field}" musi być true/false.`);
  return value;
}

function parseDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    validationError(`Pole "${field}" musi mieć format YYYY-MM-DD.`);
  }
  return value;
}

function parseEnum<T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value as T[number])) {
    validationError(`Pole "${field}" ma niedozwoloną wartość.`);
  }
  return value as T[number];
}

function parseNullableEnum<T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] | null {
  if (value == null || value === '') return null;
  return parseEnum(value, field, allowed);
}

function parseIntArray(value: unknown, field: string): number[] {
  if (value == null) return [];
  if (!Array.isArray(value)) validationError(`Pole "${field}" musi być tablicą.`);
  return value.map((entry, idx) => {
    const parsed = parseIntNumber(entry, `${field}[${idx}]`, { min: 0 });
    return parsed as number;
  });
}

export type ZadanieInput = {
  tekst?: string;
  priorytet?: (typeof ZADANIE_PRIORYTET)[number];
  zrobione?: boolean;
};

export function parseZadaniePayload(payload: unknown, mode: 'create' | 'patch'): ZadanieInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['tekst', 'priorytet', 'zrobione']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: ZadanieInput = {};
  if (mode === 'create' || 'tekst' in record) out.tekst = parseString(record.tekst, 'tekst', { max: 300 });
  if (mode === 'create' || 'priorytet' in record) out.priorytet = parseEnum(record.priorytet, 'priorytet', ZADANIE_PRIORYTET);
  if (mode === 'create' || 'zrobione' in record) out.zrobione = parseBoolean(record.zrobione, 'zrobione');

  return out;
}

export type ZlecenieInput = {
  numer?: string;
  art_id?: number;
  ilosc_m?: number;
  wykonane_m?: number;
  status?: (typeof ZLECENIE_STATUS)[number];
  data_utworzenia?: string;
  termin_realizacji?: string;
  priorytet?: (typeof ZLECENIE_PRIORYTET)[number];
  uwagi?: string;
  przekazane_do?: (typeof ZLECENIE_PRZEKAZANE_DO)[number] | null;
  split_lengths?: number[];
};

export function parseZleceniePayload(payload: unknown, mode: 'create' | 'patch'): ZlecenieInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['numer', 'art_id', 'ilosc_m', 'wykonane_m', 'status', 'data_utworzenia', 'termin_realizacji', 'priorytet', 'uwagi', 'przekazane_do', 'split_lengths']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: ZlecenieInput = {};
  if (mode === 'create' || 'numer' in record) out.numer = parseString(record.numer, 'numer', { max: 120 });
  if (mode === 'create' || 'art_id' in record) out.art_id = parseIntNumber(record.art_id, 'art_id', { min: 1 }) as number;
  if (mode === 'create' || 'ilosc_m' in record) out.ilosc_m = parseNumber(record.ilosc_m, 'ilosc_m', { min: 0 }) as number;
  if (mode === 'create' || 'wykonane_m' in record) out.wykonane_m = parseNumber(record.wykonane_m, 'wykonane_m', { min: 0 }) as number;
  if (mode === 'create' || 'status' in record) out.status = parseEnum(record.status, 'status', ZLECENIE_STATUS);
  if (mode === 'create' || 'data_utworzenia' in record) out.data_utworzenia = parseDate(record.data_utworzenia, 'data_utworzenia');
  if (mode === 'create' || 'termin_realizacji' in record) out.termin_realizacji = parseDate(record.termin_realizacji, 'termin_realizacji');
  if (mode === 'create' || 'priorytet' in record) out.priorytet = parseEnum(record.priorytet, 'priorytet', ZLECENIE_PRIORYTET);
  if (mode === 'create' || 'uwagi' in record) out.uwagi = parseString(record.uwagi, 'uwagi', { required: false, max: 1000 });
  if (mode === 'create' || 'przekazane_do' in record) out.przekazane_do = parseNullableEnum(record.przekazane_do, 'przekazane_do', ZLECENIE_PRZEKAZANE_DO);
  if (mode === 'create' || 'split_lengths' in record) out.split_lengths = parseIntArray(record.split_lengths, 'split_lengths');

  return out;
}

export type OsnowaInput = {
  numer?: string;
  art_id?: number;
  metry?: number | null;
  liczba_osn?: number | null;
  status_przew?: (typeof STATUS_PRZEW)[number];
  lokalizacja?: (typeof LOKALIZACJA_OSNOWY)[number];
  krosno_id?: number | null;
  status_przerobki?: (typeof STATUS_PRZEROBKI)[number] | null;
  zlecenie_id?: number | null;
};

export function parseOsnowaPayload(payload: unknown, mode: 'create' | 'patch'): OsnowaInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['numer', 'art_id', 'metry', 'liczba_osn', 'status_przew', 'lokalizacja', 'krosno_id', 'status_przerobki', 'zlecenie_id']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: OsnowaInput = {};
  if (mode === 'create' || 'numer' in record) out.numer = parseString(record.numer, 'numer', { max: 120 });
  if (mode === 'create' || 'art_id' in record) out.art_id = parseIntNumber(record.art_id, 'art_id', { min: 1 }) as number;
  if (mode === 'create' || 'metry' in record) out.metry = parseNumber(record.metry, 'metry', { min: 0, allowNull: true });
  if (mode === 'create' || 'liczba_osn' in record) out.liczba_osn = parseIntNumber(record.liczba_osn, 'liczba_osn', { min: 0, allowNull: true });
  if (mode === 'create' || 'status_przew' in record) out.status_przew = parseEnum(record.status_przew, 'status_przew', STATUS_PRZEW);
  if (mode === 'create' || 'lokalizacja' in record) out.lokalizacja = parseEnum(record.lokalizacja, 'lokalizacja', LOKALIZACJA_OSNOWY);
  if (mode === 'create' || 'krosno_id' in record) out.krosno_id = parseIntNumber(record.krosno_id, 'krosno_id', { min: 1, allowNull: true });
  if (mode === 'create' || 'status_przerobki' in record) out.status_przerobki = parseNullableEnum(record.status_przerobki, 'status_przerobki', STATUS_PRZEROBKI);
  if (mode === 'create' || 'zlecenie_id' in record) out.zlecenie_id = parseIntNumber(record.zlecenie_id, 'zlecenie_id', { min: 1, allowNull: true });

  return out;
}

export type ObecnoscInput = {
  pracownik_id?: number;
  data?: string;
  zmiana?: (typeof ZMIANA)[number];
  status?: (typeof STATUS_OBECNOSCI)[number];
  stanowisko?: (typeof STANOWISKO)[number];
};

export function parseObecnoscPayload(payload: unknown, mode: 'create' | 'patch'): ObecnoscInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['pracownik_id', 'data', 'zmiana', 'status', 'stanowisko']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: ObecnoscInput = {};
  if (mode === 'create' || 'pracownik_id' in record) out.pracownik_id = parseIntNumber(record.pracownik_id, 'pracownik_id', { min: 1 }) as number;
  if (mode === 'create' || 'data' in record) out.data = parseDate(record.data, 'data');
  if (mode === 'create' || 'zmiana' in record) {
    const parsed = parseIntNumber(record.zmiana, 'zmiana', { min: 1 }) as number;
    if (!ZMIANA.includes(parsed as (typeof ZMIANA)[number])) validationError('Pole "zmiana" ma niedozwoloną wartość.');
    out.zmiana = parsed as (typeof ZMIANA)[number];
  }
  if (mode === 'create' || 'status' in record) out.status = parseEnum(record.status, 'status', STATUS_OBECNOSCI);
  if (mode === 'create' || 'stanowisko' in record) out.stanowisko = parseEnum(record.stanowisko, 'stanowisko', STANOWISKO);

  return out;
}

export type NieobecnoscInput = {
  pracownik_id?: number;
  typ?: (typeof TYP_NIEOBECNOSCI)[number];
  data_od?: string;
  data_do?: string;
  uwagi?: string;
};

export function parseNieobecnoscPayload(payload: unknown, mode: 'create' | 'patch'): NieobecnoscInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['pracownik_id', 'typ', 'data_od', 'data_do', 'uwagi']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: NieobecnoscInput = {};
  if (mode === 'create' || 'pracownik_id' in record) out.pracownik_id = parseIntNumber(record.pracownik_id, 'pracownik_id', { min: 1 }) as number;
  if (mode === 'create' || 'typ' in record) out.typ = parseEnum(record.typ, 'typ', TYP_NIEOBECNOSCI);
  if (mode === 'create' || 'data_od' in record) out.data_od = parseDate(record.data_od, 'data_od');
  if (mode === 'create' || 'data_do' in record) out.data_do = parseDate(record.data_do, 'data_do');
  if (mode === 'create' || 'uwagi' in record) out.uwagi = parseString(record.uwagi, 'uwagi', { required: false, max: 1000 });

  return out;
}

export function validateNieobecnoscDateRange(data_od: string, data_do: string) {
  if (data_od > data_do) validationError('Pole "data_od" musi być wcześniejsze lub równe "data_do".');
}

export type KrosnoInput = {
  numer?: string;
  typ_id?: number | null;
  rodzaj?: (typeof RODZAJ_KROSNA)[number];
  szerokosc_cm?: number;
  status?: (typeof STATUS_KROSNA)[number];
  osnow_id?: number | null;
  art_id_override?: number | null;
  rzad_id?: number | null;
  pozycja?: number;
};

export function parseKrosnoPayload(payload: unknown, mode: 'create' | 'patch'): KrosnoInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['numer', 'typ_id', 'rodzaj', 'szerokosc_cm', 'status', 'osnow_id', 'art_id_override', 'rzad_id', 'pozycja']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: KrosnoInput = {};
  if (mode === 'create' || 'numer' in record) out.numer = parseString(record.numer, 'numer', { max: 120 });
  if (mode === 'create' || 'typ_id' in record) out.typ_id = parseIntNumber(record.typ_id, 'typ_id', { min: 1, allowNull: true });
  if (mode === 'create' || 'rodzaj' in record) out.rodzaj = parseEnum(record.rodzaj, 'rodzaj', RODZAJ_KROSNA);
  if (mode === 'create' || 'szerokosc_cm' in record) out.szerokosc_cm = parseNumber(record.szerokosc_cm, 'szerokosc_cm', { min: 1 }) as number;
  if (mode === 'create' || 'status' in record) out.status = parseEnum(record.status, 'status', STATUS_KROSNA);
  if (mode === 'create' || 'osnow_id' in record) out.osnow_id = parseIntNumber(record.osnow_id, 'osnow_id', { min: 1, allowNull: true });
  if (mode === 'create' || 'art_id_override' in record) out.art_id_override = parseIntNumber(record.art_id_override, 'art_id_override', { min: 1, allowNull: true });
  if (mode === 'create' || 'rzad_id' in record) out.rzad_id = parseIntNumber(record.rzad_id, 'rzad_id', { min: 1, allowNull: true });
  if (mode === 'create' || 'pozycja' in record) out.pozycja = parseIntNumber(record.pozycja, 'pozycja', { min: 0 }) as number;

  return out;
}

export type PartiaInput = {
  numer?: string;
  art_id?: number;
  metry?: number;
  status?: (typeof STATUS_PARTII)[number];
  data_planowana?: string;
  uwagi?: string;
  zlecenie_id?: number | null;
  split_lengths?: number[];
};

export function parsePartiaPayload(payload: unknown, mode: 'create' | 'patch'): PartiaInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['numer', 'art_id', 'metry', 'status', 'data_planowana', 'uwagi', 'zlecenie_id', 'split_lengths']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: PartiaInput = {};
  if (mode === 'create' || 'numer' in record) out.numer = parseString(record.numer, 'numer', { max: 120 });
  if (mode === 'create' || 'art_id' in record) out.art_id = parseIntNumber(record.art_id, 'art_id', { min: 1 }) as number;
  if (mode === 'create' || 'metry' in record) out.metry = parseNumber(record.metry, 'metry', { min: 0 }) as number;
  if (mode === 'create' || 'status' in record) out.status = parseEnum(record.status, 'status', STATUS_PARTII);
  if (mode === 'create' || 'data_planowana' in record) out.data_planowana = parseDate(record.data_planowana, 'data_planowana');
  if (mode === 'create' || 'uwagi' in record) out.uwagi = parseString(record.uwagi, 'uwagi', { required: false, max: 1000 });
  if (mode === 'create' || 'zlecenie_id' in record) out.zlecenie_id = parseIntNumber(record.zlecenie_id, 'zlecenie_id', { min: 1, allowNull: true });
  if (mode === 'create' || 'split_lengths' in record) out.split_lengths = parseIntArray(record.split_lengths, 'split_lengths');

  return out;
}

export type RzadKrosienInput = {
  nazwa?: string;
  pozycja?: number;
};

export function parseRzadKrosienPayload(payload: unknown, mode: 'create' | 'patch'): RzadKrosienInput {
  const record = asRecord(payload);
  assertAllowedKeys(record, ['nazwa', 'pozycja']);
  if (mode === 'patch') assertPatchNotEmpty(record);

  const out: RzadKrosienInput = {};
  if (mode === 'create' || 'nazwa' in record) out.nazwa = parseString(record.nazwa, 'nazwa', { required: false, max: 120 });
  if (mode === 'create' || 'pozycja' in record) out.pozycja = parseIntNumber(record.pozycja, 'pozycja', { min: 0 }) as number;

  return out;
}
