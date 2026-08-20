import { apiPost } from '@/lib/utils/api';

export type HistoryInput = {
  encja: string;
  encja_id: number;
  typ: string;
  opis: string;
  uzytkownik?: string;
  oddzial?: string | null;
  art_id?: number | null;
  zlecenie_id?: number | null;
  krosno_id?: number | null;
  osnowa_id?: number | null;
};

export async function saveHistory(entry: HistoryInput) {
  await apiPost('/api/historia', {
    uzytkownik: 'Operator',
    oddzial: null,
    art_id: null,
    zlecenie_id: null,
    krosno_id: null,
    osnowa_id: null,
    ...entry,
  });
}
