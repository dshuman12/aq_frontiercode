import type { Brand } from "@/lib/models";

/**
 * Sorts brands by totalRevenue numerically (not alphabetically).
 * Handles null/undefined revenue as 0; supports ascending and descending order.
 */
export function sortBrandsByRevenue(
    brands: Brand[],
    order: "asc" | "desc"
): Brand[] {
    return [...brands].sort((a, b) => {
        const revA = a.totalRevenue ?? 0;
        const revB = b.totalRevenue ?? 0;
        return order === "desc" ? revB - revA : revA - revB;
    });
}
