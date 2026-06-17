import { and, eq } from "drizzle-orm";
import { db } from "~/db/client";
import { libraries, libraryShares } from "~/db/schema";

export type LibraryRole = "owner" | "editor" | "viewer";

export async function getLibraryRole(
  libraryId: string,
  userId: string,
): Promise<LibraryRole | null> {
  const lib = await db.query.libraries.findFirst({
    where: eq(libraries.id, libraryId),
    columns: { id: true, ownerId: true },
  });
  if (!lib) return null;
  if (lib.ownerId === userId) return "owner";

  const share = await db.query.libraryShares.findFirst({
    where: and(eq(libraryShares.libraryId, libraryId), eq(libraryShares.userId, userId)),
    columns: { role: true },
  });
  return share?.role ?? null;
}

const RANK: Record<LibraryRole, number> = { viewer: 1, editor: 2, owner: 3 };

export function roleAtLeast(role: LibraryRole | null, minimum: LibraryRole): boolean {
  return role !== null && RANK[role] >= RANK[minimum];
}

export class LibraryAccessError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function assertLibraryAccess(
  libraryId: string,
  userId: string,
  minimum: LibraryRole = "viewer",
): Promise<LibraryRole> {
  const role = await getLibraryRole(libraryId, userId);
  if (!role) throw new LibraryAccessError("Library not found", 404);
  if (!roleAtLeast(role, minimum)) {
    throw new LibraryAccessError("Insufficient permission for this library", 403);
  }
  return role;
}
