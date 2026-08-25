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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', params.id).single();
  if (error) return err(error.message, 404);
  return ok(withDerivedFields(data as ZlecenieRow));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = parseZleceniePayload(await req.json(), 'patch');

    const sb = createServerClient();
    const { data: existing, error: existingError } = await sb
      .from(TABLE)
      .select('ilosc_m, wykonane_m')
      .eq('id', params.id)
      .single();
    if (existingError || !existing) return err('Nie znaleziono zlecenia.', 404);

    const ilosc = Number(payload.ilosc_m ?? existing.ilosc_m);
    const wykonane = Number(payload.wykonane_m ?? existing.wykonane_m ?? 0);

    if (wykonane > ilosc) {
      return err('Pole "wykonane_m" nie może być większe niż "ilosc_m".', 400);
    }

    const updatePayload = {
      ...payload,
      ilosc_m: ilosc,
      wykonane_m: wykonane,
      pozostalo_m: ilosc - wykonane,
    };

    const { data, error } = await sb
      .from(TABLE)
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();
    if (error) return err(error.message, 400);
    return ok(withDerivedFields(data as ZlecenieRow));
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Nieprawidłowy payload.', 400);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { error } = await sb.from(TABLE).delete().eq('id', params.id);
  if (error) return err(error.message, 400);
  return ok(null);
}
