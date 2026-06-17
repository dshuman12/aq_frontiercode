import { api } from "~/lib/api-client";
import type { Highlight, Note } from "./types";

export const notesApi = {
  list: (episodeId: string) =>
    api.get<{ items: Note[] }>(`/episodes/${episodeId}/notes`).then((r) => r.items),
  create: (
    episodeId: string,
    body: { body: string; atSec?: number | null },
  ) => api.post<{ id: string }>(`/episodes/${episodeId}/notes`, body),
  update: (
    noteId: string,
    patch: { body?: string; atSec?: number | null },
  ) => api.patch<{ ok: true }>(`/notes/${noteId}`, patch),
  remove: (noteId: string) => api.del<void>(`/notes/${noteId}`),
};

export const highlightsApi = {
  list: (episodeId: string) =>
    api
      .get<{ items: Highlight[] }>(`/episodes/${episodeId}/highlights`)
      .then((r) => r.items),
  create: (
    episodeId: string,
    body: {
      startSec: number;
      endSec: number;
      text?: string | null;
      color?: string;
      note?: string | null;
    },
  ) => api.post<{ id: string }>(`/episodes/${episodeId}/highlights`, body),
  remove: (highlightId: string) =>
    api.del<void>(`/highlights/${highlightId}`),
};
