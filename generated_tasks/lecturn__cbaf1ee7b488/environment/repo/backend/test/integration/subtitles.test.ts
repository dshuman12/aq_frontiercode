import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApp } from "../helpers/app";
import { signUpAndGetCookie } from "../helpers/auth";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeCourse, makeEpisode, makeSubtitle } from "../factories";

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

describe("GET /api/v1/episodes/:id/subtitles", () => {
  it("lists subtitles for the episode", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    await makeSubtitle(episode.id, { language: "en", label: "English", isDefault: 1 });
    await makeSubtitle(episode.id, { language: "fr", label: "French" });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const items = JSON.parse(res.body).items;
    expect(items).toHaveLength(2);
    const en = items.find((i: { language: string }) => i.language === "en");
    expect(en.isDefault).toBe(true);
  });

  it("returns an empty list when the episode has no subtitles", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles`,
      headers: { cookie },
    });
    expect(JSON.parse(res.body).items).toEqual([]);
  });

  it("rejects strangers", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles`,
      headers: { cookie: stranger.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/v1/episodes/:id/subtitles/:language", () => {
  let workDir: string;
  beforeAll(async () => {
    workDir = join(tmpdir(), `lecturn-sub-route-${Date.now()}`);
    await mkdir(workDir, { recursive: true });
  });
  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("serves a VTT file unmodified", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const filePath = join(workDir, `vtt-${Date.now()}.vtt`);
    await writeFile(filePath, "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n");
    await makeSubtitle(episode.id, { language: "en", format: "vtt", filePath });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles/en`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/vtt");
    expect(res.body).toContain("WEBVTT");
    expect(res.body).toContain("00:00:01.000 --> 00:00:02.000");
  });

  it("converts an SRT file to VTT on the fly", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const filePath = join(workDir, `srt-${Date.now()}.srt`);
    await writeFile(filePath, "1\n00:00:01,000 --> 00:00:02,000\nHello\n");
    await makeSubtitle(episode.id, { language: "en", format: "srt", filePath });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles/en`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatch(/^WEBVTT/);
    expect(res.body).toContain("00:00:01.000 --> 00:00:02.000");
    expect(res.body).not.toContain("00:00:01,000");
  });

  it("404s when the language doesn't exist", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles/zz`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s when the on-disk file is missing", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    await makeSubtitle(episode.id, {
      language: "en",
      format: "vtt",
      filePath: "/tmp/does-not-exist-12345.vtt",
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/subtitles/en`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
