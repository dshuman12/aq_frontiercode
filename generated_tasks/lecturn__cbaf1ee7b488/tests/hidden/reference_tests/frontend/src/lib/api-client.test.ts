import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, hlsUrl, streamUrl, subtitleUrl } from './api-client';

const origFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = origFetch;
  vi.clearAllMocks();
});

function mockJson(status: number, body: unknown) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

describe('api.get', () => {
  it('calls fetch with the prefixed URL and credentials: include', async () => {
    mockJson(200, { hello: 'world' });
    const res = await api.get<{ hello: string }>('/courses');
    expect(res.hello).toBe('world');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/v1\/courses$/);
    expect((init as RequestInit).credentials).toBe('include');
  });
});

describe('api.post / put / patch', () => {
  it('serializes the body as JSON and sets content-type', async () => {
    mockJson(200, { ok: true });
    await api.post('/x', { name: 'n' });
    const init = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'n' }));
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('omits Content-Type when body is undefined', async () => {
    mockJson(200, { ok: true });
    await api.post('/x');
    const init = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]![1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });

  it('returns undefined for 204 No Content', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
      text: async () => '',
    } as unknown as Response);
    expect(await api.del('/x')).toBeUndefined();
  });

  it('throws ApiError on non-ok response', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'nope',
    } as unknown as Response);
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('URL helpers', () => {
  it('streamUrl points at the legacy raw mp4 endpoint via the same-origin proxy', () => {
    expect(streamUrl('ep-1')).toBe('/stream/ep-1/stream');
  });

  it('hlsUrl points at the master playlist via the same-origin proxy', () => {
    expect(hlsUrl('ep-1')).toBe('/stream/ep-1/hls/master.m3u8');
  });

  it('subtitleUrl encodes the language tag', () => {
    expect(subtitleUrl('ep-1', 'en-US')).toBe('/stream/ep-1/subtitles/en-US');
  });
});
