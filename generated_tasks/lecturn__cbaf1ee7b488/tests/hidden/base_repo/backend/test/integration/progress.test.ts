import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { progress } from "~/db/schema";
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
  const course = await makeCourse(libId, { totalDurationSec: 100 });
  const episode = await makeEpisode(course.id, { durationSec: 100 });
  return { ...auth, course, episode };
}

describe("PUT /api/v1/progress/:episodeId", () => {
  it("upserts the caller's progress row for the episode", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/progress/${episode.id}`,
      payload: { positionSec: 42 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(204);

    const row = await db.query.progress.findFirst({
      where: eq(progress.episodeId, episode.id),
    });
    expect(row?.positionSec).toBe(42);
    expect(row?.completed).toBe(0);
  });

  it("auto-marks completed when positionSec >= 95% of duration", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    await app.inject({
      method: "PUT",
      url: `/api/v1/progress/${episode.id}`,
      payload: { positionSec: 96 },
      headers: { cookie, "content-type": "application/json" },
    });
    const row = await db.query.progress.findFirst({
      where: eq(progress.episodeId, episode.id),
    });
    expect(row?.completed).toBe(1);
  });

  it("respects an explicit `completed: false` even past the 95% threshold", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    await app.inject({
      method: "PUT",
      url: `/api/v1/progress/${episode.id}`,
      payload: { positionSec: 99, completed: false },
      headers: { cookie, "content-type": "application/json" },
    });
    const row = await db.query.progress.findFirst({
      where: eq(progress.episodeId, episode.id),
    });
    expect(row?.completed).toBe(0);
  });

  it("404s for a non-existent episode", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/progress/00000000-0000-0000-0000-000000000000",
      payload: { positionSec: 5 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects strangers (404) from writing progress on episodes they don't own", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/progress/${episode.id}`,
      payload: { positionSec: 10 },
      headers: { cookie: stranger.cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects negative positionSec", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/progress/${episode.id}`,
      payload: { positionSec: -1 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(400);
  });
});
