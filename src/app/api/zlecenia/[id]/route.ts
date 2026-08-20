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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', params.id).single();
  if (error) return err(error.message, 404);
  return ok(withPozostalo(data as ZlecenieRow));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Remove computed field so it is never written to DB
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pozostalo_m: _drop, ...patch } = body as Record<string, unknown>;
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(withPozostalo(data as ZlecenieRow));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { error } = await sb.from(TABLE).delete().eq('id', params.id);
  if (error) return err(error.message, 400);
  return ok(null);
}
