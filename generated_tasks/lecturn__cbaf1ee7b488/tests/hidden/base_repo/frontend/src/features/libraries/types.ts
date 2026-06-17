export type LibraryRole = "owner" | "editor" | "viewer";

export type Library = {
  id: string;
  name: string;
  sourcePath: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  role: LibraryRole;
  createdAt: string;
  updatedAt: string;
};

export type Share = {
  id: string;
  libraryId: string;
  userId: string;
  email: string;
  name: string;
  role: Exclude<LibraryRole, "owner">;
  createdAt: string;
};
