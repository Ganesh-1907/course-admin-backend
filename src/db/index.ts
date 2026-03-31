import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import config from '../config/env';
import * as dns from 'dns';

// Force IPv4 DNS resolution — prevents ENETUNREACH on machines
// where IPv6 has no external route (e.g., connecting to Neon cloud DB)
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
    connectionString: config.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
