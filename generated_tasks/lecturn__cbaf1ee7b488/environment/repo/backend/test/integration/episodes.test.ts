import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

let workDir: string;
beforeAll(async () => {
  workDir = join(tmpdir(), `lecturn-stream-${Date.now()}`);
  await mkdir(workDir, { recursive: true });
});
afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
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

  const filePath = join(workDir, `ep-${Date.now()}.mp4`);
  await writeFile(filePath, "0".repeat(1024)); // 1 KB fake mp4
  const episode = await makeEpisode(course.id, { filePath, fileSizeBytes: 1024 });
  return { ...auth, episode };
}

describe("GET /api/v1/episodes/:id/stream (raw mp4 byte-range)", () => {
  it("serves the full file when no Range header is present", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/stream`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("video/mp4");
    expect(Number(res.headers["content-length"])).toBe(1024);
  });

  it("returns 206 Partial Content with Content-Range when Range is set", async () => {
    const app = await buildTestApp();
    const { cookie, episode } = await setup(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/stream`,
      headers: { cookie, range: "bytes=0-99" },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers["content-range"]).toBe("bytes 0-99/1024");
    expect(Number(res.headers["content-length"])).toBe(100);
  });

  it("404s when the episode is in another library", async () => {
    const app = await buildTestApp();
    const { episode } = await setup(app);
    const stranger = await signUpAndGetCookie(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/episodes/${episode.id}/stream`,
      headers: { cookie: stranger.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
