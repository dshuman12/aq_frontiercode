import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { coursesService } from "~/features/courses/courses.service";
import { resetTestDb, setupTestDb } from "../helpers/db";
import {
  makeChapter,
  makeCourse,
  makeEpisode,
  makeFullChain,
  makeLibrary,
  makeProgress,
  makeShare,
  makeSubtitle,
  makeUser,
} from "../factories";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("coursesService.list", () => {
  it("scopes results to the requested library", async () => {
    const owner = await makeUser();
    const libA = await makeLibrary(owner.id);
    const libB = await makeLibrary(owner.id);
    const courseA = await makeCourse(libA.id, { title: "A" });
    await makeCourse(libB.id, { title: "B" });

    const items = await coursesService.list(libA.id, owner.id);
    expect(items.map((c) => c.id)).toEqual([courseA.id]);
  });

  it("computes per-user progressPct from the caller's progress rows only", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id, { totalDurationSec: 100 });
    const ep = await makeEpisode(course.id, { courseId: course.id, durationSec: 100 });
    const other = await makeUser();
    await makeShare(lib.id, other.id, { role: "viewer" });
    await makeProgress(other.id, ep.id, { positionSec: 80 }); // other user

    const ownerView = await coursesService.list(lib.id, owner.id);
    const otherView = await coursesService.list(lib.id, other.id);

    expect(ownerView[0]?.progressPct).toBe(0);
    expect(otherView[0]?.progressPct).toBe(80);
  });

  it("returns 0% when totalDurationSec is 0 to avoid division by zero", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id, { totalDurationSec: 0 });
    void course;
    const items = await coursesService.list(lib.id, owner.id);
    expect(items[0]?.progressPct).toBe(0);
  });

  it("rejects a stranger with library-not-found", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    await expect(
      coursesService.list(lib.id, stranger.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("coursesService.detail", () => {
  it("returns chapter-grouped episodes when chapters exist", async () => {
    const { owner, course } = await makeFullChain();
    const ch = await makeChapter(course.id, { title: "Ch", position: 1 });
    await makeEpisode(course.id, { chapterId: ch.id, position: 1, title: "E1" });
    await makeEpisode(course.id, { chapterId: ch.id, position: 2, title: "E2" });

    const detail = await coursesService.detail(course.id, owner.id);
    expect(detail).not.toBeNull();
    // The original full-chain episode lacks a chapterId so it lands under
    // the synthetic "_root" group; chapters[] is built from real chapters.
    const chapter = detail!.chapters.find((c) => c.id === ch.id);
    expect(chapter).toBeDefined();
    expect(chapter!.episodes.map((e) => e.title)).toEqual(["E1", "E2"]);
  });

  it("falls back to a synthetic chapter when the course has none", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id, { title: "No-chapters" });
    await makeEpisode(course.id, { title: "Solo" });
    const detail = await coursesService.detail(course.id, owner.id);
    expect(detail!.chapters).toHaveLength(1);
    expect(detail!.chapters[0]?.episodes[0]?.title).toBe("Solo");
  });

  it("includes subtitle metadata per episode", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id);
    const ep = await makeEpisode(course.id);
    await makeSubtitle(ep.id, { language: "en", label: "English", isDefault: 1 });
    const detail = await coursesService.detail(course.id, owner.id);
    const subs = detail!.chapters[0]!.episodes[0]!.subtitles;
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ language: "en", isDefault: true });
  });

  it("returns null for a non-existent course", async () => {
    const owner = await makeUser();
    expect(
      await coursesService.detail("00000000-0000-0000-0000-000000000000", owner.id),
    ).toBeNull();
  });

  it("rejects a stranger when the course exists in another library", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id);
    await expect(
      coursesService.detail(course.id, stranger.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("coursesService.delete", () => {
  it("editor or owner can delete; viewer cannot", async () => {
    const owner = await makeUser();
    const editor = await makeUser();
    const viewer = await makeUser();
    const lib = await makeLibrary(owner.id);
    const course = await makeCourse(lib.id);
    await makeShare(lib.id, editor.id, { role: "editor" });
    await makeShare(lib.id, viewer.id, { role: "viewer" });

    await expect(
      coursesService.delete(course.id, viewer.id),
    ).rejects.toMatchObject({ statusCode: 403 });

    await coursesService.delete(course.id, editor.id);
    expect(await coursesService.detail(course.id, owner.id)).toBeNull();
  });

  it("silently no-ops when the course doesn't exist", async () => {
    const user = await makeUser();
    await expect(
      coursesService.delete("00000000-0000-0000-0000-000000000000", user.id),
    ).resolves.toBeUndefined();
  });
});
