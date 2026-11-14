# Supabase: configurare

Listă de urmat în ordine. Variabilele se pun în Vercel (și în `.env.local` pentru lucru local).

## 1. Chei (Project Settings → API)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ajung în browser, e normal.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: **doar pe server**, niciodată într-o variabilă `NEXT_PUBLIC_`. O folosește numai webhook-ul Stripe, ca să scrie abonamentul și facturile. Fără ea plata online rămâne oprită.

## 2. Baza de date (SQL Editor)

- [ ] Bază nouă: rulează întâi `src/lib/supabase/schema.sql`.
- [ ] Apoi toate cele 5 fișiere din `supabase/migrations/`, în ordinea numelui (pot fi rulate de mai multe ori):

| Fișier | Ce face |
| --- | --- |
| `20261023000000_securizare_acces.sql` | nivelul contului și codurile de acces nu mai pot fi scrise sau citite din browser; `redeem_access_code`, `generate_access_codes` |
| `20261024000000_abonamente.sql` | coloanele de abonament Stripe pe `users_profile`, tabelul `stripe_events` |
| `20261025000000_intarire.sql` | limită de 10 coduri greșite pe oră, drepturi de scriere restrânse |
| `20261027000000_facturi.sql` | tabelul `fiscal_invoices` (facturile Oblio; fiecare își vede doar facturile lui) |
| `20261102000000_dashboard.sql` | proiecte de toate felurile, dosare, istoricul descărcărilor, „Copiii mei” |

- [ ] Bază existentă: rulează doar migrările care lipsesc.
- [ ] Coduri de acces: `SELECT * FROM generate_access_codes('starter', 10);` (sau `'full'`).

## 3. Autentificare (Authentication)

Aplicația folosește: Google, email + parolă cu confirmare pe email, link magic.

- [ ] **SMTP propriu (obligatoriu în producție):** Authentication → Emails → SMTP Settings. Serviciul de email implicit al Supabase trimite doar către membrii echipei proiectului și cel mult câteva mesaje pe oră, deci fără SMTP propriu un părinte care se înregistrează cu email nu primește nimic. Alege un furnizor (Resend, Brevo, Postmark), setează SPF, DKIM și DMARC pe domeniul expeditor și ridică limita de trimitere.
- [ ] **Șabloanele de email** (confirmare, link magic) traduse în română.
- [ ] **URL Configuration → Site URL:** `https://DOMENIU` (adresa reală, aceeași ca în `NEXT_PUBLIC_SITE_URL`).
- [ ] **Redirect URLs:** `https://DOMENIU/auth/callback` și, pentru lucru local, `http://localhost:3000/auth/callback`. **Fără wildcard pe domeniu** (niciodată `https://*.vercel.app/**`): cu un asemenea tipar, cineva poate porni un link de autentificare care se întoarce pe un site al lui și poate prelua contul.
- [ ] **Google** (Providers → Google): datele OAuth din Google Cloud; adresa de redirect din Google rămâne cea a Supabase.
- [ ] **Test:** deschide `/cont` nelogat, intră cu link magic și apoi cu email + parolă pe un cont nou. După click pe linkul din email trebuie să ajungi logat pe `/cont`. Dacă ajungi pe prima pagină, adresa de întoarcere nu se potrivește cu lista de la Redirect URLs.

## 4. Verificare (doar citire)

```sql
-- RLS pornit pe toate tabelele
select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1;
-- din browser se pot modifica doar display_name, children, preferences, updated_at
select column_name from information_schema.column_privileges
 where table_name = 'users_profile' and grantee = 'authenticated' and privilege_type = 'UPDATE';
```

## Unde e codul

```
src/lib/supabase/client.ts      client pentru browser
src/lib/supabase/server.ts      client pentru server (cu sesiunea utilizatorului)
src/lib/supabase/admin.ts       client cu service-role, doar pentru webhook-ul Stripe
src/lib/supabase/middleware.ts  reîmprospătează sesiunea la fiecare cerere
src/app/auth/callback/route.ts  întoarcerea de la Google / linkul din email (respectă ?next=)
src/hooks/use-auth.ts           autentificare, profil, activarea codului de acces
```
