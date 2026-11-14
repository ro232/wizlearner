'use client';

import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { downloadErrorMessage } from '@/lib/pdf/errors';

/**
 * One way to run a download or a print, for every page that has such a button:
 *   - the button shows it is busy and cannot be pressed twice;
 *   - whatever goes wrong (no connection for the PDF code or the font, a browser that
 *     refuses the file), the person is told in plain words and the button works again —
 *     it never just stops spinning with nothing said;
 *   - on success the message the job returns is shown.
 */
export function useDownload<K extends string = 'download'>() {
  const toast = useToast();
  const [busy, setBusy] = useState<K | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(
    async (what: K, job: () => Promise<string | void>): Promise<boolean> => {
      if (running.current) return false;
      running.current = true;
      setBusy(what);
      setError(null);
      try {
        const done = await job();
        if (done) toast(done);
        return true;
      } catch (err) {
        console.error('PDF failed', err);
        const message = downloadErrorMessage(err);
        setError(message);
        toast(message);
        return false;
      } finally {
        running.current = false;
        setBusy(null);
      }
    },
    [toast],
  );

  return { busy, error, run };
}
