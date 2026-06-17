import { and, desc, eq } from "drizzle-orm";
import { db } from "~/db/client";
import { libraries, libraryShares, users } from "~/db/schema";
import { assertLibraryAccess, LibraryAccessError, type LibraryRole } from "./access";

export type ShareRow = {
  id: string;
  libraryId: string;
  userId: string;
  email: string;
  name: string;
  role: "viewer" | "editor";
  createdAt: Date;
};

export const sharesService = {
  async listForLibrary(libraryId: string, callerId: string): Promise<ShareRow[]> {
    await assertLibraryAccess(libraryId, callerId, "owner");
    const rows = await db
      .select({
        id: libraryShares.id,
        libraryId: libraryShares.libraryId,
        userId: libraryShares.userId,
        email: users.email,
        name: users.name,
        role: libraryShares.role,
        createdAt: libraryShares.createdAt,
      })
      .from(libraryShares)
      .innerJoin(users, eq(users.id, libraryShares.userId))
      .where(eq(libraryShares.libraryId, libraryId))
      .orderBy(desc(libraryShares.createdAt));
    return rows;
  },

  // Invitee must already have an account — sharing does not trigger magic-link signup.
  async invite(input: {
    libraryId: string;
    callerId: string;
    inviteeEmail: string;
    role: "viewer" | "editor";
  }) {
    await assertLibraryAccess(input.libraryId, input.callerId, "owner");

    const invitee = await db.query.users.findFirst({
      where: eq(users.email, input.inviteeEmail.toLowerCase()),
      columns: { id: true },
    });
    if (!invitee) throw new LibraryAccessError("No account with that email", 404);

    const owner = await db.query.libraries.findFirst({
      where: eq(libraries.id, input.libraryId),
      columns: { ownerId: true },
    });
    if (owner?.ownerId === invitee.id) {
      throw new LibraryAccessError("Cannot share a library with its owner", 400);
    }

    // Re-invite acts as a role update.
    const existing = await db.query.libraryShares.findFirst({
      where: and(
        eq(libraryShares.libraryId, input.libraryId),
        eq(libraryShares.userId, invitee.id),
      ),
    });
    if (existing) {
      const [updated] = await db
        .update(libraryShares)
        .set({ role: input.role })
        .where(eq(libraryShares.id, existing.id))
        .returning();
      return updated;
    }
    const [row] = await db
      .insert(libraryShares)
      .values({ libraryId: input.libraryId, userId: invitee.id, role: input.role })
      .returning();
    return row;
  },

  async revoke(shareId: string, callerId: string) {
    const share = await db.query.libraryShares.findFirst({
      where: eq(libraryShares.id, shareId),
    });
    if (!share) throw new LibraryAccessError("Share not found", 404);
    await assertLibraryAccess(share.libraryId, callerId, "owner");
    await db.delete(libraryShares).where(eq(libraryShares.id, shareId));
  },

  async leave(libraryId: string, userId: string) {
    const share = await db.query.libraryShares.findFirst({
      where: and(eq(libraryShares.libraryId, libraryId), eq(libraryShares.userId, userId)),
    });
    if (!share) throw new LibraryAccessError("You are not a member of this library", 404);
    await db.delete(libraryShares).where(eq(libraryShares.id, share.id));
  },

  async updateRole(shareId: string, callerId: string, role: LibraryRole) {
    if (role === "owner") {
      throw new LibraryAccessError("Cannot promote a share to owner", 400);
    }
    const share = await db.query.libraryShares.findFirst({
      where: eq(libraryShares.id, shareId),
    });
    if (!share) throw new LibraryAccessError("Share not found", 404);
    await assertLibraryAccess(share.libraryId, callerId, "owner");
    const [row] = await db
      .update(libraryShares)
      .set({ role })
      .where(eq(libraryShares.id, shareId))
      .returning();
    return row;
  },
};
