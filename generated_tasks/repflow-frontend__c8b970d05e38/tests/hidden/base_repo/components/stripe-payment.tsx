"use client";

import {
    SUBSCRIPTION_TIERS
} from "@/app/constants/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

interface StripePaymentProps {
    selectedTier: string;
    userEmail: string;
    onPaymentSuccess: () => void;
    onPaymentError: (error: string) => void;
    isLoading?: boolean;
    isYearly: boolean;
}

function PaymentLinkForm({
    selectedTier,
    userEmail,
    onPaymentSuccess,
    onPaymentError,
    isLoading = false,
    isYearly,
}: StripePaymentProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Billing details state (minimal for payment links)
    const [billingDetails, setBillingDetails] = useState({
        name: "",
        address: {
            line1: "",
            line2: "",
            city: "",
            state: "",
            postalCode: "",
            country: "US",
        },
    });

    const tier =
        SUBSCRIPTION_TIERS[
            selectedTier.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS
        ];

    // Check if tier is disabled
    if (tier?.disabled) {
        return (
            <div className="text-center space-y-4">
                <div>
                    <h3 className="text-xl font-semibold text-figma-forest-dark">
                        Plan Not Available
                    </h3>
                    <p className="text-gray-600">
                        This subscription tier is coming soon. Please select a
                        different plan.
                    </p>
                </div>
            </div>
        );
    }

    // Calculate pricing based on billing period
    const originalPrice = isYearly ? tier.yearlyPrice : tier.price;

    // Handle billing details updates
    const handleBillingChange = (field: string, value: string) => {
        if (field.startsWith("address.")) {
            const addressField = field.split(".")[1];
            setBillingDetails((prev) => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressField]: value,
                },
            }));
        } else {
            setBillingDetails((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    // Handle payment link redirect
    const handlePaymentLinkRedirect = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!tier) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Get stored user data from localStorage
            const storedUserData = localStorage.getItem("pendingUserData");
            if (!storedUserData) {
                throw new Error(
                    "User registration data not found. Please complete the signup form first."
                );
            }

            const userData = JSON.parse(storedUserData);

            // Prepare payment link with user data
            const requestBody: any = {
                tier: selectedTier,
                email: userEmail,
                billingDetails: billingDetails,
                userData: userData, // Include all user registration data
                isYearly: isYearly, // Include billing period
            };

            const response = await fetch("/api/stripe/prepare-payment-link", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const {
                paymentLinkUrl,
                sessionId,
                pendingUserData,
                localStorageKey,
                error: serverError,
            } = await response.json();

            if (serverError) {
                throw new Error(serverError);
            }

            // Store user data in localStorage for retrieval after payment
            localStorage.setItem(
                localStorageKey,
                JSON.stringify(pendingUserData)
            );

            // Also store in the standard key for compatibility
            const currentUserData = localStorage.getItem("pendingUserData");
            if (currentUserData) {
                const userDataToUpdate = JSON.parse(currentUserData);
                // Merge with payment session data
                userDataToUpdate.paymentSessionId = sessionId;
                userDataToUpdate.selectedTier = selectedTier;
                userDataToUpdate.billingDetails = billingDetails;
                localStorage.setItem(
                    "pendingUserData",
                    JSON.stringify(userDataToUpdate)
                );
            }

            console.log("Redirecting to payment link:", {
                tier: selectedTier,
                sessionId,
            });

            // Redirect to Stripe payment link
            window.location.href = paymentLinkUrl;
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to prepare payment";
            setError(errorMessage);
            onPaymentError(errorMessage);
            setIsProcessing(false);
        }
    };

    if (!tier) {
        return (
            <div className="text-center space-y-4">
                <div>
                    <h3 className="text-xl font-semibold text-figma-forest-dark">
                        Invalid Plan
                    </h3>
                    <p className="text-gray-600">
                        Please select a valid subscription plan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Payment Information
                </CardTitle>
                <CardDescription>
                    Complete your {tier.name} subscription for ${originalPrice}
                    {isYearly ? '/year' : '/month'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handlePaymentLinkRedirect}
                    className="space-y-4"
                >
                    {error && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Payment Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Secure Payment
                        </h3>
                        <div className="p-4 border rounded-lg bg-blue-50">
                            <p className="text-sm text-gray-700">
                                You&apos;ll be redirected to Stripe&apos;s secure payment
                                page to complete your subscription. All payment
                                information will be handled securely by Stripe.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isProcessing || isLoading}
                        className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                    >
                        {isProcessing || isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isLoading
                                    ? "Creating Account..."
                                    : "Preparing Payment..."}
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                {`Continue to Payment - $${originalPrice}${isYearly ? '/year' : '/month'}`}
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function StripePayment({
    selectedTier,
    userEmail,
    onPaymentSuccess,
    onPaymentError,
    isLoading,
    isYearly,
}: StripePaymentProps) {
    return (
        <PaymentLinkForm
            selectedTier={selectedTier}
            userEmail={userEmail}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            isLoading={isLoading}
            isYearly={isYearly}
        />
    );
}
