import { api } from "~/lib/api-client";
import type { SearchHit } from "./types";

export const searchApi = {
  search: (q: string, limit?: number) => {
    const params = new URLSearchParams({ q });
    if (limit) params.set("limit", String(limit));
    return api
      .get<{ items: SearchHit[] }>(`/search?${params}`)
      .then((r) => r.items);
  },
};
