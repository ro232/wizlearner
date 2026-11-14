import type { Metadata } from 'next';
import { routeMetadata } from '@/lib/seo/metadata';

// Description, canonical and share image for /preturi. The page still exports its own title
// („Prețuri · WorksheetWiz”), which wins over the one set here until that export is removed.
export const metadata: Metadata = routeMetadata('/preturi');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
