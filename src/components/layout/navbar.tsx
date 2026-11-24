'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, User, Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useAuth } from '@/hooks/use-auth';
import { adventBannerVisible } from '@/lib/worksheet/advent';
import { NAV_ITEMS, type NavGroup, type NavLink } from './nav-items';

const TIER_LABEL = { free: 'Gratuit', starter: 'Starter', full: 'Complet' } as const;

const isCurrent = (pathname: string, href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));

/** The seasonal links (Advent) disappear after their date, like the banner on the home page. */
function useVisibleLinks() {
  const [advent, setAdvent] = useState(true);
  useEffect(() => setAdvent(adventBannerVisible()), []);
  return useCallback((links: NavLink[]) => links.filter((l) => l.seasonal !== 'advent' || advent), [advent]);
}

const topItem = 'inline-flex items-center gap-1.5 h-9 rounded-lg px-2 xl:px-2.5 text-[13px] font-bold text-ink hover:bg-white whitespace-nowrap';
const topCurrent = 'bg-white shadow-sm underline decoration-pen decoration-2 underline-offset-4';

/**
 * A menu group on the computer: a button that opens a list of links (the disclosure pattern).
 * Click or tap opens it; ↓ opens it and goes to the first link; ↑ ↓ Home End move between links;
 * Escape closes it and returns to the button; a click outside, leaving with Tab or a new page closes it.
 */
function NavDropdown({ group, links, open, onOpenChange, pathname }: {
  group: NavGroup;
  links: NavLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  const current = links.some((l) => isCurrent(pathname, l.href));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const focusFirst = useRef(false);
  const panelId = `nav-${group.id}`;

  const items = () => Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-item]') ?? []);

  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      focusFirst.current = false;
      items()[0]?.focus();
    }
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false);
    };
    // Escape from anywhere (Safari does not focus a clicked button, so the key may start on the page)
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onOpenChange(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, onOpenChange]);

  const onButtonKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (open) items()[0]?.focus();
      else {
        focusFirst.current = true;
        onOpenChange(true);
      }
    }
  };

  const onPanelKey = (e: ReactKeyboardEvent) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLAnchorElement);
    const go = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
  };

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (open && !root.current?.contains(e.relatedTarget as Node | null)) onOpenChange(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={onButtonKey}
        className={cn(topItem, (current || open) && topCurrent)}
      >
        {group.label}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKey}
        className="absolute left-0 top-full mt-2 w-[330px] rounded-xl border-2 border-ink bg-white p-1.5 shadow-lg"
      >
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                data-nav-item
                onClick={() => onOpenChange(false)}
                aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-ink hover:bg-paper focus-visible:bg-paper"
              >
                <span className="mt-0.5 shrink-0 w-7 h-7 rounded-md bg-pencil/30 flex items-center justify-center" aria-hidden>
                  <l.icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">{l.label}</span>
                  {l.text && <span className="block text-[13px] leading-snug text-slate-600">{l.text}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const tier = useWorksheetStore((s) => s.tier);
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const visible = useVisibleLinks();
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  // Escape closes the phone menu too, and gives the focus back to its button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const closeAll = () => {
    setOpen(false);
    setMenu(null);
  };

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur" aria-label="Navigare principală">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Logo />

        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {NAV_ITEMS.map((item) =>
            item.kind === 'link' ? (
              <Link key={item.href} href={item.href} className={cn(topItem, isCurrent(pathname, item.href) && topCurrent)} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
                <item.icon className="hidden xl:block w-3.5 h-3.5" aria-hidden />
                {item.label}
              </Link>
            ) : (
              <NavDropdown
                key={item.id}
                group={item}
                links={visible(item.links)}
                open={menu === item.id}
                onOpenChange={(o) => setMenu(o ? item.id : null)}
                pathname={pathname}
              />
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Badge variant="outline" className={cn('hidden sm:inline-flex text-xs font-medium', tier === 'free' && 'border-blue-200 text-blue-700 bg-blue-50/50', tier === 'starter' && 'border-green-200 text-green-700 bg-green-50/50', tier === 'full' && 'border-orange-200 text-orange-700 bg-orange-50/50')}>
              {TIER_LABEL[tier]}
            </Badge>
          )}
          {/* Local development only: cycle the tier to test locked content. Never shipped to visitors. */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                const tiers: Array<'free' | 'starter' | 'full'> = ['free', 'starter', 'full'];
                useWorksheetStore.getState().setTier(tiers[(tiers.indexOf(tier) + 1) % tiers.length]);
              }}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500"
              title="Dev only: cycle tier"
            >
              🔓 {tier}
            </button>
          )}

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-1">
              <Link href="/cont" aria-label="Contul tău" className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" data-btn="ink" title={profile?.display_name ?? 'Contul tău'}>
                {profile?.display_name?.[0]?.toUpperCase() || <User className="w-4 h-4" aria-hidden />}
              </Link>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-500" onClick={signOut} aria-label="Ieși din cont">
                <LogOut className="w-3.5 h-3.5" aria-hidden />
              </Button>
            </div>
          ) : (
            <Link href="/auth/login" className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-ink border-2 border-ink text-[13px] font-extrabold hover:bg-paper whitespace-nowrap">
              <LogIn className="w-3.5 h-3.5" aria-hidden /> Intră în cont
            </Link>
          )}

          <button
            ref={toggle}
            type="button"
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-ink hover:bg-white"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
          >
            {open ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="lg:hidden border-t-2 border-ink bg-paper max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 grid gap-x-6 sm:grid-cols-2">
            <ul className="sm:col-span-2 grid grid-cols-2 gap-2 pb-3 border-b border-ink/15">
              {NAV_ITEMS.filter((i) => i.kind === 'link' && i.href !== '/preturi').map((i) =>
                i.kind === 'link' ? (
                  <li key={i.href}>
                    <Link href={i.href} onClick={closeAll} aria-current={isCurrent(pathname, i.href) ? 'page' : undefined}
                      className={cn('flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 min-h-12 text-[15px] font-extrabold text-ink', isCurrent(pathname, i.href) && 'shadow-md')}>
                      <i.icon className="w-4 h-4 shrink-0" aria-hidden /> {i.label}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
            {NAV_ITEMS.map((g) =>
              g.kind === 'group' ? (
                <section key={g.id} aria-labelledby={`mm-${g.id}`} className="pt-3">
                  <h2 id={`mm-${g.id}`} className="px-3 text-sm font-sans font-extrabold text-pen tracking-normal">{g.label}</h2>
                  <ul className="mt-1">
                    {visible(g.links).map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} onClick={closeAll} aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}
                          className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink hover:bg-white', isCurrent(pathname, l.href) && 'bg-white')}>
                          <l.icon className="w-4 h-4 shrink-0" aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold">{l.label}</span>
                            {l.text && <span className="block text-[13px] leading-snug text-slate-600">{l.text}</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
            <ul className="sm:col-span-2 mt-3 pt-3 border-t border-ink/15 grid grid-cols-2 gap-2">
              <li>
                <Link href="/preturi" onClick={closeAll} className="flex items-center gap-2 rounded-xl px-3 min-h-12 text-[15px] font-bold text-ink hover:bg-white">Prețuri</Link>
              </li>
              <li>
                <Link href={user ? '/cont' : '/auth/login'} onClick={closeAll} className="flex items-center gap-2 rounded-xl px-3 min-h-12 text-[15px] font-bold text-ink hover:bg-white">
                  <LogIn className="w-4 h-4" aria-hidden /> {user ? 'Contul tău' : 'Intră în cont'}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
