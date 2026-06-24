import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders, AxiosInstance } from "axios";
import { ILogger } from "@onmoapp/logger";

vi.mock("./apiKeyProvider", () => ({
  apiKeyProvider: {
    getApiKey: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("@onmoapp/logger", () => ({
  logger: mockLogger,
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  addContext: vi.fn(),
} as unknown as ILogger;

const mockGet = vi.fn();
const mockClient = { get: mockGet } as unknown as AxiosInstance;

const { apiKeyProvider } = await import("./apiKeyProvider");
const mockGetApiKey = vi.mocked(apiKeyProvider.getApiKey);
const mockClearCache = vi.mocked(apiKeyProvider.clearCache);

const validResponse = {
  data: { cardId: "card-123", status: "ACTIVE", isActivated: true },
};

const makeAxiosError = (status: number, message: string): AxiosError => {
  return new AxiosError(
    message,
    "ERR_BAD_RESPONSE",
    { headers: new AxiosHeaders() } as never,
    {},
    {
      status,
      data: {},
      headers: {},
      statusText: message,
      config: { headers: new AxiosHeaders() },
    },
  );
};

describe("CardService", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetApiKey.mockResolvedValue("test-api-key");
  });

  const loadModule = async () => {
    const { CardService } = await import("./cardService");
    return CardService.init(mockClient);
  };

  it("returns card summary on successful response", async () => {
    mockGet.mockResolvedValue(validResponse);
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ id: "card-123", status: "ACTIVE", isActivated: true });
    }
    expect(mockGet).toHaveBeenCalledWith(
      "/card-123",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "test-api-key" }),
      }),
    );
  });

  it("coerces null isActivated to false", async () => {
    mockGet.mockResolvedValue({
      data: { cardId: "card-123", status: "ACTIVE", isActivated: null },
    });
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isActivated).toBe(false);
    }
  });

  it("returns failure on zod validation error", async () => {
    mockGet.mockResolvedValue({
      data: { cardId: "card-123", isActivated: true },
    });
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith("Card service response validation failed");
  });

  it("retries on 5xx errors then succeeds", async () => {
    mockGet.mockRejectedValueOnce(makeAxiosError(500, "Server error"));
    mockGet.mockResolvedValueOnce(validResponse);
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx errors", async () => {
    mockGet.mockRejectedValue(makeAxiosError(404, "Not found"));
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors (no response)", async () => {
    const networkError = new AxiosError("Network Error", "ERR_NETWORK");
    mockGet.mockRejectedValue(networkError);
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(result.ok).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("caches the API key via singleton provider", async () => {
    mockGet.mockResolvedValue(validResponse);
    const cardService = await loadModule();

    await cardService.getCardDetails("card-1");
    await cardService.getCardDetails("card-2");

    expect(mockGetApiKey).toHaveBeenCalledTimes(2);
  });

  it("retries with fresh API key on 401", async () => {
    mockGetApiKey.mockResolvedValueOnce("stale-key");
    mockGetApiKey.mockResolvedValueOnce("fresh-key");
    mockGet.mockRejectedValueOnce(makeAxiosError(401, "Unauthorized"));
    mockGet.mockResolvedValueOnce(validResponse);
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("retries with fresh API key on 403", async () => {
    mockGetApiKey.mockResolvedValueOnce("stale-key");
    mockGetApiKey.mockResolvedValueOnce("fresh-key");
    mockGet.mockRejectedValueOnce(makeAxiosError(403, "Forbidden"));
    mockGet.mockResolvedValueOnce(validResponse);
    const cardService = await loadModule();

    const result = await cardService.getCardDetails("card-123");

    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("does not leak API key in logged errors", async () => {
    mockGet.mockRejectedValue(makeAxiosError(500, "Server error"));
    const cardService = await loadModule();

    await cardService.getCardDetails("card-123");

    expect(mockLogger.error).toHaveBeenCalledWith("Card service request failed");

    const contextCalls = (mockLogger.addContext as ReturnType<typeof vi.fn>).mock.calls;
    const serialised = JSON.stringify(contextCalls);
    expect(serialised).not.toContain("test-api-key");
    expect(serialised).not.toContain("x-api-key");
  });
});
