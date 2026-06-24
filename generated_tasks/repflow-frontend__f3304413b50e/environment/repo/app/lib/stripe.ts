import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '@/app/constants/constants';

// Lazy-load Stripe client to avoid initialization during build
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
    if (!stripeClient) {
        stripeClient = new Stripe(STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: '2025-08-27.basil',
        });
    }
    return stripeClient;
}
