/**
 * The Romanian school curricula (programe școlare), as data.
 *
 * Every text here is copied verbatim from the official document approved by ministerial
 * order (only ş/ţ were normalised to ș/ț), read twice and cross-checked — see each file's
 * `sources` and `verification`. Do not edit a text by hand: a code or a sentence printed on a
 * teacher's worksheet must match the programme word for word.
 *
 *   et-presc     Curriculum pentru educație timpurie, nivel preșcolar (OMEN 4694/2019)
 *   clr-p-ii     Comunicare în limba română, CP – a II-a (OMEN 3418/2013)
 *   mem-p-ii     Matematică și explorarea mediului, CP – a II-a (OMEN 3418/2013)
 *   llr-iii-iv   Limba și literatura română, a III-a – a IV-a (OMEN 5003/2014)
 *   mate-iii-iv  Matematică, a III-a – a IV-a (OMEN 5003/2014)
 *
 * All five are the ones in force for school year 2026–2027 (checked 14.11.2026).
 */
import etPresc from './data/et-presc.json';
import clrPII from './data/clr-p-ii.json';
import memPII from './data/mem-p-ii.json';
import llrIIIIV from './data/llr-iii-iv.json';
import mateIIIIV from './data/mate-iii-iv.json';

/** Preschool: one band "3-6"; school: CP (clasa pregătitoare), I … IV. */
export type Level = '3-6' | 'CP' | 'I' | 'II' | 'III' | 'IV';

export type ProgrammeId = 'et-presc' | 'clr-p-ii' | 'mem-p-ii' | 'llr-iii-iv' | 'mate-iii-iv';

export interface GeneralCompetence {
  code: string;
  text: string;
}

export interface SpecificCompetence {
  level: Level;
  code: string;
  text: string;
  /** preschool only: the development domain (A–E) */
  domain?: string;
  /** preschool only: "dimensiune" (e.g. "3") or "comportament" (e.g. "3.2") */
  kind?: 'dimensiune' | 'comportament';
  /** preschool only: the dimension a behaviour belongs to */
  dimension?: string;
  /** preschool domain D only: "a" = mother tongue, "b" = Romanian as a non-native language */
  variant?: string;
}

export interface ContentGroup {
  level: Level | string;
  domain: string | null;
  subdomain?: string | null;
  items: string[];
}

export interface Programme {
  id: ProgrammeId;
  subject: string;
  levels: string[];
  order: string;
  inForce2026: { status: string; evidence: string; urls?: string[] };
  sources: { title: string; url: string; role: string }[];
  generalCompetences: GeneralCompetence[];
  specificCompetences: SpecificCompetence[];
  contents: ContentGroup[];
}

export const PROGRAMMES: Record<ProgrammeId, Programme> = {
  'et-presc': etPresc as unknown as Programme,
  'clr-p-ii': clrPII as unknown as Programme,
  'mem-p-ii': memPII as unknown as Programme,
  'llr-iii-iv': llrIIIIV as unknown as Programme,
  'mate-iii-iv': mateIIIIV as unknown as Programme,
};

/**
 * A reference to one competence. School: { programme, level, code }.
 * Preschool: codes repeat across domains, so the domain is part of the reference
 * ({ programme: 'et-presc', level: '3-6', domain: 'D', code: '3.2' }); domain D also needs
 * the variant ("a" by default — Romanian as mother tongue).
 */
export interface CompetenceRef {
  programme: ProgrammeId;
  level: Level;
  code: string;
  domain?: string;
  variant?: string;
}

export function findCompetence(ref: CompetenceRef): SpecificCompetence | undefined {
  const p = PROGRAMMES[ref.programme];
  return p.specificCompetences.find(
    (c) =>
      c.level === ref.level &&
      c.code === ref.code &&
      (ref.programme !== 'et-presc' ||
        (c.kind === 'comportament' && c.domain === ref.domain && (c.domain !== 'D' || c.variant === (ref.variant ?? 'a')))),
  );
}

/** Short subject names for labels on a sheet. */
const SHORT: Record<ProgrammeId, string> = {
  'et-presc': 'Educație timpurie',
  'clr-p-ii': 'Comunicare în limba română',
  'mem-p-ii': 'Matematică și explorarea mediului',
  'llr-iii-iv': 'Limba și literatura română',
  'mate-iii-iv': 'Matematică',
};

const LEVEL_NAME: Record<Level, string> = {
  '3-6': 'nivel preșcolar',
  CP: 'clasa pregătitoare',
  I: 'clasa I',
  II: 'clasa a II-a',
  III: 'clasa a III-a',
  IV: 'clasa a IV-a',
};

/**
 * The line printed on a sheet, e.g. "Competența 4.1 · Comunicare în limba română, clasa pregătitoare"
 * or, for preschool, "Comportament D 3.2 · Educație timpurie, nivel preșcolar".
 * Returns null for a reference that does not exist — never print an invented code.
 */
export function competenceLabel(ref: CompetenceRef): string | null {
  if (!findCompetence(ref)) return null;
  const where = `${SHORT[ref.programme]}, ${LEVEL_NAME[ref.level]}`;
  return ref.programme === 'et-presc' ? `Comportament ${ref.domain} ${ref.code} · ${where}` : `Competența ${ref.code} · ${where}`;
}

/** The specific competences of one programme and level (preschool: behaviours only). */
export function competencesFor(programme: ProgrammeId, level: Level): SpecificCompetence[] {
  return PROGRAMMES[programme].specificCompetences.filter(
    (c) => c.level === level && (programme !== 'et-presc' || c.kind === 'comportament'),
  );
}
