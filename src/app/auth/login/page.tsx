'use client';

import { useState } from 'react';
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
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const result = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (result?.error) {
        setError(result.error.message || 'Authentication failed');
      } else {
        if (isSignUp) {
          setError('');
          alert('Check your email for a confirmation link!');
        } else {
          router.push('/generator');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signInWithMagicLink(email);
      if (result?.error) {
        setError(result.error.message || 'Failed to send magic link');
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-md border-blue-200 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-600">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              We sent a magic link to{' '}
              <span className="font-semibold text-slate-900">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Click the link in the email to sign in. If you don&apos;t see it, check your spam folder.
            </p>
            <Button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full"
            >
              Try Another Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              WorksheetWiz
            </h1>
          </div>
          <p className="text-slate-600">Sign in to your account</p>
        </div>

        {/* Main Card */}
        <Card className="border-blue-200 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
          <div className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Get Started</CardTitle>
              <CardDescription>
                {useMagicLink
                  ? 'Enter your email to receive a magic link'
                  : 'Choose your preferred sign in method'}
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
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold h-12 gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Chrome className="w-5 h-5" />
                  )}
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
              )}

              {/* Divider */}
              {!useMagicLink && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-500 font-medium">OR</span>
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
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
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
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold h-10 gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>

                  <div className="text-center text-sm">
                    <span className="text-slate-600">
                      {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError('');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
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
                        placeholder="you@example.com"
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
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold h-10 gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Send Magic Link
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
                {useMagicLink ? 'Use email & password instead' : 'Use magic link instead'}
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
                Continue without account
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
