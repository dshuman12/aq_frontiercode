"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function InstagramReconnectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const handleInstagramReconnect = useCallback(async () => {
        try {
            setStatus('loading');
            setMessage('Initiating Instagram reconnection...');

            // Use the same OAuth logic as connect-account-modal
            const redirectUri = "https://cnhp2ujpjm.us-east-2.awsapprunner.com/creator/meta-login";
            const instagramOAuthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=2229467730901564&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`;
            
            console.log('OAuth URL redirect_uri:', redirectUri);
            console.log('Full OAuth URL:', instagramOAuthUrl);
            
            // Redirect to Instagram OAuth
            router.push(instagramOAuthUrl);

        } catch (error) {
            console.error('Instagram reconnection error:', error);
            setStatus('error');
            setMessage('Failed to initiate Instagram reconnection. Please try again.');
        }
    }, [router]);

    useEffect(() => {
        queueMicrotask(() => {
            void handleInstagramReconnect();
        });
    }, [searchParams, handleInstagramReconnect]);

    const handleRetry = () => {
        setStatus('loading');
        handleInstagramReconnect();
    };

    const handleBackToProfile = () => {
        router.push('/creator/profile');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Instagram Reconnection Required
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'loading' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <p className="text-gray-600">{message}</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {message}
                                </AlertDescription>
                            </Alert>
                            <div className="flex gap-3">
                                <Button onClick={handleRetry} className="flex-1">
                                    Try Again
                                </Button>
                                <Button onClick={handleBackToProfile} variant="outline" className="flex-1">
                                    Back to Profile
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-gray-500 text-center">
                        <p>Your Instagram connection has expired and needs to be renewed.</p>
                        <p className="mt-2">You&apos;ll be redirected to Instagram to re-authorize your account.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
