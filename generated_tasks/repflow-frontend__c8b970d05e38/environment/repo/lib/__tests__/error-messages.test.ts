import {
    getUserFriendlyError,
    formatValidationError,
    type ErrorContext,
} from "../error-messages";

describe("getUserFriendlyError", () => {
    describe("string errors", () => {
        it("converts network errors to user-friendly messages", () => {
            const result = getUserFriendlyError("NetworkError: Failed to fetch");
            expect(result.title).toBe("Connection Problem");
            expect(result.message).toContain("connect");
            expect(result.action).toBe("retry");
        });

        it("converts authentication errors to user-friendly messages", () => {
            const result = getUserFriendlyError("401 Unauthorized");
            expect(result.title).toBe("Session Expired");
            expect(result.message).toContain("sign in");
            expect(result.action).toBe("signin");
        });

        it("converts authorization errors to user-friendly messages", () => {
            const result = getUserFriendlyError("403 Forbidden");
            expect(result.title).toBe("Access Denied");
        });

        it("converts not found errors to user-friendly messages", () => {
            const result = getUserFriendlyError("404 Not Found");
            expect(result.title).toBe("Not Found");
            expect(result.action).toBe("back");
        });

        it("converts validation errors to user-friendly messages", () => {
            const result = getUserFriendlyError("Validation failed");
            expect(result.title).toBe("Invalid Information");
            expect(result.message).toContain("required fields");
        });

        it("converts timeout errors to user-friendly messages", () => {
            const result = getUserFriendlyError("Request timeout");
            expect(result.title).toBe("Request Timed Out");
            expect(result.action).toBe("retry");
        });

        it("converts server errors to user-friendly messages", () => {
            const result = getUserFriendlyError("500 Server Error");
            expect(result.title).toBe("Server Error");
            expect(result.action).toBe("retry");
        });

        it("returns generic error for unknown string messages", () => {
            const result = getUserFriendlyError("Some unknown error");
            expect(result.title).toBe("Something went wrong");
            expect(result.message).toContain("Some unknown error");
        });
    });

    describe("Error object", () => {
        it("extracts message from Error instance", () => {
            const result = getUserFriendlyError(new Error("Network request failed"));
            expect(result.title).toBe("Connection Problem");
        });
    });

    describe("HTTP status codes", () => {
        it("handles 400 Bad Request", () => {
            const result = getUserFriendlyError({ status: 400 });
            expect(result.title).toBe("Invalid Request");
        });

        it("handles 401 Unauthorized", () => {
            const result = getUserFriendlyError({ status: 401 });
            expect(result.title).toBe("Session Expired");
            expect(result.action).toBe("signin");
        });

        it("handles 404 Not Found", () => {
            const result = getUserFriendlyError({ status: 404 });
            expect(result.title).toBe("Not Found");
            expect(result.action).toBe("back");
        });

        it("handles 429 Too Many Requests", () => {
            const result = getUserFriendlyError({ status: 429 });
            expect(result.title).toBe("Too Many Requests");
        });

        it("handles 500 Server Error", () => {
            const result = getUserFriendlyError({ status: 500 });
            expect(result.title).toBe("Server Error");
        });

        it("handles 502, 503, 504 as server errors", () => {
            [502, 503, 504].forEach((status) => {
                const result = getUserFriendlyError({ status });
                expect(result.title).toBe("Server Error");
            });
        });
    });

    describe("context-based fallback", () => {
        const contexts: ErrorContext[] = [
            "network",
            "validation",
            "authentication",
            "authorization",
            "notFound",
            "server",
            "timeout",
            "unknown",
        ];

        contexts.forEach((context) => {
            it(`returns context-specific error for ${context} when message doesn't match`, () => {
                const result = getUserFriendlyError("arbitrary error", context);
                expect(result.title).toBeDefined();
                expect(result.message).toBeDefined();
            });
        });

        it("returns network context error", () => {
            const result = getUserFriendlyError("x", "network");
            expect(result.title).toBe("Connection Problem");
            expect(result.action).toBe("retry");
        });

        it("returns validation context error", () => {
            const result = getUserFriendlyError("x", "validation");
            expect(result.title).toBe("Invalid Information");
        });

        it("returns authentication context error", () => {
            const result = getUserFriendlyError("x", "authentication");
            expect(result.title).toBe("Authentication Required");
        });
    });

    describe("unknown error types", () => {
        it("returns generic error for null", () => {
            const result = getUserFriendlyError(null);
            expect(result.title).toBe("Something went wrong");
            expect(result.action).toBe("retry");
        });

        it("returns generic error for undefined", () => {
            const result = getUserFriendlyError(undefined);
            expect(result.title).toBe("Something went wrong");
        });
    });
});

describe("formatValidationError", () => {
    it("formats required errors with field name", () => {
        expect(formatValidationError("email", "required")).toBe(
            "Email is required"
        );
    });

    it("formats invalid errors with field name", () => {
        expect(formatValidationError("email", "invalid")).toBe(
            "Please enter a valid email"
        );
    });

    it("formats too short errors", () => {
        expect(formatValidationError("password", "too short")).toBe(
            "Password is too short"
        );
    });

    it("formats too long errors", () => {
        expect(formatValidationError("name", "too long")).toBe(
            "Name is too long"
        );
    });

    it("converts camelCase field names to readable format", () => {
        expect(formatValidationError("firstName", "required")).toBe(
            "First Name is required"
        );
    });

    it("returns custom error when no pattern matches", () => {
        expect(formatValidationError("email", "Custom error")).toBe(
            "Custom error"
        );
    });

    it("returns formatted fallback for empty error", () => {
        expect(formatValidationError("email", "")).toBe("Invalid email");
    });
});
