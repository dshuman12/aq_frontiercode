import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { env } from "~/config/env";
import { db } from "~/db/client";
import { accounts, sessions, users, verifications } from "~/db/schema";

export const auth = betterAuth({
  appName: "lecturn",
  baseURL: env.API_PUBLIC_URL,
  basePath: "/api/auth",
  secret: env.AUTH_SECRET,
  trustedOrigins: env.API_CORS_ORIGIN.split(",").concat([env.WEB_PUBLIC_URL]),

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users,
      sessions,
      accounts,
      verifications,
    },
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    cookiePrefix: "lecturn",
    useSecureCookies: env.NODE_ENV === "production",
    database: {
      // Schema uses uuid columns; better-auth defaults to a random string, which would mismatch.
      generateId: () => crypto.randomUUID(),
    },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        // Dev transport — swap for SMTP/Resend/Postmark in prod.
        console.log(`\n[magic-link] for ${email}\n  ${url}\n`);
      },
    }),
  ],
});

export type Auth = typeof auth;
