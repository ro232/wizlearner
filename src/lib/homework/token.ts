import 'server-only';
import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { WorksheetConfig } from '@/types';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { sanitizeGroupProject } from '@/components/projects/sanitize-project';
import { configForSaving } from '@/lib/worksheet/saved';
import { isSchoolLevel, sanitizeHomeworkTitle, type Homework, type HomeworkGroup, type HomeworkSheet } from './shared';

/**
 * The homework link (see shared.ts): `1.<payload>.<signature>`, all URL-safe.
 *
 *   payload    the settings as JSON, deflated, base64url. A sheet is written as its differences
 *              from BASELINE_V1, so a typical link stays short enough for WhatsApp and a QR code.
 *   signature  HMAC-SHA256 of „1.<payload>”, first 16 bytes, base64url.
 *
 * Nothing is stored anywhere: the link is the homework. Only the server holds the key, so only
 * the server can make a link (and it does so only for a paid account, see /api/tema), and a
 * changed letter anywhere in it makes it invalid.
 *
 * The key: HOMEWORK_LINK_SECRET when it is set; otherwise one derived from
 * SUPABASE_SERVICE_ROLE_KEY with HKDF under its own label, so the service key itself is never
 * used for anything else. Links made with the derived key keep working after
 * HOMEWORK_LINK_SECRET is added (both are accepted; new links use the secret).
 */

const VERSION = '1';
const LABEL = 'wizlearner-homework-v1';
const SIG_BYTES = 16;
/** Far longer than any real link; anything longer is not read at all. */
export const MAX_TOKEN_LENGTH = 4000;
const MAX_JSON = 32_768;

/**
 * The defaults the sheet differences are taken from. A frozen copy (not DEFAULT_CONFIG): when the
 * generator's defaults change, the links already sent still mean the same sheet.
 */
const BASELINE_V1: WorksheetConfig = Object.freeze({
  category: 'letters',
  alphabet: 'ro',
  letterMode: 'uppercase',
  selectedItems: [],
  customWords: [],
  difficulty: 'beginner',
  fontStyle: 'dashed',
  letterSize: 'large',
  pageSize: 'a4',
  orientation: 'portrait',
  tracingVisibility: 8,
  rowSpacing: 'normal',
  guideColor: 'gray',
  backgroundPattern: 'guides',
  rowsPerPage: 4,
  repetitionsPerItem: 1,
  showGuideLines: true,
  showDirectionalArrows: true,
  showStartDots: true,
  showLetterIcons: true,
  showRewardSection: true,
  fullPageMode: false,
  leftHandedMode: false,
  fillPage: true,
  childName: '',
  dateField: true,
  customTitle: '',
  schoolName: '',
}) as WorksheetConfig;
export const HOMEWORK_BASELINE: Readonly<WorksheetConfig> = BASELINE_V1;

const derive = (secret: string) => Buffer.from(hkdfSync('sha256', secret, '', LABEL, 32));

/**
 * The keys, the one new links are signed with first. Empty when neither variable is set:
 * then no link can be made or opened (the create route answers 503).
 */
export function homeworkKeys(env: Record<string, string | undefined> = process.env): Buffer[] {
  const keys: Buffer[] = [];
  const own = env.HOMEWORK_LINK_SECRET?.trim();
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (own) keys.push(derive(own));
  if (service) keys.push(derive(service));
  return keys;
}

/** A sheet as a link may carry it: complete and drawable (sanitizeConfig), and with no child's name. */
export function homeworkConfig(raw: unknown): WorksheetConfig {
  // The teacher's page already took the name out of the rows and the title (configForSaving needs
  // the name to find it, and only the browser has it). Here the header name is cleared once more.
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return sanitizeConfig(configForSaving(sanitizeConfig({ ...r, childName: '' })));
}

/** The settings of a /grupa sheet, without names or per-child levels. */
export function homeworkGroup(raw: unknown): HomeworkGroup {
  const g = sanitizeGroupProject(raw ?? {}) ?? sanitizeGroupProject({})!;
  const level = (raw as Record<string, unknown> | null)?.curriculumLevel;
  const out: HomeworkGroup = { letters: g.letters, letterMode: g.letterMode, script: g.script, difficulty: g.difficulty, withFind: g.withFind };
  if (g.themeId) out.themeId = g.themeId;
  if (isSchoolLevel(level)) out.curriculumLevel = level;
  return out;
}

function diff(config: WorksheetConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (k === 'childName') continue;
    if (JSON.stringify(v) !== JSON.stringify((BASELINE_V1 as unknown as Record<string, unknown>)[k])) out[k] = v;
  }
  return out;
}

const nameAt = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 60 ? v : undefined);

const b64 = (buf: Buffer) => buf.toString('base64url');
const sign = (key: Buffer, signed: string) => createHmac('sha256', key).update(signed).digest().subarray(0, SIG_BYTES);

export type HomeworkInput = HomeworkSheet & Pick<Homework, 'tier' | 'level'> & { title?: unknown; expiresAt: number };

/** Make a link token. The input is sanitized again here, whatever the caller did. */
export function createHomeworkToken(input: HomeworkInput, key: Buffer): string {
  const body: Record<string, unknown> = { v: 1, t: input.tier === 'starter' ? 's' : 'f', e: Math.floor(input.expiresAt / 1000) };
  if (input.kind === 'group') {
    body.k = 'g';
    body.c = homeworkGroup(input.group);
  } else {
    body.k = 's';
    body.c = diff(homeworkConfig(input.config));
    if (nameAt(input.nameAt) !== undefined) body.r = input.nameAt;
  }
  if (isSchoolLevel(input.level)) body.l = input.level;
  const title = sanitizeHomeworkTitle(input.title);
  if (title) body.n = title;
  const payload = b64(deflateRawSync(Buffer.from(JSON.stringify(body), 'utf8'), { level: 9 }));
  const signed = `${VERSION}.${payload}`;
  return `${signed}.${b64(sign(key, signed))}`;
}

export type VerifyResult = { ok: true; homework: Homework } | { ok: false; reason: 'invalid' | 'expired' };

const TOKEN = /^1\.([A-Za-z0-9_-]{4,})\.([A-Za-z0-9_-]{22})$/;

/** Check a link: the signature first (nothing else is read before it matches), then the expiry. */
export function verifyHomeworkToken(token: unknown, keys: Buffer[], now = Date.now()): VerifyResult {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !keys.length) return { ok: false, reason: 'invalid' };
  const m = TOKEN.exec(token);
  if (!m) return { ok: false, reason: 'invalid' };
  const signed = `${VERSION}.${m[1]}`;
  const given = Buffer.from(m[2], 'base64url');
  if (given.length !== SIG_BYTES || !keys.some((key) => timingSafeEqual(sign(key, signed), given))) return { ok: false, reason: 'invalid' };

  let body: Record<string, unknown>;
  try {
    const json = inflateRawSync(Buffer.from(m[1], 'base64url'), { maxOutputLength: MAX_JSON }).toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'invalid' };
    body = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (body.v !== 1 || typeof body.e !== 'number' || !Number.isFinite(body.e)) return { ok: false, reason: 'invalid' };
  const expiresAt = body.e * 1000;
  if (expiresAt <= now) return { ok: false, reason: 'expired' };

  const common = {
    tier: body.t === 's' ? ('starter' as const) : ('full' as const),
    title: sanitizeHomeworkTitle(body.n),
    expiresAt,
    ...(isSchoolLevel(body.l) ? { level: body.l } : {}),
  };
  if (body.k === 'g') return { ok: true, homework: { kind: 'group', group: homeworkGroup(body.c), ...common } };
  if (body.k !== 's') return { ok: false, reason: 'invalid' };
  const c = body.c && typeof body.c === 'object' && !Array.isArray(body.c) ? body.c : {};
  const at = nameAt(body.r);
  return { ok: true, homework: { kind: 'sheet', config: homeworkConfig({ ...BASELINE_V1, ...c }), ...(at !== undefined ? { nameAt: at } : {}), ...common } };
}
