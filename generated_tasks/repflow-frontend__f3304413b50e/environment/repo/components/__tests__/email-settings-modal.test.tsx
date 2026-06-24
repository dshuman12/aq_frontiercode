import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailPreviewModal } from "../email-settings-modal";
import { EmailRequest } from "@/lib/email-generator";
import { QuickActionType } from "@/lib/email-templates";

// Mock sonner toast
jest.mock("sonner", () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

const baseEmailRequest: EmailRequest = {
    to_addresses: ["brand@company.com"],
    subject: "Re: Partnership Offer",
    body_text: "Thank you for the offer. I'd love to discuss further.",
    body_html: "<p>Thank you for the offer. I'd love to discuss further.</p>",
    from_address: "creator@repflow.me",
    cc_addresses: [],
    bcc_addresses: [],
};

const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    emailRequest: baseEmailRequest,
    actionType: "Accept" as QuickActionType,
    contactInfo: { name: "Brand Manager", email: "brand@company.com" },
    onSendEmail: jest.fn(),
};

describe("EmailPreviewModal", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders with pre-filled recipient as a locked chip", () => {
        render(<EmailPreviewModal {...defaultProps} />);

        // The pre-filled email should appear as a chip in the UI
        expect(screen.getByText("brand@company.com")).toBeInTheDocument();
    });

    it("enables Send Email button when emailRequest has pre-filled to_addresses", () => {
        render(<EmailPreviewModal {...defaultProps} />);

        const sendButton = screen.getByRole("button", { name: /send email/i });

        // The button should be ENABLED because the pre-filled recipient counts
        expect(sendButton).not.toBeDisabled();
    });

    it("disables Send Email button when no recipients at all", () => {
        const emptyRequest: EmailRequest = {
            ...baseEmailRequest,
            to_addresses: [],
        };

        render(
            <EmailPreviewModal
                {...defaultProps}
                emailRequest={emptyRequest}
            />
        );

        const sendButton = screen.getByRole("button", { name: /send email/i });
        expect(sendButton).toBeDisabled();
    });

    it("includes pre-filled to_addresses when sending email", async () => {
        const onSendEmail = jest.fn().mockResolvedValue(undefined);

        render(
            <EmailPreviewModal
                {...defaultProps}
                onSendEmail={onSendEmail}
            />
        );

        const sendButton = screen.getByRole("button", { name: /send email/i });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(onSendEmail).toHaveBeenCalledTimes(1);
            const sentRequest = onSendEmail.mock.calls[0][0] as EmailRequest;
            // The pre-filled recipient must be included in the final to_addresses
            expect(sentRequest.to_addresses).toContain("brand@company.com");
        });
    });

    it("merges pre-filled and user-added recipients when sending", async () => {
        const onSendEmail = jest.fn().mockResolvedValue(undefined);

        render(
            <EmailPreviewModal
                {...defaultProps}
                onSendEmail={onSendEmail}
            />
        );

        // Type an additional email address in the To field and press Enter
        const toInput = screen.getByPlaceholderText("recipient@example.com");
        await userEvent.type(toInput, "extra@example.com{enter}");

        const sendButton = screen.getByRole("button", { name: /send email/i });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(onSendEmail).toHaveBeenCalledTimes(1);
            const sentRequest = onSendEmail.mock.calls[0][0] as EmailRequest;
            // Both the pre-filled and user-added emails should be present
            expect(sentRequest.to_addresses).toContain("brand@company.com");
            expect(sentRequest.to_addresses).toContain("extra@example.com");
        });
    });

    it("pre-fills subject and body from emailRequest", () => {
        render(<EmailPreviewModal {...defaultProps} />);

        const subjectInput = screen.getByDisplayValue("Re: Partnership Offer");
        expect(subjectInput).toBeInTheDocument();

        const bodyTextarea = screen.getByDisplayValue(
            "Thank you for the offer. I'd love to discuss further."
        );
        expect(bodyTextarea).toBeInTheDocument();
    });

    it("disables Send Email button when subject is empty", () => {
        render(<EmailPreviewModal {...defaultProps} />);

        // Clear the subject
        const subjectInput = screen.getByDisplayValue("Re: Partnership Offer");
        fireEvent.change(subjectInput, { target: { value: "" } });

        const sendButton = screen.getByRole("button", { name: /send email/i });
        expect(sendButton).toBeDisabled();
    });

    it("disables Send Email button when body is empty", () => {
        render(<EmailPreviewModal {...defaultProps} />);

        // Clear the body
        const bodyTextarea = screen.getByDisplayValue(
            "Thank you for the offer. I'd love to discuss further."
        );
        fireEvent.change(bodyTextarea, { target: { value: "" } });

        const sendButton = screen.getByRole("button", { name: /send email/i });
        expect(sendButton).toBeDisabled();
    });

    it("shows Cancel button that closes the modal", () => {
        const onOpenChange = jest.fn();
        render(
            <EmailPreviewModal {...defaultProps} onOpenChange={onOpenChange} />
        );

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
