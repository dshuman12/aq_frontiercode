"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/app/constants/constants";

interface ReferralCodeInputProps {
    onReferralCodeChange: (code: string) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function ReferralCodeInput({ onReferralCodeChange, onValidationChange }: ReferralCodeInputProps) {
    const [referralCode, setReferralCode] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        isValid: boolean;
        referrerName?: string;
        referrerUsername?: string;
        message: string;
    } | null>(null);

    const validateReferralCode = async (code: string) => {
        if (!code.trim()) {
            setValidationResult(null);
            onValidationChange(false);
            return;
        }

        setIsValidating(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/referrals/validate-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ referralCode: code }),
            });

            const result = await response.json();
            setValidationResult(result);
            onValidationChange(result.isValid);
        } catch (error) {
            console.error('Error validating referral code:', error);
            setValidationResult({
                isValid: false,
                message: 'Error validating referral code. Please try again.'
            });
            onValidationChange(false);
        } finally {
            setIsValidating(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (referralCode) {
                validateReferralCode(referralCode);
            } else {
                setValidationResult(null);
                onValidationChange(false);
            }
        }, 500); // Debounce validation

        return () => clearTimeout(timeoutId);
    }, [referralCode]);

    useEffect(() => {
        onReferralCodeChange(referralCode);
    }, [referralCode, onReferralCodeChange]);

    return (
        <div className="space-y-2">
            <Label htmlFor="referral-code">
                Referral Code (Optional)
                <span className="text-muted-foreground text-sm ml-1">
                    - Get 20% off your first subscription
                </span>
            </Label>
            
            <div className="relative">
                <Input
                    id="referral-code"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className={`pr-10 ${
                        validationResult?.isValid 
                            ? 'border-green-500 focus:border-green-500' 
                            : validationResult?.isValid === false 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                    }`}
                />
                
                {isValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                
                {!isValidating && validationResult && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {validationResult.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                )}
            </div>

            {validationResult && (
                <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                    <AlertDescription>
                        {validationResult.isValid ? (
                            <div>
                                <div className="font-medium">
                                    Valid referral code from {validationResult.referrerName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    @{validationResult.referrerUsername}
                                </div>
                            </div>
                        ) : (
                            validationResult.message
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
