import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeCourse, makeEpisode, makeShare } from "../factories";

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

async function setup(app: Awaited<ReturnType<typeof buildTestApp>>) {
  const auth = await signUpAndGetCookie(app);
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/libraries",
    headers: { cookie: auth.cookie },
  });
  const libId = JSON.parse(list.body).items[0].id as string;
  return { ...auth, libId };
}

describe("/api/v1/search", () => {
  it("matches courses by title", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await setup(app);
    await makeCourse(libId, { title: "Advanced TypeScript" });
    await makeCourse(libId, { title: "WebGPU Crash Course" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=typescript",
      headers: { cookie },
    });
    const items = JSON.parse(res.body).items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].type).toBe("course");
    expect(items[0].title).toBe("Advanced TypeScript");
  });

  it("matches courses by description", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await setup(app);
    await makeCourse(libId, {
      title: "Some Course",
      description: "A deep dive into closures and lexical scoping",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=closures",
      headers: { cookie },
    });
    const items = JSON.parse(res.body).items;
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("matches episodes by title", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await setup(app);
    const c = await makeCourse(libId);
    await makeEpisode(c.id, { title: "Why WebGPU is fast" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=webgpu",
      headers: { cookie },
    });
    const items = JSON.parse(res.body).items;
    expect(items.some((i: { type: string }) => i.type === "episode")).toBe(true);
  });

  it("supports prefix search (partial words)", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await setup(app);
    await makeCourse(libId, { title: "Advanced TypeScript" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=advan",
      headers: { cookie },
    });
    expect(JSON.parse(res.body).items.length).toBeGreaterThanOrEqual(1);
  });

  it("scopes results to the caller's libraries (no cross-tenant leakage)", async () => {
    const app = await buildTestApp();
    const owner = await signUpAndGetCookie(app);
    const stranger = await signUpAndGetCookie(app);
    // Owner has a default library; create an additional course there.
    const ownerLibs = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie: owner.cookie },
    });
    const ownerLibId = JSON.parse(ownerLibs.body).items[0].id as string;
    await makeCourse(ownerLibId, { title: "Secret Material" });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=secret",
      headers: { cookie: stranger.cookie },
    });
    expect(JSON.parse(res.body).items).toEqual([]);
  });

  it("includes results from libraries the caller is shared on", async () => {
    const app = await buildTestApp();
    const owner = await signUpAndGetCookie(app);
    const collab = await signUpAndGetCookie(app);
    const ownerLibs = await app.inject({
      method: "GET",
      url: "/api/v1/libraries",
      headers: { cookie: owner.cookie },
    });
    const ownerLibId = JSON.parse(ownerLibs.body).items[0].id as string;
    await makeCourse(ownerLibId, { title: "Shared Course" });
    await makeShare(ownerLibId, collab.userId, { role: "viewer" });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=shared",
      headers: { cookie: collab.cookie },
    });
    expect(JSON.parse(res.body).items.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 400 for empty query strings", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
  });
});
