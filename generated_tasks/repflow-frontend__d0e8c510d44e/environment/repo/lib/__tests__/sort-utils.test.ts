/**
 * Unit tests for sortBrandsByRevenue (contacts revenue numeric sort).
 */
import { sortBrandsByRevenue } from "../sort-utils";
import type { Brand } from "@/lib/models";

function makeBrand(overrides: Partial<Brand> & { totalRevenue: number }): Brand {
    return {
        uuid: "brand-" + Math.random().toString(36).slice(2, 8),
        name: "Brand",
        isAgency: false,
        totalRevenue: overrides.totalRevenue,
        dealCount: 0,
        contactsCount: 0,
        createdAt: "",
        updatedAt: "",
        ...overrides,
    };
}

describe("sortBrandsByRevenue", () => {
    it("sorts descending (highest revenue first)", () => {
        const brands = [
            makeBrand({ totalRevenue: 500 }),
            makeBrand({ totalRevenue: 10000 }),
            makeBrand({ totalRevenue: 2000 }),
        ];
        const result = sortBrandsByRevenue(brands, "desc");
        expect(result.map((b) => b.totalRevenue)).toEqual([10000, 2000, 500]);
    });

    it("sorts ascending (lowest revenue first)", () => {
        const brands = [
            makeBrand({ totalRevenue: 10000 }),
            makeBrand({ totalRevenue: 500 }),
            makeBrand({ totalRevenue: 2000 }),
        ];
        const result = sortBrandsByRevenue(brands, "asc");
        expect(result.map((b) => b.totalRevenue)).toEqual([500, 2000, 10000]);
    });

    it("places zero revenue at bottom when descending", () => {
        const brands = [
            makeBrand({ totalRevenue: 1000 }),
            makeBrand({ totalRevenue: 0 }),
            makeBrand({ totalRevenue: 500 }),
        ];
        const result = sortBrandsByRevenue(brands, "desc");
        expect(result.map((b) => b.totalRevenue)).toEqual([1000, 500, 0]);
    });

    it("places zero revenue at top when ascending", () => {
        const brands = [
            makeBrand({ totalRevenue: 1000 }),
            makeBrand({ totalRevenue: 0 }),
        ];
        const result = sortBrandsByRevenue(brands, "asc");
        expect(result[0].totalRevenue).toBe(0);
        expect(result[1].totalRevenue).toBe(1000);
    });

    it("does not mutate the original array", () => {
        const brands = [
            makeBrand({ totalRevenue: 3000 }),
            makeBrand({ totalRevenue: 1000 }),
        ];
        sortBrandsByRevenue(brands, "desc");
        expect(brands.map((b) => b.totalRevenue)).toEqual([3000, 1000]);
    });
});
