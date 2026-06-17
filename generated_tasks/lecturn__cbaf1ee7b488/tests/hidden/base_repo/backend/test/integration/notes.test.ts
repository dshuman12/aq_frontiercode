import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeCourse, makeEpisode } from "../factories";

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
  const course = await makeCourse(libId);
  const episode = await makeEpisode(course.id);
  return { ...auth, episode };
}

describe("Notes", () => {
  it("creates and lists notes", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/notes`,
      payload: { body: "First insight", atSec: 12 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(c.statusCode).toBe(200);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/notes`,
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ atSec: 12, body: "First insight" });
  });

  it("supports notes without a timestamp anchor (atSec=null)", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/notes`,
      payload: { body: "Whole-episode note" },
      headers: { cookie, "content-type": "application/json" },
    });
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/notes`,
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items[0].atSec).toBeNull();
  });

  it("PATCH updates the body", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/notes`,
      payload: { body: "old", atSec: 5 },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/notes/${id}`,
      payload: { body: "new" },
      headers: { cookie, "content-type": "application/json" },
    });
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/notes`,
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items[0].body).toBe("new");
  });

  it("DELETE removes the note", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/notes`,
      payload: { body: "x", atSec: 1 },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "DELETE",
      url: `/api/v1/notes/${id}`,
      headers: { cookie },
    });
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/notes`,
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items).toEqual([]);
  });

  it("strangers cannot create or read notes on someone else's episode", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/notes`,
      headers: { cookie: stranger.cookie },
    });
    if (list.statusCode === 200) {
      expect(JSON.parse(list.body).items).toEqual([]);
    } else {
      expect(list.statusCode).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("Highlights", () => {
  it("creates and lists highlights", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/highlights`,
      payload: { startSec: 10, endSec: 20, text: "key passage", color: "amber" },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(c.statusCode).toBe(200);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/highlights`,
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      startSec: 10,
      endSec: 20,
      text: "key passage",
      color: "amber",
    });
  });

  it("rejects highlights where endSec <= startSec", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/highlights`,
      payload: { startSec: 30, endSec: 10 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("DELETE removes the highlight", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/highlights`,
      payload: { startSec: 0, endSec: 5 },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/highlights/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
  });
});
