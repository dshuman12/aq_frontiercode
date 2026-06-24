import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type LoadingSpinnerProps = {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    text?: string;
};

const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
};

export function LoadingSpinner({
    size = "md",
    className,
    text,
}: LoadingSpinnerProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
            <Loader2
                className={cn(
                    "animate-spin text-figma-green-primary",
                    sizeClasses[size]
                )}
            />
            {text && (
                <p className="text-sm text-gray-600 animate-pulse">{text}</p>
            )}
        </div>
    );
}

// Full page loading component
export function PageLoading({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">{message}</p>
            </div>
        </div>
    );
}

// Inline loading component
export function InlineLoading({ text }: { text?: string }) {
    return (
        <div className="flex items-center gap-2 py-2">
            <LoadingSpinner size="sm" />
            {text && <span className="text-sm text-gray-600">{text}</span>}
        </div>
    );
}
