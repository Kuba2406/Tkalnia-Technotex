import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';

const TABLE = 'historia';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encja = searchParams.get('encja');
  const encjaId = searchParams.get('encja_id');
  const oddzial = searchParams.get('oddzial');
  const artId = searchParams.get('art_id');
  const zlecenieId = searchParams.get('zlecenie_id');
  const krosnoId = searchParams.get('krosno_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const limit = parseInt(searchParams.get('limit') || '100');

  const sb = createServerClient();
  let query = sb
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (encja) query = query.eq('encja', encja);
  if (encjaId) query = query.eq('encja_id', parseInt(encjaId));
  if (oddzial) query = query.eq('oddzial', oddzial);
  if (artId) query = query.eq('art_id', parseInt(artId));
  if (zlecenieId) query = query.eq('zlecenie_id', parseInt(zlecenieId));
  if (krosnoId) query = query.eq('krosno_id', parseInt(krosnoId));
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

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
