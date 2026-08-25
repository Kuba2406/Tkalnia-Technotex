import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { parseObecnoscPayload } from '@/lib/utils/mutationValidation';

const TABLE = 'obecnosci';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', params.id).single();
  if (error) return err(error.message, 404);
  return ok(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = parseObecnoscPayload(await req.json(), 'patch');
    const sb = createServerClient();
    const { data, error } = await sb
      .from(TABLE)
      .update(payload)
      .eq('id', params.id)
      .select()
      .single();
    if (error) return err(error.message, 400);
    return ok(data);
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
