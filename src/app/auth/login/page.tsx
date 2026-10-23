'use client';

import { useState } from 'react';
import { safeNextPath } from '@/lib/safe-redirect';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Lock,
  Chrome,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Nu am putut intra cu Google. Încearcă din nou.');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Completează emailul și parola.');
      setIsLoading(false);
      return;
    }

    try {
      const result = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (result?.error) {
        setError('Emailul sau parola nu sunt corecte.');
      } else {
        if (isSignUp) {
          setError('');
          alert('Ți-am trimis un email de confirmare. Deschide linkul din el.');
        } else {
          router.push(safeNextPath(new URLSearchParams(window.location.search).get('next')));
        }
      }
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Scrie adresa de email.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signInWithMagicLink(email);
      if (result?.error) {
        setError('Nu am putut trimite linkul. Încearcă din nou.');
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center ruled p-4">
        <Card className="w-full max-w-md border-blue-200 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-600">Verifică emailul</CardTitle>
            <CardDescription className="mt-2">
              Ți-am trimis un link de autentificare la{' '}
              <span className="font-semibold text-slate-900">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Apasă pe linkul din email ca să intri în cont. Dacă nu-l găsești, uită-te și în Spam.
            </p>
            <Button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full"
            >
              Folosește alt email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center ruled p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-extrabold text-ink">
              WorksheetWiz
            </h1>
          </div>
          <p className="text-slate-600">Intră în contul tău</p>
        </div>

        {/* Main Card */}
        <Card className="border-blue-200 shadow-xl overflow-hidden">
          
          <div className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Autentificare</CardTitle>
              <CardDescription>
                {useMagicLink
                  ? 'Primești pe email un link cu care intri direct.'
                  : 'Alege cum vrei să intri.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Google Sign In - Primary */}
              {!useMagicLink && (
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  size="lg"
                  className="w-full h-12 gap-2 rounded-xl" data-btn="ink"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Chrome className="w-5 h-5" />
                  )}
                  {isLoading ? 'Se încarcă…' : 'Continuă cu Google'}
                </Button>
              )}

              {/* Divider */}
              {!useMagicLink && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-500 font-medium">SAU</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {/* Email/Password Form */}
              {!useMagicLink && (
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        placeholder="nume@exemplu.ro"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Parolă</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="w-full h-10 gap-2 rounded-xl" data-btn="ink"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {isSignUp ? 'Creează cont' : 'Intră în cont'}
                  </Button>

                  <div className="text-center text-sm">
                    <span className="text-slate-600">
                      {isSignUp ? 'Ai deja cont? ' : 'Nu ai cont? '}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError('');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      {isSignUp ? 'Intră în cont' : 'Creează unul'}
                    </button>
                  </div>
                </form>
              )}

              {/* Magic Link Form */}
              {useMagicLink && (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        placeholder="nume@exemplu.ro"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="w-full h-10 gap-2 rounded-xl" data-btn="ink"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Trimite linkul
                  </Button>
                </form>
              )}

              {/* Toggle Magic Link */}
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(!useMagicLink);
                  setError('');
                }}
                className="w-full text-center text-sm text-slate-600 hover:text-slate-900 transition font-medium py-2"
              >
                {useMagicLink ? 'Folosește email și parolă' : 'Primește un link pe email'}
              </button>
            </CardContent>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
              <Button
                onClick={() => router.push('/generator')}
                variant="ghost"
                className="w-full text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuă fără cont
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="bg-white border-blue-200">
            <Sparkles className="w-3 h-3 mr-1 text-blue-600" />
            Secure & Fast
          </Badge>
        </div>
      </div>
    </div>
  );
}
