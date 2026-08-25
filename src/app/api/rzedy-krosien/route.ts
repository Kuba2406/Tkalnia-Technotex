import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { parseRzadKrosienPayload } from '@/lib/utils/mutationValidation';

const TABLE = 'rzedy_krosien';

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .order('pozycja', { ascending: true });
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  try {
    const payload = parseRzadKrosienPayload(await req.json(), 'create');
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
