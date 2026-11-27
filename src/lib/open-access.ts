/**
 * Test period: every paid function is open to everyone, without an account, so the site can be
 * tried freely before the launch. On in the production build on Vercel (see next.config.mjs);
 * off in the tests and local builds unless NEXT_PUBLIC_OPEN_ACCESS=1. To close it again set
 * NEXT_PUBLIC_OPEN_ACCESS=0 in Vercel (or change the default in next.config.mjs) and redeploy.
 * What still needs an account or the server keys stays as it is: saving in the account and
 * sending homework links.
 */
export const OPEN_ACCESS = process.env.NEXT_PUBLIC_OPEN_ACCESS === '1';
