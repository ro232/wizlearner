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
    // Arte vizuale și abilități practice: 2 general, 9 specific in each class (1.1–1.3, 2.1–2.6)
    expect(PROGRAMMES['avap-p-ii'].generalCompetences).toHaveLength(2);
    expect([count('avap-p-ii', 'CP'), count('avap-p-ii', 'I'), count('avap-p-ii', 'II')]).toEqual([9, 9, 9]);
    // Dezvoltare personală: 3 general, 8 specific in each class; clasa a II-a has 1.1 and 1.3 (no 1.2), as printed
    expect(PROGRAMMES['dp-p-ii'].generalCompetences).toHaveLength(3);
    expect([count('dp-p-ii', 'CP'), count('dp-p-ii', 'I'), count('dp-p-ii', 'II')]).toEqual([8, 8, 8]);
    expect(competencesFor('dp-p-ii', 'II').map((c) => c.code)).toEqual(['1.1', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3']);
    // Comunicare în limba modernă 1: 4 general; CP 8 (no 2.4), I and II 9
    expect(PROGRAMMES['lm-p-ii'].generalCompetences).toHaveLength(4);
    expect([count('lm-p-ii', 'CP'), count('lm-p-ii', 'I'), count('lm-p-ii', 'II')]).toEqual([8, 9, 9]);
    // the contents tables: AVAP 6 domains × 3 classes (Foto-film has 2 rows, the others 4); DP 8 subdomains × 3; LM 2 blocks × 3
    expect(PROGRAMMES['avap-p-ii'].contents).toHaveLength(66);
    expect(new Set(PROGRAMMES['avap-p-ii'].contents.map((c) => c.domain))).toEqual(new Set(['Desen', 'Pictură', 'Confecții și jucării', 'Modelaj', 'Colaj', 'Foto-film']));
    expect(PROGRAMMES['dp-p-ii'].contents).toHaveLength(24);
    expect(new Set(PROGRAMMES['dp-p-ii'].contents.map((c) => c.subdomain)).size).toBe(8);
    expect(PROGRAMMES['lm-p-ii'].contents).toHaveLength(6);
    for (const id of ['avap-p-ii', 'dp-p-ii', 'lm-p-ii'] as const) {
      const p = PROGRAMMES[id] as unknown as { verification: { secondPass: string; differences: string[] }; notes: string[] };
      expect(p.verification.secondPass.length, id).toBeGreaterThan(100);
      expect(p.verification.differences.length, id).toBeGreaterThan(0);
      expect(p.notes.length, id).toBeGreaterThan(0);
      for (const l of ['CP', 'I', 'II']) expect(PROGRAMMES[id].contents.some((c) => c.level === l), `${id} ${l}`).toBe(true);
    }
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
    // the three programmes added for CP – a II-a (OMEN 3418/2013), word for word
    expect(findCompetence({ programme: 'avap-p-ii', level: 'CP', code: '2.3' })?.text).toBe('Realizarea de aplicații/compoziții/obiecte/ construcții simple, pe baza interesului direct');
    expect(findCompetence({ programme: 'avap-p-ii', level: 'I', code: '1.2' })?.text).toBe('Identificarea liniei, a punctului, a culorii și a formei în contexte cunoscute');
    // „și sau” without the slash: as printed (checked on the page image)
    expect(findCompetence({ programme: 'avap-p-ii', level: 'II', code: '2.5' })?.text).toBe('Explorarea de utilizări în contexte utile și sau estetice a obiectelor/ lucrărilor realizate prin efort propriu');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'CP', code: '2.1' })?.text).toBe('Recunoașterea emoțiilor de bază în situații simple, familiare');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'I', code: '2.2' })?.text).toBe('Transmiterea unor mesaje verbale și non-verbale simple despre propriile experiențe de viață');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'II', code: '1.3' })?.text).toBe('Respectarea unor reguli de igienă personală');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'II', code: '1.2' })).toBeUndefined();
    expect(findCompetence({ programme: 'lm-p-ii', level: 'CP', code: '3.1' })?.text).toBe('Manifestarea curiozității pentru decodarea unor mesaje scrise simple și scurte din universul imediat');
    expect(findCompetence({ programme: 'lm-p-ii', level: 'CP', code: '2.4' })).toBeUndefined();
    expect(findCompetence({ programme: 'lm-p-ii', level: 'II', code: '1.2' })?.text).toBe('Recunoașterea pozițiilor de bază (pe, sub, în față, în spatele, în) ale unor obiecte din universul imediat, în mesaje articulate clar și rar');
    expect(PROGRAMMES['dp-p-ii'].contents.find((c) => c.level === 'CP' && c.subdomain === 'Trăire și manifestare emoțională, starea de bine')?.items).toEqual(['Emoții de bază denumite prin cuvinte (bucurie, tristețe, frică, furie) în activități / contexte familiare']);
    expect(PROGRAMMES['avap-p-ii'].contents.find((c) => c.level === 'II' && c.domain === 'Colaj' && c.subdomain === 'Tehnici de lucru')?.items).toEqual(['îndoirea, împletirea, origami, tangram']);
    expect(PROGRAMMES['lm-p-ii'].contents.find((c) => c.level === 'I' && c.domain === 'Sugestii de contexte')?.items).toContain('culori');
    for (const id of ['avap-p-ii', 'dp-p-ii', 'lm-p-ii'] as const) expect(PROGRAMMES[id].order, id).toBe('Anexa nr. 2 la ordinul ministrului educației naționale nr. 3418/19.03.2013');
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
    expect(competenceLabel({ programme: 'dp-p-ii', level: 'I', code: '3.3' })).toBe('Competența 3.3 · Dezvoltare personală, clasa I');
    expect(competenceLabel({ programme: 'lm-p-ii', level: 'II', code: '3.1' })).toBe('Competența 3.1 · Comunicare în limba modernă, clasa a II-a');
    expect(competencesFor('et-presc', '3-6').every((c) => c.kind === 'comportament')).toBe(true);
  });
});
