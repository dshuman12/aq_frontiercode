import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { AWS_ACCESS_KEY_ID, AWS_COGNITO_CLIENT_SECRET, AWS_COGNITO_REGION, AWS_SECRET_ACCESS_KEY } from '@/app/constants/constants';
import { AWS_COGNITO_CLIENT_ID } from '@/app/constants/constants';

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
        const { email, password, confirmPassword, firstName, lastName, repflow_username } = body;

        // Validation
        if (!email || !password || !confirmPassword || !repflow_username) {
            return NextResponse.json(
                { error: 'Email, password, password confirmation, and username are required' },
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

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
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

        const clientId = AWS_COGNITO_CLIENT_ID;
        const clientSecret = AWS_COGNITO_CLIENT_SECRET;

        // Build formatted name
        const formattedName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
        
        // NOTE: If you get "Attributes did not conform to the schema" errors:
        // 1. Check your Cognito User Pool in AWS Console
        // 2. Go to User pool > Attributes
        // 3. Check the exact names of required attributes
        // 4. Update the attribute names below to match your schema
        
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
                },
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
        
        // Note: User will be created in backend after onboarding is completed
        // For now, we just store the signup data in Cognito

        return NextResponse.json({
            message: 'User registered successfully. Please check your email for verification.',
            userSub: response.UserSub,
            codeDeliveryDetails: response.CodeDeliveryDetails,
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
                { error: 'An account with this username already exists' },
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
