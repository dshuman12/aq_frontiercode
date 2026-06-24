import {
  API_BASE_URL,
  AWS_ACCESS_KEY_ID,
  AWS_COGNITO_CLIENT_ID,
  AWS_COGNITO_CLIENT_SECRET,
  AWS_COGNITO_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "@/app/constants/constants";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "node:crypto";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Function to calculate SECRET_HASH for Cognito authentication
function calculateSecretHash(
  username: string,
  clientId: string,
  clientSecret: string
): string {
  const message = username + clientId;
  return createHmac("sha256", clientSecret).update(message).digest("base64");
}

let cognitoClient: CognitoIdentityProviderClient;

if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
  // Create Cognito client once and reuse
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

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Calculate SECRET_HASH if client secret is provided
        const clientId = AWS_COGNITO_CLIENT_ID;
        const clientSecret = AWS_COGNITO_CLIENT_SECRET;

        const authParameters: Record<string, string> = {
          USERNAME: credentials.username,
          PASSWORD: credentials.password,
        };

        // Add SECRET_HASH if client secret is configured
        if (clientSecret) {
          authParameters.SECRET_HASH = calculateSecretHash(
            credentials.username,
            clientId,
            clientSecret
          );
        }

        const command = new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: clientId,
          AuthParameters: authParameters,
        });

        try {
          const response = await cognitoClient.send(command);

          console.log("Cognito response structure:", {
            hasAuthenticationResult: !!response.AuthenticationResult,
            hasChallengeName: !!response.ChallengeName,
            challengeName: response.ChallengeName,
            hasSession: !!response.Session,
          });

          // Handle successful authentication
          if (
            response.AuthenticationResult &&
            response.AuthenticationResult.AccessToken
          ) {
            // Extract JWT tokens from Cognito response
            const accessToken = response.AuthenticationResult.AccessToken;
            const idToken = response.AuthenticationResult.IdToken;
            const refreshToken = response.AuthenticationResult.RefreshToken;

            console.log("Cognito JWT tokens received:", {
              accessToken: accessToken ? "Present" : "Missing",
              idToken: idToken ? "Present" : "Missing",
              refreshToken: refreshToken ? "Present" : "Missing",
            });

            // Fetch userID from backend using email
            try {
              const userResponse = await fetch(
                `${
                  API_BASE_URL
                }/users/by-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: credentials.username }),
                }
              );

              if (userResponse.ok) {
                const userData = await userResponse.json();
                const user = {
                  id: userData.userId || credentials.username,
                  name: userData.name || credentials.username,
                  repflow_username:
                    userData.repflow_username || credentials.username,
                  email: userData.email || credentials.username,
                  accessToken: accessToken,
                  idToken: idToken,
                  refreshToken: refreshToken,
                };
                return user;
              }

              // Backend failed or user not in DB yet: allow sign-in using email as fallback
              console.warn(
                "Failed to fetch user from backend, using email as fallback (status:",
                userResponse.status,
                ")"
              );
              const fallbackUser = {
                id: credentials.username,
                name: credentials.username,
                repflow_username: credentials.username,
                repflowUsername: credentials.username,
                email: credentials.username,
                accessToken,
                idToken,
                refreshToken,
              };
              return fallbackUser;
            } catch (fetchError) {
              console.error("Error fetching user from backend:", fetchError);
              // Network/backend error: still allow sign-in so user isn't blocked
              const fallbackUser = {
                id: credentials.username,
                name: credentials.username,
                repflow_username: credentials.username,
                repflowUsername: credentials.username,
                email: credentials.username,
                accessToken,
                idToken,
                refreshToken,
              };
              return fallbackUser;
            }
          }

          // Handle authentication challenges
          if (response.ChallengeName) {
            console.log(
              `Cognito authentication challenge required: ${response.ChallengeName}`,
              {
                challengeParameters: response.ChallengeParameters,
                session: response.Session ? "Present" : "Missing",
              }
            );

            // For now, we don't support multi-step authentication
            // Log the specific challenge for debugging
            switch (response.ChallengeName) {
              case "NEW_PASSWORD_REQUIRED":
                console.error(
                  "User needs to set a new password during first login"
                );
                throw new Error(
                  "NEW_PASSWORD_REQUIRED: Please contact support to complete your account setup"
                );
              case "SMS_MFA":
              case "SOFTWARE_TOKEN_MFA":
                console.error(
                  "MFA challenge required but not supported in this flow"
                );
                throw new Error(
                  "MFA_REQUIRED: Multi-factor authentication is required but not currently supported"
                );
              case "PASSWORD_VERIFIER":
                console.error(
                  "SRP password verifier challenge - should not occur with USER_PASSWORD_AUTH"
                );
                throw new Error(
                  "PASSWORD_VERIFIER: Unexpected authentication flow"
                );
              default:
                console.error(`Unknown challenge: ${response.ChallengeName}`);
                throw new Error(
                  `UNSUPPORTED_CHALLENGE: ${response.ChallengeName}`
                );
            }
          }

          // If we reach here, authentication failed without a clear reason
          console.log(
            "Cognito authentication failed: No authentication result or challenge",
            {
              responseKeys: Object.keys(response),
              authenticationResult: response.AuthenticationResult,
              challengeName: response.ChallengeName,
            }
          );
          return null;
        } catch (error: any) {
          console.error("Cognito authentication error:", {
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            name: error.name,
            requestId: error.$metadata?.requestId,
            service: error.$metadata?.serviceId,
            region: error.$metadata?.region,
            // Log additional error details if available
            ...(error.__type && { type: error.__type }),
            ...(error.code && { errorCode: error.code }),
          });

          // Handle specific Cognito error codes (throw so sign-in page can show message)
          if (error.name === "NotAuthorizedException") {
            const msg = (error.message ?? "").toLowerCase();
            if (msg.includes("password attempts exceeded")) {
              console.error("Authentication failed: Password attempts exceeded (rate limit)");
              throw new Error(
                "Too many failed login attempts. Please try again in a few minutes."
              );
            }
            console.error(
              "Authentication failed: Invalid username or password"
            );
          } else if (error.name === "UserNotFoundException") {
            console.error("Authentication failed: User does not exist");
          } else if (error.name === "UserNotConfirmedException") {
            console.error("Authentication failed: User email not confirmed");
          } else if (error.name === "TooManyRequestsException") {
            console.error("Authentication failed: Too many login attempts");
          } else if (error.name === "InvalidParameterException") {
            console.error("Authentication failed: Invalid parameters provided");
          }

          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    // Note: NextAuth doesn't have a built-in signup page option
    // We handle signup through our custom page and API routes
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Store Cognito JWT tokens in NextAuth token
        token.accessToken = (user as any).accessToken;
        token.idToken = (user as any).idToken;
        token.refreshToken = (user as any).refreshToken;
        token.repflowUsername = (user as any).repflowUsername;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        // Make Cognito JWT tokens available in session
        (session as any).accessToken = token.accessToken;
        (session as any).idToken = token.idToken;
        (session as any).refreshToken = token.refreshToken;
        (session as any).repflowUsername = token.repflowUsername;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
