import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorDisplay, FieldError } from "../error-display";
import type { UserFriendlyError } from "@/lib/error-messages";

const mockError: UserFriendlyError = {
    title: "Connection Problem",
    message: "We couldn't connect to our servers. Please check your internet connection.",
    action: "retry",
    actionLabel: "Try Again",
};

describe("ErrorDisplay", () => {
    describe("default variant", () => {
        it("renders error title and message", () => {
            render(<ErrorDisplay error={mockError} />);
            expect(screen.getByText("Connection Problem")).toBeInTheDocument();
            expect(
                screen.getByText(/We couldn't connect to our servers/)
            ).toBeInTheDocument();
        });

        it("renders action button when onAction provided", async () => {
            const onAction = jest.fn();
            render(
                <ErrorDisplay error={mockError} onAction={onAction} />
            );
            const button = screen.getByRole("button", { name: /try again/i });
            expect(button).toBeInTheDocument();
            await userEvent.click(button);
            expect(onAction).toHaveBeenCalledTimes(1);
        });

        it("does not render action when error has no action", () => {
            const errorWithoutAction: UserFriendlyError = {
                ...mockError,
                action: undefined,
                actionLabel: undefined,
            };
            render(<ErrorDisplay error={errorWithoutAction} />);
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });
    });

    describe("inline variant", () => {
        it("renders in compact format", () => {
            render(
                <ErrorDisplay error={mockError} variant="inline" />
            );
            expect(screen.getByText("Connection Problem")).toBeInTheDocument();
        });

        it("calls onAction when button clicked", async () => {
            const onAction = jest.fn();
            render(
                <ErrorDisplay
                    error={mockError}
                    variant="inline"
                    onAction={onAction}
                />
            );
            const button = screen.getByRole("button", { name: /try again/i });
            await userEvent.click(button);
            expect(onAction).toHaveBeenCalled();
        });
    });

    describe("page variant", () => {
        it("renders centered page layout", () => {
            const { container } = render(
                <ErrorDisplay error={mockError} variant="page" />
            );
            expect(screen.getByText("Connection Problem")).toBeInTheDocument();
            expect(container.firstChild).toHaveClass("min-h-[400px]");
        });

        it("renders retry button with refresh icon", () => {
            render(
                <ErrorDisplay
                    error={mockError}
                    variant="page"
                    onAction={() => {}}
                />
            );
            expect(screen.getByRole("button")).toBeInTheDocument();
        });
    });
});

describe("FieldError", () => {
    it("returns null when no error", () => {
        const { container } = render(<FieldError />);
        expect(container.firstChild).toBeNull();
    });

    it("returns null when error is undefined", () => {
        const { container } = render(<FieldError error={undefined} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders error message when provided", () => {
        render(<FieldError error="Email is required" />);
        expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("applies custom className", () => {
        const { container } = render(
            <FieldError error="Error" className="custom-class" />
        );
        expect(container.firstChild).toHaveClass("custom-class");
    });
});
