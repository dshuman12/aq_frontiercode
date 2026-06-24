import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { API_BASE_URL, SUBSCRIPTION_TIERS } from '@/app/constants/constants';
import { getStripeClient } from '@/app/lib/stripe';

export async function POST(request: NextRequest) {
    try {
        // Get session to identify the user
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { newTier } = await request.json();

        if (!newTier) {
            return NextResponse.json(
                { error: 'New tier is required' },
                { status: 400 }
            );
        }

        // Validate the new tier
        const tierInfo = SUBSCRIPTION_TIERS[newTier.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS];
        if (!tierInfo) {
            return NextResponse.json(
                { error: 'Invalid subscription tier' },
                { status: 400 }
            );
        }

        // Check if tier is disabled
        if (tierInfo.disabled) {
            return NextResponse.json(
                { error: 'This subscription tier is not yet available' },
                { status: 400 }
            );
        }

        // Find customer in Stripe
        const stripe = getStripeClient();
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: session.user.email,
                limit: 1,
            });

            if (customers.data.length === 0) {
                return NextResponse.json(
                    { error: 'Customer not found in Stripe' },
                    { status: 404 }
                );
            }

            customer = customers.data[0];
        } catch (error) {
            console.error('Error finding customer:', error);
            return NextResponse.json(
                { error: 'Failed to find customer in Stripe' },
                { status: 500 }
            );
        }

        // Retrieve full customer with default payment method expanded (list() may not include it)
        const fullCustomer = await stripe.customers.retrieve(customer.id, {
            expand: ['invoice_settings.default_payment_method'],
        });
        if (fullCustomer.deleted) {
            return NextResponse.json(
                { error: 'Customer not found in Stripe' },
                { status: 404 }
            );
        }

        // Resolve default payment method: customer invoice_settings, then any attached card
        let paymentMethodId: string | null = null;
        const invoiceDefaultPm = fullCustomer.invoice_settings?.default_payment_method;
        if (invoiceDefaultPm) {
            paymentMethodId = typeof invoiceDefaultPm === 'string' ? invoiceDefaultPm : (invoiceDefaultPm as { id: string }).id;
        }
        if (!paymentMethodId) {
            const methods = await stripe.paymentMethods.list({
                customer: fullCustomer.id,
                type: 'card',
                limit: 1,
            });
            if (methods.data.length > 0) {
                paymentMethodId = methods.data[0].id;
            }
        }

        if (!paymentMethodId) {
            return NextResponse.json(
                { error: 'No payment method on file. Please add a payment method in Billing settings before upgrading.' },
                { status: 400 }
            );
        }

        // Create a payment intent for the upgrade (only confirm when we have a payment method)
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: tierInfo.price * 100, // Convert to cents
                currency: 'usd',
                customer: fullCustomer.id,
                payment_method: paymentMethodId,
                confirm: true,
                metadata: {
                    upgrade: 'true',
                    newTier: newTier,
                    previousTier: 'current', // You might want to fetch this from backend
                    email: session.user.email,
                },
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });

            if (paymentIntent.status === 'succeeded') {
                // Calculate next billing date (30 days from now)
                const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                // Helper function to capitalize first letter of tier
                const capitalizeTier = (tier: string) => {
                    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
                };

                // Update subscription in backend
                const subscriptionData = {
                    tier: capitalizeTier(newTier),
                    status: 'active',
                    paymentIntentId: paymentIntent.id,
                    currentPeriodStart: new Date().toISOString(),
                    currentPeriodEnd: nextBillingDate.toISOString(),
                    nextBillingDate: nextBillingDate.toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                try {
                    const updateResponse = await fetch(`${API_BASE_URL}/users/update-subscription`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${(session as any).accessToken}`,
                        },
                        body: JSON.stringify({
                            subscription: subscriptionData,
                        }),
                    });

                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        throw new Error(`Failed to update subscription: ${updateResponse.status} - ${errorText}`);
                    }

                    console.log("Plan upgraded successfully for user:", session.user.email);
                    console.log("New subscription data:", subscriptionData);

                    return NextResponse.json({
                        message: 'Plan upgraded successfully',
                        subscription: subscriptionData,
                        paymentIntentId: paymentIntent.id
                    });

                } catch (error) {
                    console.error("Error updating subscription in backend:", error);
                    return NextResponse.json(
                        { error: 'Payment succeeded but failed to update subscription' },
                        { status: 500 }
                    );
                }

            } else {
                return NextResponse.json(
                    { error: `Payment failed: ${paymentIntent.status}` },
                    { status: 400 }
                );
            }

        } catch (error: any) {
            console.error('Error creating payment intent for upgrade:', error);

            // PaymentIntent missing payment method (e.g. no card on file)
            if (error.code === 'payment_intent_unexpected_state') {
                return NextResponse.json(
                    { error: 'No payment method on file. Please add a payment method in Billing settings before upgrading.' },
                    { status: 400 }
                );
            }

            if (error.code === 'card_declined') {
                return NextResponse.json(
                    { error: 'Your card was declined. Please check your payment method.' },
                    { status: 400 }
                );
            }

            if (error.code === 'insufficient_funds') {
                return NextResponse.json(
                    { error: 'Insufficient funds. Please check your account balance.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to process upgrade payment' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Plan upgrade error:', error);
        return NextResponse.json(
            { error: 'Failed to upgrade plan' },
            { status: 500 }
        );
    }
}
