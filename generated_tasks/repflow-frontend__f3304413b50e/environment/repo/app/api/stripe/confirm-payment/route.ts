import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/app/lib/stripe';

export async function POST(request: NextRequest) {
    try {
        const { paymentIntentId, userEmail, tier } = await request.json();

        if (!paymentIntentId || !userEmail || !tier) {
            return NextResponse.json(
                { error: 'Payment intent ID, user email, and tier are required' },
                { status: 400 }
            );
        }

        // Helper function to capitalize first letter of tier
        const capitalizeTier = (tier: string) => {
            return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
        };

        // Retrieve payment method details and referral code from Stripe
        let paymentMethodDetails = null;
        let referralCode = null;
        try {
            const stripe = getStripeClient();
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            // Extract referral code from payment intent metadata
            if (paymentIntent.metadata && paymentIntent.metadata.referralCode) {
                referralCode = paymentIntent.metadata.referralCode;
            }
            
            if (paymentIntent.payment_method) {
                const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
                    ? paymentIntent.payment_method 
                    : paymentIntent.payment_method.id;
                
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
                if (paymentMethod.card) {
                    paymentMethodDetails = {
                        cardLast4: paymentMethod.card.last4,
                        cardBrand: paymentMethod.card.brand,
                        expirationMonth: paymentMethod.card.exp_month,
                        expirationYear: paymentMethod.card.exp_year,
                    };
                }
            }
        } catch (error) {
            console.error("Error retrieving payment method details:", error);
            // Continue without payment method details
        }

        // Calculate next billing date (30 days from now)
        const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Instead of updating backend (user doesn't exist yet), 
        // return subscription data to be stored in localStorage
        const subscriptionData = {
            tier: capitalizeTier(tier),
            status: 'active',
            paymentIntentId: paymentIntentId,
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: nextBillingDate.toISOString(),
            nextBillingDate: nextBillingDate.toISOString(),
            updatedAt: new Date().toISOString(),
        };

        console.log("Payment confirmed successfully for user:", userEmail);
        console.log("Subscription data to be stored:", subscriptionData);
        if (paymentMethodDetails) {
            console.log("Payment method details captured:", paymentMethodDetails);
        }

        const responseData: any = {
            message: 'Payment confirmed successfully',
            subscription: subscriptionData,
            paymentMethodDetails: paymentMethodDetails
        };
        
        // Include referral code in response if present
        if (referralCode) {
            responseData.referralCode = referralCode;
        }
        
        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('Payment confirmation error:', error);
        return NextResponse.json(
            { error: 'Failed to confirm payment' },
            { status: 500 }
        );
    }
}
