/**
 * The embedded font (Nunito) could not be loaded. Without it a PDF would come out in the
 * viewer's stand-in font: no ș/ț, a broken minus sign, and a file KDP rejects. We stop instead.
 */
export class FontLoadError extends Error {
  constructor(cause?: unknown) {
    super('The worksheet font could not be loaded');
    this.name = 'FontLoadError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** The PDF code itself did not arrive (offline, or a tab left open across a new release). */
export function isChunkLoadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: unknown; message?: unknown };
  return e.name === 'ChunkLoadError' || (typeof e.message === 'string' && /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(e.message));
}

/** What to tell the person when a download or a print did not work. */
export function downloadErrorMessage(err: unknown): string {
  if (err instanceof FontLoadError || (err as { name?: string } | null)?.name === 'FontLoadError') {
    return 'Nu am putut încărca fontul fișei, așa că nu am făcut PDF-ul. Verifică internetul și încearcă din nou.';
  }
  if (isChunkLoadError(err)) return 'Nu am putut încărca generatorul de PDF. Verifică internetul, reîncarcă pagina și încearcă din nou.';
  return 'Nu am putut pregăti PDF-ul. Încearcă din nou.';
}
