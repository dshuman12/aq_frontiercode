import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { resetTestDb, setupTestDb } from "../helpers/db";

beforeAll(async () => {
  await setupTestDb();
  await buildTestApp();
});
afterAll(async () => {
  await closeTestApp();
});
beforeEach(async () => {
  await resetTestDb();
});

describe("POST /api/auth/sign-up/email", () => {
  it("creates a user, sets a session cookie, and returns user info", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "alice@auth.test",
        password: "alice-password-12345",
        name: "Alice",
      },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("alice@auth.test");
    expect(body.user.id).toMatch(/^[0-9a-f-]{36}$/);

    const cookies = res.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join(";") : (cookies ?? "");
    expect(cookieHeader).toMatch(/lecturn\.session_token=/);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "x@auth.test", password: "short", name: "X" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("rejects duplicate email signups", async () => {
    const app = await buildTestApp();
    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "dup@auth.test", password: "password-1234", name: "A" },
      headers: { "content-type": "application/json" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "dup@auth.test", password: "password-1234", name: "B" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("POST /api/auth/sign-in/email", () => {
  it("authenticates an existing user with correct credentials", async () => {
    const app = await buildTestApp();
    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "si@auth.test", password: "password-1234", name: "SI" },
      headers: { "content-type": "application/json" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email: "si@auth.test", password: "password-1234" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const cookies = res.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join(";") : (cookies ?? "");
    expect(cookieHeader).toMatch(/lecturn\.session_token=/);
  });

  it("rejects sign-in with wrong password", async () => {
    const app = await buildTestApp();
    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "si2@auth.test", password: "password-1234", name: "SI" },
      headers: { "content-type": "application/json" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email: "si2@auth.test", password: "wrong-password" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("rejects sign-in for unknown email", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email: "ghost@auth.test", password: "password-1234" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("GET /api/auth/get-session", () => {
  it("returns the current session when a valid cookie is present", async () => {
    const app = await buildTestApp();
    const signup = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "ses@auth.test", password: "password-1234", name: "S" },
      headers: { "content-type": "application/json" },
    });
    const cookies = signup.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : (cookies ?? "");
    const tokenMatch = /lecturn\.session_token=[^;]+/.exec(cookieHeader);
    expect(tokenMatch).not.toBeNull();

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/get-session",
      headers: { cookie: tokenMatch![0] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("ses@auth.test");
    expect(body.session.token).toBeDefined();
  });

  it("returns null/empty when no cookie is present", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/get-session",
    });
    expect(res.statusCode).toBe(200);
    // Better-auth returns null when no session.
    expect(["null", ""]).toContain(res.body);
  });
});

describe("Session-protected routes", () => {
  it("returns 401 on /api/v1/libraries without a session cookie", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/libraries" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 on /api/v1/libraries with a valid session cookie", async () => {
    const app = await buildTestApp();
    const signup = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "auth-ok@auth.test", password: "password-1234", name: "A" },
      headers: { "content-type": "application/json" },
    });
    const cookies = signup.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : (cookies ?? "");
    const tokenMatch = /lecturn\.session_token=[^;]+/.exec(cookieHeader)!;
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie: tokenMatch[0] },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("GET /health", () => {
  it("is unauthenticated and returns service info", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      status: "ok",
      service: "lecturn-api",
    });
  });
});
