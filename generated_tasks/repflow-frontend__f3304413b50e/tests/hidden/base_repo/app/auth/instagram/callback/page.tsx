"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function InstagramCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            setStatus("error");
            setMessage(`Instagram authorization failed: ${error}`);
            return;
        }
        if (code) {
            handleCallback(code, state ?? undefined);
        } else {
            setStatus("error");
            setMessage("No authorization code received from Instagram");
        }
    }, [searchParams]);

    const handleCallback = async (code: string, state?: string) => {
        try {
            setStatus("loading");
            setMessage("Connecting Instagram account...");

            const response = await fetch("/api/instagram/oauth/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, state }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ?? "Failed to connect Instagram account");
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.message ?? "Connection failed");

            setStatus("success");
            setMessage("Instagram account connected successfully!");
            setTimeout(() => router.push("/creator/portfolio"), 2000);
        } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Failed to connect Instagram account");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Connecting Instagram Account
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === "loading" && (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-pink-600" />
                            <p className="text-gray-600">{message}</p>
                        </div>
                    )}
                    {status === "success" && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
                            <p className="text-gray-600">{message}</p>
                            <p className="text-sm text-gray-500">Redirecting to portfolio...</p>
                        </div>
                    )}
                    {status === "error" && (
                        <div className="space-y-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                            <div className="flex gap-3">
                                <Button onClick={() => router.push("/creator/portfolio")} className="flex-1">
                                    Back to Portfolio
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
