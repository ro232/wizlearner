import type { Metadata } from 'next';
import { routeMetadata } from '@/lib/seo/metadata';

// The page is a client component and cannot export metadata; this layout only gives it a title, description and canonical.
export const metadata: Metadata = routeMetadata('/generator');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
