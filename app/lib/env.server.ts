function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_POOL_URL: required('DATABASE_POOL_URL'),
  RESEND_API_KEY: required('RESEND_API_KEY'),
  RESEND_FROM: required('RESEND_FROM'),
  APP_URL: required('APP_URL'),
};
