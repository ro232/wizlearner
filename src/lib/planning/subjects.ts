/**
 * The subjects the planner knows, with the weekly hours of the framework plan.
 *
 * Hours: Planul-cadru de învățământ pentru învățământul primar, Anexa nr. 1 la OMEN nr. 3.371/12.03.2013
 * (M. Of. nr. 192/05.04.2013), still in force in 2026–2027 (no new primary framework plan was
 * approved; checked 24.11.2026). Trunchi comun, hours per week:
 *
 *                                       CP   I   II
 *   Comunicare în limba română           5   7   6    (row „Limba și literatura română”, note 1)
 *   Matematică și explorarea mediului    4   4   5    (rows „Matematică” 3/3/4 + „Științe ale naturii” 1/1/1, note 2:
 *                                                      in CP–II they are taught as one integrated subject)
 *
 *   text of the order: https://nou.siphd.ro/f/2013/omen3371_2013.pdf
 *   (copy: https://www.edums.ro/legi/Legislatieinv%20primar%20pl%20cadru.pdf)
 *
 * A school may add one optional hour (CDȘ) and the teacher can change the number on the page.
 */
import type { ProgrammeId } from '@/lib/curriculum';

export type PlanLevel = 'CP' | 'I' | 'II';
export type SubjectId = 'clr' | 'mem';

export interface PlanSubject {
  id: SubjectId;
  programme: ProgrammeId;
  title: string;
  hours: Record<PlanLevel, number>;
}

export const PLAN_SUBJECTS: PlanSubject[] = [
  { id: 'clr', programme: 'clr-p-ii', title: 'Comunicare în limba română', hours: { CP: 5, I: 7, II: 6 } },
  { id: 'mem', programme: 'mem-p-ii', title: 'Matematică și explorarea mediului', hours: { CP: 4, I: 4, II: 5 } },
];

export const PLAN_LEVELS: { id: PlanLevel; title: string; /** as printed after „Clasa:” */ name: string }[] = [
  { id: 'CP', title: 'Clasa pregătitoare', name: 'pregătitoare' },
  { id: 'I', title: 'Clasa I', name: 'I' },
  { id: 'II', title: 'Clasa a II-a', name: 'a II-a' },
];

export const HOURS_SOURCE = 'Planul-cadru pentru învățământul primar, OMEN nr. 3.371/2013';
export const MAX_HOURS_PER_WEEK = 10;

export function planSubject(id: SubjectId): PlanSubject {
  return PLAN_SUBJECTS.find((s) => s.id === id) ?? PLAN_SUBJECTS[0];
}

export function planLevel(id: PlanLevel) {
  return PLAN_LEVELS.find((l) => l.id === id) ?? PLAN_LEVELS[0];
}
