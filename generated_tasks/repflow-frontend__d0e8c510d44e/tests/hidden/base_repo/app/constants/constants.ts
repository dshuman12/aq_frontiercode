import { defaultCognitoPoolAndClient } from '@/app/lib/cognito-env-defaults'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://i2mk8mby5p.us-east-2.awsapprunner.com").replace(/\/$/, '');
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const cognitoDefaults = defaultCognitoPoolAndClient()
export const AWS_COGNITO_CLIENT_ID =
    process.env.AWS_COGNITO_CLIENT_ID || cognitoDefaults.clientId;
export const AWS_COGNITO_CLIENT_SECRET = process.env.AWS_COGNITO_CLIENT_SECRET || "";
export const AWS_COGNITO_REGION = process.env.AWS_COGNITO_REGION || "us-east-2";
export const AWS_COGNITO_USER_POOL_ID =
    process.env.AWS_COGNITO_USER_POOL_ID || cognitoDefaults.userPoolId;

// Stripe Configuration - Load from environment variables
const IS_NEXT_DEV = process.env.NODE_ENV === 'development'

/** Set on hosted dev/staging (e.g. App Runner) where NODE_ENV is still production — same as local test mode. */
const EXPLICIT_STRIPE_TEST =
    process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true' ||
    process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === '1'

/**
 * In test mode (local `next dev` or NEXT_PUBLIC_STRIPE_TEST_MODE), prefer `NEXT_PUBLIC_*_TEST` so
 * `.env.local` can keep prod-like values while overrides supply the test catalog.
 */
function devStripeEnv(key: string): string | undefined {
    if (IS_NEXT_DEV || EXPLICIT_STRIPE_TEST) {
        const testName = `${key}_TEST`
        if (process.env[testName]) return process.env[testName]
    }
    return process.env[key]
}

function resolveStripePublishableKey(): string | undefined {
    const pk = devStripeEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
    // Never load pk_live when explicitly in Stripe test mode (local dev or hosted dev with the flag).
    if ((IS_NEXT_DEV || EXPLICIT_STRIPE_TEST) && pk?.startsWith('pk_live_')) {
        console.warn(
            '[Repflow] Stripe test mode requires pk_test. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST. See env.example.'
        )
        return undefined
    }
    return pk
}

export const STRIPE_PUBLISHABLE_KEY = resolveStripePublishableKey()
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
// OpenAI Configuration
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// STRIPE_WEBHOOK_SECRET moved to backend - no longer needed on the frontend

/**
 * When true, embedded live catalog defaults are disabled; env must supply test Payment Links / prices.
 * `next dev` always sets this to true so embedded live defaults are not used locally.
 * Hosted dev (e.g. App Runner): set `NEXT_PUBLIC_STRIPE_TEST_MODE=true` — NODE_ENV is still production.
 * Production: omit or set false; use live keys and Payment Links in env / apprunner.
 * @see env.example
 */
export const STRIPE_TEST_MODE = IS_NEXT_DEV || EXPLICIT_STRIPE_TEST

/** Live catalog: active recurring prices (Payment Links created via Stripe MCP, active products). */
const STRIPE_LIVE_PRICE_IDS = {
    starterMonthly: 'price_1SrZvMICnVdp6T4Nugaf5hW2',
    starterYearly: 'price_1Syj9oICnVdp6T4NK0sID4nl',
    growthMonthly: 'price_1SrZv0ICnVdp6T4NN9HRCr0y',
    growthYearly: 'price_1SzTRGICnVdp6T4NGj0uYQJC',
    scaleMonthly: 'price_1SrZolICnVdp6T4NcQV8ldps',
    scaleYearly: 'price_1SyjBtICnVdp6T4Nb5Zu6U8I',
} as const;

const STRIPE_LIVE_PAYMENT_LINKS = {
    starterMonthly: 'https://buy.stripe.com/fZuaEY8yu7fMe8v6N78Ra0d',
    starterYearly: 'https://buy.stripe.com/5kQdRa4iefMic0nfjD8Ra0g',
    growthMonthly: 'https://buy.stripe.com/7sYdRa6qmfMi9Sf4EZ8Ra0e',
    growthYearly: 'https://buy.stripe.com/aFa8wQaGC9nU5BZ9Zj8Ra0h',
    scaleMonthly: 'https://buy.stripe.com/dRm14obKGcA6d4r3AV8Ra0f',
    scaleYearly: 'https://buy.stripe.com/4gM5kE7uqbw2fcz3AV8Ra0i',
} as const;

function stripePriceId(
    envVal: string | undefined,
    liveDefault: string
): string {
    if (envVal) return envVal
    return STRIPE_TEST_MODE ? '' : liveDefault
}

/** Test Payment Links use `buy.stripe.com/test_...`; live checkout URLs do not include `/test`. */
function isLiveBuyStripeCheckoutUrl(url: string): boolean {
    return url.includes('buy.stripe.com/') && !url.includes('buy.stripe.com/test')
}

function stripePaymentLink(
    envVal: string | undefined,
    liveDefault: string
): string {
    if (envVal) {
        if (STRIPE_TEST_MODE && isLiveBuyStripeCheckoutUrl(envVal)) {
            console.warn(
                '[Repflow] Ignoring a live Stripe Payment Link in test mode. Use test links (buy.stripe.com/test_...) or NEXT_PUBLIC_STRIPE_*_PAYMENT_LINK_TEST.'
            )
        } else {
            return envVal
        }
    }
    return STRIPE_TEST_MODE ? '' : liveDefault
}

// Subscription Tiers Configuration
export const SUBSCRIPTION_TIERS = {
    STARTER: {
        disabled: false,
        id: "starter",
        name: "Starter",
        price: 39,
        yearlyPrice: 390, // 39 × 10 (save 2 months)
        description: "For creators getting started with sponsorships",
        features: [
            "5 pre-qualified offers/mo",

            "Deal Tracker",

            "Email-to-Chat Messenger ",

            "Sharable Sponsorship Page",
        ],
        stripePriceId: stripePriceId(
            devStripeEnv('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID'),
            STRIPE_LIVE_PRICE_IDS.starterMonthly
        ),
        paymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_STARTER_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.starterMonthly
        ),
        yearlyPaymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.starterYearly
        ),
    },
    GROWTH: {
        disabled: false,
        id: "growth",
        name: "Growth",
        price: 179,
        yearlyPrice: 1790, // 179 × 10 (save 2 months)
        description: "For creators ready to increase deal flow & revenue",
        features: [
            "Unlimited pre-qualified offers/mo",
            "Analytics Dashboard",
            "Referral Program Access",
            "Deal Tracker",
            "Email-to chat messenger",
            "Sharable Sponsorship Page",
        ],
        stripePriceId: stripePriceId(
            devStripeEnv('NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID'),
            STRIPE_LIVE_PRICE_IDS.growthMonthly
        ),
        paymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_GROWTH_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.growthMonthly
        ),
        yearlyPaymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.growthYearly
        ),
    },
    SCALE: {
        disabled: true,
        id: "scale",
        name: "Scale",
        price: 279,
        yearlyPrice: 2790, // 279 × 10 (save 2 months)
        description:
            "For teams & high-volume creators top-tier brand access & operations",
        features: [
            "Everything in Growth",
            "Up to 3 team members",
            "Preferred Brand Proposals",
            "Custom Sponsorship Page",
        ],
        stripePriceId: stripePriceId(
            devStripeEnv('NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID'),
            STRIPE_LIVE_PRICE_IDS.scaleMonthly
        ),
        paymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_SCALE_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.scaleMonthly
        ),
        yearlyPaymentLink: stripePaymentLink(
            devStripeEnv('NEXT_PUBLIC_STRIPE_SCALE_YEARLY_PAYMENT_LINK'),
            STRIPE_LIVE_PAYMENT_LINKS.scaleYearly
        ),
    },
};

// Helper functions for payment link and price selection
export const getPaymentLink = (tierId: string, isYearly: boolean): string => {
    const tier = SUBSCRIPTION_TIERS[tierId.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS];
    if (!tier) return "";
    return isYearly ? tier.yearlyPaymentLink : tier.paymentLink;
};

export const getPrice = (tierId: string, isYearly: boolean): number => {
    const tier = SUBSCRIPTION_TIERS[tierId.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS];
    if (!tier) return 0;
    return isYearly ? tier.yearlyPrice : tier.price;
};
