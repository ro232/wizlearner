import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createHomeworkToken, homeworkKeys, type HomeworkInput } from '@/lib/homework/token';
import { homeworkDays, isSchoolLevel } from '@/lib/homework/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 20_000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Make a „Temă pentru acasă” link (see src/lib/homework). Only for a signed-in account on a paid
 * plan, read here on the server from users_profile.tier (which only the server can change), so
 * the free download for parents can never be a way around the plans. Nothing is written
 * anywhere: the signed link is the homework.
 *
 * The page sends the sheet without the child's name (configForSaving); the name is cleared here
 * once more. Body: { kind: 'sheet', config, nameAt? } | { kind: 'group', group }, plus title, days, level.
 */
export async function POST(request: Request) {
  const keys = homeworkKeys();
  if (!keys.length) {
    console.error('[homework] HOMEWORK_LINK_SECRET and SUPABASE_SERVICE_ROLE_KEY are both missing: homework links are off');
    return NextResponse.json({ error: 'Temele nu sunt încă active.', code: 'homework_off' }, { status: 503 });
  }

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: 'Intră în cont ca să trimiți teme.' }, { status: 401 });

  const { data: profile, error } = await supabase.from('users_profile').select('tier').eq('id', user.id).single();
  if (error && !profile) {
    console.error('[homework] could not read the plan', error);
    return NextResponse.json({ error: 'Nu am putut verifica abonamentul. Încearcă din nou.' }, { status: 502 });
  }
  const tier = (profile as { tier?: unknown } | null)?.tier;
  if (tier !== 'starter' && tier !== 'full') {
    return NextResponse.json({ error: 'Temele pentru acasă sunt incluse în abonament.', code: 'paid_only' }, { status: 403 });
  }

  const text = await request.text().catch(() => '');
  if (text.length > MAX_BODY) return NextResponse.json({ error: 'Fișa este prea mare pentru un link.' }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(text || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Cerere greșită.' }, { status: 400 });
  }

  const days = homeworkDays(body.days);
  const expiresAt = Date.now() + days * DAY;
  const common = { tier: tier as 'starter' | 'full', title: body.title, expiresAt, ...(isSchoolLevel(body.level) ? { level: body.level } : {}) };
  let input: HomeworkInput;
  if (body.kind === 'group') input = { kind: 'group', group: body.group as never, ...common };
  else if (body.kind === 'sheet' && body.config && typeof body.config === 'object') input = { kind: 'sheet', config: body.config as never, ...(typeof body.nameAt === 'number' ? { nameAt: body.nameAt } : {}), ...common };
  else return NextResponse.json({ error: 'Cerere greșită.' }, { status: 400 });

  const token = createHomeworkToken(input, keys[0]);
  return NextResponse.json({ token, expiresAt: Math.floor(expiresAt / 1000) * 1000, days }, { headers: { 'Cache-Control': 'no-store' } });
}
