"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function YouTubeCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [platformName, setPlatformName] = useState('');

    useEffect(() => {
        const state = searchParams.get('state');
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (state) {
            // Extract platform name from state (format: "youtube-sync-{name}")
            const nameMatch = state.match(/youtube-sync-(.+)/);
            if (nameMatch) {
                setPlatformName(decodeURIComponent(nameMatch[1]));
            }
        }

        if (error) {
            setStatus('error');
            setMessage(`YouTube authorization failed: ${error}`);
            return;
        }

        if (code) {
            handleYouTubeCallback(code, state);
        } else {
            setStatus('error');
            setMessage('No authorization code received from YouTube');
        }
    }, [searchParams]);

    const handleYouTubeCallback = async (code: string, state: string | null) => {
        try {
            setStatus('loading');
            setMessage('Connecting YouTube account...');

            // Step 1: Call the YouTube OAuth callback API to exchange code for tokens
            const response = await fetch('/api/youtube/oauth/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    state
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect YouTube account');
            }

            const data = await response.json();
            console.log('YouTube OAuth callback response:', data);

            if (!data.success || !data.tokens) {
                throw new Error('Failed to get OAuth tokens');
            }

            setMessage('Fetching YouTube analytics...');

            // Step 2: Fetch YouTube analytics with OAuth credentials
            const analyticsResponse = await fetch('/api/youtube/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oauth_credentials: data.tokens,
                    include_demographics: true
                }),
            });

            if (!analyticsResponse.ok) {
                const errorData = await analyticsResponse.json();
                throw new Error(errorData.error || 'Failed to fetch YouTube analytics');
            }

            const analyticsData = await analyticsResponse.json();
            console.log('YouTube analytics response:', analyticsData);

            if (!analyticsData.success) {
                throw new Error(analyticsData.message || 'Failed to fetch YouTube analytics');
            }

            setStatus('success');
            setMessage('YouTube account connected and analytics synced successfully!');
            
            // Redirect to profile after a short delay
            setTimeout(() => {
                router.push('/creator/portfolio');
            }, 2000);

        } catch (error) {
            console.error('YouTube connection error:', error);
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Failed to connect YouTube account');
        }
    };

    const handleRetry = () => {
        router.push('/creator/portfolio');
    };

    const handleBackToProfile = () => {
        router.push('/creator/portfolio');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Connecting YouTube Account
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'loading' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" />
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
