// Lazy-evaluated environment variable accessor.
//
// Historically this module read every required var at module-load time and
// threw on first miss. That coupled every test file (and every transitive
// importer of env.server) to having the full production env set, which made
// adding new test phases painful (carry-over #48).
//
// Now the export is a Proxy over a descriptor map. Each property reads
// `process.env[name]` on access and throws — with the missing var's name in
// the message — only when something actually touches a missing required var.
//
// The exported TYPE shape is unchanged, so call sites like `env.DATABASE_POOL_URL`
// keep their `string` typing and need no changes.

type EnvDescriptor = { name: string; required: boolean };

const DESCRIPTORS = {
  SUPABASE_URL: { name: 'SUPABASE_URL', required: true },
  SUPABASE_ANON_KEY: { name: 'SUPABASE_ANON_KEY', required: true },
  SUPABASE_SERVICE_ROLE_KEY: { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  DATABASE_URL: { name: 'DATABASE_URL', required: true },
  DATABASE_POOL_URL: { name: 'DATABASE_POOL_URL', required: true },
  // Optional. When set, `db.service.server.ts` connects via this URL instead of
  // DATABASE_POOL_URL. The intent (carry-over #77) is to let the pool client
  // downgrade to a real `anon` Postgres role for genuine RLS enforcement while
  // the service client keeps a BYPASSRLS connection for the anonymous-intern
  // submission path. Today (dev) both vars point at the same BYPASSRLS URL,
  // so flipping the switch later requires only re-provisioning roles in
  // Supabase and updating this env var — no code change.
  DATABASE_SERVICE_URL: { name: 'DATABASE_SERVICE_URL', required: false },
  RESEND_API_KEY: { name: 'RESEND_API_KEY', required: true },
  RESEND_FROM: { name: 'RESEND_FROM', required: true },
  APP_URL: { name: 'APP_URL', required: true },
} as const satisfies Record<string, EnvDescriptor>;

type EnvKey = keyof typeof DESCRIPTORS;

type EnvShape = {
  [K in EnvKey]: (typeof DESCRIPTORS)[K]['required'] extends true ? string : string | undefined;
};

export const env = new Proxy({} as EnvShape, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string' || !(prop in DESCRIPTORS)) {
      return undefined;
    }
    const descriptor = DESCRIPTORS[prop as EnvKey];
    const value = process.env[descriptor.name];
    if (!value) {
      if (descriptor.required) {
        throw new Error(`Missing required environment variable: ${descriptor.name}`);
      }
      return undefined;
    }
    return value;
  },
});

// SESSION_SECRET is intentionally NOT in `env` above. Its only consumer
// (`app/lib/intern-identity.server.ts`) reads `process.env.SESSION_SECRET`
// lazily so tests can override it in `beforeAll` without racing module
// evaluation. Including it here would force every test file that
// transitively imports `env.server.ts` to set SESSION_SECRET at module load,
// which is incompatible with the lazy-eval design.
