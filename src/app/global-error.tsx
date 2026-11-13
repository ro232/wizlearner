'use client';

import './globals.css';
import { ErrorScreen } from '@/components/layout/error-screen';

/** Replaces the whole document when the root layout itself fails. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ro">
      <head>
        <title>Ceva nu a mers · WorksheetWiz</title>
      </head>
      <body className="font-sans antialiased">
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
