import type { LucideIcon } from 'lucide-react';
import { Pencil, ListChecks, Users, CalendarRange, LayoutGrid, QrCode, UserRound, Library, FileDown, CalendarDays, Crown, LayoutDashboard, Shapes, Search, Grid2x2 } from 'lucide-react';
import type { Role } from '@/stores/role-store';

export interface NavLink {
  href: string;
  label: string;
  /** One line under the label in the dropdown and the phone menu. */
  text?: string;
  icon: LucideIcon;
  /** Shown only while the Advent calendar runs (it hides itself after Christmas). */
  seasonal?: 'advent';
  /** A teacher's tool (the programme, the yearly plan): left out of a parent's menu; the footer still has it. */
  teacher?: boolean;
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

/**
 * The menu of a teacher: the dashboard and the four tools of every week. Everything else is in
 * „Toate uneltele” and in the footer.
 */
export const CADRU_NAV: NavItem[] = [
  { kind: 'link', href: '/panou/cadru', label: 'Panou', icon: LayoutDashboard },
  { kind: 'link', href: '/generator', label: 'Fișe de lucru', icon: Pencil },
  { kind: 'link', href: '/grupa', label: 'Grupa mea', icon: Users },
  { kind: 'link', href: '/planificare', label: 'Planificare', icon: CalendarRange },
  { kind: 'link', href: '/programa', label: 'Programa', icon: ListChecks },
];

/** The menu of a parent: no school paperwork, only what is printed at home. Advent is seasonal. */
export const PARINTE_NAV: NavItem[] = [
  { kind: 'link', href: '/panou/parinte', label: 'Panou', icon: LayoutDashboard },
  { kind: 'link', href: '/nume', label: 'Fișă cu nume', icon: UserRound },
  { kind: 'link', href: '/caiete', label: 'Caiete', icon: Library },
  { kind: 'link', href: '/fise-de-lucru', label: 'Fișe pe vârste', icon: Shapes },
  { kind: 'link', href: '/advent', label: 'Advent', icon: CalendarDays, seasonal: 'advent' },
];

/**
 * „Toate uneltele”: with a role chosen the menu is short, so every tool of the site stays one
 * click away here (and in the footer), whoever is looking.
 */
export const ALL_TOOLS: NavGroup = {
  id: 'toate',
  label: 'Toate uneltele',
  links: [
    { href: '/generator', label: 'Generator de fișe', text: 'Litere, cifre, matematică, jocuri', icon: Pencil },
    { href: '/cauta', label: 'Caută fișe', text: 'Toate fișele, cu filtre', icon: Search },
    { href: '/fise-de-lucru', label: 'Fișe de lucru pe clase', text: 'De la grădiniță la clasa a IV-a', icon: Grid2x2 },
    { href: '/fise', label: 'Fișe gratuite', text: 'Fiecare literă, cifră și joc, ca PDF', icon: FileDown },
    { href: '/nume', label: 'Fișa cu numele', text: 'Numele copilului, de trasat', icon: UserRound },
    { href: '/caiete', label: 'Caiete gata', text: 'Tot alfabetul sau toate cifrele', icon: Library },
    { href: '/grupa', label: 'Pentru grupă', text: 'Câte o fișă cu numele fiecărui copil', icon: Users },
    { href: '/programa', label: 'Fișe pe programă', text: 'Competențele, cu fișele lor', icon: ListChecks, teacher: true },
    { href: '/planificare', label: 'Planificare', text: 'Planificarea calendaristică 2026–2027', icon: CalendarRange, teacher: true },
    { href: '/planse', label: 'Planșe și diplome', text: 'Alfabetul pentru perete, cartonașe, diplome', icon: LayoutGrid },
    { href: '/advent', label: 'Calendar de Advent', text: 'O fișă pe zi, 1–24 decembrie', icon: CalendarDays, seasonal: 'advent' },
    { href: '/preturi', label: 'Prețuri', text: 'Gratuit sau varianta completă', icon: Crown },
  ],
};

const ROLE_NAV: Record<Role, NavItem[]> = { cadru: CADRU_NAV, parinte: PARINTE_NAV };

/** The menu for a role; with no role, the menu everyone has always seen. */
export function navItemsFor(role: Role | null): NavItem[] {
  if (!role) return NAV_ITEMS;
  const links = role === 'parinte' ? ALL_TOOLS.links.filter((l) => !l.teacher) : ALL_TOOLS.links;
  return [...ROLE_NAV[role], { kind: 'group', ...ALL_TOOLS, links }];
}

/** Every address the menu can open (the hash of „/#tema” left out). */
export function navHrefs(items: NavItem[] = NAV_ITEMS): string[] {
  return items.flatMap((i) => (i.kind === 'link' ? [i.href] : i.links.map((l) => l.href)));
}
