import { describe, expect, it } from 'vitest';
import { LETTER_ORDER, SCHOOL_YEAR, WEEKS_IN_YEAR, weekLabel, weekOfSchoolYear } from '@/lib/calendar';
import { themeById } from '@/lib/themes';
import { ALPHABETS } from '@/lib/glyphs/data';
import { buildGroupPages } from '@/lib/worksheet/group';

describe('school-year plan', () => {
  it('covers every letter of the Romanian alphabet exactly once in the first half', () => {
    expect([...LETTER_ORDER].sort()).toEqual([...ALPHABETS.ro].sort());
    const firstHalf = SCHOOL_YEAR.slice(2, 18).flatMap((w) => w.letters);
    expect(firstHalf).toEqual(LETTER_ORDER);
  });

  it('has a known theme and at most two letters every week', () => {
    expect(SCHOOL_YEAR).toHaveLength(WEEKS_IN_YEAR);
    for (const w of SCHOOL_YEAR) {
      expect(themeById(w.themeId), `week ${w.week}`).toBeDefined();
      expect(w.letters.length).toBeLessThanOrEqual(2);
    }
  });

  it('finds the week of a date', () => {
    expect(weekOfSchoolYear(new Date('2026-09-07T10:00:00'))).toBe(1);
    expect(weekOfSchoolYear(new Date('2026-09-14T10:00:00'))).toBe(2);
    expect(weekOfSchoolYear(new Date('2026-08-30T10:00:00'))).toBeNull();
    expect(weekOfSchoolYear(new Date('2027-08-30T10:00:00'))).toBeNull();
    expect(weekLabel(1)).toBe('7–11 septembrie');
    expect(weekLabel(4)).toBe('28 septembrie – 2 octombrie');
  });
});

describe('levels per child', () => {
  it('gives one child a different level without changing the others', () => {
    const base = { names: ['Ana', 'Luca'], themeId: 'toamna', letters: ['A'], letterMode: 'uppercase' as const, difficulty: 'beginner' as const };
    const same = buildGroupPages(base).pages;
    const mixed = buildGroupPages({ ...base, levels: { Luca: 'advanced' } }).pages;
    expect(JSON.stringify(mixed[0])).toBe(JSON.stringify(same[0]));
    expect(JSON.stringify(mixed[1])).not.toBe(JSON.stringify(same[1]));
  });
});
