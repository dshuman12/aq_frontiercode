import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { librariesService } from "~/features/libraries/libraries.service";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeLibrary, makeShare, makeUser } from "../factories";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("librariesService.listForUser", () => {
  it("returns owned libraries with role='owner'", async () => {
    const user = await makeUser();
    const lib = await makeLibrary(user.id, { name: "Mine" });
    const items = await librariesService.listForUser(user.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: lib.id, role: "owner", name: "Mine" });
  });

  it("returns shared libraries with the granted role", async () => {
    const owner = await makeUser({ name: "Owner", email: "owner@x.test" });
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id, { name: "Shared" });
    await makeShare(lib.id, collab.id, { role: "editor" });
    const items = await librariesService.listForUser(collab.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: lib.id,
      role: "editor",
      name: "Shared",
      ownerName: "Owner",
      ownerEmail: "owner@x.test",
    });
  });

  it("merges owned and shared libraries", async () => {
    const me = await makeUser();
    const other = await makeUser();
    const ownLib = await makeLibrary(me.id);
    const otherLib = await makeLibrary(other.id);
    await makeShare(otherLib.id, me.id, { role: "viewer" });
    const items = await librariesService.listForUser(me.id);
    const ids = items.map((i) => i.id).sort();
    expect(ids).toEqual([ownLib.id, otherLib.id].sort());
  });

  it("returns an empty array for users with no libraries", async () => {
    const user = await makeUser();
    expect(await librariesService.listForUser(user.id)).toEqual([]);
  });
});

describe("librariesService.create", () => {
  it("inserts a library row owned by the caller", async () => {
    const user = await makeUser();
    const lib = await librariesService.create({
      name: "New",
      sourcePath: "/foo",
      ownerId: user.id,
    });
    expect(lib.ownerId).toBe(user.id);
    expect(lib.name).toBe("New");
    expect(lib.sourcePath).toBe("/foo");
  });
});

describe("librariesService.getById", () => {
  it("returns the library when the caller has access", async () => {
    const user = await makeUser();
    const lib = await makeLibrary(user.id);
    const got = await librariesService.getById(lib.id, user.id);
    expect(got?.id).toBe(lib.id);
  });

  it("throws when the caller is a stranger", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    await expect(
      librariesService.getById(lib.id, stranger.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("librariesService.update", () => {
  it("owner can patch name and sourcePath", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    const updated = await librariesService.update(lib.id, owner.id, {
      name: "Renamed",
      sourcePath: "/other",
    });
    expect(updated?.name).toBe("Renamed");
    expect(updated?.sourcePath).toBe("/other");
  });

  it("editor cannot update (owner-only)", async () => {
    const owner = await makeUser();
    const editor = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, editor.id, { role: "editor" });
    await expect(
      librariesService.update(lib.id, editor.id, { name: "Renamed" }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("only sets fields actually provided in the patch", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id, { name: "Keep", sourcePath: "/keep" });
    await librariesService.update(lib.id, owner.id, { name: "Changed" });
    const after = await librariesService.getById(lib.id, owner.id);
    expect(after?.name).toBe("Changed");
    expect(after?.sourcePath).toBe("/keep");
  });
});

describe("librariesService.remove", () => {
  it("owner deletes the library", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    await librariesService.remove(lib.id, owner.id);
    expect(await librariesService.listForUser(owner.id)).toEqual([]);
  });

  it("non-owner cannot delete", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "editor" });
    await expect(
      librariesService.remove(lib.id, collab.id),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("librariesService.ensureDefault", () => {
  it("creates a default library on first call", async () => {
    const user = await makeUser();
    const lib = await librariesService.ensureDefault(user.id, "/seed/path");
    expect(lib.ownerId).toBe(user.id);
    expect(lib.sourcePath).toBe("/seed/path");
    expect(lib.name).toBe("My library");
  });

  it("is idempotent: returns the existing library on subsequent calls", async () => {
    const user = await makeUser();
    const a = await librariesService.ensureDefault(user.id, "/seed");
    const b = await librariesService.ensureDefault(user.id, "/seed-2");
    expect(b.id).toBe(a.id);
    // Should not overwrite the original sourcePath.
    expect(b.sourcePath).toBe("/seed");
  });
});
