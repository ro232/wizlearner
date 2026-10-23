import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Only same-site paths: "/x" is fine, "//evil.com" or "@evil.com" would leave the site.
  const requested = searchParams.get('next') ?? '/generator';
  const next = /^\/(?!\/)[^\\@]*$/.test(requested) ? requested : '/generator';

  if (code) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
