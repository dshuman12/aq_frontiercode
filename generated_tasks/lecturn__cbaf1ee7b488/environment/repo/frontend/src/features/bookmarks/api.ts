import { api } from "~/lib/api-client";
import type { Bookmark } from "./types";

export const bookmarksApi = {
  list: (episodeId: string) =>
    api
      .get<{ items: Bookmark[] }>(`/episodes/${episodeId}/bookmarks`)
      .then((r) => r.items),
  create: (episodeId: string, body: { atSec: number; label?: string }) =>
    api.post<{ id: string }>(`/episodes/${episodeId}/bookmarks`, body),
  update: (
    bookmarkId: string,
    patch: { label?: string | null; atSec?: number },
  ) => api.patch<{ ok: true }>(`/bookmarks/${bookmarkId}`, patch),
  remove: (bookmarkId: string) => api.del<void>(`/bookmarks/${bookmarkId}`),
};
