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
| `npm test` | testele automate (Vitest) |
| `npm run lint` | verificarea codului |
| `npm run build` | build de producție |
| `npm run build:icons` | regenerează imaginile pentru cuvinte după ce schimbi `LETTER_HINTS` sau `THEMES` |

## Configurare

1. **Supabase:** rulează `src/lib/supabase/schema.sql` (doar pe o bază nouă), apoi toate fișierele din `supabase/migrations/` în ordinea numelui (acum trei). Ele închid accesul din browser la coduri, nivelul contului și starea abonamentului. Adaugă `https://SITE/auth/callback` (cu parametri) la URL-urile de redirect din Authentication.
2. **Coduri de acces** (de exemplu pentru Etsy), din SQL Editor: `SELECT * FROM generate_access_codes('starter', 10);`
3. **Stripe:** două prețuri recurente (lunar și pe an școlar) puse în `STRIPE_PRICE_MONTHLY` și `STRIPE_PRICE_YEARLY`; un webhook spre `/api/stripe/webhook` cu evenimentele `checkout.session.completed` și `customer.subscription.*`; Customer Portal activat. Planul plătit se acordă **doar** din webhook.
4. **Datele firmei** pentru Confidențialitate și Termeni: variabilele `NEXT_PUBLIC_OPERATOR_*`.

## Cum e construit

```
src/lib/glyphs      motorul de litere: linii vectoriale în ordinea de scriere, puncte numerotate, săgeți
                    → desenate identic pe ecran (canvas), în PDF (jsPDF) și în SVG
src/lib/worksheet   paginile fișelor (layout.ts), rândurile (rows.ts), fișele pentru grupă (group.ts)
src/lib/book        caietul KDP: interior cu margini oglindite, copertă cu cotor, dimensiuni KDP
src/lib/hints       imaginile pentru cuvinte (Twemoji, CC-BY 4.0), convertite în desene vectoriale
src/lib/themes.ts   temele săptămânii
src/lib/access.ts   ce e gratuit și ce nu (o singură regulă, folosită peste tot)
src/lib/billing     planuri și reguli abonament → nivel
src/app/api/stripe  checkout, portal, webhook
```

Ce vezi în previzualizare e exact ce se tipărește: aceeași descriere de pagină alimentează ecranul și PDF-ul. PDF-urile includ doar fontul Nunito (înglobat), cum cere KDP.

## Teste

`npm test` verifică, printre altele: că nicio pagină a caietului nu iese din zona sigură KDP pe niciun format, că fiecare copil încape pe o pagină la fișele pentru grupă, că literele blocate nu ajung în fișele gratuite, că webhook-ul Stripe acordă și retrage planul corect (cu semnături reale) și că numele copilului nu se salvează niciodată în cont.
