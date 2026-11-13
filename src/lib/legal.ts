/**
 * Who runs the site (Legea 365/2002 art. 5, OUG 34/2014 art. 6): shown in the footer and on the
 * legal pages. Each field comes from an environment variable; a field that is not set is simply
 * not shown — never a placeholder in brackets.
 */

export interface Operator {
  /** Company name, e.g. „Exemplu S.R.L.” */
  name: string | null;
  /** Fiscal code (CUI / CIF). */
  cui: string | null;
  /** Trade Register number, e.g. „J40/1234/2020”. */
  regCom: string | null;
  /** Registered office. */
  address: string | null;
  email: string | null;
  phone: string | null;
}

type OperatorEnv = Partial<Record<
  | 'NEXT_PUBLIC_OPERATOR_NAME'
  | 'NEXT_PUBLIC_OPERATOR_CUI'
  | 'NEXT_PUBLIC_OPERATOR_REG_COM'
  | 'NEXT_PUBLIC_OPERATOR_ADDRESS'
  | 'NEXT_PUBLIC_OPERATOR_EMAIL'
  | 'NEXT_PUBLIC_OPERATOR_PHONE',
  string | undefined
>>;

/** Trimmed value, or null when empty or still a template placeholder like „[CUI]”. */
function clean(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v || /^\[.*\]$/.test(v)) return null;
  return v;
}

export function readOperator(env: OperatorEnv): Operator {
  return {
    name: clean(env.NEXT_PUBLIC_OPERATOR_NAME),
    cui: clean(env.NEXT_PUBLIC_OPERATOR_CUI),
    regCom: clean(env.NEXT_PUBLIC_OPERATOR_REG_COM),
    address: clean(env.NEXT_PUBLIC_OPERATOR_ADDRESS),
    email: clean(env.NEXT_PUBLIC_OPERATOR_EMAIL),
    phone: clean(env.NEXT_PUBLIC_OPERATOR_PHONE),
  };
}

// Named in full so Next.js can inline the public variables.
export const OPERATOR: Operator = readOperator({
  NEXT_PUBLIC_OPERATOR_NAME: process.env.NEXT_PUBLIC_OPERATOR_NAME,
  NEXT_PUBLIC_OPERATOR_CUI: process.env.NEXT_PUBLIC_OPERATOR_CUI,
  NEXT_PUBLIC_OPERATOR_REG_COM: process.env.NEXT_PUBLIC_OPERATOR_REG_COM,
  NEXT_PUBLIC_OPERATOR_ADDRESS: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS,
  NEXT_PUBLIC_OPERATOR_EMAIL: process.env.NEXT_PUBLIC_OPERATOR_EMAIL,
  NEXT_PUBLIC_OPERATOR_PHONE: process.env.NEXT_PUBLIC_OPERATOR_PHONE,
});

const ENV_NAMES: Record<keyof Operator, string> = {
  name: 'NEXT_PUBLIC_OPERATOR_NAME',
  cui: 'NEXT_PUBLIC_OPERATOR_CUI',
  regCom: 'NEXT_PUBLIC_OPERATOR_REG_COM',
  address: 'NEXT_PUBLIC_OPERATOR_ADDRESS',
  email: 'NEXT_PUBLIC_OPERATOR_EMAIL',
  phone: 'NEXT_PUBLIC_OPERATOR_PHONE',
};

/** Names of the environment variables that are still empty. */
export function missingOperatorFields(op: Operator = OPERATOR): string[] {
  return (Object.keys(ENV_NAMES) as (keyof Operator)[]).filter((k) => !op[k]).map((k) => ENV_NAMES[k]);
}

/** „CUI 123 · Reg. Com. J40/1/2020 · sediu · telefon”, only from the fields that are set. */
export function operatorDetails(op: Operator = OPERATOR): { label: string; value: string }[] {
  return [
    op.cui && { label: 'CUI', value: op.cui },
    op.regCom && { label: 'Nr. Reg. Com.', value: op.regCom },
    op.address && { label: 'Sediu', value: op.address },
  ].filter((x): x is { label: string; value: string } => !!x);
}

/**
 * The sentence that opens the legal pages. With the company filled in it names it in full;
 * without it, a neutral sentence — the page must never print „[Denumirea firmei]”.
 */
export function operatorSentence(op: Operator = OPERATOR): string {
  if (!op.name) return 'WorksheetWiz este un serviciu online de fișe de lucru pentru copii.';
  const parts = [
    op.address && `cu sediul în ${op.address}`,
    op.regCom && `înregistrată la Registrul Comerțului sub nr. ${op.regCom}`,
    op.cui && `CUI ${op.cui}`,
  ].filter(Boolean);
  return `WorksheetWiz este un serviciu al ${op.name}${parts.length ? `, ${parts.join(', ')}` : ''}.`;
}

let warned = false;
/** Server-side reminder in the build and server logs while the company details are incomplete. */
export function warnIfOperatorIncomplete(op: Operator = OPERATOR, log: (msg: string) => void = console.warn): string[] {
  const missing = missingOperatorFields(op);
  if (missing.length && typeof window === 'undefined' && (!warned || log !== console.warn)) {
    if (log === console.warn) warned = true;
    log(`[legal] Datele firmei sunt incomplete: lipsesc ${missing.join(', ')}. Paginile legale și subsolul afișează doar câmpurile completate.`);
  }
  return missing;
}
