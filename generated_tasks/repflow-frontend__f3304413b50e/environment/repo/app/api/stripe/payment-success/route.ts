import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { sessionId, stripeSessionId, customerEmail } = await request.json();

        if (!sessionId || !customerEmail) {
            return NextResponse.json(
                { error: 'Session ID and customer email are required' },
                { status: 400 }
            );
        }

        // Here you would:
        // 1. Retrieve the pending user data using sessionId
        // 2. Verify the payment was successful with Stripe
        // 3. Complete referral if applicable
        // 4. Return success response

        console.log('Payment successful for session:', {
            sessionId,
            stripeSessionId,
            customerEmail
        });

        return NextResponse.json({
            success: true,
            message: 'Payment completed successfully',
            sessionId,
            nextSteps: 'redirect_to_onboarding'
        });

    } catch (error: any) {
        console.error('Payment success handler error:', error);
        return NextResponse.json(
            { error: 'Failed to process payment success' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    // Handle GET requests from Stripe payment link redirects
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const data = searchParams.get('data');

    if (!sessionId || !data) {
        return NextResponse.redirect('/payment/error?reason=missing_session');
    }

    try {
        // Decode user data
        const decodedData = JSON.parse(Buffer.from(data, 'base64').toString());
        
        // In a real app, you'd verify the payment status with Stripe here
        console.log('Payment success redirect:', {
            sessionId,
            decodedData
        });

        // Redirect to success page with encoded data
        const successUrl = `/payment/success?session_id=${sessionId}&data=${data}`;
        return NextResponse.redirect(successUrl);

    } catch (error) {
        console.error('Error processing payment success redirect:', error);
        return NextResponse.redirect('/payment/error?reason=invalid_session');
    }
}
