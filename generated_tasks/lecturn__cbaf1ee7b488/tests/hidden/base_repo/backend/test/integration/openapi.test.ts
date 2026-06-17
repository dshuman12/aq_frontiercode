import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { setupTestDb } from "../helpers/db";

beforeAll(async () => {
  await setupTestDb();
  await buildTestApp();
});
afterAll(async () => {
  await closeTestApp();
});

describe("GET /api/docs/json", () => {
  it("returns a valid OpenAPI 3.1 document", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/docs/json" });
    expect(res.statusCode).toBe(200);
    const spec = JSON.parse(res.body);
    expect(spec.openapi).toMatch(/^3\.1/);
    expect(spec.info.title).toBe("Lecturn API");
    expect(typeof spec.paths).toBe("object");
  });

  it("includes the libraries CRUD endpoints", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/docs/json" });
    const spec = JSON.parse(res.body);
    expect(spec.paths["/api/v1/libraries"]).toBeDefined();
    expect(spec.paths["/api/v1/libraries"].get).toBeDefined();
    expect(spec.paths["/api/v1/libraries"].post).toBeDefined();
  });

  it("declares the sessionCookie security scheme", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/docs/json" });
    const spec = JSON.parse(res.body);
    expect(spec.components.securitySchemes.sessionCookie).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "lecturn.session_token",
    });
  });

  it("transforms Zod request schemas into JSON Schema", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/docs/json" });
    const spec = JSON.parse(res.body);
    const post = spec.paths["/api/v1/libraries"].post;
    expect(post.requestBody.content["application/json"].schema).toBeDefined();
  });
});

describe("GET /api/docs (Swagger UI)", () => {
  it("serves the Swagger UI HTML page", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/docs/static/index.html",
    });
    // The exact route Swagger UI serves on can vary by version; just verify
    // the docs route prefix is wired up.
    expect([200, 301, 302]).toContain(res.statusCode);
  });
});
