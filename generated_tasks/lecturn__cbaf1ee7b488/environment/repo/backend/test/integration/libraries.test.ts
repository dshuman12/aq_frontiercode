import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
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

describe("GET /api/v1/libraries", () => {
  it("auto-bootstraps a default library on first call", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].role).toBe("owner");
    expect(body.items[0].name).toBe("My library");
  });

  it("subsequent calls don't create duplicate defaults", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    await app.inject({ method: "GET", url: "/api/v1/libraries", headers: { cookie } });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie },
    });
    expect(JSON.parse(res.body).items).toHaveLength(1);
  });

  it("401s without a session cookie", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/libraries" });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/v1/libraries", () => {
  it("creates a new library owned by the caller", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "Conf Talks", sourcePath: "/tmp/conf" },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items.find((i: { id: string }) => i.id === body.id)).toMatchObject({
      name: "Conf Talks",
      sourcePath: "/tmp/conf",
      role: "owner",
    });
  });

  it("rejects invalid bodies (zero-length name)", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "", sourcePath: "/x" },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /api/v1/libraries/:id", () => {
  it("owner can rename and change sourcePath", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "Old", sourcePath: "/old" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(create.body).id;
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/libraries/${id}`,
      payload: { name: "New", sourcePath: "/new" },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(patch.statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie },
    });
    const found = JSON.parse(list.body).items.find(
      (i: { id: string }) => i.id === id,
    );
    expect(found.name).toBe("New");
    expect(found.sourcePath).toBe("/new");
  });

  it("non-owner cannot patch (404 to avoid enumeration)", async () => {
    const app = await buildTestApp();
    const { cookie: aliceCookie } = await signUpAndGetCookie(app);
    const { cookie: bobCookie } = await signUpAndGetCookie(app);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "Alice's", sourcePath: "/a" },
      headers: { cookie: aliceCookie, "content-type": "application/json" },
    });
    const id = JSON.parse(create.body).id;
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/libraries/${id}`,
      payload: { name: "Stolen" },
      headers: { cookie: bobCookie, "content-type": "application/json" },
    });
    expect(patch.statusCode).toBe(404);
  });
});

describe("DELETE /api/v1/libraries/:id", () => {
  it("owner can delete; library disappears from list", async () => {
    const app = await buildTestApp();
    const { cookie } = await signUpAndGetCookie(app);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "Tmp", sourcePath: "/t" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(create.body).id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/libraries/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie },
    });
    expect(
      JSON.parse(list.body).items.find((i: { id: string }) => i.id === id),
    ).toBeUndefined();
  });

  it("non-owner cannot delete", async () => {
    const app = await buildTestApp();
    const { cookie: aliceCookie } = await signUpAndGetCookie(app);
    const { cookie: bobCookie } = await signUpAndGetCookie(app);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/libraries",
      payload: { name: "Alice's", sourcePath: "/a" },
      headers: { cookie: aliceCookie, "content-type": "application/json" },
    });
    const id = JSON.parse(create.body).id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/libraries/${id}`,
      headers: { cookie: bobCookie },
    });
    expect(del.statusCode).toBe(404);
  });
});
