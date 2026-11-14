/**
 * What to tell someone when signing in or creating an account did not work.
 * Supabase answers with a code (newer versions), a status and an English message; all three
 * are looked at, so the explanation stays right across versions.
 */
export type AuthProblem = 'credentials' | 'not_confirmed' | 'exists' | 'weak_password' | 'invalid_email' | 'rate_limited' | 'network' | 'unknown';

interface AuthErrorLike {
  code?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
}

export function authProblem(error: unknown): AuthProblem {
  const e = (error && typeof error === 'object' ? error : {}) as AuthErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : typeof error === 'string' ? error.toLowerCase() : '';
  const name = typeof e.name === 'string' ? e.name : '';
  const status = typeof e.status === 'number' ? e.status : undefined;

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'not_confirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered') || message.includes('already been registered')) return 'exists';
  if (code === 'weak_password' || name === 'AuthWeakPasswordError' || message.includes('password should') || message.includes('weak password')) return 'weak_password';
  if (code.startsWith('over_') || status === 429 || message.includes('rate limit') || message.includes('too many') || message.includes('for security purposes')) return 'rate_limited';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'credentials';
  if (code === 'email_address_invalid' || code === 'validation_failed' || message.includes('invalid email') || message.includes('unable to validate email')) return 'invalid_email';
  if (name === 'AuthRetryableFetchError' || status === 0 || message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed') || message.includes('network request failed')) return 'network';
  return 'unknown';
}

export function authErrorMessage(error: unknown, mode: 'signin' | 'signup' | 'link'): string {
  switch (authProblem(error)) {
    case 'credentials':
      return 'Emailul sau parola nu sunt corecte.';
    case 'not_confirmed':
      return 'Contul există, dar emailul nu e confirmat încă. Deschide linkul din emailul primit la înscriere (uită-te și în Spam).';
    case 'exists':
      return 'Există deja un cont cu acest email. Intră în cont cu parola ta sau cere un link pe email.';
    case 'weak_password':
      return 'Parola e prea scurtă sau prea simplă. Alege una de cel puțin 8 caractere.';
    case 'invalid_email':
      return 'Adresa de email nu pare corectă. Verific-o și încearcă din nou.';
    case 'rate_limited':
      return 'Prea multe încercări într-un timp scurt. Așteaptă câteva minute și încearcă din nou.';
    case 'network':
      return 'Nu am putut ajunge la server. Verifică internetul și încearcă din nou.';
    default:
      return mode === 'signup' ? 'Nu am putut crea contul. Încearcă din nou peste puțin timp.' : mode === 'link' ? 'Nu am putut trimite linkul. Încearcă din nou peste puțin timp.' : 'Nu am putut face autentificarea. Încearcă din nou peste puțin timp.';
  }
}
