import { neonConfig, Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

// Enable WebSocket for serverless environments (required for transactions)
neonConfig.webSocketConstructor = ws;

// Use Pool for connection pooling and transaction support
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
