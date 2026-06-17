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

async function createLibrary(app: Awaited<ReturnType<typeof buildTestApp>>, cookie: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/libraries",
    payload: { name: "L", sourcePath: "/l" },
    headers: { cookie, "content-type": "application/json" },
  });
  return JSON.parse(res.body).id as string;
}

describe("library shares lifecycle", () => {
  it("owner invites a known user; shared library appears in invitee's list", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const bob = await signUpAndGetCookie(app);

    const libId = await createLibrary(app, alice.cookie);
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: bob.email, role: "viewer" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    expect(invite.statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie: bob.cookie },
    });
    const items = JSON.parse(list.body).items;
    const shared = items.find((i: { id: string }) => i.id === libId);
    expect(shared).toBeDefined();
    expect(shared.role).toBe("viewer");
  });

  it("inviting an email without an account returns 404", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const libId = await createLibrary(app, alice.cookie);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: "ghost@no.test", role: "viewer" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("only the owner can list shares", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const bob = await signUpAndGetCookie(app);
    const libId = await createLibrary(app, alice.cookie);
    await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: bob.email, role: "viewer" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });

    const ownerList = await app.inject({
      method: "GET",
      url: `/api/v1/libraries/${libId}/shares`,
      headers: { cookie: alice.cookie },
    });
    expect(ownerList.statusCode).toBe(200);
    expect(JSON.parse(ownerList.body).items).toHaveLength(1);

    const collabList = await app.inject({
      method: "GET",
      url: `/api/v1/libraries/${libId}/shares`,
      headers: { cookie: bob.cookie },
    });
    expect(collabList.statusCode).toBe(403);
  });

  it("PATCH .../shares/:shareId updates role", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const bob = await signUpAndGetCookie(app);
    const libId = await createLibrary(app, alice.cookie);
    const inviteRes = await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: bob.email, role: "viewer" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    const shareId = JSON.parse(inviteRes.body).id;
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/libraries/${libId}/shares/${shareId}`,
      payload: { role: "editor" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    expect(patch.statusCode).toBe(200);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/libraries/${libId}/shares`,
      headers: { cookie: alice.cookie },
    });
    expect(JSON.parse(list.body).items[0].role).toBe("editor");
  });

  it("DELETE .../shares/:shareId revokes access", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const bob = await signUpAndGetCookie(app);
    const libId = await createLibrary(app, alice.cookie);
    const inviteRes = await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: bob.email, role: "viewer" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    const shareId = JSON.parse(inviteRes.body).id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/libraries/${libId}/shares/${shareId}`,
      headers: { cookie: alice.cookie },
    });
    expect(del.statusCode).toBe(204);
    const bobLibs = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie: bob.cookie },
    });
    expect(
      JSON.parse(bobLibs.body).items.find((i: { id: string }) => i.id === libId),
    ).toBeUndefined();
  });

  it("collaborator can self-leave via POST .../leave", async () => {
    const app = await buildTestApp();
    const alice = await signUpAndGetCookie(app);
    const bob = await signUpAndGetCookie(app);
    const libId = await createLibrary(app, alice.cookie);
    await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/shares`,
      payload: { email: bob.email, role: "editor" },
      headers: { cookie: alice.cookie, "content-type": "application/json" },
    });
    const leave = await app.inject({
      method: "POST",
      url: `/api/v1/libraries/${libId}/leave`,
      headers: { cookie: bob.cookie },
    });
    expect(leave.statusCode).toBe(200);
  });
});
