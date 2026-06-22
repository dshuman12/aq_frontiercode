export type ApiResult<T> = { data: T; requestId: string };

export async function getJson<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(`/api${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return { data: await response.json() as T, requestId: response.headers.get("x-request-id") ?? "" };
}
