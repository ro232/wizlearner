import type { Metadata } from 'next';
import { LegalPage, LEGAL_UPDATED } from '@/components/layout/legal-page';
import { OPERATOR, operatorSentence } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Politica de confidențialitate',
  description: 'Ce date folosește WorksheetWiz, de ce, cât timp, cu ce furnizori lucrăm și ce drepturi ai. Numele scrise pe fișe rămân în browserul tău.',
  path: '/confidentialitate',
});

/** „pe e-mail, la …” as a link, or a neutral wording while the contact address is not set. */
function Contact() {
  if (OPERATOR.email) return <>pe e-mail, la <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a></>;
  return <>la adresa de contact care va fi afișată în subsolul site-ului</>;
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Politica de confidențialitate" updated={LEGAL_UPDATED}>
      <p>
        {operatorSentence()} În această pagină, „noi” înseamnă operatorul site-ului: noi hotărâm ce date se folosesc și răspundem
        de ele. Pentru orice întrebare despre datele tale ne scrii <Contact />.
      </p>

      <h2>Ce date folosim</h2>
      <ul>
        <li><strong>Fără cont:</strong> fișele se generează direct în browserul tău. Numele copilului și cuvintele pe care le scrii nu ne sunt trimise și nu sunt salvate de noi.</li>
        <li><strong>Cu cont:</strong> adresa de e-mail, numele afișat și, dacă intri cu Google, numele din contul Google. Le folosim ca să te autentificăm și să știm ce variantă ai (gratuită sau completă).</li>
        <li><strong>Coduri de acces:</strong> când activezi un cod, păstrăm codul și data activării, legate de contul tău.</li>
        <li><strong>Abonament și facturi:</strong> plata se face prin Stripe. Datele cardului ajung doar la Stripe, nu la noi. Noi păstrăm identificatorul de client Stripe, starea abonamentului și data reînnoirii. Pentru factură folosim numele și adresa de facturare pe care le dai la plată (și codul fiscal, dacă plătești pe firmă).</li>
        <li><strong>Fișe și caiete salvate:</strong> dacă salvezi o fișă sau un caiet în cont, păstrăm setările lui (literele, cuvintele, nivelul), fără numele copilului. Excepție: caietul cu numele, pe care îl salvezi tocmai cu numele scris pe el.</li>
        <li><strong>Istoricul descărcărilor:</strong> cât timp ești în cont, păstrăm setările ultimelor 60 de descărcări (fără numele copiilor), ca să le poți reface. Îl ștergi oricând din cont.</li>
        <li><strong>Date tehnice:</strong> ca la orice site, adresa IP și tipul de browser ajung la serverele care îți trimit paginile. Nu le folosim ca să aflăm cine ești.</li>
      </ul>
      <p>
        Nu ești obligat să ne dai date: fișele gratuite merg fără cont. Pentru cont e nevoie de o adresă de e-mail, iar pentru
        abonament, de datele cerute de lege pe factură.
      </p>

      <h2>Datele copiilor</h2>
      <p>
        Nu cerem date despre copii: nici vârsta, nici clasa, nici fotografii. Numele scris pe o fișă, inclusiv listele de nume de
        pe pagina „Pentru grupă”, rămân în browserul tău. Când salvezi o fișă în cont, numele copilului este scos înainte de
        salvare. Păstrăm un prenume doar dacă îl adaugi tu la „Copiii mei” (prenumele și nivelul, nimic altceva) sau salvezi un
        caiet cu numele. Le vezi și le ștergi oricând din cont.
      </p>
      <p>
        Prenumele unui copil este o dată a copilului, pe care ne-o dai tu, ca părinte sau cadru didactic. O folosim doar ca să-ți
        arătăm fișele lui. Site-ul este făcut pentru adulți, nu pentru a fi folosit de copii.
      </p>

      <h2>Pentru educatoare și învățătoare</h2>
      <p>
        Dacă salvezi în cont prenume ale copiilor din grupa sau din clasa ta, grădinița sau școala la care lucrezi este
        operatorul acestor date, iar noi le prelucrăm doar în numele ei, ca persoană împuternicită: le ținem în contul tău, le
        folosim numai ca să-ți facem fișele și le ștergem când le ștergi tu sau când ne ceri. Prenumele sunt opționale. Poți
        face fișe pentru toată grupa fără să salvezi niciun nume în cont: pe pagina „Pentru grupă”, lista de nume rămâne doar
        în browserul tău și nu ajunge la noi.
      </p>

      <h2>De ce avem voie să folosim datele (temeiuri)</h2>
      <ul>
        <li><strong>Contul și abonamentul:</strong> ca să-ți oferim serviciul pe care l-ai cerut (executarea contractului, art. 6 alin. 1 lit. b din GDPR).</li>
        <li><strong>Facturile:</strong> pentru că legea ne obligă să le emitem și să le păstrăm (obligație legală, lit. c).</li>
        <li><strong>Statisticile de folosire și protecția împotriva abuzurilor:</strong> interesul nostru legitim de a face site-ul mai bun și mai sigur (lit. f). Te poți opune oricând.</li>
        <li><strong>Prenumele adăugate la „Copiii mei”:</strong> interesul legitim de a-ți oferi fișele personalizate pe care le-ai cerut (lit. f).</li>
      </ul>

      <h2>Cât timp păstrăm datele</h2>
      <ul>
        <li>Datele contului, fișele salvate și prenumele: cât timp ai cont sau până le ștergi tu.</li>
        <li>Dacă ne ceri ștergerea contului, ștergem datele în cel mult 30 de zile, cu excepția celor pe care legea ne obligă să le păstrăm.</li>
        <li>Facturile: atât cât cere legislația contabilă și fiscală.</li>
        <li>Ce rămâne în browserul tău (vezi mai jos): până îl ștergi tu.</li>
      </ul>

      <h2>Cu cine lucrăm</h2>
      <p>Datele ajung doar la furnizorii de care avem nevoie ca site-ul să funcționeze:</p>
      <ul>
        <li><strong>Supabase</strong> – autentificarea și baza de date (contul, fișele salvate, prenumele de la „Copiii mei”).</li>
        <li><strong>Vercel</strong> – găzduirea site-ului.</li>
        <li><strong>Stripe</strong> – plățile cu cardul și abonamentul.</li>
        <li><strong>Oblio</strong> – emiterea facturilor și transmiterea lor în sistemul e-Factura, potrivit legii.</li>
        <li><strong>PostHog</strong> – statistici de folosire, pe servere din Uniunea Europeană, fără cookie-uri.</li>
        <li><strong>Google</strong> – doar dacă alegi să intri cu contul Google.</li>
      </ul>
      <p>
        Unii dintre acești furnizori (Stripe, Vercel, Google, Supabase) au sediul sau servere și în Statele Unite, așa că datele
        pot fi prelucrate și în afara Spațiului Economic European. Când se întâmplă asta, transferul se face pe baza Cadrului
        UE–SUA privind confidențialitatea datelor sau a clauzelor contractuale standard aprobate de Comisia Europeană.
      </p>
      <p>Nu vindem date și nu afișăm reclame.</p>

      <h2>Cookie-uri și ce rămâne în browserul tău</h2>
      <p>Folosim doar cookie-urile necesare ca să rămâi autentificat. Nu folosim cookie-uri de analiză sau de marketing.</p>
      <p>
        Ultima fișă la care ai lucrat și grupele salvate pe pagina „Pentru grupă” rămân în acest browser, ca să le găsești data
        viitoare. Nu ne sunt trimise. Pe un calculator folosit și de alții, le poți șterge din setările browserului (ștergerea
        datelor site-ului).
      </p>

      <h2>Statistici de folosire</h2>
      <p>
        Ca să facem site-ul mai ușor de folosit, măsurăm anonim ce pagini sunt deschise și ce funcții sunt folosite, de exemplu
        că a fost descărcată o fișă (PostHog, cu servere în Uniunea Europeană). Nu se salvează nimic în browserul tău și nu
        folosim cookie-uri pentru asta. Numele copiilor și ce scrii în câmpuri nu fac parte din aceste statistici, iar ele nu
        sunt legate de contul tău. Dacă browserul tău cere „Do Not Track”, nu măsurăm nimic.
      </p>

      <h2>Drepturile tale</h2>
      <p>
        Ai dreptul să ceri acces la datele tale, corectarea sau ștergerea lor, restricționarea prelucrării, portabilitatea
        (o copie a datelor, într-un format ușor de folosit) și dreptul să te opui prelucrărilor bazate pe interesul nostru
        legitim, cum sunt statisticile de folosire.
      </p>
      <p>
        Prenumele de la „Copiii mei”, fișele salvate și istoricul descărcărilor le ștergi singur, oricând, din cont. Ștergerea
        întregului cont și copia datelor se fac deocamdată la cerere: ne scrii <Contact />, de pe adresa contului, și rezolvăm
        în cel mult 30 de zile.
      </p>
      <p>
        Dacă crezi că îți folosim datele greșit, poți depune plângere la Autoritatea Națională de Supraveghere a Prelucrării
        Datelor cu Caracter Personal (ANSPDCP),{' '}
        <a href="https://www.dataprotection.ro/" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>.
      </p>
    </LegalPage>
  );
}
