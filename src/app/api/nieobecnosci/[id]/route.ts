import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { validateNieobecnoscDates } from '@/lib/domain/rules';

const TABLE = 'nieobecnosci';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', params.id).single();
  if (error) return err(error.message, 404);
  return ok(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const sb = createServerClient();

  // Fetch existing record to resolve the full date range for partial updates.
  const { data: existing, error: fetchError } = await sb
    .from(TABLE)
    .select('data_od, data_do')
    .eq('id', params.id)
    .single();
  if (fetchError) return err(fetchError.message, 404);

  try {
    validateNieobecnoscDates(body, existing as { data_od: string; data_do: string });
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Błąd walidacji nieobecności', 422);
  }

  const { data, error } = await sb
    .from(TABLE)
    .update(body)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { error } = await sb.from(TABLE).delete().eq('id', params.id);
  if (error) return err(error.message, 400);
  return ok(null);
}
