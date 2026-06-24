import { useCallback } from "react";
import { toast } from "sonner";
import { getUserFriendlyError, UserFriendlyError } from "@/lib/error-messages";
import { ErrorContext } from "@/lib/error-messages";

/**
 * Hook for standardized error handling across the application
 * Provides consistent error messages and user feedback
 */
export function useErrorHandler() {
    const handleError = useCallback(
        (
            error: unknown,
            context?: ErrorContext,
            options?: {
                showToast?: boolean;
                onAction?: (error: UserFriendlyError) => void;
            }
        ) => {
            const userFriendlyError = getUserFriendlyError(error, context);

            // Log technical error for debugging
            console.error("Error:", error);

            // Show toast notification if enabled
            if (options?.showToast !== false) {
                toast.error(userFriendlyError.title, {
                    description: userFriendlyError.message,
                });
            }

            // Call custom action handler if provided
            if (options?.onAction) {
                options.onAction(userFriendlyError);
            }

            return userFriendlyError;
        },
        []
    );

    const handleAsync = useCallback(
        async <T,>(
            asyncFn: () => Promise<T>,
            context?: ErrorContext,
            options?: {
                showToast?: boolean;
                onError?: (error: UserFriendlyError) => void;
            }
        ): Promise<T | null> => {
            try {
                return await asyncFn();
            } catch (error) {
                const userFriendlyError = handleError(error, context, {
                    showToast: options?.showToast,
                    onAction: options?.onError,
                });
                return null;
            }
        },
        [handleError]
    );

    return {
        handleError,
        handleAsync,
    };
}
