import { Deal } from "./models";

/**
 * Utility functions for working with deals
 */

/**
 * Create a minimal deal object for subject generation from conversation data
 * @param conversation The conversation object
 * @returns Minimal deal object for subject generation
 */
export const createDealForSubject = (conversation: any): Partial<Deal> => {
    return {
        uuid: conversation.dealId,
        brand: { name: conversation.name } as any, // Partial brand for subject generation
        dealType: "Brand Partnership", // Default type
        value: 0, // Default value
        createdBy: conversation.userId || "Creator", // Include creator name
    };
};

/**
 * Create a minimal deal object for subject generation from deal data
 * @param deal The deal object
 * @returns Minimal deal object for subject generation
 */
export const createDealForSubjectFromDeal = (deal: Deal): Partial<Deal> => {
    return {
        uuid: deal.uuid || deal.id,
        brand: deal.brand,
        dealType: deal.dealType,
        value: deal.value,
    };
};
