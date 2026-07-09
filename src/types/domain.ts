// ============================================================
// types/domain.ts – Domain types for Tkalnia-Technotex V2
// ============================================================

export type RodzajSnucia = 'taśmowe' | 'zespołowe';
export type RozpinkaValue = 'tak' | 'nie';

export interface Artykul {
  id: number;
  nazwa: string;
  watki_na_cm: number;
  rozpinka: RozpinkaValue;
  rodzaj_snucia: RodzajSnucia;
  szerokosc_tkaniny: number | null;
  uwagi: string;
  created_at: string;
  updated_at: string;
}

// ---- Loom types ----
export interface TypKrosna {
  id: number;
  nazwa: string;
  kolor: string;
}

// ---- Loom rows (configurable layout) ----
export interface RzadKrosien {
  id: number;
  nazwa: string;
  pozycja: number;
}

export type StatusKrosna = 'pracuje' | 'awaria' | 'zatrzymane' | 'wiazanie' | 'brak';
export type RodzajKrosna = 'pneumatyk' | 'rapier';

export interface Krosno {
  id: number;
  numer: string;
  typ_id: number | null;
  rodzaj: RodzajKrosna;
  szerokosc_cm: number;
  status: StatusKrosna;
  osnow_id: number | null;
  art_id_override: number | null;
  rzad_id: number | null;
  pozycja: number;
  created_at: string;
  updated_at: string;
  // Joined data
  typ?: TypKrosna | null;
  osnowa?: Osnowa | null;
  artykul?: Artykul | null;
  rzad?: RzadKrosien | null;
}

// ---- Warps ----
export type StatusPrzew = 'przewleczona' | 'nieprzewleczona';
export type LokalizacjaOsnowy = 'magazyn' | 'przewlekalnia' | 'krosno' | 'snowalnia' | 'klejarnia';
export type StatusPrzerobki = 'w_kolejce' | 'w_przygotowaniu' | 'przewleczona';

export interface Osnowa {
  id: number;
  numer: string;
  art_id: number;
  metry: number | null;
  status_przew: StatusPrzew;
  lokalizacja: LokalizacjaOsnowy;
  krosno_id: number | null;
  status_przerobki: StatusPrzerobki | null;
  zlecenie_id: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  artykul?: Artykul | null;
}

// ---- Production orders ----
export type StatusZlecenia = 'nowe' | 'w_trakcie' | 'zrealizowane';
export type PriorytetZlecenia = 'niski' | 'standard' | 'wysoki' | 'krytyczny';
export type PrzekazaneDo = 'snowalnia' | 'klejarnia';

export interface Zlecenie {
  id: number;
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
  created_at: string;
  updated_at: string;
  // Joined data
  artykul?: Artykul | null;
}

// ---- Employees ----
export type Stanowisko = 'tkalnia' | 'snowalnia' | 'klejarnia' | 'przewlekalnia';

export interface Pracownik {
  id: number;
  imie: string;
  nazwisko: string;
  stanowisko: Stanowisko;
  zmiana: 1 | 2;
  created_at: string;
  updated_at: string;
}

// ---- Absences ----
export type TypNieobecnosci = 'urlop' | 'chory' | 'inne';

export interface Nieobecnosc {
  id: number;
  pracownik_id: number;
  typ: TypNieobecnosci;
  od: string;
  do: string;
  uwagi: string;
  created_at: string;
  // Joined data
  pracownik?: Pracownik | null;
}

// ---- Attendance ----
export type StatusObecnosci = 'obecny' | 'nieobecny' | 'chory' | 'urlop';

export interface Obecnosc {
  id: number;
  pracownik_id: number;
  data: string;
  zmiana: 1 | 2;
  status: StatusObecnosci;
  stanowisko: Stanowisko;
  created_at: string;
  updated_at: string;
  // Joined data
  pracownik?: Pracownik | null;
}

// ---- Department batches ----
export type StatusPartii = 'w_kolejce' | 'w_trakcie' | 'gotowe' | 'zarchiwizowane';

export interface PartiaSnowalni {
  id: number;
  numer: string;
  art_id: number;
  metry: number;
  status: StatusPartii;
  data_planowana: string;
  uwagi: string;
  zlecenie_id: number | null;
  split_lengths: number[];
  created_at: string;
  updated_at: string;
  // Joined data
  artykul?: Artykul | null;
  zlecenie?: Zlecenie | null;
}

export interface PartiaKlejarni {
  id: number;
  numer: string;
  art_id: number;
  metry: number;
  status: StatusPartii;
  data_planowana: string;
  uwagi: string;
  zlecenie_id: number | null;
  split_lengths: number[];
  created_at: string;
  updated_at: string;
  // Joined data
  artykul?: Artykul | null;
  zlecenie?: Zlecenie | null;
}

// ---- History ----
export interface WpisHistorii {
  id: number;
  encja: string;
  encja_id: number;
  typ: string;
  opis: string;
  uzytkownik: string;
  created_at: string;
}

// ---- Tasks (NEW in V2) ----
export type PriorytetZadania = 'niski' | 'sredni' | 'wysoki';

export interface Zadanie {
  id: number;
  tekst: string;
  priorytet: PriorytetZadania;
  zrobione: boolean;
  created_at: string;
  updated_at: string;
}

// ---- API response helpers ----
export type ApiResponse<T> = { data: T } | { error: string };
