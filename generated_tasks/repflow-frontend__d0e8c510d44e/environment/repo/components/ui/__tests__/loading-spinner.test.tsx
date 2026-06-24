import { render, screen } from "@testing-library/react";
import {
    LoadingSpinner,
    PageLoading,
    InlineLoading,
} from "../loading-spinner";

describe("LoadingSpinner", () => {
    it("renders without text", () => {
        const { container } = render(<LoadingSpinner />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass("animate-spin");
    });

    it("renders with text", () => {
        render(<LoadingSpinner text="Loading data..." />);
        expect(screen.getByText("Loading data...")).toBeInTheDocument();
    });

    it("applies size classes correctly", () => {
        const { container } = render(<LoadingSpinner size="lg" />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveClass("h-8", "w-8");
    });

    it("applies custom className", () => {
        const { container } = render(
            <LoadingSpinner className="custom-class" />
        );
        expect(container.firstChild).toHaveClass("custom-class");
    });
});

describe("PageLoading", () => {
    it("renders with default message", () => {
        render(<PageLoading />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders with custom message", () => {
        render(<PageLoading message="Loading deals..." />);
        expect(screen.getByText("Loading deals...")).toBeInTheDocument();
    });

    it("renders spinner", () => {
        const { container } = render(<PageLoading />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
    });
});

describe("InlineLoading", () => {
    it("renders without text", () => {
        const { container } = render(<InlineLoading />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
    });

    it("renders with text", () => {
        render(<InlineLoading text="Saving..." />);
        expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
});
