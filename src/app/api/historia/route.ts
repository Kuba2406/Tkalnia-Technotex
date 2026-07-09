import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

const TABLE = 'historia';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encja = searchParams.get('encja');
  const encjaId = searchParams.get('encja_id');
  const limit = parseInt(searchParams.get('limit') || '100');

  const sb = createServerClient();
  let query = sb
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (encja) query = query.eq('encja', encja);
  if (encjaId) query = query.eq('encja_id', parseInt(encjaId));

  const { data, error } = await query;
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
