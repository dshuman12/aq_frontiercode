import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/app/constants/constants';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { referralCode, customerEmail, tier, amount, stripeCustomerId } = body;

        if (!referralCode || !customerEmail || !tier || !amount) {
            console.error('Missing required fields: referralCode, customerEmail, tier, amount');
            console.log('Body:', body);
            return NextResponse.json(
                { error: 'Missing required fields: referralCode, customerEmail, tier, amount' },
                { status: 400 }
            );
        }

        console.log(`Processing referral completion for code: ${referralCode}, customer: ${customerEmail}, amount: $${amount}`);

        // Call the backend endpoint that handles all the processing logic
        const backendResponse = await fetch(`${API_BASE_URL}/referrals/frontend/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                referralCode: referralCode,
                customerEmail: customerEmail,
                tier: tier,
                amount: amount,
                stripeCustomerId: stripeCustomerId
            })
        });

        if (!backendResponse.ok) {
            console.error('Backend referral completion failed:', await backendResponse.text());
            return NextResponse.json(
                { error: 'Failed to complete referral' },
                { status: 500 }
            );
        }

        const result = await backendResponse.json();
        console.log('Referral completion result:', result);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error handling referral completion:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
