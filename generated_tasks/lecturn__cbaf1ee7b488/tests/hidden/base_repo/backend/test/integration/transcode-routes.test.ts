import { mkdir, rm, writeFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { episodes } from "~/db/schema";
import { episodeOutputDir } from "~/features/transcode/storage";
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

describe("GET /api/v1/episodes/:id/hls/master.m3u8", () => {
  it("returns 409 when the episode hasn't finished transcoding", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/hls/master.m3u8`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("pending");
  });

  it("serves the master playlist when status=ready and the file exists", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const outDir = episodeOutputDir(episode.id);
    await mkdir(outDir, { recursive: true });
    await writeFile(`${outDir}/master.m3u8`, "#EXTM3U\n#EXT-X-VERSION:6\n");
    await db
      .update(episodes)
      .set({
        transcodeStatus: "ready",
        transcodeProgress: 1,
        hlsManifestPath: `${outDir}/master.m3u8`,
        transcodedAt: new Date(),
      })
      .where(eq(episodes.id, episode.id));
    try {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/episodes/${episode.id}/hls/master.m3u8`,
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/vnd.apple.mpegurl");
      expect(res.body).toContain("#EXTM3U");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects strangers", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/hls/master.m3u8`,
      headers: { cookie: stranger.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/v1/episodes/:id/hls/:rendition/:segment", () => {
  it("serves segments under the episode's output directory", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const outDir = episodeOutputDir(episode.id);
    await mkdir(`${outDir}/720p`, { recursive: true });
    await writeFile(`${outDir}/720p/seg_00001.ts`, "fake-ts-bytes");
    try {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/episodes/${episode.id}/hls/720p/seg_00001.ts`,
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("video/mp2t");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("404s for a missing segment", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/hls/720p/missing.ts`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
