"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmationError, setConfirmationError] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        const handlePaymentSuccess = async () => {
            try {
                // Stripe Payment Links may provide different parameters
                const stripeSessionId = searchParams.get('session_id');
                
                // Try to get user data from localStorage first (most reliable)
                const existingUserData = localStorage.getItem('pendingUserData');
                
                console.log('Payment success page loaded:', {
                    stripeSessionId,
                    hasPendingData: !!existingUserData,
                    currentUrl: window.location.href
                });
                
                if (!existingUserData) {
                    // Try to find any pending payment session data as fallback
                    const paymentSessionKeys = Object.keys(localStorage).filter(key => 
                        key.startsWith('pending_payment_')
                    );
                    
                    if (paymentSessionKeys.length > 0) {
                        // Use the most recent payment session data
                        const fallbackData = localStorage.getItem(paymentSessionKeys[0]);
                        if (fallbackData) {
                            const parsedFallback = JSON.parse(fallbackData);
                            // Store it in the standard location
                            localStorage.setItem('pendingUserData', fallbackData);
                            console.log('Using fallback payment session data');
                        } else {
                            throw new Error('No pending user data found. Please try the payment process again.');
                        }
                    } else {
                        throw new Error('No pending user data found. Please try the payment process again.');
                    }
                }

                // Get the current user data (either original or fallback)
                const currentUserData = localStorage.getItem('pendingUserData');
                const userData = JSON.parse(currentUserData!);
                setSessionData(userData);

                // Mark payment as completed
                userData.paymentCompleted = true;
                userData.stripeSessionId = stripeSessionId;
                userData.stripePaymentSuccess = true;
                userData.completedAt = new Date().toISOString();

                // Create Cognito user after successful payment
                if (!userData.userSub) {
                    try {
                        console.log('Creating Cognito user after successful payment...');
                        const cognitoResponse = await fetch('/api/auth/create-cognito-user', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: userData.email,
                                password: userData.password,
                                firstName: userData.firstName,
                                lastName: userData.lastName,
                                repflow_username: userData.repflow_username,
                                selectedTier: userData.selectedTier || userData.tier,
                            }),
                        });

                        const cognitoData = await cognitoResponse.json();

                        if (cognitoResponse.ok) {
                            userData.userSub = cognitoData.userSub;
                            userData.codeDeliveryDetails = cognitoData.codeDeliveryDetails;
                            userData.cognitoUserCreated = true;
                            console.log('Cognito user created successfully');
                        } else {
                            throw new Error(cognitoData.error || 'Failed to create Cognito user');
                        }
                    } catch (cognitoError) {
                        console.error('Error creating Cognito user:', cognitoError);
                        // This is critical - if we can't create the user, we should show an error
                        throw new Error('Failed to create user account after payment. Please contact support.');
                    }
                }

                // Handle referral completion if applicable
                if (userData.referralCode) {
                    try {
                        const referralResponse = await fetch('/api/referrals/complete', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                referralCode: userData.referralCode,
                                customerEmail: userData.email,
                                tier: userData.selectedTier || userData.tier,
                                stripeSessionId: stripeSessionId,
                            }),
                        });

                        if (referralResponse.ok) {
                            console.log('Referral completed successfully');
                            userData.referralCompleted = true;
                        } else {
                            console.error('Failed to complete referral');
                        }
                    } catch (referralError) {
                        console.error('Error completing referral:', referralError);
                        // Don't fail the success flow if referral completion fails
                    }
                }

                // Update localStorage with completed payment info
                localStorage.setItem('pendingUserData', JSON.stringify(userData));

                // Clean up any temporary payment session data
                const paymentSessionKeys = Object.keys(localStorage).filter(key => 
                    key.startsWith('pending_payment_')
                );
                paymentSessionKeys.forEach(key => localStorage.removeItem(key));

                console.log('Payment success processed:', {
                    tier: userData.selectedTier || userData.tier,
                    email: userData.email,
                    referralCode: userData.referralCode || 'none',
                    stripeSessionId
                });

                // Show email confirmation if Cognito user was created
                if (userData.cognitoUserCreated && !userData.emailConfirmed) {
                    setShowEmailConfirmation(true);
                }

                setIsProcessing(false);

            } catch (err) {
                console.error('Error processing payment success:', err);
                setError(err instanceof Error ? err.message : 'Failed to process payment success');
                setIsProcessing(false);
            }
        };

        handlePaymentSuccess();
    }, [searchParams]);

    const handleEmailConfirmation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConfirming(true);
        setConfirmationError(null);

        try {
            const response = await fetch('/api/auth/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: sessionData.email,
                    confirmationCode: confirmationCode,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user data to mark email as confirmed
                const userData = JSON.parse(localStorage.getItem('pendingUserData')!);
                userData.emailConfirmed = true;
                localStorage.setItem('pendingUserData', JSON.stringify(userData));
                setSessionData(userData);
                setShowEmailConfirmation(false);
            } else {
                setConfirmationError(data.error || 'Failed to confirm email. Please try again.');
            }
        } catch (err) {
            setConfirmationError('An unexpected error occurred. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleResendCode = async () => {
        setIsResending(true);
        setConfirmationError(null);

        try {
            const response = await fetch('/api/auth/resend-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: sessionData.email,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setConfirmationError(null);
                // Show success message temporarily
                setConfirmationError('Confirmation code resent! Please check your email.');
                setTimeout(() => setConfirmationError(null), 3000);
            } else {
                setConfirmationError(data.error || 'Failed to resend confirmation code.');
            }
        } catch (err) {
            setConfirmationError('Failed to resend confirmation code. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    const handleContinue = () => {
        // Navigate to onboarding or dashboard
        router.push('/auth/onboarding');
    };

    if (isProcessing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <h2 className="text-lg font-semibold">Processing Payment...</h2>
                            <p className="text-gray-600">Please wait while we confirm your subscription.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-600">Payment Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert className="border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                        <Button 
                            onClick={() => router.push('/auth/signup')} 
                            className="w-full mt-4"
                            variant="outline"
                        >
                            Back to Signup
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show email confirmation form if needed
    if (showEmailConfirmation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle className="text-blue-600">Confirm Your Email</CardTitle>
                        <CardDescription>
                            Please check your email and enter the confirmation code to activate your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessionData && (
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-600">
                                    We sent a confirmation code to <strong>{sessionData.email}</strong>
                                </p>
                            </div>
                        )}
                        
                        <form onSubmit={handleEmailConfirmation} className="space-y-4">
                            {confirmationError && (
                                <Alert className={confirmationError.includes('resent') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                                    <AlertDescription className={confirmationError.includes('resent') ? 'text-green-800' : 'text-red-800'}>
                                        {confirmationError}
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <div className="space-y-2">
                                <Label htmlFor="confirmationCode">Confirmation Code</Label>
                                <Input
                                    id="confirmationCode"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={confirmationCode}
                                    onChange={(e) => setConfirmationCode(e.target.value)}
                                    maxLength={6}
                                    required
                                />
                            </div>
                            
                            <Button
                                type="submit"
                                disabled={isConfirming || confirmationCode.length !== 6}
                                className="w-full bg-sage-primary hover:bg-sage-primary/90"
                            >
                                {isConfirming ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    'Confirm Email'
                                )}
                            </Button>
                            
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={isResending}
                                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                >
                                    {isResending ? 'Resending...' : 'Resend confirmation code'}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                    <CardDescription>
                        Your subscription has been activated and email confirmed successfully.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {sessionData && (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600">
                                <strong>Plan:</strong> {(sessionData.selectedTier || sessionData.tier)?.toUpperCase() || 'Selected Plan'}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Email:</strong> {sessionData.email}
                            </p>
                            {sessionData.referralCode && (
                                <p className="text-sm text-green-600">
                                    <strong>Referral Applied:</strong> {sessionData.referralCode}
                                    {sessionData.referralCompleted && ' ✓'}
                                </p>
                            )}
                            {sessionData.emailConfirmed && (
                                <p className="text-sm text-green-600">
                                    <strong>Email Confirmed:</strong> ✓
                                </p>
                            )}
                        </div>
                    )}
                    
                    <div className="text-center text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                        <p>🎉 <strong>Welcome to Repflow!</strong></p>
                        <p>Your account is fully set up and ready to go.</p>
                    </div>
                    
                    <Button 
                        onClick={handleContinue}
                        className="w-full bg-sage-primary hover:bg-sage-primary/90"
                    >
                        Continue to Onboarding
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
