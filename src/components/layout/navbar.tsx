'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pencil, LogIn, LogOut, User, BookOpen, Menu, X, UserRound, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useAuth } from '@/hooks/use-auth';

export const NAV_LINKS = [
  { href: '/generator', label: 'Fișe', icon: Pencil },
  { href: '/nume', label: 'Fișa cu numele', icon: UserRound },
  { href: '/grupa', label: 'Pentru grupă', icon: Users },
  { href: '/book', label: 'Caiet KDP', icon: BookOpen },
];

const TIER_LABEL = { free: 'Gratuit', starter: 'Starter', full: 'Complet' } as const;

export function Navbar() {
  const pathname = usePathname();
  const tier = useWorksheetStore((s) => s.tier);
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur" aria-label="Navigare principală">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Logo />

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="ghost" size="sm" className={cn('text-[13px] font-bold gap-1.5 text-ink hover:bg-white', pathname === link.href && 'bg-white shadow-sm underline decoration-pen decoration-2 underline-offset-4')}>
                <link.icon className="w-3.5 h-3.5" aria-hidden />
                {link.label}
              </Button>
            </Link>
          ))}
          <Link href="/preturi">
            <Button variant="ghost" size="sm" className={cn('text-[13px] font-bold gap-1.5 text-ink hover:bg-white', pathname === '/preturi' && 'bg-white shadow-sm underline decoration-pen decoration-2 underline-offset-4')}>
              <Crown className="w-3.5 h-3.5" aria-hidden /> Prețuri
            </Button>
          </Link>
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
            <Link href="/auth/login" className="hidden sm:block">
              <Button size="sm" className="text-[13px] gap-1.5 rounded-lg bg-white text-ink border-2 border-ink font-extrabold hover:bg-paper"><LogIn className="w-3.5 h-3.5" aria-hidden /> Intră în cont</Button>
            </Link>
          )}

          <button
            type="button"
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t-2 border-ink bg-paper px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50', pathname === link.href && 'bg-blue-50 text-blue-700')}>
              <link.icon className="w-4 h-4" aria-hidden /> {link.label}
            </Link>
          ))}
          <Link href="/preturi" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Crown className="w-4 h-4" aria-hidden /> Prețuri
          </Link>
          <Link href={user ? '/cont' : '/auth/login'} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <LogIn className="w-4 h-4" aria-hidden /> {user ? 'Contul tău' : 'Intră în cont'}
          </Link>
        </div>
      )}
    </nav>
  );
}
