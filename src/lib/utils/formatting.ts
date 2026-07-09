// ============================================================
// lib/utils/formatting.ts – Date, label and status helpers
// ============================================================

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}.${m}.${y}`;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function stanowiskoLabel(s: string): string {
  const map: Record<string, string> = {
    tkalnia: 'Tkalnia',
    snowalnia: 'Snowalnia',
    klejarnia: 'Klejarnia',
    przewlekalnia: 'Przewlekalnia',
  };
  return map[s] || s;
}

export function statusZleceniaLabel(s: string): string {
  const map: Record<string, string> = {
    nowe: 'Nowe',
    w_trakcie: 'W trakcie',
    zrealizowane: 'Zrealizowane',
  };
  return map[s] || s;
}

export function statusZleceniaBadge(s: string): string {
  const map: Record<string, string> = {
    nowe: 'badge-info',
    w_trakcie: 'badge-warning',
    zrealizowane: 'badge-success',
  };
  return map[s] || 'badge-grey';
}

export function statusPartiiLabel(s: string): string {
  const map: Record<string, string> = {
    w_kolejce: 'W kolejce',
    w_trakcie: 'W trakcie',
    gotowe: 'Gotowe',
    zarchiwizowane: 'Zarchiwizowane',
  };
  return map[s] || s;
}

export function statusPartiiBadge(s: string): string {
  const map: Record<string, string> = {
    w_kolejce: 'badge-grey',
    w_trakcie: 'badge-warning',
    gotowe: 'badge-success',
    zarchiwizowane: 'badge-info',
  };
  return map[s] || 'badge-grey';
}

export function statusPrzerobkiLabel(s: string): string {
  const map: Record<string, string> = {
    w_kolejce: 'W kolejce',
    w_przygotowaniu: 'W przygotowaniu',
    przewleczona: 'Przewleczona',
  };
  return map[s] || s;
}

export function statusPrzerobkiBadge(s: string): string {
  const map: Record<string, string> = {
    w_kolejce: 'badge-grey',
    w_przygotowaniu: 'badge-warning',
    przewleczona: 'badge-success',
  };
  return map[s] || 'badge-grey';
}

export function priorytetLabel(s: string): string {
  const map: Record<string, string> = {
    niski: 'Niski',
    standard: 'Standard',
    wysoki: 'Wysoki',
    krytyczny: 'Krytyczny',
  };
  return map[s] || s;
}

export function priorytetBadge(s: string): string {
  const map: Record<string, string> = {
    niski: 'badge-grey',
    standard: 'badge-info',
    wysoki: 'badge-warning',
    krytyczny: 'badge-danger',
  };
  return map[s] || 'badge-grey';
}

export function statusKrosnaLabel(s: string): string {
  const map: Record<string, string> = {
    pracuje: 'Pracuje',
    awaria: 'Awaria',
    zatrzymane: 'Zatrzymane',
    wiazanie: 'Wiązanie/Przeróbka',
    brak: 'Brak statusu',
  };
  return map[s] || s;
}

export function statusKrosnaLamp(s: string): string {
  const map: Record<string, string> = {
    pracuje: 'lamp-pracuje',
    awaria: 'lamp-awaria',
    zatrzymane: 'lamp-zatrzymane',
    wiazanie: 'lamp-wiazanie',
    brak: 'lamp-brak',
  };
  return map[s] || 'lamp-brak';
}

export function statusObecnosciLabel(s: string): string {
  const map: Record<string, string> = {
    obecny: 'Obecny',
    nieobecny: 'Nieobecny',
    chory: 'Chory',
    urlop: 'Urlop',
  };
  return map[s] || s;
}

export function statusObecnosciBadge(s: string): string {
  const map: Record<string, string> = {
    obecny: 'badge-success',
    nieobecny: 'badge-danger',
    chory: 'badge-warning',
    urlop: 'badge-info',
  };
  return map[s] || 'badge-grey';
}

export function priorytetZadaniaBadge(s: string): string {
  const map: Record<string, string> = {
    niski: 'badge-grey',
    sredni: 'badge-info',
    wysoki: 'badge-danger',
  };
  return map[s] || 'badge-grey';
}

export function priorytetZadaniaLabel(s: string): string {
  const map: Record<string, string> = {
    niski: 'Niski',
    sredni: 'Średni',
    wysoki: 'Wysoki',
  };
  return map[s] || s;
}

export function loomWidth(szerokoscCm: number): number {
  const base = 88;
  const extra = Math.max(0, szerokoscCm - 140) * 0.4;
  return Math.round(Math.min(base + extra, 140));
}

// Generate year-month string: 2025-06
export function yearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Get all days of a month as YYYY-MM-DD strings
export function daysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Polish short day names (Mon-Sun starting)
export const DAYS_PL_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export function dayOfWeek(dateStr: string): number {
  // Returns 0=Mon ... 6=Sun
  const d = new Date(dateStr);
  return (d.getDay() + 6) % 7;
}
