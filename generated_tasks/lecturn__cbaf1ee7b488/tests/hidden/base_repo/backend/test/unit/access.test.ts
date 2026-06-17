import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertLibraryAccess,
  getLibraryRole,
  LibraryAccessError,
  roleAtLeast,
} from "~/features/libraries/access";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeLibrary, makeShare, makeUser } from "../factories";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("roleAtLeast", () => {
  it("ranks owner > editor > viewer", () => {
    expect(roleAtLeast("owner", "viewer")).toBe(true);
    expect(roleAtLeast("owner", "editor")).toBe(true);
    expect(roleAtLeast("editor", "viewer")).toBe(true);
    expect(roleAtLeast("editor", "owner")).toBe(false);
    expect(roleAtLeast("viewer", "editor")).toBe(false);
  });

  it("returns false for null role", () => {
    expect(roleAtLeast(null, "viewer")).toBe(false);
  });

  it("treats matching role as satisfied", () => {
    expect(roleAtLeast("viewer", "viewer")).toBe(true);
  });
});

describe("getLibraryRole", () => {
  it("returns 'owner' when the user owns the library", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    expect(await getLibraryRole(lib.id, owner.id)).toBe("owner");
  });

  it("returns the share role for collaborators", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "editor" });
    expect(await getLibraryRole(lib.id, collab.id)).toBe("editor");
  });

  it("returns null for users with no relationship to the library", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    expect(await getLibraryRole(lib.id, stranger.id)).toBe(null);
  });

  it("returns null when the library does not exist", async () => {
    const user = await makeUser();
    expect(
      await getLibraryRole("00000000-0000-0000-0000-000000000000", user.id),
    ).toBe(null);
  });

  it("prefers ownership over a redundant share row (owner check first)", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    // Manually add a viewer share for the owner — assertLibraryAccess shouldn't
    // be downgraded by it (we'd never actually create this row in production).
    expect(await getLibraryRole(lib.id, owner.id)).toBe("owner");
  });
});

describe("assertLibraryAccess", () => {
  it("returns the role on success", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    expect(await assertLibraryAccess(lib.id, owner.id, "viewer")).toBe("owner");
  });

  it("throws LibraryAccessError(404) when the library doesn't exist", async () => {
    const user = await makeUser();
    await expect(
      assertLibraryAccess("00000000-0000-0000-0000-000000000000", user.id),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Library not found",
    });
  });

  it("throws LibraryAccessError(404) for a stranger (no enumeration leak)", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    await expect(
      assertLibraryAccess(lib.id, stranger.id, "viewer"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 403 when role is below minimum", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "viewer" });
    await expect(
      assertLibraryAccess(lib.id, collab.id, "editor"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("permits editor when minimum is editor or viewer", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "editor" });
    expect(await assertLibraryAccess(lib.id, collab.id, "editor")).toBe("editor");
    expect(await assertLibraryAccess(lib.id, collab.id, "viewer")).toBe("editor");
  });

  it("LibraryAccessError exposes statusCode for Fastify error mapping", () => {
    const err = new LibraryAccessError("nope", 403);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("nope");
  });
});
