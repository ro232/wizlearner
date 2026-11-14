# WorksheetWiz

Fișe de scris pentru grădiniță și clasa pregătitoare, cu alfabetul românesc complet (Ă Â Î Ș Ț): litere, cifre, forme, exerciții grafice, numele copilului, fișe pentru toată grupa pe teme și caiete gata de publicat pe Amazon KDP.

## Pornire

```bash
npm install
cp .env.example .env.local   # completează cheile (vezi mai jos)
npm run dev                  # http://localhost:3000
```

Fără chei Supabase/Stripe, generatorul, fișa cu numele, fișele pentru grupă și caietul KDP merg în continuare (totul se desenează în browser); doar contul și plata sunt oprite.

## Comenzi

| Comandă | Ce face |
| --- | --- |
| `npm run dev` | server de dezvoltare (aici apare și butonul 🔓 care schimbă planul, pentru teste) |
| `npm run check` | lint + tipuri + teste, tot ce rulează și CI |
| `npm test` | testele automate (Vitest) |
| `npm run e2e` | testele în browser (Playwright) |
| `npm run build` | build de producție |
| `npm run build:icons` | regenerează imaginile pentru cuvinte după ce schimbi `LETTER_HINTS` sau `THEMES` |
| `npm run sheets:preview` | desenează fișele de probă în `./sheets-preview` |

## Trecerea în live: listă de urmat în ordine

Regula de bază: **plata online rămâne oprită** (pe `/preturi` scrie „Plata online vine în curând”, iar `/api/stripe/checkout` răspunde 503) până când sunt setate TOATE: `STRIPE_SECRET_KEY`, cel puțin un preț, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. Ce lipsește apare doar în logul serverului (Vercel → Logs, caută `[billing]`). După orice schimbare de variabile: **redeploy**.

### 1. Supabase

- [ ] Baza de date și setările de autentificare: urmează [SUPABASE_SETUP.md](SUPABASE_SETUP.md) (5 migrări, SMTP propriu, Site URL, Redirect URLs).
- [ ] Coduri de acces (de exemplu pentru Etsy), din SQL Editor: `SELECT * FROM generate_access_codes('starter', 10);`

### 2. Stripe (întâi în modul test, apoi repetat identic în live: setările NU se copiază între moduri)

- [ ] **Cont Stripe dedicat acestui produs.** Dacă același cont mai vinde și altceva, aplicația ignoră tot ce nu e pe prețurile ei (nu dă acces, nu emite factură), dar un cont separat e mai sigur și mai curat la contabilitate.
- [ ] **Produs + prețuri:** un produs „WorksheetWiz Complet”, două prețuri recurente în RON (lunar, anual), cu TVA inclus. Id-urile `price_…` → `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` (diferă între test și live).
- [ ] **Dacă schimbi vreodată prețul:** abonații vechi rămân pe prețul vechi. Pune id-ul vechi în `STRIPE_PRICE_LEGACY` (mai multe, separate prin virgulă); altfel reînnoirile și anulările lor sunt ignorate.
- [ ] **Webhook** (Developers → Webhooks → Add destination):
  - URL: `https://DOMENIU/api/stripe/webhook`
  - tip de conținut: **Snapshot** (nu „Thin”: codul citește obiectul întreg din eveniment)
  - evenimente, exact acestea șase: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `charge.refunded`
  - secretul `whsec_…` → `STRIPE_WEBHOOK_SECRET` (diferit în test și live)
- [ ] **Customer portal** (Settings → Billing → Customer portal), **salvat explicit și în live**: actualizare card: da; anulare: da, „la sfârșitul perioadei de facturare”; schimbare de plan: oprită la început; istoric facturi: după decizia contabilului; linkuri către Termeni și Confidențialitate. Fără portal salvat, butonul „Card, facturi sau anulare” din cont arată un mesaj de eroare și clientul nu poate anula singur.
- [ ] **Plăți eșuate** (Billing → Revenue recovery → Retries → „Manage failed payments”): după epuizarea reîncercărilor alege **„Cancel the subscription”**. NU „Leave the subscription past-due”: cu acea opțiune clientul păstrează accesul complet fără să plătească.
- [ ] **Emailuri către clienți** (Settings → Customer emails): chitanță la plată reușită (decide cu contabilul, fiindcă factura fiscală vine din Oblio), plată eșuată și card care expiră: pornite; anunț de reînnoire pentru planul anual: pornit.
- [ ] **Dispute:** „dacă o plată e contestată → anulează abonamentul”.
- [ ] **Stripe Tax:** oprit (aplicația nu îl folosește; prețurile sunt cu TVA inclus).
- [ ] **Date publice:** denumirea firmei, email de suport, textul de pe extrasul de cont, logo.

Planul plătit se acordă și se retrage **doar** din webhook. La rambursare, aplicația emite storno, dar NU anulează abonamentul: anulează-l tu din Stripe.

### 3. Oblio (facturi fiscale + e-Factura)

- [ ] Serie de facturi dedicată (și una de test) → `OBLIO_SERIES`, opțional `OBLIO_STORNO_SERIES`.
- [ ] Cota TVA exact ca în nomenclatorul firmei → `OBLIO_VAT_NAME`, `OBLIO_VAT_PERCENT` (întreabă contabilul).
- [ ] Setări → E-mail-uri alarmă → „Document prin email”: șablon activ.
- [ ] „Trimite automat e-Factura în SPV” + certificat SPV. Pentru primele facturi reale ține `OBLIO_SPV=0`, verifică-le și trimite-le manual, apoi pune `1`.
- [ ] `OBLIO_EMAIL`, `OBLIO_API_SECRET`, `OBLIO_CIF`.

Configurează Oblio **înainte** de prima plată reală. Dacă lipsește, plata trece, clientul primește acces, iar în `fiscal_invoices` rămâne un rând `failed` cu „Oblio neconfigurat”: factura trebuie emisă apoi de mână.

### 4. Variabile în Vercel (apoi redeploy)

| Variabilă | Pentru ce |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cont și bază de date |
| `SUPABASE_SERVICE_ROLE_KEY` | doar pe server: webhook-ul scrie abonamentul și facturile |
| `NEXT_PUBLIC_SITE_URL` | adresa reală a site-ului (întoarcerea de la Stripe). Nu pune un domeniu care încă nu există |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | plăți |
| `STRIPE_PRICE_LEGACY` | opțional: prețuri vechi încă plătite de abonați |
| `OBLIO_EMAIL`, `OBLIO_API_SECRET`, `OBLIO_CIF`, `OBLIO_SERIES`, `OBLIO_STORNO_SERIES`, `OBLIO_VAT_NAME`, `OBLIO_VAT_PERCENT`, `OBLIO_SEND_EMAIL`, `OBLIO_SPV` | facturi |
| `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_CUI`, `NEXT_PUBLIC_OPERATOR_REG_COM`, `NEXT_PUBLIC_OPERATOR_ADDRESS`, `NEXT_PUBLIC_OPERATOR_EMAIL`, `NEXT_PUBLIC_OPERATOR_PHONE` | datele firmei din Termeni, Confidențialitate și mesajele de contact |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | statistici, opțional (vezi mai jos) |

### 5. Teste cap-coadă în modul test Stripe, în această ordine

1. Fără `STRIPE_WEBHOOK_SECRET`: `/preturi` spune „Plata online vine în curând”. Cu toate variabilele: apar ambele prețuri, în lei.
2. Persoană fizică, plan lunar, card `4242 4242 4242 4242`: întoarcere pe `/cont?plata=ok`; în cel mult un minut „Varianta ta: Complet”; în Stripe → Webhooks toate livrările au 200.
3. Cu Oblio pe seria de test și `OBLIO_SPV=0`, alt cont: verifică în Oblio numele clientului (nu emailul), adresa, cota TVA, totalul, „încasată cu cardul”, data; emailul cu factura ajunge; factura apare în cont cu link.
4. Trimite manual factura de la pasul 3 în SPV: trece validarea fără CNP și cu adresa din Stripe?
5. Firmă plătitoare de TVA (`RO` + CUI): denumirea și CUI-ul apar pe prima factură.
6. Instituție fără TVA (CUI fără RO): ce permite pagina de plată și ce iese pe factură?
7. Card cu 3D Secure (`4000 0025 0000 3155`): acces doar după confirmare.
8. Card respins (`4000 0000 0000 0002`): fără acces, fără factură.
9. Oblio indisponibil (pune temporar o serie inexistentă) și plătește: acces acordat, webhook 500, rând `failed`; repară seria, „Resend” din Stripe → `issued`. Verifică în Oblio că nu au ieșit două facturi.
10. Reînnoire cu „test clock”: a doua factură Stripe → a doua factură Oblio.
11. Plată eșuată la reînnoire (test clock + card `4000 0000 0000 0341`): acces păstrat cât Stripe reîncearcă; după ultima încercare → „Gratuit” (confirmă setarea de la „Plăți eșuate”).
12. Anulare din portal: accesul rămâne până la sfârșitul perioadei, apoi „Gratuit”; în cont scrie „Abonamentul s-a încheiat”.
13. Anulare imediată din dashboard: „Gratuit” imediat.
14. Rambursare totală din dashboard: storno în Oblio și link „Storno” în cont; apoi anulează manual abonamentul.
15. Rambursare parțială: rând `refund_partial`; fă storno parțial manual în Oblio.
16. Cod de acces: `SELECT * FROM generate_access_codes('full', 1)`; activează, abonează-te, anulează → rămâne „Complet”.
17. A doua abonare cu abonament activ → „Ai deja un abonament activ”.
18. Cupon 100%: acces acordat, rând `skipped`, fără factură.
19. Butonul „Card, facturi sau anulare” deschide portalul în română și se întoarce pe `/cont`.
20. Plan anual: „an școlar” și perioada corectă pe factură.
21. După trecerea pe chei live: o plată reală mică făcută de tine, verificarea facturii, apoi rambursare + storno + anulare. Abia apoi `OBLIO_SPV=1`.

### 6. După lansare, săptămânal

```sql
-- plăți care au nevoie de un om: fără factură, rambursate parțial sau rambursate înainte de factură
select * from fiscal_invoices where status not in ('issued', 'skipped', 'refunded');
```

Coloana `error` spune ce e de făcut. Uită-te și în Stripe → Webhooks la livrările eșuate (se pot retrimite 15 zile din dashboard). Un eveniment deja primit cu 200 nu se reprocesează la „Resend”; pentru un rând `failed`, emite factura de mână în Oblio.

## Statistici (PostHog)

Opționale; pornesc doar cu `NEXT_PUBLIC_POSTHOG_KEY`. Se trimit numai vizualizări de pagină și evenimentele numite din cod, cu proprietățile din lista permisă din `src/lib/analytics.ts`. Autocapture, înregistrările de sesiune, hărțile de click și sondajele sunt oprite din cod, fiindcă paginile afișează nume de copii și emailul contului; nu se folosesc cookie-uri și vizitatorii nu sunt identificați. Nu porni aceste funcții fără să schimbi întâi codul și politica de confidențialitate.

## Cum e construit

```
src/lib/glyphs      motorul de litere: linii vectoriale în ordinea de scriere, puncte numerotate, săgeți
                    → desenate identic pe ecran (canvas), în PDF (jsPDF) și în SVG
src/lib/worksheet   paginile fișelor (layout.ts), rândurile (rows.ts), fișele pentru grupă (group.ts)
src/lib/book        caietul KDP: interior cu margini oglindite, copertă cu cotor, dimensiuni KDP
src/lib/hints       imaginile pentru cuvinte (Twemoji, CC-BY 4.0), convertite în desene vectoriale
src/lib/themes.ts   temele săptămânii
src/lib/access.ts   ce e gratuit și ce nu (o singură regulă, folosită peste tot)
src/lib/billing     planuri, abonament → nivel, facturi Oblio, ce prețuri sunt ale noastre
src/app/api/stripe  checkout, portal, webhook
```

Ce vezi în previzualizare e exact ce se tipărește: aceeași descriere de pagină alimentează ecranul și PDF-ul. PDF-urile includ doar fontul Nunito (înglobat), cum cere KDP.

## Teste

`npm test` verifică, printre altele: că nicio pagină a caietului nu iese din zona sigură KDP pe niciun format, că fiecare copil încape pe o pagină la fișele pentru grupă, că literele blocate nu ajung în fișele gratuite, că webhook-ul Stripe acordă și retrage planul corect (cu semnături reale), că plățile altui produs din același cont Stripe nu devin facturi, că statisticile nu primesc nume sau emailuri și că numele copilului nu se salvează niciodată în cont.
