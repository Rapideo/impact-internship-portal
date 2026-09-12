// Sentry server instrumentation — loads BEFORE any other app code via
// react-router's server entry hook. Initialization is conditional on
// SENTRY_DSN being set; missing DSN is a silent no-op so dev / CI / and
// preview deploys without a Sentry project don't crash at boot. To
// activate in any environment, set SENTRY_DSN in the Netlify env-var
// context (production / deploy-preview / branch-deploy) and redeploy.
import * as Sentry from '@sentry/react-router';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    // Conservative default: 10% of transactions traced. Bump after launch
    // once we see baseline traffic. SP6 Phase E follow-up.
    tracesSampleRate: 0.1,
    // Incident 2026-09-12: Sentry's postgres-js instrumentation (a default integration in
    // Node SDK 10) wraps every query's handle(). In production, any request that used BOTH
    // postgres-js clients (service-role then regular) hung until Netlify's 26s limit, while
    // requests touching one client worked. We do not need per-query DB spans — drop it.
    integrations: (defaults) => defaults.filter((i) => i.name !== 'PostgresJs'),
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'unknown',
    // Don't capture local dev unless explicitly opted in.
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE === '1',
  });
}
