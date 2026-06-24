import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
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
        const email = typeof body.email === 'string' ? body.email.trim() : ''
        const confirmationCode =
            typeof body.confirmationCode === 'string'
                ? body.confirmationCode.replace(/\s/g, '')
                : ''

        // Validation
        if (!email || !confirmationCode) {
            return NextResponse.json(
                { error: 'Email and confirmation code are required' },
                { status: 400 }
            );
        }

        const defaults = defaultCognitoPoolAndClient()
        const clientId =
            process.env.AWS_COGNITO_CLIENT_ID?.trim() || defaults.clientId
        const clientSecret = process.env.AWS_COGNITO_CLIENT_SECRET?.trim() ?? ''

        const confirmParams: any = {
            ClientId: clientId,
            Username: email,
            ConfirmationCode: confirmationCode,
        };

        // Add SECRET_HASH if client secret is configured
        if (clientSecret) {
            confirmParams.SecretHash = calculateSecretHash(email, clientId, clientSecret);
        }

        const command = new ConfirmSignUpCommand(confirmParams);
        await cognitoClient.send(command);

        console.log("Email confirmation successful for user:", email);

        return NextResponse.json({
            message: 'Email confirmed successfully. You can now sign in.',
        });

    } catch (error: any) {
        console.error("Email confirmation error:", {
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            name: error.name
        });

        // Handle specific Cognito errors
        if (error.name === 'CodeMismatchException') {
            return NextResponse.json(
                { error: 'Invalid confirmation code. Please check and try again.' },
                { status: 400 }
            );
        }

        if (error.name === 'ExpiredCodeException') {
            return NextResponse.json(
                { error: 'Confirmation code has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        if (error.name === 'UserNotFoundException') {
            return NextResponse.json(
                { error: 'User not found. Please check your email address.' },
                { status: 404 }
            );
        }

        if (error.name === 'NotAuthorizedException') {
            return NextResponse.json(
                { error: 'User is already confirmed or invalid request.' },
                { status: 400 }
            );
        }

        if (error.name === 'InvalidParameterException') {
            return NextResponse.json(
                {
                    error:
                        'That code looks invalid (for example, spaces or partial digits). Paste the 6-digit code from your email and try again.',
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Email confirmation failed. Please try again.' },
            { status: 500 }
        );
    }
}
