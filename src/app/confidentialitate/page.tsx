import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';
import { OPERATOR } from '@/lib/legal';

export const metadata: Metadata = { title: 'Confidențialitate · WorksheetWiz' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Politica de confidențialitate" updated="23 octombrie 2026">
      <p>
        WorksheetWiz este operat de {OPERATOR.name}, CUI {OPERATOR.cui}, cu sediul în {OPERATOR.address} („noi”). Pentru orice
        întrebare despre datele tale ne scrii la {OPERATOR.email}.
      </p>

      <h2>Ce date folosim</h2>
      <ul>
        <li><strong>Fără cont:</strong> fișele se generează direct în browserul tău. Numele copilului și cuvintele pe care le scrii nu ne sunt trimise și nu sunt salvate de noi.</li>
        <li><strong>Cu cont:</strong> adresa de email, numele afișat și, dacă intri cu Google, numele din contul Google. Le folosim ca să te autentificăm și să știm ce variantă ai (gratuită sau completă).</li>
        <li><strong>Coduri de acces:</strong> când activezi un cod, păstrăm codul și data activării, legate de contul tău.</li>
      </ul>

      <h2>Datele copiilor</h2>
      <p>
        Nu cerem și nu păstrăm date despre copii. Numele scris pe o fișă rămâne în browserul tău. Dacă în viitor vei putea salva
        fișe în cont, te vom anunța aici înainte, iar salvarea va fi opțională.
      </p>

      <h2>Temeiul și cât timp</h2>
      <p>
        Folosim datele contului pentru a-ți oferi serviciul pe care l-ai cerut (art. 6 alin. 1 lit. b GDPR) și le păstrăm cât timp ai
        cont. Dacă îți ștergi contul, ștergem datele în cel mult 30 de zile, cu excepția celor pe care legea ne obligă să le păstrăm (de exemplu, facturile).
      </p>

      <h2>Cu cine lucrăm</h2>
      <ul>
        <li>Supabase, pentru autentificare și baza de date.</li>
        <li>Furnizorul de găzduire al site-ului.</li>
        <li>Google, doar dacă alegi să intri cu contul Google.</li>
      </ul>
      <p>Nu vindem date și nu folosim reclame sau instrumente de urmărire.</p>

      <h2>Cookie-uri</h2>
      <p>Folosim doar cookie-urile necesare ca să rămâi autentificat. Nu folosim cookie-uri de analiză sau de marketing.</p>

      <h2>Drepturile tale</h2>
      <p>
        Poți cere acces la date, corectarea sau ștergerea lor, restricționarea prelucrării și portabilitatea, scriind la {OPERATOR.email}.
        Poți depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (dataprotection.ro).
      </p>
    </LegalPage>
  );
}
