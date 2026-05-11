import { config } from 'dotenv';

// Load .env.local first (developer overrides), then .env (defaults).
// process.env wins over both — useful for CI overrides.
config({ path: '.env.local' });
config();
