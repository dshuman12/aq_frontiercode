"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        
        if (sessionId) {
            // Clean up any temporary payment session data
            const localStorageKey = `pending_payment_${sessionId}`;
            localStorage.removeItem(localStorageKey);
            
            console.log('Payment cancelled for session:', sessionId);
        }
    }, [searchParams]);

    const handleRetryPayment = () => {
        // Navigate back to pricing/signup
        router.push('/pricing');
    };

    const handleGoHome = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-red-600">Payment Cancelled</CardTitle>
                    <CardDescription>
                        Your payment was cancelled. No charges have been made to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center text-sm text-gray-600">
                        <p>
                            You can try again anytime. Your subscription selection and 
                            referral code (if any) have been saved.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Button 
                            onClick={handleRetryPayment}
                            className="w-full bg-sage-primary hover:bg-sage-primary/90"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Try Payment Again
                        </Button>
                        
                        <Button 
                            onClick={handleGoHome}
                            variant="outline"
                            className="w-full"
                        >
                            Back to Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
