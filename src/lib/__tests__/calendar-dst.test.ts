// Must be set before any Date is made: the plan is used by teachers in Romania.
process.env.TZ = 'Europe/Bucharest';

import { describe, expect, it } from 'vitest';
import { SCHOOL_YEAR_START, WEEKS_IN_YEAR, weekLabel, weekOfSchoolYear } from '@/lib/calendar';

/**
 * Romania changes the clock on the last Sunday of October (25 Oct 2026, a 25-hour day) and
 * of March (28 Mar 2027, a 23-hour day). Counting milliseconds from 7 September moved every
 * week after October one day back: „Săpt. 10 · 8–12 noiembrie” instead of 9–13.
 */
describe('school-year weeks across the clock changes (Europe/Bucharest)', () => {
  it('runs in a time zone that has clock changes', () => {
    expect(new Date(2026, 9, 24, 12).getTimezoneOffset()).toBe(-180);
    expect(new Date(2026, 9, 26, 12).getTimezoneOffset()).toBe(-120);
  });

  it.each([
    [7, '19–23 octombrie'], // the week before the October change
    [8, '26–30 octombrie'], // the first week after it
    [9, '2–6 noiembrie'],
    [10, '9–13 noiembrie'],
    [12, '23–27 noiembrie'],
    [13, '30 noiembrie – 4 decembrie'],
    [17, '28 decembrie – 1 ianuarie'],
    [29, '22–26 martie'], // the week before the March change
    [30, '29 martie – 2 aprilie'], // the first week after it
    [34, '26–30 aprilie'],
  ])('week %i is %s', (week, label) => {
    expect(weekLabel(week)).toBe(label);
  });

  it('every week starts on a Monday and ends on the Friday of the same week', () => {
    const [y, m, d] = SCHOOL_YEAR_START.split('-').map(Number);
    for (let w = 1; w <= WEEKS_IN_YEAR; w++) {
      const monday = new Date(y, m - 1, d + (w - 1) * 7, 12);
      expect(monday.getDay(), `week ${w}`).toBe(1);
      const friday = new Date(y, m - 1, d + (w - 1) * 7 + 4, 12);
      const label = weekLabel(w);
      expect(label.startsWith(`${monday.getDate()}`), `week ${w}: ${label}`).toBe(true);
      expect(label).toContain(`${friday.getDate()} `);
    }
  });

  it('finds the week of a date at any hour, on both sides of each clock change', () => {
    const cases: [string, number | null][] = [
      ['2026-09-07T00:00:00', 1],
      ['2026-09-13T23:59:00', 1],
      ['2026-10-23T08:00:00', 7], // Friday before the change
      ['2026-10-25T02:30:00', 7], // the Sunday of the change (25 hours long)
      ['2026-10-25T23:30:00', 7],
      ['2026-10-26T00:00:00', 8], // Monday, the first minute
      ['2026-10-26T00:30:00', 8],
      ['2026-11-08T23:30:00', 9], // Sunday evening still belongs to the week that ends
      ['2026-11-09T00:10:00', 10],
      ['2026-11-13T12:00:00', 10],
      ['2027-03-28T23:30:00', 29], // the Sunday of the spring change (23 hours long)
      ['2027-03-29T00:10:00', 30],
      ['2027-04-30T12:00:00', 34],
      ['2027-05-02T23:59:00', 34],
      ['2027-05-03T00:00:00', null],
      ['2026-09-06T23:59:00', null],
    ];
    for (const [iso, week] of cases) expect(weekOfSchoolYear(new Date(iso)), iso).toBe(week);
  });
});
