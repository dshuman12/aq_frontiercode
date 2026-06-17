import type { FastifyInstance } from "fastify";

// Helpers for creating an authenticated session in integration tests.
// We exercise the real better-auth flow (sign-up via /api/auth/sign-up/email),
// then forward the resulting cookie on subsequent requests.

interface SignUpResult {
  cookie: string;
  userId: string;
  email: string;
}

let counter = 0;

export async function signUpAndGetCookie(
  app: FastifyInstance,
  overrides: { email?: string; password?: string; name?: string } = {},
): Promise<SignUpResult> {
  counter += 1;
  const email = overrides.email ?? `auth-${counter}-${Date.now()}@test.local`;
  const password = overrides.password ?? "test-password-12345";
  const name = overrides.name ?? `Auth ${counter}`;

  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { email, password, name },
    headers: { "content-type": "application/json" },
  });

  if (res.statusCode !== 200) {
    throw new Error(`sign-up failed: ${res.statusCode} ${res.body}`);
  }

  const setCookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(setCookies)
    ? setCookies.join("; ")
    : (setCookies ?? "");
  const tokenMatch = /lecturn\.session_token=[^;]+/.exec(cookieHeader);
  if (!tokenMatch) throw new Error("no session_token in sign-up response");

  const json = JSON.parse(res.body);
  return { cookie: tokenMatch[0], userId: json.user.id, email };
}

export function authedHeaders(cookie: string) {
  return {
    cookie,
    "content-type": "application/json",
  };
}
