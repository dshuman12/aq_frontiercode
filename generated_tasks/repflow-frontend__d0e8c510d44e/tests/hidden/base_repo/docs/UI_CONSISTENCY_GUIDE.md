# UI/UX Consistency Guide

This guide outlines the standardized components, patterns, and best practices for maintaining consistency across the Repflow application.

## Table of Contents
1. [Form Inputs](#form-inputs)
2. [Button States](#button-states)
3. [Loading Indicators](#loading-indicators)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)

## Form Inputs

### Standardized Input Styling

All form inputs use consistent styling through the `Input` and `Textarea` components:

```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Standard input
<Input
    placeholder="Enter text..."
    className="mt-1" // Use mt-1 for consistent spacing below labels
/>

// Textarea
<Textarea
    placeholder="Enter description..."
    className="mt-1"
/>
```

### Key Features
- **Consistent height**: All inputs are `h-10` (40px)
- **Consistent text size**: `text-sm` for better readability
- **Focus states**: Ring-2 with ring-offset for clear focus indication
- **Disabled states**: Opacity-50 with muted background
- **Hover states**: Subtle border color change
- **Transitions**: Smooth 200ms transitions for state changes

### Form Field Pattern

```tsx
<div className="space-y-2">
    <Label htmlFor="field-name" className="text-sm font-medium text-gray-700">
        Field Label *
    </Label>
    <Input
        id="field-name"
        placeholder="Enter value..."
        className="mt-1"
        required
    />
    <FieldError error={fieldError} />
</div>
```

## Button States

### Button Variants

All buttons use the standardized `Button` component with consistent states:

```tsx
import { Button } from "@/components/ui/button";

// Default button
<Button>Click me</Button>

// Disabled state
<Button disabled>Disabled</Button>

// Loading state
<Button disabled>
    <LoadingSpinner size="sm" />
    Loading...
</Button>
```

### Button States Explained

1. **Default**: Gradient background with shadow
2. **Hover**: Darker gradient, larger shadow, scale-105
3. **Active**: Scale-95 for tactile feedback
4. **Disabled**: 
   - Opacity-60 (more visible than before)
   - Cursor-not-allowed
   - No hover/active effects
   - Prevents pointer events

### Button Variants

- `default`: Primary action (sage gradient)
- `destructive`: Delete/dangerous actions (red gradient)
- `outline`: Secondary actions (border with hover)
- `secondary`: Neutral actions (gray gradient)
- `ghost`: Subtle actions (no background)
- `link`: Text-only actions

## Loading Indicators

### Loading Components

Use standardized loading components for consistent user feedback:

```tsx
import { LoadingSpinner, PageLoading, InlineLoading } from "@/components/ui/loading-spinner";

// Full page loading
<PageLoading message="Loading dashboard..." />

// Inline loading (small)
<InlineLoading text="Saving..." />

// Custom spinner
<LoadingSpinner size="lg" text="Processing..." />
```

### When to Use Each

1. **PageLoading**: Initial page load, major data fetches
2. **InlineLoading**: Form submissions, inline operations
3. **LoadingSpinner**: Custom placements, buttons

### Example: Async Operation

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
    setIsLoading(true);
    try {
        await saveData();
        toast.success("Saved successfully");
    } catch (error) {
        handleError(error, "network");
    } finally {
        setIsLoading(false);
    }
};

return (
    <Button disabled={isLoading}>
        {isLoading ? (
            <>
                <LoadingSpinner size="sm" />
                Saving...
            </>
        ) : (
            "Save"
        )}
    </Button>
);
```

## Error Handling

### Standardized Error Messages

Use the error handling utilities for consistent, user-friendly error messages:

```tsx
import { useErrorHandler } from "@/hooks/use-error-handler";
import { ErrorDisplay, FieldError } from "@/components/ui/error-display";
import { getUserFriendlyError } from "@/lib/error-messages";

// In component
const { handleError, handleAsync } = useErrorHandler();

// Handle errors
try {
    await apiCall();
} catch (error) {
    handleError(error, "network", { showToast: true });
}

// Or use handleAsync wrapper
const result = await handleAsync(
    () => apiCall(),
    "network",
    { showToast: true }
);
```

### Error Display Components

```tsx
// Page-level error
<ErrorDisplay
    error={getUserFriendlyError(error, "network")}
    variant="page"
    onAction={() => window.location.reload()}
/>

// Inline error (in forms, cards)
<ErrorDisplay
    error={getUserFriendlyError(error, "validation")}
    variant="inline"
/>

// Field-level error
<FieldError error={fieldError} />
```

### Error Contexts

- `network`: Connection issues
- `validation`: Form validation errors
- `authentication`: Auth failures
- `authorization`: Permission issues
- `notFound`: 404 errors
- `server`: Server errors
- `timeout`: Request timeouts
- `unknown`: Fallback

### User-Friendly Error Messages

All errors are automatically converted to user-friendly messages:

- ❌ "NetworkError: Failed to fetch"
- ✅ "Connection Problem - We couldn't connect to our servers. Please check your internet connection."

- ❌ "401 Unauthorized"
- ✅ "Session Expired - Your session has expired. Please sign in again to continue."

## Best Practices

### 1. Consistent Spacing

```tsx
// ✅ Good: Consistent spacing
<div className="space-y-2">
    <Label>Field</Label>
    <Input className="mt-1" />
    <FieldError error={error} />
</div>

// ❌ Bad: Inconsistent spacing
<div>
    <Label>Field</Label>
    <Input className="mt-3 mb-2" />
    <p className="mt-1">{error}</p>
</div>
```

### 2. Loading States

```tsx
// ✅ Good: Clear loading state
{isLoading ? (
    <PageLoading message="Loading data..." />
) : (
    <Content />
)}

// ❌ Bad: No loading indicator
<Content /> // User doesn't know if it's loading
```

### 3. Error Handling

```tsx
// ✅ Good: User-friendly error
try {
    await saveData();
} catch (error) {
    handleError(error, "network", { showToast: true });
}

// ❌ Bad: Technical error message
catch (error) {
    toast.error(error.message); // "NetworkError: Failed to fetch"
}
```

### 4. Button States

```tsx
// ✅ Good: Proper disabled state
<Button disabled={isLoading || !isValid}>
    {isLoading ? "Saving..." : "Save"}
</Button>

// ❌ Bad: No disabled state
<Button onClick={handleSave}>Save</Button> // Can click multiple times
```

### 5. Form Validation

```tsx
// ✅ Good: Clear validation feedback
<div className="space-y-2">
    <Label htmlFor="email">Email *</Label>
    <Input
        id="email"
        className={fieldErrors.email ? 'border-red-500' : ''}
    />
    <FieldError error={fieldErrors.email} />
</div>

// ❌ Bad: No visual feedback
<Input id="email" />
```

## Migration Checklist

When updating existing components:

- [ ] Replace custom loading spinners with `LoadingSpinner` or `PageLoading`
- [ ] Replace error messages with `ErrorDisplay` or `FieldError`
- [ ] Use `useErrorHandler` hook for error handling
- [ ] Ensure all inputs use standardized `Input`/`Textarea` components
- [ ] Verify button disabled states are visible and functional
- [ ] Add loading states to all async operations
- [ ] Replace technical error messages with user-friendly ones

## Examples

### Complete Form Example

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useErrorHandler } from "@/hooks/use-error-handler";

export function MyForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { handleError } = useErrorHandler();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await submitForm({ email });
        } catch (err) {
            const userError = handleError(err, "validation", {
                showToast: true,
            });
            setError(userError.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    disabled={isLoading}
                />
                <FieldError error={error} />
            </div>

            <Button type="submit" disabled={isLoading || !email}>
                {isLoading ? (
                    <>
                        <LoadingSpinner size="sm" />
                        Submitting...
                    </>
                ) : (
                    "Submit"
                )}
            </Button>
        </form>
    );
}
```

## Summary

Following these guidelines ensures:
- ✅ Consistent user experience across all pages
- ✅ Clear feedback for all user actions
- ✅ Professional, polished interface
- ✅ Accessible and user-friendly error messages
- ✅ Predictable button interactions
- ✅ Clear loading states for async operations
