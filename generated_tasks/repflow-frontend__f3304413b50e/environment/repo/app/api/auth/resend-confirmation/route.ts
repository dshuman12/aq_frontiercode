import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { AWS_ACCESS_KEY_ID, AWS_COGNITO_REGION, AWS_SECRET_ACCESS_KEY } from '@/app/constants/constants';
import { defaultCognitoPoolAndClient } from '@/app/lib/cognito-env-defaults';

// Function to calculate SECRET_HASH for Cognito authentication
function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    const message = username + clientId;
    return createHmac('sha256', clientSecret).update(message).digest('base64');
}

// Create Cognito client once and reuse
const cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_COGNITO_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validation
        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const defaults = defaultCognitoPoolAndClient()
        const clientId =
            process.env.AWS_COGNITO_CLIENT_ID?.trim() || defaults.clientId
        const clientSecret = process.env.AWS_COGNITO_CLIENT_SECRET?.trim() ?? ''

        const resendParams: any = {
            ClientId: clientId,
            Username: email,
        };

        // Add SECRET_HASH if client secret is configured
        if (clientSecret) {
            resendParams.SecretHash = calculateSecretHash(email, clientId, clientSecret);
        }

        const command = new ResendConfirmationCodeCommand(resendParams);
        const response = await cognitoClient.send(command);

        console.log("Confirmation code resent successfully for user:", email);

        return NextResponse.json({
            message: 'Confirmation code sent successfully. Please check your email.',
            codeDeliveryDetails: response.CodeDeliveryDetails,
        });

    } catch (error: any) {
        console.error("Resend confirmation code error:", {
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            name: error.name
        });

        // Handle specific Cognito errors
        if (error.name === 'UserNotFoundException') {
            return NextResponse.json(
                { error: 'User not found. Please check your email address.' },
                { status: 404 }
            );
        }

        if (error.name === 'InvalidParameterException') {
            return NextResponse.json(
                { error: 'User is already confirmed.' },
                { status: 400 }
            );
        }

        if (error.name === 'LimitExceededException') {
            return NextResponse.json(
                { error: 'Too many requests. Please wait before requesting another code.' },
                { status: 429 }
            );
        }

        // Cognito returns this when the user pool has no auto-verified attributes (e.g. email) configured
        if (
            error.name === 'NotAuthorizedException' &&
            typeof error.message === 'string' &&
            error.message.includes('Auto verification')
        ) {
            return NextResponse.json(
                {
                    error:
                        'Email verification is not enabled for this Cognito user pool. In AWS Console: User pool → Sign-up experience → ensure email verification / auto-verified attributes include email.',
                },
                { status: 503 }
            );
        }

        if (error.name === 'NotAuthorizedException') {
            return NextResponse.json(
                { error: error.message || 'Unable to resend code. Check Cognito app client and pool settings.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to resend confirmation code. Please try again.' },
            { status: 500 }
        );
    }
}
