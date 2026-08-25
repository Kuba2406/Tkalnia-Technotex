import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { parseObecnoscPayload } from '@/lib/utils/mutationValidation';

const TABLE = 'obecnosci';

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, pracownik:pracownicy(*)')
    .order('data', { ascending: false });
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  try {
    const payload = parseObecnoscPayload(await req.json(), 'create');
    const sb = createServerClient();
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) return err(error.message, 400);
    return ok(data, 201);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Nieprawidłowy payload.', 400);
  }
}
