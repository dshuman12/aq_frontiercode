import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "~/db/client";
import { libraries, libraryShares, users } from "~/db/schema";
import { assertLibraryAccess, type LibraryRole } from "./access";

export type LibrarySummary = {
  id: string;
  name: string;
  sourcePath: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  role: LibraryRole;
  createdAt: Date;
  updatedAt: Date;
};

export const librariesService = {
  async listForUser(userId: string): Promise<LibrarySummary[]> {
    const owned = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        sourcePath: libraries.sourcePath,
        ownerId: libraries.ownerId,
        ownerEmail: users.email,
        ownerName: users.name,
        createdAt: libraries.createdAt,
        updatedAt: libraries.updatedAt,
      })
      .from(libraries)
      .innerJoin(users, eq(users.id, libraries.ownerId))
      .where(eq(libraries.ownerId, userId))
      .orderBy(desc(libraries.updatedAt));

    const sharedRows = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        sourcePath: libraries.sourcePath,
        ownerId: libraries.ownerId,
        ownerEmail: users.email,
        ownerName: users.name,
        role: libraryShares.role,
        createdAt: libraries.createdAt,
        updatedAt: libraries.updatedAt,
      })
      .from(libraryShares)
      .innerJoin(libraries, eq(libraries.id, libraryShares.libraryId))
      .innerJoin(users, eq(users.id, libraries.ownerId))
      .where(eq(libraryShares.userId, userId))
      .orderBy(desc(libraries.updatedAt));

    return [
      ...owned.map((r) => ({ ...r, role: "owner" as const })),
      ...sharedRows.map((r) => ({ ...r, role: r.role as LibraryRole })),
    ];
  },

  async create(input: { name: string; sourcePath: string; ownerId: string }) {
    const [row] = await db
      .insert(libraries)
      .values({ name: input.name, sourcePath: input.sourcePath, ownerId: input.ownerId })
      .returning();
    if (!row) throw new Error("Failed to create library");
    return row;
  },

  async getById(libraryId: string, userId: string) {
    await assertLibraryAccess(libraryId, userId, "viewer");
    return db.query.libraries.findFirst({ where: eq(libraries.id, libraryId) });
  },

  async update(
    libraryId: string,
    userId: string,
    patch: { name?: string; sourcePath?: string },
  ) {
    await assertLibraryAccess(libraryId, userId, "owner");
    const [row] = await db
      .update(libraries)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(libraries.id, libraryId))
      .returning();
    return row;
  },

  async remove(libraryId: string, userId: string) {
    await assertLibraryAccess(libraryId, userId, "owner");
    await db.delete(libraries).where(eq(libraries.id, libraryId));
  },

  async ensureDefault(userId: string, defaultPath: string) {
    const existing = await db.query.libraries.findFirst({
      where: eq(libraries.ownerId, userId),
    });
    if (existing) return existing;
    return this.create({ name: "My library", sourcePath: defaultPath, ownerId: userId });
  },
};
