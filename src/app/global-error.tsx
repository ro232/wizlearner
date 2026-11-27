'use client';

import './globals.css';
import { ErrorScreen } from '@/components/layout/error-screen';
import { BRAND_NAME } from '@/lib/brand';

/** Replaces the whole document when the root layout itself fails. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ro">
      <head>
        <title>{`Ceva nu a mers · ${BRAND_NAME}`}</title>
      </head>
      <body className="font-sans antialiased">
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
