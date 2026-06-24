import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminGetUserCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { AWS_ACCESS_KEY_ID, AWS_COGNITO_REGION, AWS_SECRET_ACCESS_KEY, AWS_COGNITO_USER_POOL_ID } from '@/app/constants/constants';

// Create Cognito client
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
        const { email, repflow_username } = body;

        const errors: {
            email?: string;
            repflow_username?: string;
        } = {};

        // Check if email exists in Cognito
        if (email) {
            try {
                const getUserCommand = new AdminGetUserCommand({
                    UserPoolId: AWS_COGNITO_USER_POOL_ID,
                    Username: email,
                });
                await cognitoClient.send(getUserCommand);
                // If we get here, user exists
                errors.email = 'An account with this email already exists';
            } catch (error: any) {
                // UserNotFoundException means the email is available
                if (error.name !== 'UserNotFoundException') {
                    console.error("Error checking email availability:", error);
                }
            }
        }

        // Check if username exists in Cognito
        if (repflow_username) {
            try {
                const listUsersCommand = new ListUsersCommand({
                    UserPoolId: AWS_COGNITO_USER_POOL_ID,
                    Filter: `preferred_username = "${repflow_username}"`,
                    Limit: 1,
                });
                const response = await cognitoClient.send(listUsersCommand);
                
                if (response.Users && response.Users.length > 0) {
                    errors.repflow_username = 'This username is already taken';
                }
            } catch (error: any) {
                console.error("Error checking username availability:", error);
            }
        }

        const available = Object.keys(errors).length === 0;

        return NextResponse.json({
            available,
            errors,
        });

    } catch (error: any) {
        console.error("Check availability error:", error);
        return NextResponse.json(
            { error: 'Failed to check availability. Please try again.' },
            { status: 500 }
        );
    }
}

