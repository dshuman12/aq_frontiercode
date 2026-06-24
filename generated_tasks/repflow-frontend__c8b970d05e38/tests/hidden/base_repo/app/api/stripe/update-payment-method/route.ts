import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { API_BASE_URL } from '@/app/constants/constants';
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

        const { paymentMethodId, billingDetails } = await request.json();

        if (!paymentMethodId || !billingDetails) {
            return NextResponse.json(
                { error: 'Payment method ID and billing details are required' },
                { status: 400 }
            );
        }

        const stripe = getStripeClient();

        // Find or create customer in Stripe
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: session.user.email,
                limit: 1,
            });

            if (customers.data.length > 0) {
                customer = customers.data[0];
            } else {
                // Create customer if doesn't exist
                customer = await stripe.customers.create({
                    email: session.user.email,
                    name: session.user.name || undefined,
                });
            }
        } catch (error) {
            console.error('Error finding/creating customer:', error);
            return NextResponse.json(
                { error: 'Failed to find customer in Stripe' },
                { status: 500 }
            );
        }

        // Attach the payment method to the customer
        try {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.id,
            });
        } catch (error) {
            console.error('Error attaching payment method to customer:', error);
            return NextResponse.json(
                { error: 'Failed to attach payment method to customer' },
                { status: 500 }
            );
        }

        // Get current default payment method to detach it later
        let oldPaymentMethodId = null;
        if (customer.invoice_settings?.default_payment_method) {
            oldPaymentMethodId = typeof customer.invoice_settings.default_payment_method === 'string' 
                ? customer.invoice_settings.default_payment_method 
                : customer.invoice_settings.default_payment_method.id;
        }

        // Set as default payment method for the customer
        try {
            await stripe.customers.update(customer.id, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        } catch (error) {
            console.error('Error setting default payment method:', error);
            return NextResponse.json(
                { error: 'Failed to set default payment method' },
                { status: 500 }
            );
        }

        // Detach old payment method if it exists
        if (oldPaymentMethodId && oldPaymentMethodId !== paymentMethodId) {
            try {
                await stripe.paymentMethods.detach(oldPaymentMethodId);
                console.log('Old payment method detached:', oldPaymentMethodId);
            } catch (error) {
                console.error('Error detaching old payment method:', error);
                // Don't fail the request if we can't detach the old method
            }
        }

        // Retrieve the payment method details from Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        if (!paymentMethod.card) {
            return NextResponse.json(
                { error: 'Invalid payment method' },
                { status: 400 }
            );
        }

        // Calculate next billing date (30 days from now)
        const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Create updated billing info object
        const updatedBillingInfo = {
            cardLast4: paymentMethod.card.last4,
            cardBrand: paymentMethod.card.brand,
            expirationMonth: paymentMethod.card.exp_month,
            expirationYear: paymentMethod.card.exp_year,
            nextBillingDate: nextBillingDate.toISOString(),
            billingEmail: billingDetails.email,
            billingAddress: {
                line1: billingDetails.address.line1,
                line2: billingDetails.address.line2,
                city: billingDetails.address.city,
                state: billingDetails.address.state,
                postalCode: billingDetails.address.postalCode,
                country: billingDetails.address.country,
            }
        };

        // Update billing info in backend using user credentials
        try {
            const updateResponse = await fetch(`${API_BASE_URL}/users/update-billing`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(session as any).accessToken}`,
                },
                body: JSON.stringify({
                    billingInfo: updatedBillingInfo,
                    paymentMethodId: paymentMethodId,
                }),
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update billing info: ${updateResponse.status} - ${errorText}`);
            }

            console.log("Payment method updated successfully in Stripe for customer:", customer.id);
            console.log("Billing info updated successfully for user:", session.user.email);
            console.log("New payment method ID:", paymentMethodId);

            return NextResponse.json({
                message: 'Payment method updated successfully',
                billingInfo: updatedBillingInfo,
                stripeCustomerId: customer.id,
                paymentMethodId: paymentMethodId
            });

        } catch (error) {
            console.error("Error updating billing info in backend:", error);
            return NextResponse.json(
                { error: 'Failed to update billing information' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Payment method update error:', error);
        return NextResponse.json(
            { error: 'Failed to update payment method' },
            { status: 500 }
        );
    }
}
