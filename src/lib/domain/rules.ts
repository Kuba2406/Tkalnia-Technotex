// ============================================================
// lib/domain/rules.ts – Centralized domain invariants V6
// ============================================================

// ---- Shared value sets ----

export const STATUSY_ZLECENIA = ['nowe', 'w_trakcie', 'zrealizowane'] as const;
export const PRIORYTETY_ZLECENIA = ['niski', 'standard', 'wysoki', 'krytyczny'] as const;
export const TYPY_NIEOBECNOSCI = ['urlop', 'chory', 'inne'] as const;

// ---- Zlecenia progress invariants ----

export interface ZlecenieProgressInput {
  ilosc_m?: number;
  wykonane_m?: number;
  pozostalo_m?: number;
}

/**
 * Validate and derive progress fields for a zlecenie mutation.
 * Returns derived `pozostalo_m` and the validated payload,
 * or throws with a user-facing message if invariants are violated.
 */
export function applyZlecenieProgressRules(
  input: ZlecenieProgressInput,
  existing?: { ilosc_m: number; wykonane_m: number },
): { ilosc_m?: number; wykonane_m?: number; pozostalo_m: number } | null {
  const ilosc_m = input.ilosc_m ?? existing?.ilosc_m;
  const wykonane_m = input.wykonane_m ?? existing?.wykonane_m;

  // If neither field is present this mutation doesn't touch progress – skip.
  if (ilosc_m === undefined && wykonane_m === undefined) return null;

  // Both must be resolvable to validate the invariant.
  if (ilosc_m === undefined || wykonane_m === undefined) {
    throw new Error('ilosc_m i wykonane_m muszą być podane razem');
  }

  if (ilosc_m < 0) throw new Error('ilosc_m nie może być ujemna');
  if (wykonane_m < 0) throw new Error('wykonane_m nie może być ujemna');
  if (wykonane_m > ilosc_m) {
    throw new Error('wykonane_m nie może przekraczać ilosc_m');
  }

  const pozostalo_m = ilosc_m - wykonane_m;

  return {
    ...(input.ilosc_m !== undefined ? { ilosc_m } : {}),
    ...(input.wykonane_m !== undefined ? { wykonane_m } : {}),
    pozostalo_m,
  };
}

// ---- Nieobecnosci date-range invariants ----

export interface NieobecnoscDateInput {
  data_od?: string;
  data_do?: string;
}

/**
 * Validate that data_od <= data_do for a nieobecnosc mutation.
 * Returns a clean payload with only the date fields present in input,
 * or throws with a user-facing message if the range is invalid.
 */
export function validateNieobecnoscDates(
  input: NieobecnoscDateInput,
  existing?: { data_od: string; data_do: string },
): void {
  const data_od = input.data_od ?? existing?.data_od;
  const data_do = input.data_do ?? existing?.data_do;

  // At least one date being mutated – need both to validate.
  if ((input.data_od !== undefined || input.data_do !== undefined) &&
      data_od !== undefined && data_do !== undefined) {
    if (data_od > data_do) {
      throw new Error('data_od nie może być późniejsza niż data_do');
    }
  }
}
