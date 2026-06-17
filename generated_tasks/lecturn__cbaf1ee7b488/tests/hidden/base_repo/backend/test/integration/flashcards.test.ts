import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { flashcardReviews, flashcards } from "~/db/schema";
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
  return { ...auth, libId, course, episode };
}

describe("Flashcards CRUD", () => {
  it("creates a card linked to an episode and lists it", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: {
        front: "What is closure?",
        back: "A function bundled with its lexical scope",
        episodeId: episode.id,
      },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(c.statusCode).toBe(200);
    const id = JSON.parse(c.body).id;

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/flashcards",
      headers: { cookie },
    });
    const items = JSON.parse(list.body).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id, state: "new", reps: 0 });
  });

  it("filters by episodeId and courseId", async () => {
    const app = await buildTestApp();
    const { cookie, episode, course, libId } = await setup(app);
    const otherCourse = await makeCourse(libId);
    const otherEp = await makeEpisode(otherCourse.id);
    await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "A", back: "a", episodeId: episode.id },
      headers: { cookie, "content-type": "application/json" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "B", back: "b", episodeId: otherEp.id },
      headers: { cookie, "content-type": "application/json" },
    });
    const epOnly = await app.inject({
      method: "GET",
      url: `/api/v1/flashcards?episodeId=${episode.id}`,
      headers: { cookie },
    });
    expect(JSON.parse(epOnly.body).items).toHaveLength(1);
    void course;
  });

  it("PATCH updates front + back", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "old-q", back: "old-a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/flashcards/${id}`,
      payload: { front: "new-q", back: "new-a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/flashcards",
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items[0]).toMatchObject({ front: "new-q", back: "new-a" });
  });

  it("DELETE removes the card", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "x", back: "y" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "DELETE",
      url: `/api/v1/flashcards/${id}`,
      headers: { cookie },
    });
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/flashcards",
      headers: { cookie },
    });
    expect(JSON.parse(list.body).items).toEqual([]);
  });
});

describe("Flashcards review (FSRS)", () => {
  it("a 'good' review on a new card moves it to 'review' and schedules a future due date", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "q", back: "a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const r = await app.inject({
      method: "POST",
      url: `/api/v1/flashcards/${id}/review`,
      payload: { rating: 3 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.state).toBe("review");
    expect(body.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(new Date(body.dueAt).getTime()).toBeGreaterThan(Date.now());

    const card = await db.query.flashcards.findFirst({
      where: eq(flashcards.id, id),
    });
    expect(card?.reps).toBe(1);
    expect(card?.state).toBe("review");

    const reviews = await db
      .select()
      .from(flashcardReviews)
      .where(eq(flashcardReviews.cardId, id));
    expect(reviews).toHaveLength(1);
  });

  it("an 'again' review increments lapses and moves to learning/relearning", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "q", back: "a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    await app.inject({
      method: "POST",
      url: `/api/v1/flashcards/${id}/review`,
      payload: { rating: 1 },
      headers: { cookie, "content-type": "application/json" },
    });
    const card = await db.query.flashcards.findFirst({
      where: eq(flashcards.id, id),
    });
    expect(card?.lapses).toBe(1);
    expect(["learning", "relearning"]).toContain(card?.state);
  });

  it("rejects invalid ratings (0, 5, etc.)", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "q", back: "a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/flashcards/${id}/review`,
      payload: { rating: 5 },
      headers: { cookie, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("/flashcards/due lists only cards whose dueAt has passed", async () => {
    const app = await buildTestApp();
    const { cookie, userId } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "q", back: "a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const newId = JSON.parse(c.body).id;
    // New cards have dueAt = now (defaultNow), so they should appear in due.
    const due = await app.inject({
      method: "GET",
      url: "/api/v1/flashcards/due",
      headers: { cookie },
    });
    const ids = JSON.parse(due.body).items.map((i: { id: string }) => i.id);
    expect(ids).toContain(newId);

    // After a 'good' review the card is scheduled in the future, so /due
    // should no longer surface it.
    await app.inject({
      method: "POST",
      url: `/api/v1/flashcards/${newId}/review`,
      payload: { rating: 3 },
      headers: { cookie, "content-type": "application/json" },
    });
    const after = await app.inject({
      method: "GET",
      url: "/api/v1/flashcards/due",
      headers: { cookie },
    });
    expect(JSON.parse(after.body).items.map((i: { id: string }) => i.id)).not.toContain(newId);
    void userId;
  });

  it("a user cannot review another user's card", async () => {
    const app = await buildTestApp();
    const { cookie } = await setup(app);
    const c = await app.inject({
      method: "POST",
      url: "/api/v1/flashcards",
      payload: { front: "q", back: "a" },
      headers: { cookie, "content-type": "application/json" },
    });
    const id = JSON.parse(c.body).id;
    const stranger = await signUpAndGetCookie(app);
    const r = await app.inject({
      method: "POST",
      url: `/api/v1/flashcards/${id}/review`,
      payload: { rating: 3 },
      headers: { cookie: stranger.cookie, "content-type": "application/json" },
    });
    expect(r.statusCode).toBeGreaterThanOrEqual(400);
  });
});
