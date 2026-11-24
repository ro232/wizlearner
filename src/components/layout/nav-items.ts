import type { LucideIcon } from 'lucide-react';
import { Pencil, ListChecks, Users, CalendarRange, LayoutGrid, QrCode, UserRound, Library, FileDown, CalendarDays, Crown } from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  /** One line under the label in the dropdown and the phone menu. */
  text?: string;
  icon: LucideIcon;
  /** Shown only while the Advent calendar runs (it hides itself after Christmas). */
  seasonal?: 'advent';
}

export interface NavGroup {
  id: string;
  label: string;
  links: NavLink[];
}

export type NavItem = ({ kind: 'link' } & NavLink) | ({ kind: 'group' } & NavGroup);

/**
 * The main menu: two direct links, two groups and the prices. Teachers first (the programme, the
 * class tools), parents second. „Caiet KDP” (/book) is the owner's own tool: it lives in the footer.
 */
export const NAV_ITEMS: NavItem[] = [
  { kind: 'link', href: '/generator', label: 'Fișe', icon: Pencil },
  { kind: 'link', href: '/programa', label: 'Pe programă', icon: ListChecks },
  {
    kind: 'group',
    id: 'clasa',
    label: 'Pentru clasă',
    links: [
      { href: '/grupa', label: 'Pentru grupă', text: 'Câte o fișă cu numele fiecărui copil', icon: Users },
      { href: '/planificare', label: 'Planificare', text: 'Planificarea calendaristică 2026–2027', icon: CalendarRange },
      { href: '/planse', label: 'Planșe și diplome', text: 'Alfabetul pentru perete, cartonașe, diplome', icon: LayoutGrid },
      { href: '/#tema', label: 'Temă pentru părinți', text: 'Link și cod QR, gratuit pentru părinți', icon: QrCode },
    ],
  },
  {
    kind: 'group',
    id: 'parinti',
    label: 'Pentru părinți',
    links: [
      { href: '/nume', label: 'Fișa cu numele', text: 'Numele copilului, de trasat', icon: UserRound },
      { href: '/caiete', label: 'Caiete gata', text: 'Tot alfabetul sau toate cifrele', icon: Library },
      { href: '/fise', label: 'Fișe gratuite', text: 'Fiecare literă, cifră și joc, ca PDF', icon: FileDown },
      { href: '/advent', label: 'Calendar de Advent', text: 'O fișă pe zi, 1–24 decembrie', icon: CalendarDays, seasonal: 'advent' },
    ],
  },
  { kind: 'link', href: '/preturi', label: 'Prețuri', icon: Crown },
];

/** Every address the menu can open (the hash of „/#tema” left out). */
export function navHrefs(items: NavItem[] = NAV_ITEMS): string[] {
  return items.flatMap((i) => (i.kind === 'link' ? [i.href] : i.links.map((l) => l.href)));
}
