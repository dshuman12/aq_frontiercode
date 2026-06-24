"use client";

import { StripePayment } from "@/components/stripe-payment";
import { SubscriptionTierSelector } from "@/components/subscription-tier-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CheckCircle, Eye, EyeOff, Loader2, UserPlus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PasswordRequirements = {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
};

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        repflow_username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [step, setStep] = useState<"signup" | "tier" | "confirm" | "payment">("signup");
    const [confirmationCode, setConfirmationCode] = useState("");
    const [selectedTier, setSelectedTier] = useState("");
    const [isYearly, setIsYearly] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false,
    });
    const router = useRouter();
    const stripeReturnHandled = useRef(false);

    // Validate password requirements
    const validatePasswordRequirements = (password: string): PasswordRequirements => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        console.log("name", name);
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(""); // Clear error when user types
        
        // Clear field-specific error when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Update password requirements in real-time
        if (name === "password") {
            setPasswordRequirements(validatePasswordRequirements(value));
        }
    };

    const validateForm = () => {
        const newFieldErrors: Record<string, string> = {};

        if (!formData.email) {
            newFieldErrors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                newFieldErrors.email = "Please enter a valid email address";
            }
        }

        if (!formData.repflow_username) {
            newFieldErrors.repflow_username = "Username is required";
        } else if (formData.repflow_username.length < 3) {
            newFieldErrors.repflow_username = "Username must be at least 3 characters long";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.repflow_username)) {
            newFieldErrors.repflow_username = "Username can only contain letters, numbers, and underscores";
        }

        if (!formData.password) {
            newFieldErrors.password = "Password is required";
        } else {
            const requirements = validatePasswordRequirements(formData.password);
            if (!requirements.minLength) {
                newFieldErrors.password = "Password must be at least 8 characters long";
            } else if (!requirements.hasUppercase) {
                newFieldErrors.password = "Password must contain at least one uppercase letter";
            } else if (!requirements.hasNumber) {
                newFieldErrors.password = "Password must contain at least one number";
            } else if (!requirements.hasSpecialChar) {
                newFieldErrors.password = "Password must contain at least one special character";
            }
        }

        if (!formData.confirmPassword) {
            newFieldErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            newFieldErrors.confirmPassword = "Passwords do not match";
        }

        setFieldErrors(newFieldErrors);

        if (Object.keys(newFieldErrors).length > 0) {
            setError("Please fix the errors below");
            return false;
        }

        return true;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsLoading(true);
        setError("");

        try {
            // Check if email and username are available in Cognito
            const availabilityResponse = await fetch("/api/auth/check-availability", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    repflow_username: formData.repflow_username,
                }),
            });

            const availabilityData = await availabilityResponse.json();

            if (!availabilityData.available) {
                // Set field-specific errors
                setFieldErrors(availabilityData.errors || {});
                setError("Please fix the errors below");
                setIsLoading(false);
                return;
            }

            // Validate form data and store locally (no Cognito user creation yet)
            const userData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                repflow_username: formData.repflow_username,
                email: formData.email,
                password: formData.password, // Store password temporarily for Cognito creation later
                timestamp: Date.now()
            };
            
            console.log("Storing user data locally:", userData);
            localStorage.setItem('pendingUserData', JSON.stringify(userData));
            
            setSuccess("Account information saved! Please select your subscription plan.");
            setStep("tier");
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirmationCode) {
            setError("Please enter the confirmation code");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    confirmationCode: confirmationCode.replace(/\s/g, ''),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Email confirmed successfully! Setting up your profile...");
                setTimeout(() => {
                    router.push("/auth/onboarding");
                }, 500);
            } else {
                setError(data.error || "Email confirmation failed");
            }
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resendConfirmationCode = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/resend-confirmation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Confirmation code sent! Please check your email.");
            } else {
                setError(data.error || "Failed to resend confirmation code");
            }
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTierSelect = (tierId: string) => {
        setSelectedTier(tierId);
        setError("");
    };

    const handleTierContinue = () => {
        if (!selectedTier) {
            setError("Please select a subscription plan");
            return;
        }

        // Update user data with selected tier and billing period
        const pendingUserData = localStorage.getItem('pendingUserData');
        if (pendingUserData) {
            const userData = JSON.parse(pendingUserData);
            userData.selectedTier = selectedTier;
            userData.isYearly = isYearly;
            localStorage.setItem('pendingUserData', JSON.stringify(userData));
        }

        // All tiers now require payment
        setStep("payment");
    };

    const handlePaymentSuccess = useCallback(async (tierOverride?: string) => {
        const tier = tierOverride ?? selectedTier;
        if (!tier) {
            setError("Please select a subscription plan.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // Get user data from localStorage
            const pendingUserData = localStorage.getItem('pendingUserData');
            if (!pendingUserData) {
                setError("User data not found. Please start over.");
                return;
            }

            const userData = JSON.parse(pendingUserData);

            // Create Cognito user after successful payment
            const response = await fetch("/api/auth/create-cognito-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    repflow_username: userData.repflow_username,
                    selectedTier: tier,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user data with Cognito userSub
                userData.userSub = data.userSub;
                userData.selectedTier = tier;
                localStorage.setItem('pendingUserData', JSON.stringify(userData));
                
                setSuccess("Payment successful! Please check your email for verification.");
                setStep("confirm");
            } else {
                setError(data.error || "Failed to create account. Please try again.");
            }
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedTier]);

    // After Stripe Payment Link checkout, Stripe redirects to /auth/signup?stripe_payment=success
    useEffect(() => {
        if (typeof window === "undefined" || stripeReturnHandled.current) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("stripe_payment") !== "success") return;

        const pendingRaw = localStorage.getItem("pendingUserData");
        if (!pendingRaw) return;

        stripeReturnHandled.current = true;

        let tier: string | undefined;
        try {
            const data = JSON.parse(pendingRaw) as {
                email?: string;
                firstName?: string;
                lastName?: string;
                repflow_username?: string;
                selectedTier?: string;
                isYearly?: boolean;
            };
            if (data.email) {
                setFormData((prev) => ({
                    ...prev,
                    email: data.email ?? prev.email,
                    firstName: data.firstName ?? prev.firstName,
                    lastName: data.lastName ?? prev.lastName,
                    repflow_username: data.repflow_username ?? prev.repflow_username,
                }));
            }
            tier = data.selectedTier;
            if (data.selectedTier) setSelectedTier(data.selectedTier);
            if (typeof data.isYearly === "boolean") setIsYearly(data.isYearly);
        } catch {
            stripeReturnHandled.current = false;
            return;
        }

        if (!tier) {
            setError("Missing subscription plan after payment. Please start signup again.");
            stripeReturnHandled.current = false;
            return;
        }

        // Drop query string so React Strict Mode’s second mount does not run this again
        window.history.replaceState({}, "", "/auth/signup");
        setStep("payment");

        void handlePaymentSuccess(tier);
    }, [handlePaymentSuccess]);

    const handlePaymentError = (error: string) => {
        setError(error);
    };

    if (step === "tier") {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="flex justify-center">
                    <div className="w-full max-w-6xl">
                        <div className="text-center mb-8">
                            <Image
                                src="/repflow-logo.png"
                                alt="Repflow"
                                width={120}
                                height={40}
                                className="dark:invert mx-auto mb-4"
                            />
                            <h1 className="text-3xl font-bold text-figma-forest-dark mb-2">
                                Choose Your Plan
                            </h1>
                            <p className="text-gray-600">
                                Select the subscription tier that best fits your needs
                            </p>
                        </div>

                        {error && (
                            <div className="max-w-2xl mx-auto mb-6">
                                <Alert className="border-red-200 bg-red-50">
                                    <AlertDescription className="text-red-800">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {success && (
                            <div className="max-w-2xl mx-auto mb-6">
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        {success}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        <SubscriptionTierSelector
                            selectedTier={selectedTier}
                            onTierSelect={handleTierSelect}
                            onContinue={handleTierContinue}
                            isLoading={isLoading}
                            isYearly={isYearly}
                            onToggleYearly={setIsYearly}
                        />

                        <div className="text-center mt-8">
                            <button
                                type="button"
                                onClick={() => setStep("signup")}
                                className="text-sage-primary hover:text-sage-primary/80 font-medium"
                            >
                                ← Back to sign up
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "payment") {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="text-center mb-8">
                            <Image
                                src="/repflow-logo.png"
                                alt="Repflow"
                                width={120}
                                height={40}
                                className="dark:invert mx-auto mb-4"
                            />
                            <h1 className="text-3xl font-bold text-figma-forest-dark mb-2">
                                Complete Your Subscription
                            </h1>
                            <p className="text-gray-600">
                                Secure payment powered by Stripe
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6">
                                <Alert className="border-red-200 bg-red-50">
                                    <AlertDescription className="text-red-800">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {success && (
                            <div className="mb-6">
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        {success}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        <StripePayment
                            selectedTier={selectedTier}
                            userEmail={formData.email}
                            onPaymentSuccess={handlePaymentSuccess}
                            onPaymentError={handlePaymentError}
                            isLoading={isLoading}
                            isYearly={isYearly}
                        />

                        <div className="text-center mt-8">
                            <button
                                type="button"
                                onClick={() => setStep("tier")}
                                className="text-sage-primary hover:text-sage-primary/80 font-medium"
                            >
                                ← Back to plan selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "confirm") {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="flex justify-center">
                    <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <Image
                                src="/repflow-logo.png"
                                alt="Repflow"
                                width={120}
                                height={40}
                                className="dark:invert"
                            />
                        </div>
                        <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
                        <CardDescription>
                            We&apos;ve sent a verification code to {formData.email}
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleConfirmEmail}>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert className="border-red-200 bg-red-50">
                                    <AlertDescription className="text-red-800">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        {success}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="confirmationCode">Verification Code</Label>
                                <Input
                                    id="confirmationCode"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={confirmationCode}
                                    onChange={(e) => {
                                        setConfirmationCode(e.target.value);
                                        setError("");
                                    }}
                                    className="text-center text-lg tracking-widest"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button 
                                type="submit" 
                                className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Verify Email
                                    </>
                                )}
                            </Button>

                            <div className="text-center text-sm">
                                <span className="text-gray-600">Didn&apos;t receive the code? </span>
                                <button
                                    type="button"
                                    onClick={resendConfirmationCode}
                                    className="text-sage-primary hover:text-sage-primary/80 font-medium"
                                >
                                    Resend code
                                </button>
                            </div>

                            <div className="text-center text-sm">
                                <span className="text-gray-600">Wrong email? </span>
                                <button
                                    type="button"
                                    onClick={() => setStep("signup")}
                                    className="text-sage-primary hover:text-sage-primary/80 font-medium"
                                >
                                    Go back
                                </button>
                            </div>
                        </CardFooter>
                    </form>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="flex justify-center">
                <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <Image
                            src="/repflow-logo.png"
                            alt="Repflow"
                            width={120}
                            height={40}
                            className="dark:invert"
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
                    <CardDescription>
                        Join Repflow and start managing your creator partnerships
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSignUp}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertDescription className="text-red-800">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="repflow_username">Your Repflow Email *</Label>
                            <div className="relative">
                                <Input
                                    id="repflow_username"
                                    name="repflow_username"
                                    type="text"
                                    placeholder="Email"
                                    value={formData.repflow_username}
                                    onChange={handleInputChange}
                                    className={`pr-24 ${fieldErrors.repflow_username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 text-gray-600 text-sm rounded-r-md pointer-events-none">
                                    @repflow.me
                                </div>
                            </div>
                            {fieldErrors.repflow_username ? (
                                <p className="text-xs text-red-600">
                                    {fieldErrors.repflow_username}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500">
                                    At least 3 characters. Only letters, numbers, and underscores allowed.
                                </p>
                            )}                           
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    placeholder="First Name"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    placeholder="Last Name"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                required
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-600">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-xs text-red-600">
                                    {fieldErrors.password}
                                </p>
                            )}
                            {formData.password && (
                                <div className="text-xs space-y-1 mt-2">
                                    <p className="font-medium text-gray-700">Password Requirements:</p>
                                    <div className="space-y-1">
                                        <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                                            {passwordRequirements.minLength ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            <span>At least 8 characters</span>
                                        </div>
                                        <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                                            {passwordRequirements.hasUppercase ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            <span>One uppercase letter</span>
                                        </div>
                                        <div className={`flex items-center gap-1 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                            {passwordRequirements.hasNumber ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            <span>One number</span>
                                        </div>
                                        <div className={`flex items-center gap-1 ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                            {passwordRequirements.hasSpecialChar ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            <span>One special character</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className={fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="text-xs text-red-600">
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button 
                            type="submit" 
                            className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark" 
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create Account
                                </>
                            )}
                        </Button>

                        <div className="text-center text-sm">
                            <span className="text-gray-600">Already have an account? </span>
                            <Link 
                                href="/auth/signin" 
                                className="text-sage-primary hover:text-sage-primary/80 font-medium"
                            >
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
                </Card>
            </div>
        </div>
    );
}
