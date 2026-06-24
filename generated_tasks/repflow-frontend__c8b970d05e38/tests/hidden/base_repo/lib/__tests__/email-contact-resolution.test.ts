/**
 * Tests for email template helper functions related to contact email resolution.
 * Verifies that getPrimaryContactEmail and getAllContactEmails behave correctly
 * when a deal has a contact with/without an email, or no contact at all.
 */
import { Deal, DealStatus, DealSource, BrandContact } from "../models";
import { getPrimaryContactEmail, getAllContactEmails } from "../email-templates";

/** Minimal deal object for testing */
const makeDeal = (contact?: Partial<BrandContact>): Deal => ({
    uuid: "deal-1",
    title: "Test Deal",
    status: "New Offer" as DealStatus,
    dealType: "Flat Rate",
    lastActivity: "2026-01-01T00:00:00.000Z",
    value: 500,
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
    contact: contact
        ? ({
              uuid: "c-1",
              name: "Test Contact",
              email: "",
              isAgencyContact: false,
              isPrimary: true,
              ...contact,
          } as BrandContact)
        : undefined,
});

describe("getPrimaryContactEmail", () => {
    it("returns the contact email when present", () => {
        const deal = makeDeal({ email: "brand@example.com" });
        expect(getPrimaryContactEmail(deal)).toBe("brand@example.com");
    });

    it("returns null when the deal has no contact", () => {
        const deal = makeDeal();
        expect(getPrimaryContactEmail(deal)).toBeNull();
    });

    it("returns null when the contact has no email", () => {
        const deal = makeDeal({ email: "" });
        expect(getPrimaryContactEmail(deal)).toBeNull();
    });

    it("returns null when the contact email is undefined", () => {
        const deal = makeDeal({ email: undefined } as any);
        expect(getPrimaryContactEmail(deal)).toBeNull();
    });
});

describe("getAllContactEmails", () => {
    it("returns array with email when present", () => {
        const deal = makeDeal({ email: "brand@example.com" });
        expect(getAllContactEmails(deal)).toEqual(["brand@example.com"]);
    });

    it("returns empty array when no contact", () => {
        const deal = makeDeal();
        expect(getAllContactEmails(deal)).toEqual([]);
    });

    it("returns empty array when contact has empty email", () => {
        const deal = makeDeal({ email: "" });
        expect(getAllContactEmails(deal)).toEqual([]);
    });
});
