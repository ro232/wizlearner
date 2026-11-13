import { describe, expect, it } from 'vitest';
import { authErrorMessage, authProblem } from '@/app/auth/auth-errors';

describe('sign-in errors, told apart', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }, 'credentials'],
    [{ status: 400, message: 'Invalid login credentials' }, 'credentials'],
    [{ code: 'email_not_confirmed', message: 'Email not confirmed' }, 'not_confirmed'],
    [{ message: 'Email not confirmed' }, 'not_confirmed'],
    [{ code: 'user_already_exists', message: 'User already registered' }, 'exists'],
    [{ status: 422, message: 'User already registered' }, 'exists'],
    [{ code: 'weak_password', name: 'AuthWeakPasswordError', message: 'Password should be at least 6 characters.' }, 'weak_password'],
    [{ message: 'Password should be at least 6 characters' }, 'weak_password'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate_limited'],
    [{ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, 'rate_limited'],
    [{ message: 'For security purposes, you can only request this after 42 seconds.' }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'network'],
    [new TypeError('Failed to fetch'), 'network'],
    [{ code: 'email_address_invalid', message: 'Email address "x" is invalid' }, 'invalid_email'],
    [{ status: 500, message: 'Database error saving new user' }, 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
  ])('%j → %s', (error, problem) => {
    expect(authProblem(error)).toBe(problem);
  });

  it('never tells someone creating an account that the password is wrong', () => {
    for (const e of [{ code: 'weak_password' }, { code: 'user_already_exists' }, { status: 500 }, { code: 'over_request_rate_limit' }]) {
      expect(authErrorMessage(e, 'signup')).not.toMatch(/nu sunt corecte/);
    }
    expect(authErrorMessage({ code: 'invalid_credentials' }, 'signin')).toBe('Emailul sau parola nu sunt corecte.');
    const all = ['invalid_credentials', 'email_not_confirmed', 'user_already_exists', 'weak_password', 'over_request_rate_limit', 'nope'].map((code) => authErrorMessage({ code }, 'signin'));
    expect(new Set(all).size).toBe(all.length);
  });
});
