import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

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
  const payload = {
    ...body,
    data_od: body.data_od ?? body.od,
    data_do: body.data_do ?? body.do,
  };
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(data, 201);
}
