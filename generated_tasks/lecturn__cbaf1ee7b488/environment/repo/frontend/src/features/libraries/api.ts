import { api } from "~/lib/api-client";
import type { Library, Share } from "./types";

export const librariesApi = {
  list: () => api.get<{ items: Library[] }>("/libraries").then((r) => r.items),
  create: (input: { name: string; sourcePath: string }) =>
    api.post<{ id: string }>("/libraries", input),
  update: (id: string, patch: { name?: string; sourcePath?: string }) =>
    api.patch<{ ok: true }>(`/libraries/${id}`, patch),
  remove: (id: string) => api.del<void>(`/libraries/${id}`),

  shares: (id: string) =>
    api.get<{ items: Share[] }>(`/libraries/${id}/shares`).then((r) => r.items),
  invite: (id: string, body: { email: string; role: "viewer" | "editor" }) =>
    api.post<{ id: string }>(`/libraries/${id}/shares`, body),
  updateShare: (id: string, shareId: string, role: "viewer" | "editor") =>
    api.patch<{ ok: true }>(`/libraries/${id}/shares/${shareId}`, { role }),
  revokeShare: (id: string, shareId: string) =>
    api.del<void>(`/libraries/${id}/shares/${shareId}`),
  leave: (id: string) => api.post<{ ok: true }>(`/libraries/${id}/leave`),
};

export const libraryApi = {
  sync: (libraryId: string) =>
    api.post<{ scanned: number; inserted: number }>("/library/sync", { libraryId }),
};
