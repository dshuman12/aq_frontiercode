"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MetaLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Connecting your Instagram account...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const connectInstagram = async () => {
            try {
                const code = searchParams.get('code');
                const errorParam = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');
                
                // Debug: Log all URL parameters
                console.log('OAuth callback parameters:', {
                    code: code ? 'Present' : 'Missing',
                    error: errorParam,
                    errorDescription: errorDescription,
                    allParams: Object.fromEntries(searchParams.entries())
                });
                
                if (errorParam) {
                    throw new Error(`Instagram authorization failed: ${errorParam} - ${errorDescription || 'No description provided'}`);
                }
                
                if (!code) {
                    throw new Error('No authorization code received from Instagram');
                }

                setMessage('Processing Instagram authorization...');

                // Call the Instagram connection API
                const response = await fetch('/api/instagram/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to connect Instagram account');
                }

                const result = await response.json();
                
                setStatus('success');
                setMessage('Instagram account connected successfully!');
                
                // Redirect to portfolio page after a short delay
                setTimeout(() => {
                    router.push('/creator/portfolio');
                }, 2000);

            } catch (error) {
                console.error('Instagram connection error:', error);
                setStatus('error');
                setError(error instanceof Error ? error.message : 'An unexpected error occurred');
                setMessage('Failed to connect Instagram account');
            }
        };

        connectInstagram();
    }, [searchParams, router]);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
            case 'success':
                return <CheckCircle className="h-8 w-8 text-green-600" />;
            case 'error':
                return <XCircle className="h-8 w-8 text-red-600" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'border-blue-200 bg-blue-50';
            case 'success':
                return 'border-green-200 bg-green-50';
            case 'error':
                return 'border-red-200 bg-red-50';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className={`w-full max-w-md ${getStatusColor()}`}>
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {getStatusIcon()}
                    </div>
                    <CardTitle className="text-xl font-semibold">
                        Instagram Connection
                    </CardTitle>
                    <CardDescription>
                        {message}
                    </CardDescription>
                </CardHeader>
                
                {status === 'error' && error && (
                    <CardContent>
                        <div className="text-center">
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <Button 
                                onClick={() => router.push('/creator/portfolio')}
                                variant="outline"
                                className="w-full"
                            >
                                Return to Portfolio
                            </Button>
                        </div>
                    </CardContent>
                )}
                
                {status === 'success' && (
                    <CardContent>
                        <div className="text-center">
                            <p className="text-sm text-green-600 mb-4">
                                Redirecting you back to your portfolio...
                            </p>
                        </div>
                    </CardContent>
                )}
                
                {status === 'loading' && (
                    <CardContent>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Please wait while we set up your Instagram connection.
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
