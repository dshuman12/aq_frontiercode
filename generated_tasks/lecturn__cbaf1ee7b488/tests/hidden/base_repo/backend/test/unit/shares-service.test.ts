import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sharesService } from "~/features/libraries/shares.service";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeLibrary, makeShare, makeUser } from "../factories";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("sharesService.listForLibrary", () => {
  it("returns shares with joined user info; owner-only", async () => {
    const owner = await makeUser();
    const collab = await makeUser({ name: "Bob", email: "bob@x.test" });
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "editor" });
    const items = await sharesService.listForLibrary(lib.id, owner.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      role: "editor",
      email: "bob@x.test",
      name: "Bob",
    });
  });

  it("rejects non-owners", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id, { role: "viewer" });
    await expect(
      sharesService.listForLibrary(lib.id, collab.id),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("sharesService.invite", () => {
  it("creates a share row when inviting a known user", async () => {
    const owner = await makeUser();
    const invitee = await makeUser({ email: "invitee@x.test" });
    const lib = await makeLibrary(owner.id);
    const share = await sharesService.invite({
      libraryId: lib.id,
      callerId: owner.id,
      inviteeEmail: "invitee@x.test",
      role: "viewer",
    });
    expect(share?.userId).toBe(invitee.id);
    expect(share?.role).toBe("viewer");
  });

  it("returns 404 when the invitee email isn't registered", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    await expect(
      sharesService.invite({
        libraryId: lib.id,
        callerId: owner.id,
        inviteeEmail: "ghost@x.test",
        role: "viewer",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects sharing with the owner themselves", async () => {
    const owner = await makeUser({ email: "owner@x.test" });
    const lib = await makeLibrary(owner.id);
    await expect(
      sharesService.invite({
        libraryId: lib.id,
        callerId: owner.id,
        inviteeEmail: "owner@x.test",
        role: "editor",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("upserts when re-inviting an existing collaborator (changes role)", async () => {
    const owner = await makeUser();
    const collab = await makeUser({ email: "c@x.test" });
    const lib = await makeLibrary(owner.id);
    const first = await sharesService.invite({
      libraryId: lib.id,
      callerId: owner.id,
      inviteeEmail: "c@x.test",
      role: "viewer",
    });
    const second = await sharesService.invite({
      libraryId: lib.id,
      callerId: owner.id,
      inviteeEmail: "c@x.test",
      role: "editor",
    });
    expect(second?.id).toBe(first?.id);
    expect(second?.role).toBe("editor");
  });

  it("rejects when caller isn't the owner", async () => {
    const owner = await makeUser();
    const editor = await makeUser();
    const target = await makeUser({ email: "t@x.test" });
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, editor.id, { role: "editor" });
    await expect(
      sharesService.invite({
        libraryId: lib.id,
        callerId: editor.id,
        inviteeEmail: "t@x.test",
        role: "viewer",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    void target;
  });

  it("normalizes email case (lowercase lookup)", async () => {
    const owner = await makeUser();
    const invitee = await makeUser({ email: "uppercase@x.test" });
    const lib = await makeLibrary(owner.id);
    const share = await sharesService.invite({
      libraryId: lib.id,
      callerId: owner.id,
      inviteeEmail: "UPPERCASE@x.test",
      role: "viewer",
    });
    expect(share?.userId).toBe(invitee.id);
  });
});

describe("sharesService.revoke", () => {
  it("owner can revoke a share", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    const share = await makeShare(lib.id, collab.id);
    await sharesService.revoke(share.id, owner.id);
    const remaining = await sharesService.listForLibrary(lib.id, owner.id);
    expect(remaining).toEqual([]);
  });

  it("404s when the share doesn't exist", async () => {
    const owner = await makeUser();
    await expect(
      sharesService.revoke("00000000-0000-0000-0000-000000000000", owner.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects non-owner attempting to revoke", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    const share = await makeShare(lib.id, collab.id);
    await expect(
      sharesService.revoke(share.id, collab.id),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("sharesService.leave", () => {
  it("collaborator can self-leave", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    await makeShare(lib.id, collab.id);
    await sharesService.leave(lib.id, collab.id);
    const remaining = await sharesService.listForLibrary(lib.id, owner.id);
    expect(remaining).toEqual([]);
  });

  it("404s when the user isn't a member", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const lib = await makeLibrary(owner.id);
    await expect(
      sharesService.leave(lib.id, stranger.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("sharesService.updateRole", () => {
  it("owner can change role between viewer and editor", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    const share = await makeShare(lib.id, collab.id, { role: "viewer" });
    const updated = await sharesService.updateRole(share.id, owner.id, "editor");
    expect(updated?.role).toBe("editor");
  });

  it("rejects 'owner' role (no transfer-ownership shortcut)", async () => {
    const owner = await makeUser();
    const collab = await makeUser();
    const lib = await makeLibrary(owner.id);
    const share = await makeShare(lib.id, collab.id);
    await expect(
      // @ts-expect-error - intentionally pass owner to verify the guard
      sharesService.updateRole(share.id, owner.id, "owner"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
