import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { AWS_ACCESS_KEY_ID, AWS_COGNITO_REGION, AWS_SECRET_ACCESS_KEY } from '@/app/constants/constants';
import { defaultCognitoPoolAndClient } from '@/app/lib/cognito-env-defaults';

// Resolve client id/secret at request time (process.env) with the same pool defaults as constants.
function getCognitoAppConfig() {
    const defaults = defaultCognitoPoolAndClient()
    const clientId =
        process.env.AWS_COGNITO_CLIENT_ID?.trim() || defaults.clientId
    const clientSecret = process.env.AWS_COGNITO_CLIENT_SECRET?.trim() ?? ''
    return { clientId, clientSecret }
}

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
        const { email, password, firstName, lastName, repflow_username, selectedTier } = body;

        // Validation
        if (!email || !password || !repflow_username) {
            return NextResponse.json(
                { error: 'Email, password, and username are required' },
                { status: 400 }
            );
        }

        if (repflow_username.length < 3) {
            return NextResponse.json(
                { error: 'Username must be at least 3 characters long' },
                { status: 400 }
            );
        }

        if (!/^[a-zA-Z0-9_]+$/.test(repflow_username)) {
            return NextResponse.json(
                { error: 'Username can only contain letters, numbers, and underscores' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address' },
                { status: 400 }
            );
        }

        const { clientId, clientSecret } = getCognitoAppConfig()
        if (!clientId) {
            console.error(
                'create-cognito-user: AWS_COGNITO_CLIENT_ID is missing. Set it in .env.local (see env.example).'
            )
            return NextResponse.json(
                {
                    error:
                        'Server is missing AWS Cognito app client configuration. Add AWS_COGNITO_CLIENT_ID (and secret if your app client has one) to .env.local, then restart the dev server.',
                },
                { status: 503 }
            )
        }

        // Build formatted name
        const formattedName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
        
        const signUpParams: any = {
            ClientId: clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email,
                },
                {
                    Name: 'name',
                    Value: formattedName,
                },
                {
                    Name: 'profile',
                    Value: '/placeholder-user.png', // Default placeholder image
                },
                {
                    Name: 'preferred_username',
                    Value: repflow_username,
                }
            ],
        };

        // Add name attributes if provided
        if (firstName) {
            signUpParams.UserAttributes.push({
                Name: 'given_name',
                Value: firstName,
            });
        }

        if (lastName) {
            signUpParams.UserAttributes.push({
                Name: 'family_name',
                Value: lastName,
            });
        }

        // Add SECRET_HASH if client secret is configured
        if (clientSecret) {
            signUpParams.SecretHash = calculateSecretHash(email, clientId, clientSecret);
        }

        const command = new SignUpCommand(signUpParams);
        const response = await cognitoClient.send(command);

        console.log("Cognito sign-up successful for user:", email);
        console.log("User selected tier:", selectedTier);
        
        return NextResponse.json({
            message: 'User created successfully in Cognito. Please check your email for verification.',
            userSub: response.UserSub,
            codeDeliveryDetails: response.CodeDeliveryDetails,
            selectedTier: selectedTier
        });

    } catch (error: any) {
        console.error("Cognito sign-up error:", {
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            name: error.name
        });

        // Handle specific Cognito errors
        if (error.name === 'UsernameExistsException') {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        if (error.name === 'InvalidPasswordException') {
            return NextResponse.json(
                { error: 'Password does not meet requirements. Please ensure it has at least 8 characters, including uppercase, lowercase, numbers, and special characters.' },
                { status: 400 }
            );
        }

        if (error.name === 'InvalidParameterException') {
            // Check if it's an attribute schema error
            if (error.message && error.message.includes('Attributes did not conform to the schema')) {
                return NextResponse.json(
                    { error: 'Registration failed due to required profile information. Please contact support.' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: 'Invalid parameters provided. Please check your input.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Registration failed. Please try again.' },
            { status: 500 }
        );
    }
}
