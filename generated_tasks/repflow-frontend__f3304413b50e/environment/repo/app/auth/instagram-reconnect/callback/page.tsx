"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function InstagramReconnectCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [platformName, setPlatformName] = useState('');

    useEffect(() => {
        const platform = searchParams.get('platform');
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (platform) {
            setPlatformName(platform);
        }

        if (error) {
            setStatus('error');
            setMessage(`Instagram authorization failed: ${error}`);
            return;
        }

        if (code) {
            handleTokenUpdate(code, platform);
        } else {
            setStatus('error');
            setMessage('No authorization code received from Instagram');
        }
    }, [searchParams]);

    const handleTokenUpdate = async (code: string, platform: string | null) => {
        try {
            setStatus('loading');
            setMessage('Updating Instagram connection...');

            // Call the update token API
            const response = await fetch('/api/instagram/update-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    platform
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update Instagram token');
            }

            const data = await response.json();
            
            setStatus('success');
            setMessage('Instagram connection updated successfully!');
            
            // Redirect to profile after a short delay
            setTimeout(() => {
                router.push('/creator/profile');
            }, 2000);

        } catch (error) {
            console.error('Token update error:', error);
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Failed to update Instagram connection');
        }
    };

    const handleRetry = () => {
        router.push(`/auth/instagram-reconnect?platform=${platformName}`);
    };

    const handleBackToProfile = () => {
        router.push('/creator/profile');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Updating Instagram Connection
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'loading' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <p className="text-gray-600">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
                            <p className="text-gray-600">{message}</p>
                            <p className="text-sm text-gray-500">Redirecting to your profile...</p>
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
                </CardContent>
            </Card>
        </div>
    );
}
