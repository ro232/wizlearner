import type { PlanMeta } from './document';
import type { Plan } from './plan';

/**
 * The downloads the page calls. The PDF code (jsPDF) and the Word code (docx) are loaded only when
 * someone presses the button, so neither is part of the page's first load.
 */
export const downloadPlanPdf = async (plan: Plan, meta: PlanMeta) => (await import('./pdf')).downloadPlanPdf(plan, meta);

export const downloadPlanDocx = async (plan: Plan, meta: PlanMeta, filename: string) => (await import('./docx')).downloadPlanDocx(plan, meta, filename);
