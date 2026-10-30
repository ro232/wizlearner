'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { track } from '@/lib/analytics';

/** Sends a signed-in user to Stripe Checkout; anyone else signs in first and comes back here. */
export function SubscribeButton({ plan, label, highlight }: { plan: string; label: string; highlight?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!user) {
      router.push('/auth/login?next=/preturi');
      return;
    }
    setBusy(true);
    setError(null);
    track('checkout_start', { plan });
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? 'Nu am putut porni plata.');
    } catch {
      setError('Nu am putut porni plata. Verifică conexiunea.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button onClick={go} disabled={busy} className="w-full h-12 rounded-xl" data-btn={highlight ? 'primary' : 'ink'}>
        {busy ? 'Se deschide plata…' : label}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
