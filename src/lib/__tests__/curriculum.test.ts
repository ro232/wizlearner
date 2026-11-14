import { describe, expect, it } from 'vitest';
import { PROGRAMMES, competenceLabel, competencesFor, findCompetence, type ProgrammeId } from '@/lib/curriculum';

const IDS = Object.keys(PROGRAMMES) as ProgrammeId[];

describe('the curricula as data', () => {
  it('each programme names its approving order and its official source, and is in force', () => {
    for (const id of IDS) {
      const p = PROGRAMMES[id];
      expect(p.order, id).toMatch(/nr\.\s?\d/);
      expect(p.sources.some((s) => s.role === 'primary' && /^https:\/\//.test(s.url)), id).toBe(true);
      expect(p.inForce2026.status, id).toBe('da');
    }
  });

  it('texts are normalised: comma-below ș ț, no cedilla, no stray whitespace', () => {
    for (const id of IDS) {
      const p = PROGRAMMES[id];
      const texts = [
        ...p.generalCompetences.map((c) => c.text),
        ...p.specificCompetences.map((c) => c.text),
        ...p.contents.flatMap((c) => c.items),
      ];
      for (const t of texts) {
        expect(t, `${id}: ${t}`).not.toMatch(/[şţŞŢ]/);
        expect(t, `${id}: ${t}`).toBe(t.trim());
        expect(t.length, `${id}: empty text`).toBeGreaterThan(1);
      }
    }
  });

  it('codes are unique and belong to a general competence of the programme', () => {
    for (const id of IDS.filter((x) => x !== 'et-presc')) {
      const p = PROGRAMMES[id];
      const general = new Set(p.generalCompetences.map((g) => g.code));
      const seen = new Set<string>();
      for (const c of p.specificCompetences) {
        const key = `${c.level}|${c.code}`;
        expect(seen.has(key), `${id}: duplicate ${key}`).toBe(false);
        seen.add(key);
        expect(general.has(c.code.split('.')[0]), `${id}: ${key} has no general competence`).toBe(true);
        expect(p.levels, `${id}: level ${c.level}`).toContain(c.level);
      }
    }
  });

  it('the counts read from the official documents', () => {
    const count = (id: ProgrammeId, level: string) => PROGRAMMES[id].specificCompetences.filter((c) => c.level === level).length;
    expect(PROGRAMMES['clr-p-ii'].generalCompetences).toHaveLength(4);
    for (const l of ['CP', 'I', 'II']) expect(count('clr-p-ii', l)).toBe(15);
    expect(PROGRAMMES['mem-p-ii'].generalCompetences).toHaveLength(6);
    expect([count('mem-p-ii', 'CP'), count('mem-p-ii', 'I'), count('mem-p-ii', 'II')]).toEqual([17, 18, 18]);
    expect(PROGRAMMES['llr-iii-iv'].generalCompetences).toHaveLength(4);
    expect([count('llr-iii-iv', 'III'), count('llr-iii-iv', 'IV')]).toEqual([21, 21]);
    expect(PROGRAMMES['mate-iii-iv'].generalCompetences).toHaveLength(5);
    expect([count('mate-iii-iv', 'III'), count('mate-iii-iv', 'IV')]).toEqual([14, 14]);
    // preschool: 5 domains, 19 dimensions, 61 behaviours (domain D in two variants)
    const et = PROGRAMMES['et-presc'];
    expect(et.generalCompetences.map((g) => g.code)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(et.specificCompetences.filter((c) => c.kind === 'dimensiune')).toHaveLength(19);
    expect(et.specificCompetences.filter((c) => c.kind === 'comportament')).toHaveLength(61);
  });

  it('spot checks against the documents, word for word', () => {
    expect(findCompetence({ programme: 'clr-p-ii', level: 'CP', code: '4.1' })?.text).toBe(
      'Trasarea elementelor grafice și a contururilor literelor, folosind resurse variate',
    );
    expect(findCompetence({ programme: 'clr-p-ii', level: 'I', code: '4.1' })?.text).toBe('Scrierea literelor de mână');
    expect(findCompetence({ programme: 'mem-p-ii', level: 'CP', code: '1.1' })).toBeDefined();
    // "diferențiează" is how the official document spells it (a typo there, kept verbatim)
    expect(findCompetence({ programme: 'et-presc', level: '3-6', domain: 'D', code: '3.2' })?.text).toBe(
      'Discriminează/diferențiează fonetic cuvinte, silabe, sunete și asociază sunete cu litere',
    );
    expect(findCompetence({ programme: 'et-presc', level: '3-6', domain: 'E', code: '2.1' })?.text).toBe(
      'Demonstrează familiarizarea cu conceptul de număr și cu numerația',
    );
    // the pregătitoare number range, as the programme says it
    const cpNumbers = PROGRAMMES['mem-p-ii'].contents.find((c) => c.level === 'CP' && c.domain === 'Numere');
    expect(cpNumbers?.items.join(' ')).toContain('Numerele naturale 0-31');
  });

  it('labels: printed only for codes that exist', () => {
    expect(competenceLabel({ programme: 'clr-p-ii', level: 'CP', code: '4.1' })).toBe(
      'Competența 4.1 · Comunicare în limba română, clasa pregătitoare',
    );
    expect(competenceLabel({ programme: 'et-presc', level: '3-6', domain: 'D', code: '3.4' })).toBe(
      'Comportament D 3.4 · Educație timpurie, nivel preșcolar',
    );
    expect(competenceLabel({ programme: 'clr-p-ii', level: 'CP', code: '9.9' })).toBeNull();
    expect(competenceLabel({ programme: 'et-presc', level: '3-6', code: '3.2' })).toBeNull(); // domain missing
    expect(competencesFor('clr-p-ii', 'II')).toHaveLength(15);
    expect(competencesFor('et-presc', '3-6').every((c) => c.kind === 'comportament')).toBe(true);
  });
});
