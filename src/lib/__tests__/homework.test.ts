import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { configForSaving } from '@/lib/worksheet/saved';
import { presetConfig, presetById } from '@/lib/curriculum/presets';
import { HOMEWORK_BASELINE, MAX_TOKEN_LENGTH, createHomeworkToken, homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { QR_MAX_URL, homeworkShareText, sanitizeHomeworkTitle, whatsappLink, type Homework } from '@/lib/homework/shared';
import { homeworkPages, homeworkSheetConfig, nameRowIndex } from '@/lib/homework/pages';
import { ALLOWED_PROPS, redactHomeworkUrls } from '@/lib/analytics';
import sitemap from '@/app/sitemap';

const KEY = homeworkKeys({ HOMEWORK_LINK_SECRET: 'test-secret-0123456789abcdef' })[0];
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 24, 12);

const sheet = (over: Partial<WorksheetConfig> = {}): WorksheetConfig => sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['A', 'M', 'Ș'], ...over });
const make = (config: WorksheetConfig, extra: Partial<Homework> = {}) =>
  createHomeworkToken({ kind: 'sheet', config, tier: 'full', expiresAt: NOW + 30 * DAY, ...extra } as never, KEY);
const open = (token: string, now = NOW) => verifyHomeworkToken(token, [KEY], now);
const payloadJson = (token: string) => inflateRawSync(Buffer.from(token.split('.')[1], 'base64url')).toString('utf8');

describe('homework link: sign and verify', () => {
  it('round-trips a sheet: the decoded settings are exactly what sanitizeConfig makes of them', () => {
    const config = sheet({ customWords: ['MAMA', 'CASA'], fontStyle: 'dotted', mathSeed: 42, curriculumLevel: 'CP', customTitle: 'Litera M' });
    const res = open(make(config, { level: 'CP', title: 'Tema de weekend' }));
    expect(res.ok).toBe(true);
    if (!res.ok || res.homework.kind !== 'sheet') throw new Error('not a sheet');
    expect(res.homework.config).toEqual(sanitizeConfig({ ...config, childName: '' }));
    expect(res.homework).toMatchObject({ tier: 'full', level: 'CP', title: 'Tema de weekend', expiresAt: Math.floor((NOW + 30 * DAY) / 1000) * 1000 });
  });

  it('round-trips every ready-made sheet of „Fișe pe programă”', () => {
    for (const id of ['litere-tipar', 'litere-mana', 'grafisme', 'cifre', 'mate-adunari', 'mate-compara']) {
      const preset = presetById(id);
      expect(preset, id).toBeTruthy();
      if (!preset) continue;
      const config = sanitizeConfig(presetConfig(preset, 'I'));
      const res = open(make(config));
      expect(res.ok && res.homework.kind === 'sheet' && res.homework.config).toEqual(sanitizeConfig({ ...config, childName: '' }));
    }
  });

  it('round-trips a /grupa sheet without any child', () => {
    const token = createHomeworkToken(
      { kind: 'group', group: { themeId: 'toamna', letters: ['M', 'A'], letterMode: 'uppercase', script: 'print', difficulty: 'intermediate', withFind: true, curriculumLevel: 'presc', names: ['Ana'], levels: { Ana: 'advanced' } } as never, tier: 'full', expiresAt: NOW + 7 * DAY },
      KEY,
    );
    const res = open(token);
    expect(res.ok && res.homework.kind === 'group' && res.homework.group).toEqual(expect.objectContaining({ letters: ['M', 'A'], difficulty: 'intermediate', withFind: true, curriculumLevel: 'presc' }));
    expect(payloadJson(token)).not.toMatch(/Ana|advanced|names|levels/);
  });

  it('rejects a link changed anywhere: payload, signature, version', () => {
    const token = make(sheet());
    const [v, p, s] = token.split('.');
    const flip = (str: string, i: number) => str.slice(0, i) + (str[i] === 'A' ? 'B' : 'A') + str.slice(i + 1);
    expect(open(`${v}.${flip(p, 3)}.${s}`)).toEqual({ ok: false, reason: 'invalid' });
    expect(open(`${v}.${p}.${flip(s, 5)}`)).toEqual({ ok: false, reason: 'invalid' });
    expect(open(`2.${p}.${s}`)).toEqual({ ok: false, reason: 'invalid' });
    expect(open(`${v}.${p}`)).toEqual({ ok: false, reason: 'invalid' });
    expect(open('')).toEqual({ ok: false, reason: 'invalid' });
    expect(open('x'.repeat(MAX_TOKEN_LENGTH + 1))).toEqual({ ok: false, reason: 'invalid' });
    expect(verifyHomeworkToken(token, homeworkKeys({ HOMEWORK_LINK_SECRET: 'another-secret' }), NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(verifyHomeworkToken(token, [], NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('a link signed with a different payload under the right key but a forged tier is still checked by signature', () => {
    // a teacher on Starter cannot turn their link into a Full one: the tier is inside the signed part
    const token = createHomeworkToken({ kind: 'sheet', config: sheet(), tier: 'starter', expiresAt: NOW + DAY } as never, KEY);
    const res = open(token);
    expect(res.ok && res.homework.tier).toBe('starter');
  });

  it('expires', () => {
    const token = make(sheet(), { expiresAt: NOW + 7 * DAY } as never);
    expect(open(token, NOW + 7 * DAY - 2000).ok).toBe(true);
    expect(open(token, NOW + 7 * DAY + 1000)).toEqual({ ok: false, reason: 'expired' });
  });

  it('keeps working after HOMEWORK_LINK_SECRET is added to a site that signed with the derived key', () => {
    const before = homeworkKeys({ SUPABASE_SERVICE_ROLE_KEY: 'service-role' });
    const after = homeworkKeys({ SUPABASE_SERVICE_ROLE_KEY: 'service-role', HOMEWORK_LINK_SECRET: 'new-secret-xyz' });
    const token = createHomeworkToken({ kind: 'sheet', config: sheet(), tier: 'full', expiresAt: NOW + DAY } as never, before[0]);
    expect(verifyHomeworkToken(token, after, NOW).ok).toBe(true);
    // the service key itself is never the HMAC key: it is derived under the homework label
    expect(before[0].toString('utf8')).not.toContain('service-role');
    expect(before[0].length).toBe(32);
    expect(homeworkKeys({})).toEqual([]);
  });
});

describe('homework link: no child names', () => {
  it('the name is not in the link, not in the rows, not in a title that quotes it', () => {
    const teacher = sheet({ childName: 'Ștefan Popescu', customWords: ['Ștefan', 'MAMA'], customTitle: 'Fișa lui Ștefan' });
    // what the teacher's page sends (configForSaving), and what the server makes of it
    const token = make(configForSaving(teacher), { nameAt: nameRowIndex(teacher) } as never);
    const json = payloadJson(token);
    expect(json).not.toMatch(/tefan|Popescu/i);
    const res = open(token);
    if (!res.ok || res.homework.kind !== 'sheet') throw new Error('not a sheet');
    expect(res.homework.config.childName).toBe('');
    expect(res.homework.config.customWords).toEqual(['MAMA']);
    expect(res.homework.config.customTitle).toBe('');
    // the row of the name is kept as a position only; the parent's name goes there, on the phone
    expect(res.homework.nameAt).toBe(0);
    expect(homeworkSheetConfig(res.homework, 'Ioana').customWords).toEqual(['Ioana', 'MAMA']);
    expect(homeworkSheetConfig(res.homework, '').customWords).toEqual(['MAMA']);
  });

  it('the server clears the header name even when a page forgot to', () => {
    const token = make(sheet({ childName: 'Maria' }));
    expect(payloadJson(token)).not.toContain('Maria');
    const res = open(token);
    expect(res.ok && res.homework.kind === 'sheet' && res.homework.config.childName).toBe('');
  });

  it('the parent’s name is drawn into the pages, on the phone', () => {
    const res = open(make(sheet()));
    if (!res.ok) throw new Error('invalid');
    const text = JSON.stringify(homeworkPages(res.homework, '  Ana   Maria '));
    expect(text).toContain('Nume: Ana Maria');
    expect(JSON.stringify(homeworkPages(res.homework, ''))).toContain('Nume: ______________');
  });
});

describe('homework title', () => {
  it('is one short line of plain text, without addresses or e-mails', () => {
    expect(sanitizeHomeworkTitle('  Tema 3.2\n– litera M. ')).toBe('Tema 3.2 – litera M.');
    expect(sanitizeHomeworkTitle('Vezi https://evil.example/x și www.spam.ro')).toBe('Vezi și');
    expect(sanitizeHomeworkTitle('scrie la ana@scoala.ro sau pe site.com')).toBe('scrie la sau pe');
    expect(sanitizeHomeworkTitle('<b>Tema</b>')).toBe('bTema/b');
    expect(sanitizeHomeworkTitle('x'.repeat(200))).toHaveLength(60);
    expect(sanitizeHomeworkTitle(42)).toBe('');
    const res = open(make(sheet(), { title: 'Tema de pe https://x.ro' }));
    expect(res.ok && res.homework.title).toBe('Tema de pe');
  });

  it('the share text carries the link and the title', () => {
    const text = homeworkShareText('https://site.test/tema/abc', 'Litera M');
    expect(text).toContain('„Litera M”');
    expect(text).toContain('https://site.test/tema/abc');
    expect(whatsappLink(text)).toMatch(/^https:\/\/wa\.me\/\?text=Bun/);
  });
});

describe('homework link size', () => {
  const sizes: Record<string, number> = {};
  const url = (t: string) => `https://wizlearner.vercel.app/tema/${t}`.length;
  it('stays short for typical sheets (QR code shown below the limit)', () => {
    const cases: Record<string, WorksheetConfig> = {
      'letters A M Ș': sheet(),
      'letters + 6 words': sheet({ customWords: ['MAMA', 'TATA', 'CASA', 'MERE', 'PARA', 'NUCI'], customTitle: 'Cuvinte cu M', schoolName: 'Grădinița nr. 12' }),
      'math add 0-20': sanitizeConfig({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add', 'sub'], mathRange: 20, mathSeed: 123456, mathAnswers: true, curriculumLevel: 'I' }),
      'games read:match:2': sanitizeConfig({ ...DEFAULT_CONFIG, category: 'games', selectedItems: ['read:match:2', 'read:gap:2'], curriculumLevel: 'CP' }),
      'full alphabet': sheet({ selectedItems: 'AĂÂBCDEFGHIÎJKLMNOPQRSȘTȚUVWXYZ'.split('') }),
    };
    for (const [name, config] of Object.entries(cases)) {
      const token = make(config, { title: 'Tema pentru weekend – litera M', level: 'CP' } as never);
      sizes[name] = url(token);
      expect(open(token).ok).toBe(true);
    }
    console.info('homework link lengths (full URL):', sizes);
    for (const [name, n] of Object.entries(sizes)) expect(n, name).toBeLessThan(QR_MAX_URL);
    expect(sizes['letters A M Ș']).toBeLessThan(220);
  });

  it('the baseline the sheets are written against is a complete, valid sheet', () => {
    expect(sanitizeConfig(HOMEWORK_BASELINE)).toEqual(HOMEWORK_BASELINE);
  });
});

describe('homework analytics and indexing', () => {
  it('the events use only allow-listed keys', () => {
    for (const key of ['kind', 'category', 'days', 'level', 'tier', 'format', 'pages', 'named']) expect(ALLOWED_PROPS.has(key), key).toBe(true);
  });

  it('the link never reaches analytics in a page URL', () => {
    const event = { event: '$pageview', properties: { $current_url: 'https://site.test/tema/1.abc_D-e.sig?x=1', $pathname: '/tema/1.abc.sig', $referrer: 'https://site.test/generator', $set: { $initial_current_url: 'https://site.test/tema/1.zz.yy' } } };
    expect(redactHomeworkUrls(event).properties).toEqual({ $current_url: 'https://site.test/tema/_?x=1', $pathname: '/tema/_', $referrer: 'https://site.test/generator', $set: { $initial_current_url: 'https://site.test/tema/_' } });
  });

  it('the homework pages are not in the sitemap', () => {
    expect(sitemap().some((e) => /\/tema\//.test(e.url))).toBe(false);
  });
});

// ── POST /api/tema ─────────────────────────────────────────────────────────────────────────────
let user: { id: string } | null = { id: 'u-1' };
let profile: { tier: string } | null = { tier: 'full' };
const query = { select: () => query, eq: () => query, single: async () => ({ data: profile, error: profile ? null : { message: 'no row' } }) };
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => query }) }));

describe('POST /api/tema', () => {
  const post = async (body: unknown) =>
    (await import('@/app/api/tema/route')).POST(new Request('https://site.test/api/tema', { method: 'POST', body: JSON.stringify(body) }));
  const body = { kind: 'sheet', config: { ...DEFAULT_CONFIG, selectedItems: ['M'], childName: 'Ana' }, title: 'Litera M', days: 7, level: 'CP' };

  beforeEach(() => {
    vi.stubEnv('HOMEWORK_LINK_SECRET', 'test-secret-0123456789abcdef');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    user = { id: 'u-1' };
    profile = { tier: 'full' };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('makes a signed link for a paid account, without the child’s name, expiring when asked', async () => {
    const res = await post(body);
    expect(res.status).toBe(200);
    const { token, expiresAt, days } = await res.json();
    expect(days).toBe(7);
    expect(Math.abs(expiresAt - (Date.now() + 7 * DAY))).toBeLessThan(5000);
    expect(payloadJson(token)).not.toContain('Ana');
    const opened = verifyHomeworkToken(token, homeworkKeys());
    expect(opened.ok && opened.homework).toMatchObject({ kind: 'sheet', tier: 'full', level: 'CP', title: 'Litera M' });
    expect(opened.ok && opened.homework.kind === 'sheet' && opened.homework.config.childName).toBe('');
  });

  it('refuses a free account (403) and asks a visitor to sign in (401)', async () => {
    profile = { tier: 'free' };
    const res = await post(body);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'paid_only' });
    user = null;
    expect((await post(body)).status).toBe(401);
  });

  it('a tier sent by the browser counts for nothing', async () => {
    profile = { tier: 'free' };
    expect((await post({ ...body, tier: 'full' })).status).toBe(403);
  });

  it('is off (503, a friendly message) when no secret is configured', async () => {
    vi.stubEnv('HOMEWORK_LINK_SECRET', '');
    const res = await post(body);
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ error: 'Temele nu sunt încă active.' });
    expect(text).not.toMatch(/SECRET|SUPABASE|KEY/);
  });

  it('works with only the service role key (derived secret)', async () => {
    vi.stubEnv('HOMEWORK_LINK_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    expect((await post(body)).status).toBe(200);
  });

  it('answers 400 to a request it cannot read, 413 to a huge one', async () => {
    expect((await post({ kind: 'nimic' })).status).toBe(400);
    expect((await post({ kind: 'sheet', config: { customWords: ['x'.repeat(30_000)] } })).status).toBe(413);
  });
});
