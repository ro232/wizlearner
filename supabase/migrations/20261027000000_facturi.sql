-- Facturi fiscale (Oblio) pentru plățile Stripe.
-- Rulează după 20261025000000_intarire.sql. Poate fi rulat de mai multe ori.

-- O factură Oblio pentru fiecare factură Stripe plătită (prima plată și fiecare reînnoire).
-- Scrise doar de server (webhook-ul Stripe, cu cheia service_role); utilizatorul își vede doar facturile lui.
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  stripe_invoice_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  payment_intent TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  -- issued | skipped (0 lei, cupon 100%) | failed (se reîncearcă) | refunded (storno emis) | refund_partial (de făcut manual)
  status TEXT NOT NULL,
  oblio_series TEXT,
  oblio_number TEXT,
  oblio_link TEXT,
  storno_series TEXT,
  storno_number TEXT,
  storno_link TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fiscal_invoices_user ON fiscal_invoices (user_id);
CREATE INDEX IF NOT EXISTS fiscal_invoices_pi ON fiscal_invoices (payment_intent);

ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own invoices" ON fiscal_invoices;
CREATE POLICY "Users see own invoices" ON fiscal_invoices FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON fiscal_invoices FROM anon, authenticated;
