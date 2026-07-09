import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

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
  const body = await req.json();
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert(body)
    .select()
    .single();
  if (error) return err(error.message, 400);
  return ok(data, 201);
}
