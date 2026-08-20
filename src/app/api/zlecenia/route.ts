import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

const TABLE = 'zlecenia';

type ZlecenieRow = Record<string, unknown> & {
  ilosc_m: number;
  wykonane_m: number;
};

function withPozostalo(row: ZlecenieRow) {
  return { ...row, pozostalo_m: row.ilosc_m - row.wykonane_m };
}

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, artykul:artykuly(*)')
    .order('created_at', { ascending: false });
  if (error) return err(error.message, 500);
  return ok((data as ZlecenieRow[]).map(withPozostalo));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.numer?.trim()) return err('Brak numeru zlecenia', 400);
  if (!body.art_id) return err('Brak artykułu', 400);
  if (!body.ilosc_m || body.ilosc_m <= 0) return err('Ilość musi być większa od 0', 400);
  if (!body.termin_realizacji) return err('Brak terminu realizacji', 400);
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert({ wykonane_m: 0, ...body })
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(withPozostalo(data as ZlecenieRow), 201);
}
