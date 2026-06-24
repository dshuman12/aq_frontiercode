/**
 * Tests for deal-related API functions (addDeal, updateDeal, archiveDeal, deleteDeal).
 * Validates that each function sends correct HTTP payloads and handles errors properly.
 */
import { Deal, DealSource, DealStatus } from "../models";

// Mock auth-utils before importing api module
jest.mock("../auth-utils", () => ({
    getAuthHeaders: jest.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
    getUserId: jest.fn().mockResolvedValue("test-user-id"),
}));

jest.mock("@/app/constants/constants", () => ({
    API_BASE_URL: "https://api.test.com",
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { addDeal, updateDeal, archiveDeal, deleteDeal } from "../api";

// Import getDealsGroupedByStatus separately so we can test it
import { getDealsGroupedByStatus } from "../api";

/** Minimal valid deal object for testing */
const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
    uuid: "deal-123",
    title: "Test Brand",
    status: "New Offer" as DealStatus,
    dealType: "Flat Rate",
    lastActivity: "2026-01-01T00:00:00.000Z",
    value: 1000,
    valueCurrency: "USD",
    dueDateType: "reminder",
    isPriority: false,
    isHighValue: false,
    isAiPaused: false,
    dateReceived: "2026-01-01T00:00:00.000Z",
    brief: { link: "N/A", promoCode: "N/A" },
    deliverables: [],
    communicationHistory: [],
    source: "inbound" as DealSource,
    stageHistory: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

beforeEach(() => {
    mockFetch.mockReset();
});

describe("addDeal", () => {
    it("sends POST with full deal payload and returns created deal", async () => {
        const deal = makeDeal();
        const { uuid, ...dealWithoutId } = deal;
        const responseDeal = { ...deal, id: "server-id" };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => responseDeal,
        });

        const result = await addDeal({ ...dealWithoutId, uuid });
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.test.com/deals/",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                    Authorization: "Bearer test-token",
                }),
            })
        );

        // Verify the body contains the deal with userId injected
        const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(sentBody.userId).toBe("test-user-id");
        expect(sentBody.title).toBe("Test Brand");
        expect(result).toEqual(responseDeal);
    });

    it("creates Repflow-sourced deals the same as inbound deals", async () => {
        const deal = makeDeal({ source: "Repflow" });
        const responseDeal = { ...deal, id: "server-id" };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => responseDeal,
        });

        const result = await addDeal(deal);
        const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(sentBody.source).toBe("Repflow");
        expect(result.source).toBe("Repflow");
    });

    it("includes status code and response body in error on failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 422,
            text: async () => '{"detail":"source must be lowercase"}',
        });

        await expect(addDeal(makeDeal())).rejects.toThrow("422");
    });
});

describe("updateDeal", () => {
    it("sends PUT with full deal payload", async () => {
        const deal = makeDeal();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => deal,
        });

        await updateDeal("deal-123", deal);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.test.com/deals/deal-123",
            expect.objectContaining({ method: "PUT" })
        );
    });

    it("includes status code in error on failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => "Bad Request",
        });

        await expect(updateDeal("deal-123", {})).rejects.toThrow("400");
    });
});

describe("archiveDeal", () => {
    it("sends the full deal with status overridden to Archive", async () => {
        const deal = makeDeal({ status: "New Offer" });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...deal, status: "Archive" }),
        });

        const result = await archiveDeal(deal);
        const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);

        // Must include the full deal, not just { status, updatedAt }
        expect(sentBody.title).toBe("Test Brand");
        expect(sentBody.value).toBe(1000);
        expect(sentBody.source).toBe("inbound");
        expect(sentBody.status).toBe("Archive");
        expect(sentBody.updatedAt).toBeDefined();
        expect(result.status).toBe("Archive");
    });

    it("works with Repflow-sourced deals", async () => {
        const deal = makeDeal({ source: "Repflow", status: "Negotiating" });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...deal, status: "Archive" }),
        });

        await archiveDeal(deal);
        const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(sentBody.source).toBe("Repflow");
        expect(sentBody.status).toBe("Archive");
    });
});

describe("deleteDeal", () => {
    it("sends DELETE request", async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const result = await deleteDeal("deal-123");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.test.com/deals/deal-123",
            expect.objectContaining({ method: "DELETE" })
        );
        expect(result).toBe(true);
    });

    it("throws on failure", async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

        await expect(deleteDeal("deal-123")).rejects.toThrow();
    });
});

describe("getDealsGroupedByStatus", () => {
    it("groups deals into the correct status columns", async () => {
        const deals = [
            makeDeal({ uuid: "d1", status: "New Offer" }),
            makeDeal({ uuid: "d2", status: "Negotiating" }),
            makeDeal({ uuid: "d3", status: "Lost" }),
            makeDeal({ uuid: "d4", status: "Abandoned" }),
            makeDeal({ uuid: "d5", status: "Archive" }),
            makeDeal({ uuid: "d6", status: "Complete" }),
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => deals,
        });

        const result = await getDealsGroupedByStatus();

        // Every expected column should exist
        expect(result["new-offer"]).toBeDefined();
        expect(result["negotiating"]).toBeDefined();
        expect(result["contracting"]).toBeDefined();
        expect(result["lost"]).toBeDefined();
        expect(result["abandoned"]).toBeDefined();
        expect(result["archive"]).toBeDefined();

        // Deals should be in their matching column
        expect(result["new-offer"].deals).toHaveLength(1);
        expect(result["new-offer"].deals[0].uuid).toBe("d1");

        expect(result["lost"].deals).toHaveLength(1);
        expect(result["lost"].deals[0].uuid).toBe("d3");

        expect(result["abandoned"].deals).toHaveLength(1);
        expect(result["abandoned"].deals[0].uuid).toBe("d4");

        expect(result["archive"].deals).toHaveLength(1);
        expect(result["archive"].deals[0].uuid).toBe("d5");

        // Empty columns should have zero deals
        expect(result["contracting"].deals).toHaveLength(0);
        expect(result["drafting"].deals).toHaveLength(0);
        expect(result["live"].deals).toHaveLength(0);
    });

    it("returns empty columns when no deals exist", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        const result = await getDealsGroupedByStatus();

        // All 9 columns should be present but empty
        const keys = Object.keys(result);
        expect(keys).toHaveLength(9);
        keys.forEach((key) => {
            expect(result[key].deals).toHaveLength(0);
        });
    });

    it("column titles match their status display names", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        const result = await getDealsGroupedByStatus();

        expect(result["new-offer"].title).toBe("New Offer");
        expect(result["lost"].title).toBe("Lost");
        expect(result["abandoned"].title).toBe("Abandoned");
        expect(result["archive"].title).toBe("Archive");
    });

    it("throws when the API returns an error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        await expect(getDealsGroupedByStatus()).rejects.toThrow("Failed to fetch deals");
    });
});
