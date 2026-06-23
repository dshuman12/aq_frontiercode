import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import { db } from '@/db';
import * as authSchema from '@/db/auth-schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    nextCookies(), // must be last — handles Set-Cookie in server actions
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
});
