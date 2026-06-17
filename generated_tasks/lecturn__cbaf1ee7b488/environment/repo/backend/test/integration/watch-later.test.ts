import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeCourse, makeEpisode, makeProgress } from "../factories";

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
  return { ...auth, libId, course };
}

describe("/api/v1/queue", () => {
  it("returns empty queued + continueWatching for a fresh user", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    expect(JSON.parse(res.body)).toEqual({ queued: [], continueWatching: [] });
  });

  it("POST /queue/:episodeId queues the episode and GET returns it", async () => {
    const app = await buildTestApp();
    const { cookie, course } = await setup(app);
    const ep = await makeEpisode(course.id);
    await app.inject({
      method: "POST",
      url: `/api/v1/queue/${ep.id}`,
      headers: { cookie },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    const body = JSON.parse(res.body);
    expect(body.queued).toHaveLength(1);
    expect(body.queued[0]).toMatchObject({
      episodeId: ep.id,
      source: "queued",
    });
  });

  it("queue ordering respects insertion order", async () => {
    const app = await buildTestApp();
    const { cookie, course } = await setup(app);
    const a = await makeEpisode(course.id);
    const b = await makeEpisode(course.id);
    const c = await makeEpisode(course.id);
    for (const id of [a.id, b.id, c.id]) {
      await app.inject({
        method: "POST",
        url: `/api/v1/queue/${id}`,
        headers: { cookie },
      });
    }
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    const ids = JSON.parse(res.body).queued.map((i: { episodeId: string }) => i.episodeId);
    expect(ids).toEqual([a.id, b.id, c.id]);
  });

  it("DELETE /queue/:episodeId removes from the queue", async () => {
    const app = await buildTestApp();
    const { cookie, course } = await setup(app);
    const ep = await makeEpisode(course.id);
    await app.inject({
      method: "POST",
      url: `/api/v1/queue/${ep.id}`,
      headers: { cookie },
    });
    await app.inject({
      method: "DELETE",
      url: `/api/v1/queue/${ep.id}`,
      headers: { cookie },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    expect(JSON.parse(res.body).queued).toEqual([]);
  });

  it("PUT /queue/order rewrites the position field", async () => {
    const app = await buildTestApp();
    const { cookie, course } = await setup(app);
    const a = await makeEpisode(course.id);
    const b = await makeEpisode(course.id);
    const c = await makeEpisode(course.id);
    for (const id of [a.id, b.id, c.id]) {
      await app.inject({
        method: "POST",
        url: `/api/v1/queue/${id}`,
        headers: { cookie },
      });
    }
    await app.inject({
      method: "PUT",
      url: "/api/v1/queue/order",
      payload: { episodeIds: [c.id, a.id, b.id] },
      headers: { cookie, "content-type": "application/json" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    const ids = JSON.parse(res.body).queued.map((i: { episodeId: string }) => i.episodeId);
    expect(ids).toEqual([c.id, a.id, b.id]);
  });

  it("Continue-watching surfaces episodes with progress > 0 and not completed", async () => {
    const app = await buildTestApp();
    const { cookie, course, userId } = await setup(app);
    const inProgressEp = await makeEpisode(course.id, { durationSec: 100 });
    const completedEp = await makeEpisode(course.id, { durationSec: 100 });
    await makeProgress(userId, inProgressEp.id, { positionSec: 30, completed: 0 });
    await makeProgress(userId, completedEp.id, { positionSec: 99, completed: 1 });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/queue",
      headers: { cookie },
    });
    const ids = JSON.parse(res.body).continueWatching.map(
      (i: { episodeId: string }) => i.episodeId,
    );
    expect(ids).toEqual([inProgressEp.id]);
  });

  it("strangers can't queue someone else's episode", async () => {
    const app = await buildTestApp();
    const { course } = await setup(app);
    const ep = await makeEpisode(course.id);
    const stranger = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/queue/${ep.id}`,
      headers: { cookie: stranger.cookie },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
