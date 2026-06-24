import { API_BASE_URL, SUBSCRIPTION_TIERS, getPaymentLink } from '@/app/constants/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { tier, email, referralCode, billingDetails, userData, isYearly = false } = await request.json();

        if (!tier || !email) {
            return NextResponse.json(
                { error: 'Tier and email are required' },
                { status: 400 }
            );
        }

        // Validate that we have necessary user data for Cognito user creation
        if (!userData || !userData.password || !userData.repflow_username) {
            return NextResponse.json(
                { error: 'Complete user registration data is required' },
                { status: 400 }
            );
        }

        const subscriptionTier = SUBSCRIPTION_TIERS[tier.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS];
        
        if (!subscriptionTier) {
            return NextResponse.json(
                { error: 'Invalid subscription tier' },
                { status: 400 }
            );
        }

        // Check if tier is disabled
        if (subscriptionTier.disabled) {
            return NextResponse.json(
                { error: 'This subscription tier is not yet available' },
                { status: 400 }
            );
        }

        // Get the correct payment link based on billing period
        const paymentLink = getPaymentLink(tier, isYearly);

        if (!paymentLink || paymentLink.includes('REPLACE_WITH')) {
            return NextResponse.json(
                { error: 'Payment link not configured for this tier' },
                { status: 500 }
            );
        }

        // Validate referral code if provided
        let referralValidation = null;
        if (referralCode) {
            try {
                const validationResponse = await fetch(`${API_BASE_URL}/referrals/validate-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ referralCode: referralCode }),
                });
                
                if (validationResponse.ok) {
                    referralValidation = await validationResponse.json();
                }
            } catch (error) {
                console.error('Error validating referral code:', error);
                // Continue without validation if it fails
            }
        }

        // Generate a unique session ID to track this payment flow
        const sessionId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store user data temporarily with session ID (preserve all user data)
        const pendingUserData = {
            ...userData, // Include all user data (firstName, lastName, password, etc.)
            sessionId,
            email,
            tier,
            selectedTier: tier, // Keep for backward compatibility
            isYearly, // Include billing period
            referralCode: referralCode || null,
            referralValidation,
            billingDetails,
            timestamp: new Date().toISOString(),
            status: 'pending_payment'
        };

        // In a real app, you'd store this in a database or Redis
        // For now, we'll include it in the payment link URL parameters
        const encodedUserData = Buffer.from(JSON.stringify({
            sessionId,
            email,
            tier,
            referralCode: referralCode || null,
        })).toString('base64');

        // Payment Links must include after_completion.redirect (set by scripts/stripe-sync-env.mjs).
        // User returns to /auth/signup?stripe_payment=success; signup page completes Cognito signup.
        const paymentLinkUrl = new URL(paymentLink);
        
        // Add metadata that Stripe can use (if supported by your payment link configuration)
        paymentLinkUrl.searchParams.set('client_reference_id', sessionId);
        paymentLinkUrl.searchParams.set('prefilled_email', email);

        // Store pending user data in localStorage key for retrieval after payment
        const localStorageKey = `pending_payment_${sessionId}`;

        console.log('Preparing payment link for:', {
            email,
            tier,
            isYearly,
            referralCode: referralCode || 'none',
            sessionId,
            hasValidReferral: referralValidation?.isValid || false
        });

        return NextResponse.json({
            paymentLinkUrl: paymentLinkUrl.toString(),
            sessionId,
            pendingUserData,
            localStorageKey,
            isYearly,
            discountEligible: referralValidation?.isValid || false,
            referralValidation
        });

    } catch (error: any) {
        console.error('Payment link preparation error:', error);
        return NextResponse.json(
            { error: 'Failed to prepare payment link' },
            { status: 500 }
        );
    }
}
