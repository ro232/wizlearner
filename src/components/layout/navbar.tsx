'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pencil, Trophy, Users, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useAuth } from '@/hooks/use-auth';

const navLinks = [
  { href: '/generator', label: 'Generator', icon: Pencil },
  { href: '/dashboard', label: 'Dashboard', icon: Trophy },
  { href: '/community', label: 'Community', icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  const tier = useWorksheetStore((s) => s.tier);
  const { user, profile, loading, signOut } = useAuth();
  const isLanding = pathname === '/';

  return (
    <nav className="sticky top-0 z-50 border-b border-white/20 glass" style={{ background: 'rgba(255,255,255,0.75)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}>
            <Pencil className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-slate-900">Worksheet</span>
            <span className="gradient-text">Wiz</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {isLanding ? (
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <Link href="/generator" className="hover:text-blue-600 transition-colors">Features</Link>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <Link href="/community" className="hover:text-blue-600 transition-colors">Community</Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" size="sm" className={cn('text-xs gap-1.5', pathname === link.href && 'bg-blue-50 text-blue-700')}>
                  <link.icon className="w-3.5 h-3.5" />{link.label}
                </Button>
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {!isLanding && (
            <Badge variant="outline" className={cn('text-xs font-medium', tier === 'free' && 'border-blue-200 text-blue-700 bg-blue-50/50', tier === 'starter' && 'border-green-200 text-green-700 bg-green-50/50', tier === 'full' && 'border-orange-200 text-orange-700 bg-orange-50/50')}>
              {tier === 'free' ? 'Free Tier' : tier === 'starter' ? 'Starter' : 'Full Access'}
            </Badge>
          )}

          {/* Auth buttons */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}>
                {profile?.display_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-500" onClick={signOut}>
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              {isLanding ? (
                <>
                  <Link href="/auth/login"><Button variant="ghost" className="text-sm hidden sm:inline-flex gap-1.5"><LogIn className="w-3.5 h-3.5" /> Log in</Button></Link>
                  <Link href="/generator">
                    <Button className="text-sm text-white px-5 rounded-xl btn-premium shadow-md" style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}>Start Free</Button>
                  </Link>
                </>
              ) : (
                <Link href="/auth/login"><Button variant="ghost" size="sm" className="text-xs gap-1.5"><LogIn className="w-3.5 h-3.5" /> Log in</Button></Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
