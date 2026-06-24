import { renderHook, act } from "@testing-library/react";
import { useErrorHandler } from "../use-error-handler";
import { toast } from "sonner";

jest.mock("sonner", () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

describe("useErrorHandler", () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    describe("handleError", () => {
        it("returns user-friendly error for string", () => {
            const { result } = renderHook(() => useErrorHandler());

            let errorResult;
            act(() => {
                errorResult = result.current.handleError("Network request failed");
            });

            expect(errorResult?.title).toBe("Connection Problem");
            expect(toast.error).toHaveBeenCalledWith("Connection Problem", expect.any(Object));
        });

        it("returns user-friendly error for Error instance", () => {
            const { result } = renderHook(() => useErrorHandler());

            let errorResult;
            act(() => {
                errorResult = result.current.handleError(
                    new Error("401 Unauthorized")
                );
            });

            expect(errorResult?.title).toBe("Session Expired");
            expect(toast.error).toHaveBeenCalled();
        });

        it("uses context when provided", () => {
            const { result } = renderHook(() => useErrorHandler());

            let errorResult;
            act(() => {
                errorResult = result.current.handleError("x", "validation");
            });

            expect(errorResult?.title).toBe("Invalid Information");
        });

        it("suppresses toast when showToast is false", () => {
            const { result } = renderHook(() => useErrorHandler());

            act(() => {
                result.current.handleError("error", undefined, {
                    showToast: false,
                });
            });

            expect(toast.error).not.toHaveBeenCalled();
        });

        it("calls onAction when provided", () => {
            const { result } = renderHook(() => useErrorHandler());
            const onAction = jest.fn();

            act(() => {
                result.current.handleError("error", undefined, {
                    showToast: false,
                    onAction,
                });
            });

            expect(onAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: expect.any(String),
                    message: expect.any(String),
                })
            );
        });
    });

    describe("handleAsync", () => {
        it("returns result on success", async () => {
            const { result } = renderHook(() => useErrorHandler());

            let asyncResult;
            await act(async () => {
                asyncResult = await result.current.handleAsync(
                    async () => "success"
                );
            });

            expect(asyncResult).toBe("success");
        });

        it("returns null and shows toast on error", async () => {
            const { result } = renderHook(() => useErrorHandler());

            let asyncResult;
            await act(async () => {
                asyncResult = await result.current.handleAsync(
                    async () => {
                        throw new Error("Network error");
                    },
                    "network"
                );
            });

            expect(asyncResult).toBeNull();
            expect(toast.error).toHaveBeenCalled();
        });

        it("calls onError callback when provided", async () => {
            const { result } = renderHook(() => useErrorHandler());
            const onError = jest.fn();

            await act(async () => {
                await result.current.handleAsync(
                    async () => {
                        throw new Error("error");
                    },
                    undefined,
                    { showToast: false, onError }
                );
            });

            expect(onError).toHaveBeenCalled();
        });
    });
});
