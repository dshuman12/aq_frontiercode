import { AlertCircle, RefreshCw, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserFriendlyError } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

type ErrorDisplayProps = {
    error: UserFriendlyError;
    onAction?: () => void;
    className?: string;
    variant?: "default" | "inline" | "page";
};

/**
 * Standardized error display component
 * Provides consistent error messaging across the application
 */
export function ErrorDisplay({
    error,
    onAction,
    className,
    variant = "default",
}: ErrorDisplayProps) {
    const getActionIcon = () => {
        switch (error.action) {
            case "retry":
                return <RefreshCw className="h-4 w-4" />;
            case "back":
                return <ArrowLeft className="h-4 w-4" />;
            case "signin":
                return <LogIn className="h-4 w-4" />;
            default:
                return null;
        }
    };

    if (variant === "inline") {
        return (
            <div className={cn("flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200", className)}>
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                        {error.title}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                        {error.message}
                    </p>
                    {error.action && error.actionLabel && onAction && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onAction}
                            className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                        >
                            {getActionIcon()}
                            {error.actionLabel}
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (variant === "page") {
        return (
            <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
                <div className="text-center max-w-md">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {error.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {error.message}
                    </p>
                    {error.action && error.actionLabel && onAction && (
                        <Button
                            onClick={onAction}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            {getActionIcon()}
                            {error.actionLabel}
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Default variant (Alert)
    return (
        <Alert variant="destructive" className={className}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription className="mt-2">
                {error.message}
                {error.action && error.actionLabel && onAction && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAction}
                        className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                        {getActionIcon()}
                        {error.actionLabel}
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
}

/**
 * Field-level error display for form validation
 */
export function FieldError({ error, className }: { error?: string; className?: string }) {
    if (!error) return null;

    return (
        <p className={cn("text-xs text-red-600 mt-1 flex items-center gap-1", className)}>
            <AlertCircle className="h-3 w-3" />
            {error}
        </p>
    );
}
