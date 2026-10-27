import 'server-only';

/**
 * Oblio.eu API client (Romanian invoicing + e-Factura). Docs: https://www.oblio.eu/api
 * Only the calls the app needs: issue an invoice (already paid by card) and issue a storno.
 */

const API = 'https://www.oblio.eu/api';

export function oblioConfigured(): boolean {
  return !!(process.env.OBLIO_EMAIL && process.env.OBLIO_API_SECRET && process.env.OBLIO_CIF && process.env.OBLIO_SERIES);
}

let cached: { token: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${API}/authorize/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.OBLIO_EMAIL!, client_secret: process.env.OBLIO_API_SECRET! }),
  });
  if (!res.ok) throw new Error(`Oblio: autentificare eșuată (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number | string };
  cached = { token: data.access_token, until: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cached.token;
}

/** For tests: forget the cached token. */
export function resetOblioToken(): void {
  cached = null;
}

async function call<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: number; statusMessage?: string; data?: T };
  if (!res.ok || (json.status && json.status !== 200)) {
    throw new Error(`Oblio ${path}: ${json.statusMessage || res.status}`);
  }
  return json.data as T;
}

export interface OblioClient {
  name: string;
  /** CUI/CIF for companies (with RO for VAT payers); empty for private persons. */
  cif?: string;
  vatPayer?: boolean;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  email?: string;
}

export interface OblioInvoiceInput {
  client: OblioClient;
  /** One line, price with VAT included. */
  product: { name: string; description?: string; price: number };
  currency: string;
  issueDate: string; // YYYY-MM-DD
  /** Card payment reference (the Stripe payment), so the invoice is issued as paid. */
  paymentReference: string;
  /** Same key → same document, even if the request is sent twice. */
  idempotencyKey: string;
}

export interface OblioDoc {
  seriesName: string;
  number: string;
  link: string;
}

const flag = (name: string, fallback: '0' | '1') => ((process.env[name] ?? fallback) === '1' ? 1 : 0);

/** Issue an invoice in Oblio, marked as paid by card; e-mailed to the client and sent to e-Factura (SPV) by default. */
export async function createOblioInvoice(input: OblioInvoiceInput): Promise<OblioDoc> {
  const vatName = process.env.OBLIO_VAT_NAME ?? 'Normala';
  const vatPercentage = Number(process.env.OBLIO_VAT_PERCENT ?? 21);
  return call<OblioDoc>('POST', '/docs/invoice', {
    cif: process.env.OBLIO_CIF,
    seriesName: process.env.OBLIO_SERIES,
    issueDate: input.issueDate,
    language: 'RO',
    precision: 2,
    currency: input.currency,
    useStock: 0,
    sendEmail: input.client.email ? flag('OBLIO_SEND_EMAIL', '1') : 0,
    spvExtern: flag('OBLIO_SPV', '1'),
    idempotencyKey: input.idempotencyKey,
    client: {
      name: input.client.name,
      cif: input.client.cif ?? '',
      vatPayer: input.client.vatPayer ? 1 : 0,
      address: input.client.address ?? '',
      state: input.client.state ?? '',
      city: input.client.city ?? '',
      country: input.client.country ?? 'Romania',
      email: input.client.email ?? '',
      save: 0,
    },
    products: [
      {
        name: input.product.name,
        description: input.product.description ?? '',
        price: input.product.price,
        measuringUnit: 'buc',
        currency: input.currency,
        vatName,
        vatPercentage,
        vatIncluded: 1,
        quantity: 1,
        save: 0,
      },
    ],
    collect: { type: 'Card', documentNumber: input.paymentReference.slice(-30), issueDate: input.issueDate },
    mentions: 'Plătit online cu cardul.',
  });
}

/** Full storno of an invoice (refund). */
export async function createOblioStorno(seriesName: string, number: string, idempotencyKey: string): Promise<OblioDoc> {
  return call<OblioDoc>('POST', '/docs/invoice', {
    cif: process.env.OBLIO_CIF,
    seriesName: process.env.OBLIO_STORNO_SERIES || seriesName,
    language: 'RO',
    spvExtern: flag('OBLIO_SPV', '1'),
    idempotencyKey,
    referenceDocument: { type: 'Factura', seriesName, number, refund: 1 },
  });
}
