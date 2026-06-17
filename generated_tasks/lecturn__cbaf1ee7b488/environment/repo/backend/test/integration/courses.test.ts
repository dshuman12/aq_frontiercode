import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "~/db/client";
import { libraries } from "~/db/schema";
import { eq } from "drizzle-orm";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
import { resetTestDb, setupTestDb } from "../helpers/db";
import {
  makeChapter,
  makeCourse,
  makeEpisode,
  makeProgress,
  makeSubtitle,
} from "../factories";

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

async function bootstrap(app: Awaited<ReturnType<typeof buildTestApp>>) {
  const auth = await signUpAndGetCookie(app);
  // Trigger default-library auto-bootstrap.
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/libraries",
    headers: { cookie: auth.cookie },
  });
  const libId = JSON.parse(list.body).items[0].id as string;
  return { ...auth, libId };
}

describe("GET /api/v1/courses", () => {
  it("returns courses scoped to ?libraryId", async () => {
    const app = await buildTestApp();
    const { cookie, userId, libId } = await bootstrap(app);
    void userId;
    const lib = await db.query.libraries.findFirst({ where: eq(libraries.id, libId) });
    const course = await makeCourse(lib!.id, { title: "Hello" });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/courses?libraryId=${libId}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const items = JSON.parse(res.body).items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(course.id);
    expect(items[0].title).toBe("Hello");
  });

  it("returns 400 when libraryId is missing", async () => {
    const app = await buildTestApp();
    const { cookie } = await bootstrap(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/courses",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
  });

  it("denies access to libraries the caller doesn't share", async () => {
    const app = await buildTestApp();
    const alice = await bootstrap(app);
    const bob = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/courses?libraryId=${alice.libId}`,
      headers: { cookie: bob.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/v1/courses/:id", () => {
  it("returns chapters + episodes + subtitles for the caller", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await bootstrap(app);
    const course = await makeCourse(libId);
    const chapter = await makeChapter(course.id);
    const ep = await makeEpisode(course.id, { chapterId: chapter.id });
    await makeSubtitle(ep.id, { language: "en", label: "English", isDefault: 1 });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/courses/${course.id}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const detail = JSON.parse(res.body);
    expect(detail.chapters).toHaveLength(1);
    expect(detail.chapters[0].episodes).toHaveLength(1);
    expect(detail.chapters[0].episodes[0].subtitles).toHaveLength(1);
    expect(detail.chapters[0].episodes[0].subtitles[0].isDefault).toBe(true);
  });

  it("404s when the course doesn't exist", async () => {
    const app = await buildTestApp();
    const { cookie } = await bootstrap(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/courses/00000000-0000-0000-0000-000000000000",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s for a course in another library (no enumeration leak)", async () => {
    const app = await buildTestApp();
    const alice = await bootstrap(app);
    const bob = await signUpAndGetCookie(app);
    const course = await makeCourse(alice.libId);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/courses/${course.id}`,
      headers: { cookie: bob.cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("computes progressPct from per-user progress only", async () => {
    const app = await buildTestApp();
    const { cookie, userId, libId } = await bootstrap(app);
    const course = await makeCourse(libId, { totalDurationSec: 100 });
    const ep = await makeEpisode(course.id, { durationSec: 100 });
    await makeProgress(userId, ep.id, { positionSec: 50 });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/courses/${course.id}`,
      headers: { cookie },
    });
    const detail = JSON.parse(res.body);
    expect(detail.progressPct).toBe(50);
  });
});

describe("DELETE /api/v1/courses/:id", () => {
  it("owner can delete; subsequent fetch 404s", async () => {
    const app = await buildTestApp();
    const { cookie, libId } = await bootstrap(app);
    const course = await makeCourse(libId);
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/courses/${course.id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    const after = await app.inject({
      method: "GET",
      url: `/api/v1/courses/${course.id}`,
      headers: { cookie },
    });
    expect(after.statusCode).toBe(404);
  });
});
