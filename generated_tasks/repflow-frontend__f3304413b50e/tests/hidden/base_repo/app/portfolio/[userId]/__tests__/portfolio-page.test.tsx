/**
 * Tests for the public portfolio page.
 * Verifies that only one Contact button is shown (no duplicate).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { User } from "@/lib/models";

const mockGetPublicUserPortfolio = jest.fn();

jest.mock("@/lib/api", () => ({
    getPublicUserPortfolio: (...args: unknown[]) =>
        mockGetPublicUserPortfolio(...args),
}));

jest.mock("next/navigation", () => ({
    useParams: () => ({ userId: "test-user-123" }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: { alt: string }) => <img alt={props.alt} />,
}));

jest.mock("@/components/creator-profile-display", () => ({
    __esModule: true,
    default: () => <div data-testid="creator-profile-display">Profile</div>,
}));

jest.mock("@/components/portfolio-chatbot", () => ({
    __esModule: true,
    default: () => null,
}));

import PublicPortfolioPage from "../page";

function makeUser(overrides: Partial<User> = {}): User {
    return {
        uuid: "user-123",
        createdAt: "",
        updatedAt: "",
        profile: {
            id: "profile-1",
            name: "Jane Creator",
            email: "jane@example.com",
            repflow_username: "jane",
            avatar: undefined,
            bio: undefined,
            tags: [],
            subscription: { tier: "", status: "", currentPeriodEnd: "" },
            createdAt: "",
            updatedAt: "",
        },
        platforms: [],
        preferences: {
            partnershipTypes: {
                flatRate: false,
                performanceHybrid: false,
                affiliate: false,
                gifting: false,
                ugc: false,
                events: false,
            },
            absoluteMinimumRate: 0,
            deliverables: [],
            pricingTiers: {
                lowTier: { enabled: false, categories: [] },
                premiumTier: { enabled: false, categories: [] },
                ultraPremium: { enabled: false, categories: [] },
            },
            autoRejectCategories: [],
            preferredContactMethod: "email",
            responseTimeHours: 24,
            timezone: "UTC",
            language: "en",
            emailNotifications: false,
            pushNotifications: false,
            dealAlerts: false,
            weeklyReports: false,
        },
        teamMembers: [],
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("PublicPortfolioPage – Contact button", () => {
    it("shows exactly one Contact button when user has repflow_username", async () => {
        mockGetPublicUserPortfolio.mockResolvedValue(makeUser());

        render(<PublicPortfolioPage />);

        await waitFor(() => {
            expect(screen.getByText(/Jane Creator's Portfolio/i)).toBeInTheDocument();
        });

        const contactButtons = screen.getAllByRole("button", { name: /Contact/i });
        expect(contactButtons).toHaveLength(1);
        expect(contactButtons[0]).toHaveTextContent("Contact Me");
    });
});
