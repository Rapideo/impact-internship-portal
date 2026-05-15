import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

// These tests exercise env.server's lazy-evaluation contract:
//   1. Importing the module never throws, even when required vars are unset.
//   2. Accessing a missing required var throws a descriptive Error that names it.
//   3. Accessing a present var returns its string value from process.env.
//
// We use vi.resetModules() between tests to force the module to be re-imported
// from scratch each time so the proxy reflects the current process.env at the
// moment of access (the proxy itself reads lazily, but resetting modules also
// guards against any future caching layer added in the module).

describe('env.server lazy evaluation', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('does not throw on module import when required vars are missing', async () => {
    delete process.env.DATABASE_POOL_URL;
    delete process.env.SUPABASE_URL;
    const mod = await import('~/lib/env.server');
    expect(mod.env).toBeDefined();
  });

  it('throws when a missing required var is accessed', async () => {
    delete process.env.DATABASE_POOL_URL;
    const { env } = await import('~/lib/env.server');
    expect(() => env.DATABASE_POOL_URL).toThrow(/DATABASE_POOL_URL/);
  });

  it('returns the value when the required var is present', async () => {
    process.env.DATABASE_POOL_URL = 'postgresql://example';
    const { env } = await import('~/lib/env.server');
    expect(env.DATABASE_POOL_URL).toBe('postgresql://example');
  });
});
