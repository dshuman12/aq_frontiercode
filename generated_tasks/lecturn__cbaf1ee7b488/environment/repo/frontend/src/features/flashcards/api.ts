import { api } from "~/lib/api-client";
import type { CardRating, Flashcard, ReviewOutcome } from "./types";

export const flashcardsApi = {
  list: (params: { episodeId?: string; courseId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.episodeId) qs.set("episodeId", params.episodeId);
    if (params.courseId) qs.set("courseId", params.courseId);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api
      .get<{ items: Flashcard[] }>(`/flashcards${suffix}`)
      .then((r) => r.items);
  },
  due: (limit?: number) =>
    api
      .get<{ items: Flashcard[] }>(
        `/flashcards/due${limit ? `?limit=${limit}` : ""}`,
      )
      .then((r) => r.items),
  create: (body: {
    front: string;
    back: string;
    episodeId?: string | null;
    courseId?: string | null;
    sourceNoteId?: string | null;
  }) => api.post<{ id: string }>("/flashcards", body),
  update: (cardId: string, patch: { front?: string; back?: string }) =>
    api.patch<{ ok: true }>(`/flashcards/${cardId}`, patch),
  remove: (cardId: string) => api.del<void>(`/flashcards/${cardId}`),
  review: (cardId: string, rating: CardRating) =>
    api.post<ReviewOutcome>(`/flashcards/${cardId}/review`, { rating }),
};
