import { MessageStatus, MessageType, Message } from "@/lib/models";

/**
 * Standalone copy of isMessageFromCreator for unit testing.
 * Must stay in sync with the implementation in app/creator/messages/page.tsx.
 */
const isMessageFromCreator = (message: Message): boolean => {
    const statusStr = message.status != null ? String(message.status).toLowerCase() : "";

    if (statusStr === MessageStatus.SENT) return true;
    if (statusStr === MessageStatus.RECEIVED) return false;

    if (message.senderEmail) {
        const email = message.senderEmail.trim().toLowerCase();
        if (email.endsWith("@repflow.me")) return true;
        return false;
    }

    if (message.senderId && message.userId) {
        return message.senderId === message.userId;
    }

    return false;
};

/** Helper to build a minimal Message with sensible defaults */
const makeMessage = (overrides: Partial<Message>): Message => ({
    id: "msg-1",
    messageType: MessageType.EMAIL,
    content: "Hello",
    status: MessageStatus.SENT,
    conversationId: "conv-1",
    dealId: "deal-1",
    userId: "user-1",
    senderName: "Test",
    threadPosition: 0,
    isInternal: false,
    isAutomated: false,
    priority: 0,
    tags: [],
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe("isMessageFromCreator", () => {
    // ── Primary check: message.status ──────────────────────────────────

    it("returns true for status=SENT (creator sent the message)", () => {
        const msg = makeMessage({ status: MessageStatus.SENT });
        expect(isMessageFromCreator(msg)).toBe(true);
    });

    it("returns false for status=RECEIVED (brand sent the message)", () => {
        const msg = makeMessage({ status: MessageStatus.RECEIVED });
        expect(isMessageFromCreator(msg)).toBe(false);
    });

    // ── Bug scenario: external email containing 'creator' substring ────

    it("correctly treats email from creatorconsult.com as RECEIVED (not from creator)", () => {
        const msg = makeMessage({
            status: MessageStatus.RECEIVED,
            senderEmail: "henry@creatorconsult.com",
        });
        expect(isMessageFromCreator(msg)).toBe(false);
    });

    it("correctly treats email from repflow.me as SENT (from creator)", () => {
        const msg = makeMessage({
            status: MessageStatus.SENT,
            senderEmail: "henry@repflow.me",
        });
        expect(isMessageFromCreator(msg)).toBe(true);
    });

    // ── Fallback: senderId === userId (e.g. optimistic messages) ───────

    it("falls back to senderId === userId when status is ambiguous", () => {
        const msg = makeMessage({
            status: MessageStatus.PENDING,
            senderId: "user-1",
            userId: "user-1",
        });
        expect(isMessageFromCreator(msg)).toBe(true);
    });

    it("returns false via fallback when senderId differs from userId", () => {
        const msg = makeMessage({
            status: MessageStatus.PENDING,
            senderId: "brand-contact-1",
            userId: "user-1",
        });
        expect(isMessageFromCreator(msg)).toBe(false);
    });

    // ── Last resort: senderEmail domain check ──────────────────────────

    it("falls back to senderEmail @repflow.me when no status or senderId", () => {
        const msg = makeMessage({
            status: MessageStatus.DRAFT,
            senderId: undefined,
            senderEmail: "test@repflow.me",
        });
        expect(isMessageFromCreator(msg)).toBe(true);
    });

    it("does not match senderEmail containing 'creator' in a different domain", () => {
        const msg = makeMessage({
            status: MessageStatus.DRAFT,
            senderId: undefined,
            senderEmail: "info@creatorconsult.com",
        });
        expect(isMessageFromCreator(msg)).toBe(false);
    });

    it("does not match senderEmail with a random domain", () => {
        const msg = makeMessage({
            status: MessageStatus.DRAFT,
            senderId: undefined,
            senderEmail: "brand@company.com",
        });
        expect(isMessageFromCreator(msg)).toBe(false);
    });

    // ── AI assistant messages ──────────────────────────────────────────

    it("treats AI assistant messages with status=SENT as from creator", () => {
        const msg = makeMessage({
            messageType: MessageType.AI_ASSISTANT,
            status: MessageStatus.SENT,
        });
        expect(isMessageFromCreator(msg)).toBe(true);
    });

    it("treats AI assistant messages with status=RECEIVED as not from creator", () => {
        const msg = makeMessage({
            messageType: MessageType.AI_ASSISTANT,
            status: MessageStatus.RECEIVED,
        });
        expect(isMessageFromCreator(msg)).toBe(false);
    });
});
