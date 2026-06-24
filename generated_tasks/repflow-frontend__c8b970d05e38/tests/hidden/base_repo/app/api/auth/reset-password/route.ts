import {
  AWS_ACCESS_KEY_ID,
  AWS_COGNITO_CLIENT_ID,
  AWS_COGNITO_CLIENT_SECRET,
  AWS_COGNITO_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "@/app/constants/constants";
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Function to calculate SECRET_HASH for Cognito authentication
function calculateSecretHash(
  username: string,
  clientId: string,
  clientSecret: string
): string {
  const message = username + clientId;
  return createHmac("sha256", clientSecret).update(message).digest("base64");
}

// Create Cognito client once and reuse
let cognitoClient: CognitoIdentityProviderClient;

if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
  cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_COGNITO_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  // Use IAM instance role credentials (AWS App Runner)
  cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_COGNITO_REGION,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Trim inputs so Cognito's [\S]+ constraint on ConfirmationCode is satisfied
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword.trim() : "";

    // Validation
    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, verification code, and new password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password requirements
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 }
      );
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must contain at least one special character" },
        { status: 400 }
      );
    }

    const clientId = AWS_COGNITO_CLIENT_ID;
    const clientSecret = AWS_COGNITO_CLIENT_SECRET;

    const confirmPasswordParams: any = {
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    };

    // Add SECRET_HASH if client secret is configured
    if (clientSecret) {
      confirmPasswordParams.SecretHash = calculateSecretHash(
        email,
        clientId,
        clientSecret
      );
    }

    const command = new ConfirmForgotPasswordCommand(confirmPasswordParams);
    await cognitoClient.send(command);

    console.log("Password reset successful for user:", email);

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", {
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      name: error.name,
    });

    // Handle specific Cognito error codes
    if (error.name === "CodeMismatchException") {
      return NextResponse.json(
        { error: "Invalid verification code. Please check the code and try again." },
        { status: 400 }
      );
    } else if (error.name === "ExpiredCodeException") {
      return NextResponse.json(
        {
          error:
            "Verification code has expired. Please request a new password reset code.",
        },
        { status: 400 }
      );
    } else if (error.name === "UserNotFoundException") {
      return NextResponse.json(
        { error: "User not found. Please check your email address." },
        { status: 404 }
      );
    } else if (error.name === "InvalidPasswordException") {
      return NextResponse.json(
        {
          error:
            "Password does not meet requirements. Please ensure it has at least 8 characters, one uppercase letter, one number, and one special character.",
        },
        { status: 400 }
      );
    } else if (error.name === "LimitExceededException") {
      return NextResponse.json(
        {
          error:
            "Too many attempts. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    } else if (error.name === "TooManyFailedAttemptsException") {
      return NextResponse.json(
        {
          error:
            "Too many failed attempts. Please request a new password reset code.",
        },
        { status: 429 }
      );
    } else if (error.name === "InvalidParameterException") {
      return NextResponse.json(
        {
          error:
            "Invalid verification code format. Please enter the code without spaces and try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
