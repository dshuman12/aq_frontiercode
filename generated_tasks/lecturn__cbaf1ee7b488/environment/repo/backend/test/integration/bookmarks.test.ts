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

describe("Bookmarks", () => {
  it("creates a bookmark and lists it", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const create = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      payload: { atSec: 42, label: "Important bit" },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(create.statusCode).toBe(200);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items).toHaveLength(1);
    expect(items[0].atSec).toBe(42);
    expect(items[0].label).toBe("Important bit");
  });

  it("orders bookmarks by atSec ascending", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    for (const sec of [99, 11, 55]) {
      await app.inject({
        method: "POST",
        url: `/api/v1/episodes/${episode.id}/bookmarks`,
        payload: { atSec: sec },
        headers: { cookie, "content-type": "application/json" },
      });
    }
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items.map((i: { atSec: number }) => i.atSec)).toEqual([11, 55, 99]);
  });

  it("PATCH updates the label and atSec", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      payload: { atSec: 10, label: "old" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/bookmarks/${id}`,
      payload: { label: "new", atSec: 20 },
      headers: { cookie, "content-type": "application/json" },
    });
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items[0]).toMatchObject({ atSec: 20, label: "new" });
  });

  it("DELETE removes the bookmark", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      payload: { atSec: 10 },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/bookmarks/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items).toEqual([]);
  });

  it("strangers cannot list or create bookmarks on someone else's episode", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      headers: { cookie: stranger.cookie },
    });
    // No access → either 4xx error or 200 with an empty list; the
    // important invariant is that no rows leak.
    if (list.statusCode === 200) {
      expect(JSON.parse(list.body).items).toEqual([]);
    } else {
      expect(list.statusCode).toBeGreaterThanOrEqual(400);
    }

    const create = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      payload: { atSec: 1 },
      headers: { cookie: stranger.cookie, "content-type": "application/json" },
    });
    expect(create.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("user cannot delete another user's bookmark", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: `/api/v1/episodes/${episode.id}/bookmarks`,
      payload: { atSec: 7 },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const stranger = await signUpAndGetCookie(app);
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/bookmarks/${id}`,
      headers: { cookie: stranger.cookie },
    });
    expect(del.statusCode).toBeGreaterThanOrEqual(400);
  });
});
