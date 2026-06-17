import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// credentials:include is required because the API runs on a different port even though it's same-site.
export const authClient = createAuthClient({
  baseURL: BASE,
  fetchOptions: { credentials: "include" },
  plugins: [magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
