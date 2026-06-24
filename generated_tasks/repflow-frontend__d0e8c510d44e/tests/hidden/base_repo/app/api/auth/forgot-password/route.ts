import {
  AWS_ACCESS_KEY_ID,
  AWS_COGNITO_CLIENT_ID,
  AWS_COGNITO_CLIENT_SECRET,
  AWS_COGNITO_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "@/app/constants/constants";
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
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
    const { email } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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

    const clientId = AWS_COGNITO_CLIENT_ID;
    const clientSecret = AWS_COGNITO_CLIENT_SECRET;

    const forgotPasswordParams: any = {
      ClientId: clientId,
      Username: email,
    };

    // Add SECRET_HASH if client secret is configured
    if (clientSecret) {
      forgotPasswordParams.SecretHash = calculateSecretHash(
        email,
        clientId,
        clientSecret
      );
    }

    const command = new ForgotPasswordCommand(forgotPasswordParams);
    const response = await cognitoClient.send(command);

    console.log("Password reset code sent successfully for user:", email);

    return NextResponse.json({
      message:
        "Password reset code sent successfully. Please check your email.",
      codeDeliveryDetails: response.CodeDeliveryDetails,
    });
  } catch (error: any) {
    console.error("Forgot password error:", {
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      name: error.name,
    });

    // Handle specific Cognito error codes
    if (error.name === "UserNotFoundException") {
      // For security, we don't reveal if user exists or not
      return NextResponse.json({
        message:
          "If an account with that email exists, a password reset code has been sent.",
      });
    } else if (error.name === "LimitExceededException") {
      return NextResponse.json(
        {
          error:
            "Too many requests. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    } else if (error.name === "InvalidParameterException") {
      return NextResponse.json(
        { error: "Invalid email address provided." },
        { status: 400 }
      );
    } else if (error.name === "NotAuthorizedException") {
      return NextResponse.json(
        {
          error:
            "Password reset is not allowed for this user. Please contact support.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send password reset code. Please try again." },
      { status: 500 }
    );
  }
}
