import type { Tier } from '@/types';
import { subscriptionGivesAccess } from './tier';

/**
 * What the account page says about the subscription. It is built only from what is stored on the
 * profile (subscription_status, subscription_period_end, tier), so it must never claim more than
 * those three say. In particular the profile does not record whether the customer asked Stripe to
 * cancel at the end of the period: an "active" subscription may or may not renew, so the text
 * shows the current period and points to the portal instead of promising a renewal.
 */

/** The label on the account page's button that opens Stripe's customer portal. */
export const PORTAL_BUTTON = 'Card, facturi sau anulare';

export interface SubscriptionSummary {
  /** One or two full sentences, in Romanian. */
  text: string;
  /** Offer the link to the pricing page (the account is on the free tier with no running subscription). */
  offerPlans: boolean;
}

const TIER_NAME: Record<Tier, string> = { free: 'Gratuit', starter: 'Starter', full: 'Complet' };

function day(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });
}

/** Statuses that give no access, in words. Anything Stripe adds later reads as "inactiv". */
const INACTIVE: Record<string, string> = {
  unpaid: 'Abonamentul este suspendat: plata nu a reușit.',
  paused: 'Abonamentul este în pauză.',
  incomplete: 'Plata abonamentului nu a fost finalizată.',
  incomplete_expired: 'Plata abonamentului nu a fost finalizată, iar comanda a expirat.',
};

export function subscriptionSummary(status: string | null | undefined, periodEnd: string | null | undefined, tier: Tier): SubscriptionSummary | null {
  if (!status) return null;
  const manage = `Reînnoirea și anularea le gestionezi din „${PORTAL_BUTTON}”.`;
  const until = day(periodEnd);

  if (status === 'past_due') {
    // The period end already points at the unpaid period, so no date here.
    return { text: `Plata abonamentului nu a reușit; Stripe mai încearcă. Verifică sau schimbă cardul din „${PORTAL_BUTTON}” ca să nu pierzi accesul.`, offerPlans: false };
  }
  if (subscriptionGivesAccess(status)) {
    const state = status === 'trialing' ? 'Abonament în perioada de probă.' : 'Abonament activ.';
    return { text: `${state}${until ? ` Perioada curentă: până la ${until}.` : ''} ${manage}`, offerPlans: false };
  }

  // No access from the subscription from here on: never promise a date.
  const start = status === 'canceled' ? 'Abonamentul s-a încheiat.' : INACTIVE[status] ?? 'Abonamentul nu este activ.';
  if (tier === 'free') return { text: `${start} Acum ai varianta gratuită.`, offerPlans: true };
  return { text: `${start} Varianta ${TIER_NAME[tier]} rămâne a ta prin codul de acces.`, offerPlans: false };
}
