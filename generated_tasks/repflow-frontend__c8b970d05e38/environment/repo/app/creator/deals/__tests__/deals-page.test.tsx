/**
 * Tests for the Deal Tracker page.
 * Verifies that deal status columns (including hidden ones like Lost, Abandoned, Archive)
 * are correctly revealed when deals with those statuses exist or are updated.
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import { Deal, DealStatus, DealSource } from "@/lib/models";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the page component
// ---------------------------------------------------------------------------

/** Mock API functions */
const mockGetDealsGroupedByStatus = jest.fn();
const mockAddDeal = jest.fn();
const mockUpdateDeal = jest.fn();
const mockArchiveDeal = jest.fn();
const mockDeleteDeal = jest.fn();

jest.mock("@/lib/api", () => ({
    getDealsGroupedByStatus: (...args: unknown[]) => mockGetDealsGroupedByStatus(...args),
    addDeal: (...args: unknown[]) => mockAddDeal(...args),
    updateDeal: (...args: unknown[]) => mockUpdateDeal(...args),
    archiveDeal: (...args: unknown[]) => mockArchiveDeal(...args),
    deleteDeal: (...args: unknown[]) => mockDeleteDeal(...args),
}));

jest.mock("@/hooks/use-error-handler", () => ({
    useErrorHandler: () => ({
        handleError: jest.fn().mockReturnValue({ message: "Error" }),
    }),
}));

jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

/** Mock drag-and-drop — render children without DnD machinery */
jest.mock("@hello-pangea/dnd", () => ({
    DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Droppable: ({ children }: { children: (p: any, s: any) => React.ReactNode }) =>
        children(
            { droppableProps: {}, innerRef: jest.fn(), placeholder: null },
            { isDraggingOver: false }
        ),
    Draggable: ({ children }: { children: (p: any, s: any) => React.ReactNode }) =>
        children(
            { innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} },
            { isDragging: false }
        ),
}));

/** Mock child modals so they don't interfere */
jest.mock("@/components/deal-details-modal", () => ({
    DealDetailsModal: () => null,
}));
jest.mock("@/components/new-deal-modal", () => ({
    NewDealModal: () => null,
}));

/** Mock Radix UI dropdown to avoid jsdom issues with Popper */
jest.mock("@/components/ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuContent: () => null,
    DropdownMenuItem: () => null,
    DropdownMenuSeparator: () => null,
    DropdownMenuCheckboxItem: () => null,
}));

import DealTrackerPage from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal valid Deal object */
const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
    uuid: "deal-" + Math.random().toString(36).slice(2, 8),
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

/** Build a board object the same way getDealsGroupedByStatus returns */
const makeBoard = (deals: Deal[] = []) => {
    const statusKeys = [
        "new-offer", "negotiating", "contracting", "drafting",
        "live", "complete", "archive", "lost", "abandoned",
    ];
    const statusTitles = [
        "New Offer", "Negotiating", "Contracting", "Drafting",
        "Live", "Complete", "Archive", "Lost", "Abandoned",
    ];

    const board: Record<string, { title: string; deals: Deal[] }> = {};
    statusKeys.forEach((key, i) => {
        board[key] = {
            title: statusTitles[i],
            deals: deals.filter((d) => d.status === statusTitles[i]),
        };
    });
    return board;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks();
});

describe("DealTrackerPage – column visibility", () => {
    it("shows the 6 default columns when all deals are in normal statuses", async () => {
        const deals = [makeDeal({ status: "New Offer" })];
        mockGetDealsGroupedByStatus.mockResolvedValue(makeBoard(deals));

        render(<DealTrackerPage />);

        await waitFor(() => {
            expect(screen.getByText("New Offer")).toBeInTheDocument();
        });

        // The 6 default columns should be visible
        expect(screen.getByText("Negotiating")).toBeInTheDocument();
        expect(screen.getByText("Contracting")).toBeInTheDocument();
        expect(screen.getByText("Drafting")).toBeInTheDocument();
        expect(screen.getByText("Live")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();

        // Hidden columns should NOT be rendered when they have no deals
        expect(screen.queryByText("Archive")).not.toBeInTheDocument();
        expect(screen.queryByText("Lost")).not.toBeInTheDocument();
        expect(screen.queryByText("Abandoned")).not.toBeInTheDocument();
    });

    it("auto-reveals the Archive column when a deal exists with Archive status on load", async () => {
        const deals = [
            makeDeal({ status: "New Offer" }),
            makeDeal({ status: "Archive" }),
        ];
        mockGetDealsGroupedByStatus.mockResolvedValue(makeBoard(deals));

        render(<DealTrackerPage />);

        await waitFor(() => {
            // Archive column should now be visible because it contains a deal
            expect(screen.getByText("Archive")).toBeInTheDocument();
        });
    });

    it("auto-reveals the Lost column when a deal exists with Lost status on load", async () => {
        const deals = [makeDeal({ status: "Lost" })];
        mockGetDealsGroupedByStatus.mockResolvedValue(makeBoard(deals));

        render(<DealTrackerPage />);

        await waitFor(() => {
            expect(screen.getByText("Lost")).toBeInTheDocument();
        });
    });

    it("auto-reveals the Abandoned column when a deal exists with Abandoned status on load", async () => {
        const deals = [makeDeal({ status: "Abandoned" })];
        mockGetDealsGroupedByStatus.mockResolvedValue(makeBoard(deals));

        render(<DealTrackerPage />);

        await waitFor(() => {
            expect(screen.getByText("Abandoned")).toBeInTheDocument();
        });
    });

    it("reveals all three hidden columns when all three have deals on load", async () => {
        const deals = [
            makeDeal({ status: "Archive" }),
            makeDeal({ status: "Lost" }),
            makeDeal({ status: "Abandoned" }),
        ];
        mockGetDealsGroupedByStatus.mockResolvedValue(makeBoard(deals));

        render(<DealTrackerPage />);

        await waitFor(() => {
            expect(screen.getByText("Archive")).toBeInTheDocument();
            expect(screen.getByText("Lost")).toBeInTheDocument();
            expect(screen.getByText("Abandoned")).toBeInTheDocument();
        });
    });
});

describe("DealTrackerPage – loading & error states", () => {
    it("shows loading state while fetching deals", async () => {
        // Never resolve so we stay in loading
        mockGetDealsGroupedByStatus.mockReturnValue(new Promise(() => {}));

        render(<DealTrackerPage />);

        expect(screen.getByText("Loading deals...")).toBeInTheDocument();
    });

    it("shows error state when fetch fails", async () => {
        mockGetDealsGroupedByStatus.mockRejectedValue(new Error("Network error"));

        render(<DealTrackerPage />);

        await waitFor(() => {
            // The error display shows the user-friendly error title
            expect(screen.getByText("Connection Problem")).toBeInTheDocument();
        });
    });
});
