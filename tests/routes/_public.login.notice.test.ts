// /login is the landing spot for several redirects that carry a reason in the
// query string. None of them were rendered, so a dead recovery link looked
// exactly like arriving at the sign-in page normally — which is what made the
// 2026-09-22 reset failure so hard to read.

import { describe, it, expect } from 'vitest';
import { loginNotice } from '~/routes/_public.login';

const notice = (qs: string) => loginNotice(new URLSearchParams(qs));

describe('loginNotice', () => {
  it('confirms a completed password reset', () => {
    expect(notice('reset=ok')).toEqual({
      tone: 'success',
      message: 'Password updated. Sign in with your new password.',
    });
  });

  it('explains a dead recovery link, including the same-browser requirement', () => {
    const n = notice('error=link-invalid');
    expect(n?.tone).toBe('danger');
    expect(n?.message).toMatch(/expired|already been used/i);
    expect(n?.message).toMatch(/same browser/i);
  });

  it('explains both employer-scope redirects the employer layout sends', () => {
    for (const code of ['no-employer', 'employer-missing']) {
      const n = notice(`error=${code}`);
      expect(n?.tone).toBe('danger');
      expect(n?.message).toMatch(/not linked to an employer/i);
    }
  });

  it('returns nothing for a plain visit or an unknown code', () => {
    expect(notice('')).toBeNull();
    expect(notice('error=something-else')).toBeNull();
    expect(notice('reset=nope')).toBeNull();
  });
});
