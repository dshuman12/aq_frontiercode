/**
 * Standardized error messages for user-friendly error handling
 * Provides clear, actionable guidance instead of technical jargon
 */

export type ErrorContext =
    | "network"
    | "validation"
    | "authentication"
    | "authorization"
    | "notFound"
    | "server"
    | "timeout"
    | "unknown";

export interface UserFriendlyError {
    title: string;
    message: string;
    action?: string;
    actionLabel?: string;
}

/**
 * Converts technical errors to user-friendly messages
 */
export function getUserFriendlyError(
    error: unknown,
    context?: ErrorContext
): UserFriendlyError {
    // Handle string errors
    if (typeof error === "string") {
        return getErrorByMessage(error, context);
    }

    // Handle Error objects
    if (error instanceof Error) {
        return getErrorByMessage(error.message, context);
    }

    // Handle fetch/network errors
    if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status: number }).status;
        return getErrorByStatus(status, context);
    }

    // Default fallback
    return {
        title: "Something went wrong",
        message:
            "We encountered an unexpected issue. Please try again in a moment.",
        action: "retry",
        actionLabel: "Try Again",
    };
}

/**
 * Get error message based on error message string
 */
/** True for browser/network failures, false for app errors like "Failed to fetch deals". */
function isLikelyNetworkFailure(message: string): boolean {
    const m = message.toLowerCase();
    if (m.includes("network") || m.includes("connection")) return true;
    // API helpers use "Failed to fetch <thing>" — not the same as the browser's "Failed to fetch"
    if (/^failed to fetch\s+\S/.test(m)) return false;
    if (m.includes("failed to fetch")) return true;
    return false;
}

function getErrorByMessage(
    message: string,
    context?: ErrorContext
): UserFriendlyError {
    const lowerMessage = message.toLowerCase();

    // Cognito JWT / JWKS mismatch (backend and frontend must share one user pool)
    if (
        lowerMessage.includes("jwk") ||
        lowerMessage.includes("jwks") ||
        lowerMessage.includes("token key id")
    ) {
        return {
            title: "Authentication configuration error",
            message:
                "We could not verify your sign-in with our API. Try signing out and signing in again. If the problem continues, contact support — the server may be using a different Cognito user pool than this site.",
            action: "signin",
            actionLabel: "Sign in",
        };
    }

    // Network errors (avoid treating "Failed to fetch deals" as offline)
    if (isLikelyNetworkFailure(message)) {
        return {
            title: "Connection Problem",
            message:
                "We couldn't connect to our servers. Please check your internet connection and try again.",
            action: "retry",
            actionLabel: "Retry",
        };
    }

    // Authentication errors
    if (
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("401") ||
        lowerMessage.includes("authentication")
    ) {
        return {
            title: "Session Expired",
            message:
                "Your session has expired. Please sign in again to continue.",
            action: "signin",
            actionLabel: "Sign In",
        };
    }

    // Authorization errors
    if (
        lowerMessage.includes("forbidden") ||
        lowerMessage.includes("403") ||
        lowerMessage.includes("permission")
    ) {
        return {
            title: "Access Denied",
            message:
                "You don't have permission to perform this action. Please contact support if you believe this is an error.",
        };
    }

    // Not found errors
    if (
        lowerMessage.includes("not found") ||
        lowerMessage.includes("404")
    ) {
        return {
            title: "Not Found",
            message:
                "The item you're looking for doesn't exist or has been removed.",
            action: "back",
            actionLabel: "Go Back",
        };
    }

    // Validation errors
    if (
        lowerMessage.includes("validation") ||
        lowerMessage.includes("invalid") ||
        lowerMessage.includes("required")
    ) {
        return {
            title: "Invalid Information",
            message:
                "Please check your input and make sure all required fields are filled correctly.",
        };
    }

    // Timeout errors
    if (lowerMessage.includes("timeout")) {
        return {
            title: "Request Timed Out",
            message:
                "The request took too long to complete. Please try again.",
            action: "retry",
            actionLabel: "Try Again",
        };
    }

    // Server errors
    if (
        lowerMessage.includes("500") ||
        lowerMessage.includes("server error")
    ) {
        return {
            title: "Server Error",
            message:
                "Our servers are experiencing issues. Please try again in a few moments.",
            action: "retry",
            actionLabel: "Try Again",
        };
    }

    // Context-specific defaults
    if (context) {
        return getErrorByContext(context);
    }

    // Generic error
    return {
        title: "Something went wrong",
        message: message || "An unexpected error occurred. Please try again.",
        action: "retry",
        actionLabel: "Try Again",
    };
}

/**
 * Get error message based on HTTP status code
 */
function getErrorByStatus(
    status: number,
    context?: ErrorContext
): UserFriendlyError {
    switch (status) {
        case 400:
            return {
                title: "Invalid Request",
                message:
                    "The information you provided is invalid. Please check your input and try again.",
            };
        case 401:
            return {
                title: "Session Expired",
                message:
                    "Your session has expired. Please sign in again to continue.",
                action: "signin",
                actionLabel: "Sign In",
            };
        case 403:
            return {
                title: "Access Denied",
                message:
                    "You don't have permission to perform this action.",
            };
        case 404:
            return {
                title: "Not Found",
                message:
                    "The item you're looking for doesn't exist or has been removed.",
                action: "back",
                actionLabel: "Go Back",
            };
        case 408:
            return {
                title: "Request Timed Out",
                message:
                    "The request took too long. Please try again.",
                action: "retry",
                actionLabel: "Try Again",
            };
        case 429:
            return {
                title: "Too Many Requests",
                message:
                    "You've made too many requests. Please wait a moment and try again.",
                action: "retry",
                actionLabel: "Try Again",
            };
        case 500:
        case 502:
        case 503:
        case 504:
            return {
                title: "Server Error",
                message:
                    "Our servers are experiencing issues. Please try again in a few moments.",
                action: "retry",
                actionLabel: "Try Again",
            };
        default:
            return getErrorByContext(context);
    }
}

/**
 * Get error message based on context
 */
function getErrorByContext(context: ErrorContext): UserFriendlyError {
    switch (context) {
        case "network":
            return {
                title: "Connection Problem",
                message:
                    "We couldn't connect to our servers. Please check your internet connection.",
                action: "retry",
                actionLabel: "Retry",
            };
        case "validation":
            return {
                title: "Invalid Information",
                message:
                    "Please check your input and make sure all required fields are filled correctly.",
            };
        case "authentication":
            return {
                title: "Authentication Required",
                message:
                    "Please sign in to continue.",
                action: "signin",
                actionLabel: "Sign In",
            };
        case "authorization":
            return {
                title: "Access Denied",
                message:
                    "You don't have permission to perform this action.",
            };
        case "notFound":
            return {
                title: "Not Found",
                message:
                    "The item you're looking for doesn't exist.",
                action: "back",
                actionLabel: "Go Back",
            };
        case "server":
            return {
                title: "Server Error",
                message:
                    "Our servers are experiencing issues. Please try again later.",
                action: "retry",
                actionLabel: "Try Again",
            };
        case "timeout":
            return {
                title: "Request Timed Out",
                message:
                    "The request took too long. Please try again.",
                action: "retry",
                actionLabel: "Try Again",
            };
        default:
            return {
                title: "Something went wrong",
                message:
                    "An unexpected error occurred. Please try again.",
                action: "retry",
                actionLabel: "Try Again",
            };
    }
}

/**
 * Format validation errors for form fields
 */
export function formatValidationError(field: string, error: string): string {
    const fieldName = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

    if (error.toLowerCase().includes("required")) {
        return `${fieldName} is required`;
    }

    if (error.toLowerCase().includes("invalid")) {
        return `Please enter a valid ${fieldName.toLowerCase()}`;
    }

    if (error.toLowerCase().includes("too short")) {
        return `${fieldName} is too short`;
    }

    if (error.toLowerCase().includes("too long")) {
        return `${fieldName} is too long`;
    }

    return error || `Invalid ${fieldName.toLowerCase()}`;
}
