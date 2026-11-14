'use client';

import { traceLetters, unsupportedLetters } from '@/lib/glyphs/data';

/**
 * Under a name field: says which letters are not in the Romanian alphabet and how they will
 * be traced (László → Laszlo), so a parent or a teacher is never surprised by the printed sheet.
 * `names` lists several names (a group): only the ones with such letters are mentioned.
 */
export function ForeignLettersNote({ text, names, className = '' }: { text?: string; names?: string[]; className?: string }) {
  const box = `text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 ${className}`;
  if (names) {
    const odd = names.filter((n) => unsupportedLetters(n).length > 0);
    if (!odd.length) return null;
    const shown = odd.slice(0, 5).map((n) => `${n} → ${traceLetters(n)}`).join(', ');
    return (
      <p role="status" className={box}>
        Unele litere nu sunt în alfabetul românesc și se scriu fără semne: {shown}{odd.length > 5 ? ` și încă ${odd.length - 5}` : ''}.
      </p>
    );
  }
  const letters = unsupportedLetters(text ?? '');
  if (!letters.length) return null;
  return (
    <p role="status" className={box}>
      {letters.length === 1 ? 'Litera' : 'Literele'} {letters.join(', ')} {letters.length === 1 ? 'nu e' : 'nu sunt'} în alfabetul românesc:
      pe fișă se scrie „{traceLetters(text ?? '')}”.
    </p>
  );
}
