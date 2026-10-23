import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';
import { OPERATOR } from '@/lib/legal';

export const metadata: Metadata = { title: 'Termeni · WorksheetWiz' };

export default function TermsPage() {
  return (
    <LegalPage title="Termeni și condiții" updated="23 octombrie 2026">
      <p>Folosind WorksheetWiz, operat de {OPERATOR.name} (CUI {OPERATOR.cui}), accepți termenii de mai jos.</p>

      <h2>Ce poți face cu fișele</h2>
      <ul>
        <li>Varianta gratuită și cea completă: poți printa și folosi fișele acasă, la grădiniță sau la școală, oricâte copii ai.</li>
        <li>Caietele generate pe pagina „Caiet KDP” cu varianta completă le poți publica și vinde sub numele tău, de exemplu pe Amazon KDP.</li>
        <li>Nu poți revinde fișele ca pachete de fișiere pe alte platforme de fișe sau șabloane.</li>
      </ul>

      <h2>Imagini</h2>
      <p>Imaginile de lângă cuvinte provin din Twemoji (licență CC-BY 4.0). Atribuirea apare în caiete și pe site și trebuie păstrată.</p>

      <h2>Coduri de acces</h2>
      <p>Un cod de acces se poate activa o singură dată, pe un singur cont. Nu poate fi transferat după activare.</p>

      <h2>Răspundere</h2>
      <p>
        Facem tot ce putem ca fișele să fie corecte și site-ul să funcționeze, dar serviciul este oferit „ca atare”. Verifică un PDF
        înainte de a-l tipări în multe exemplare sau de a-l publica.
      </p>

      <h2>Contact</h2>
      <p>Pentru orice întrebare: {OPERATOR.email}.</p>
    </LegalPage>
  );
}
