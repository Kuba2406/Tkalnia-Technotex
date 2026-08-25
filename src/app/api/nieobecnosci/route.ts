import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { validateNieobecnoscDates } from '@/lib/domain/rules';

const TABLE = 'nieobecnosci';

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, pracownik:pracownicy(*)')
    .order('data_od', { ascending: true });
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    validateNieobecnoscDates(body);
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Błąd walidacji nieobecności', 422);
  }

  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert(body)
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(data, 201);
}
