import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api';
import { applyZlecenieProgressRules } from '@/lib/domain/rules';

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

  try {
    const progress = applyZlecenieProgressRules(body);
    if (progress) Object.assign(body, progress);
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Błąd walidacji zlecenia', 422);
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
