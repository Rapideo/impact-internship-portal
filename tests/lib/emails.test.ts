// Guards the branded transactional email templates. These are pasted into the
// Supabase dashboard by hand (docs/deployment.md), so a regression here is not
// caught by any deploy — only by someone receiving an ugly or broken email.

import { describe, it, expect } from 'vitest';
import { emailLayout, escapeHtml, EMAIL_LOGO_URL } from '~/emails/_layout';
import { renderPasswordReset } from '~/emails/password-reset';
import { renderEmployerInvite } from '~/emails/employer-invite';

const NAVY_DEEP = '#051028';
const GREEN = '#73AF2F';

describe('emailLayout', () => {
  const html = emailLayout({ previewText: 'Preview', bodyHtml: '<p>Body</p>' });

  it('renders the Equus logo in the masthead', () => {
    expect(html).toContain(`src="${EMAIL_LOGO_URL}"`);
    expect(html).toContain('alt="Equus Workforce Solutions"');
  });

  it('points the logo at an absolute https URL', () => {
    // An email has no origin, so a root-relative path would resolve nowhere.
    expect(EMAIL_LOGO_URL).toMatch(/^https:\/\//);
    expect(EMAIL_LOGO_URL).toMatch(/\.png$/);
  });

  it('uses a PNG rather than the app SVG, which mail clients strip', () => {
    expect(html).not.toContain('logo-reverse.svg');
    expect(html).not.toContain('<svg');
  });

  it('carries the brand colours — navy masthead and green accent rule', () => {
    expect(html).toContain(NAVY_DEEP);
    expect(html).toContain(GREEN);
  });

  it('gives the logo width/height attributes so blocked images hold layout', () => {
    expect(html).toMatch(/width="180"/);
    expect(html).toMatch(/height="41"/);
  });

  it('uses inline styles only — no class selectors or <style> blocks', () => {
    expect(html).not.toContain('<style');
    expect(html).not.toMatch(/class="/);
  });

  it('hides the preview text from the rendered body', () => {
    expect(html).toContain('Preview');
    expect(html).toContain('display:none');
  });

  it('escapes the preview text', () => {
    const evil = emailLayout({ previewText: '<script>x</script>', bodyHtml: '' });
    expect(evil).not.toContain('<script>x</script>');
    expect(evil).toContain('&lt;script&gt;');
  });
});

describe('escapeHtml', () => {
  it('escapes the five significant characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('renderPasswordReset', () => {
  const mail = renderPasswordReset({
    resetUrl: 'https://example.test/auth/callback?next=/auth/reset',
    programName: 'Equus Internship Program',
  });

  it('puts the program name in the subject', () => {
    expect(mail.subject).toBe('Reset your Equus Internship Program password');
  });

  it('links the reset URL and ships a plain-text alternative', () => {
    expect(mail.html).toContain('https://example.test/auth/callback?next=/auth/reset');
    expect(mail.text).toContain('https://example.test/auth/callback?next=/auth/reset');
  });

  it('is wrapped in the branded layout', () => {
    expect(mail.html).toContain(EMAIL_LOGO_URL);
    expect(mail.html).toContain(GREEN);
  });
});

describe('renderEmployerInvite', () => {
  const mail = renderEmployerInvite({
    employerName: 'Riverbend Manufacturing',
    acceptUrl: 'https://example.test/auth/callback?next=/auth/accept',
    programName: 'Equus Internship Program',
  });

  it('names the employer and the program', () => {
    expect(mail.subject).toContain('Equus Internship Program');
    expect(mail.html).toContain('Riverbend Manufacturing');
    expect(mail.text).toContain('Riverbend Manufacturing');
  });

  it('is wrapped in the branded layout', () => {
    expect(mail.html).toContain(EMAIL_LOGO_URL);
    expect(mail.html).toContain(GREEN);
  });

  it('escapes an employer name containing markup', () => {
    const evil = renderEmployerInvite({
      employerName: '<img src=x onerror=alert(1)>',
      acceptUrl: 'https://example.test/a',
      programName: 'P',
    });
    expect(evil.html).not.toContain('<img src=x');
    expect(evil.html).toContain('&lt;img');
  });
});
