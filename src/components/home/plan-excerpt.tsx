import { buildPlan, periodLabel, weekNumbers } from '@/lib/planning/plan';

/**
 * The first rows of a real proposal (clasa I, MEM), built on the server by the same code as
 * /planificare: what the visitor sees here is what the page gives them.
 */
export function PlanExcerpt() {
  const plan = buildPlan({ level: 'I', subject: 'mem' });
  const rows = plan.rows.slice(0, 4);
  return (
    <figure className="rounded-2xl border-2 border-ink bg-white shadow-lg overflow-hidden">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink bg-paper px-4 py-3">
        <span className="font-extrabold text-ink">Clasa I, Matematică și explorarea mediului</span>
        <span className="text-sm text-slate-600">{plan.hoursPerWeek} ore pe săptămână</span>
      </figcaption>
      <table className="w-full text-left text-sm">
        <thead className="text-[13px] text-slate-600">
          <tr className="border-b border-ink/15">
            <th scope="col" className="px-4 py-2 font-bold">Unitatea și competențele</th>
            <th scope="col" className="px-2 py-2 font-bold">Săptămânile</th>
            <th scope="col" className="px-4 py-2 font-bold text-right">Ore</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-b border-ink/10 last:border-0 align-top ${r.kind === 'program' ? 'bg-paper/70' : ''}`}>
              <td className="px-4 py-3">
                <span className="block font-bold text-ink">{r.title}</span>
                {r.codes.length > 0 && <span className="block mt-0.5 text-[13px] text-slate-600 tabular-nums">{r.codes.join(', ')}</span>}
              </td>
              <td className="px-2 py-3">
                <span className="block font-bold text-ink tabular-nums whitespace-nowrap">{weekNumbers(r.weeks)}</span>
                <span className="block mt-0.5 text-[13px] text-slate-600">{periodLabel(r.weeks, plan.weeks)}</span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-ink tabular-nums">{r.hours || '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
