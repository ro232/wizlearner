-- Etapa 5: abonamente Stripe.
-- Rulează după 20261023000000_securizare_acces.sql. Poate fi rulat de mai multe ori.

-- Starea abonamentului, scrisă doar de server (webhook-ul Stripe, cu cheia service_role).
-- Utilizatorii le pot citi (politica existentă de SELECT pe propriul profil), dar nu le pot modifica:
-- drepturile de UPDATE din browser sunt limitate la display_name, children, preferences, updated_at.
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Webhook-urile Stripe pot sosi de mai multe ori: le procesăm o singură dată.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
-- Fără politici: tabelul nu e accesibil din browser, doar cu service_role.

-- Fișele salvate: utilizatorul nu își poate umfla singur contoarele publice.
REVOKE UPDATE ON saved_worksheets FROM anon, authenticated;
GRANT UPDATE (name, configuration, updated_at) ON saved_worksheets TO authenticated;
