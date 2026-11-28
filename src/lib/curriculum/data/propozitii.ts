/**
 * „Lecția literei”: short sentences to start from, for the field „Propoziția” (clickable suggestions).
 * Three to six words, concrete, for children of 5–7; capital at the start, a full stop at the end
 * (the full stop is traced), ș/ț with the comma below. Every sentence has its letter or group.
 *
 * Keyed like the word lists: the capital letter („M”, „Ș”) or the group („che”). Q, W and Y have no
 * suggestions (hardly any Romanian words for children): the teacher writes one.
 * Loaded only when the lesson is opened (dynamic import). Checked by src/lib/__tests__/lesson-data.test.ts.
 */
export const LESSON_SENTENCES: Readonly<Record<string, readonly string[]>> = {
  A: ['Ana bea apă.', 'Ariciul are ace.', 'Avionul zboară sus.', 'Ana are un ac.'],
  Ă: ['Am o păpușă.', 'Fata are o pălărie.', 'Vaca paște iarbă.', 'Mama mătură casa.'],
  Â: ['Câinele latră tare.', 'Mama face pâine.', 'Mâna mea e mică.', 'Bate vântul tare.'],
  B: ['Balonul e roșu.', 'Bradul e verde.', 'Bunica face biscuiți.', 'Barca e pe lac.'],
  C: ['Calul e maro.', 'Cana e plină.', 'Copacul e înalt.', 'Am o casă mică.'],
  D: ['Delfinul e în mare.', 'Dan face un desen.', 'Dulapul e mare.', 'Dovleacul e rotund.'],
  E: ['Elefantul e mare.', 'Eu sunt elev.', 'Ema e elevă.'],
  F: ['Fata are o floare.', 'Fluturele e galben.', 'Frunza e galbenă.', 'Fulgii cad încet.'],
  G: ['Gâsca e albă.', 'Găina face ouă.', 'Gardul e lung.', 'Gutuia e galbenă.'],
  H: ['Haina e caldă.', 'Harta e pe masă.', 'Hamsterul e mic.'],
  I: ['Iepurele e alb.', 'Iarna ninge mult.', 'Ioana are un inel.', 'Iarba e verde.'],
  Î: ['Îmi place înghețata.', 'Eu înot în lac.', 'Îmi place toamna.'],
  J: ['Jucăria e nouă.', 'Jeleul e dulce.', 'Jucăm un joc.', 'Jaguarul e rapid.'],
  K: ['Koala doarme mult.', 'Am un kiwi.', 'Dan face karate.'],
  L: ['Luna e pe cer.', 'Laleaua e roșie.', 'Lupul urlă noaptea.', 'Lili bea lapte.'],
  M: ['Mama are mere.', 'Melcul merge încet.', 'Mărul e roșu.', 'Mihai are o minge.'],
  N: ['Norul e alb.', 'Nicu are o nucă.', 'Ninge mult afară.'],
  O: ['Oaia e albă.', 'Am un ou.', 'Omida e verde.', 'Oana are ochelari.'],
  P: ['Pisica bea lapte.', 'Pomul e înalt.', 'Petru are un pix.', 'Plouă în parc.'],
  R: ['Rața înoată pe lac.', 'Robotul merge încet.', 'Rochia e nouă.', 'Radu are un rucsac.'],
  S: ['Soarele e cald.', 'Sania e nouă.', 'Sara are o soră.', 'Steaua e sus.'],
  Ș: ['Șoricelul e mic.', 'Șarpele e lung.', 'Ștefan merge la școală.', 'Am o șapcă.'],
  T: ['Trenul e lung.', 'Tata citește o carte.', 'Toamna plouă des.', 'Tortul e bun.'],
  Ț: ['Țestoasa merge încet.', 'Țânțarul e mic.', 'Țurțurii se topesc.', 'Țara mea e frumoasă.'],
  U: ['Ursul doarme iarna.', 'Umbrela e mare.', 'Ușa e deschisă.', 'Am un unicorn.'],
  V: ['Vaca dă lapte.', 'Vulpea e isteață.', 'Vara e frumoasă.', 'Veverița are o nucă.'],
  X: ['Tata are un taxi.', 'Alex cântă la xilofon.', 'Am un pix nou.'],
  Z: ['Zebra are dungi.', 'Zăpada e albă.', 'Zâna e bună.', 'Zmeul zboară sus.'],
  ce: ['Cerul e senin.', 'Ceaiul e cald.', 'Ceasul sună dimineața.', 'Afară e ceață.'],
  ci: ['Cireșele sunt dulci.', 'Ariciul are ace.', 'Ciorapul e nou.', 'Am cinci creioane.'],
  ge: ['Geanta e nouă.', 'Afară e ger.', 'Geamul e curat.', 'Mănânc pâine cu gem.'],
  gi: ['Girafa e înaltă.', 'Regina are o coroană.', 'Citesc o pagină.', 'Fragii sunt dulci.'],
  che: ['Cheia e mică.', 'Bunicul are ochelari.', 'Am o pereche de mănuși.', 'Mama face chec.'],
  chi: ['Ochii sunt albaștri.', 'Unchiul are o chitară.', 'Rochia e nouă.', 'Chiflele sunt calde.'],
  ghe: ['Gheața e rece.', 'Ghetele sunt noi.', 'Pisica are gheare.', 'Am un ghem de lână.'],
  ghi: ['Ghiocelul e alb.', 'Ghiozdanul e greu.', 'Veverița are o ghindă.', 'Unghiile sunt curate.'],
};
