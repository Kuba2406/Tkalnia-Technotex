import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { parseZleceniePayload } from '@/lib/utils/mutationValidation';

const TABLE = 'zlecenia';

type ZlecenieRow = {
  ilosc_m: number;
  wykonane_m: number | null;
  pozostalo_m?: number | null;
};

function withDerivedFields<T extends ZlecenieRow>(row: T) {
  const ilosc = Number(row.ilosc_m) || 0;
  const wykonane = Number(row.wykonane_m) || 0;
  const pozostalo = Math.max(0, ilosc - wykonane);
  return { ...row, wykonane_m: wykonane, pozostalo_m: pozostalo };
}

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, artykul:artykuly(*)')
    .order('created_at', { ascending: false });
  if (error) return err(error.message, 500);
  return ok((data ?? []).map(row => withDerivedFields(row as ZlecenieRow)));
}

export async function POST(req: NextRequest) {
  try {
    const payload = parseZleceniePayload(await req.json(), 'create');
    const ilosc = Number(payload.ilosc_m ?? 0);
    const wykonane = Number(payload.wykonane_m ?? 0);
    if (wykonane > ilosc) {
      return err('Pole "wykonane_m" nie może być większe niż "ilosc_m".', 400);
    }

    const sb = createServerClient();
    const insertPayload = {
      ...payload,
      wykonane_m: wykonane,
      pozostalo_m: ilosc - wykonane,
    };

    const { data, error } = await sb
      .from(TABLE)
      .insert(insertPayload)
      .select()
      .single();
    if (error) return err(error.message, 400);
    return ok(withDerivedFields(data as ZlecenieRow), 201);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Nieprawidłowy payload.', 400);
  }
}
