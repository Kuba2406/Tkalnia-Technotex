import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

const TABLE = 'zlecenia';

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, artykul:artykuly(*)')
    .order('created_at', { ascending: false });
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payload = {
    ...body,
    wykonane_m: body.wykonane_m ?? 0,
    pozostalo_m: body.pozostalo_m ?? body.ilosc_m ?? 0,
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
