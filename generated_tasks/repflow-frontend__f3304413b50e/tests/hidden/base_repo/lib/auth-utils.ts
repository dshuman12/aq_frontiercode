import { getSession } from "next-auth/react";

export interface CognitoTokens {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
}

/**
 * Get Cognito JWT tokens from the current session
 * @returns Promise containing the Cognito tokens
 */
export async function getCognitoTokens(): Promise<CognitoTokens | null> {
    const session = await getSession();
    
    if (!session) {
        return null;
    }

    return {
        accessToken: (session as any).accessToken,
        idToken: (session as any).idToken,
        refreshToken: (session as any).refreshToken,
    };
}

/**
 * Get the Cognito access token for API requests
 * @returns Promise containing the access token or null
 */
export async function getAccessToken(): Promise<string> {
    const tokens = await getCognitoTokens();
    return tokens?.accessToken || '';
}

/**
 * Get the Cognito ID token (contains user claims)
 * @returns Promise containing the ID token or null
 */
export async function getIdToken(): Promise<string> {
    const tokens = await getCognitoTokens();
    return tokens?.idToken || '';
}

/**
 * Get the user ID from the current session
 * @returns Promise containing the user ID or null
 */
export async function getUserId(): Promise<string | null> {
    const session = await getSession();
    
    if (!session?.user) {
        return null;
    }

    return (session.user as any).id || null;
}

/**
 * Get authorization headers for API requests
 * @returns Promise containing the authorization headers
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await getAccessToken();
    console.log("accessToken", accessToken);
    if (!accessToken) {
        return {};
    }

    return {
        'Authorization': `Bearer ${accessToken}`,
    };
}

/**
 * Decode JWT payload (without verification - for client-side use only)
 * @param token - The JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeJwtPayload(token: string): any {
    try {
        const base64Payload = token.split('.')[1];
        const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
        return JSON.parse(payload);
    } catch (error) {
        console.error('Error decoding JWT payload:', error);
        return null;
    }
}

/**
 * Get user claims from Cognito ID token
 * @returns Promise containing user claims or null
 */
export async function getUserClaims(): Promise<any> {
    const idToken = await getIdToken();
    
    if (!idToken) {
        return null;
    }

    return decodeJwtPayload(idToken);
}

/**
 * Get the repflow_username from the current session
 * @returns Promise containing the repflow_username or null
 */
export async function getRepflowUsername(): Promise<string | null> {
    const session = await getSession();
    
    if (!session?.user) {
        return null;
    }

    // Try to get repflow_username from user object
    const repflowUsername = (session.user as any).repflow_username;
    
    if (repflowUsername) {
        return repflowUsername;
    }

    // Fallback: try to get from Cognito claims
    const claims = await getUserClaims();
    return claims?.preferred_username || null;
}

/**
 * Get the user's actual name from the current session
 * @returns Promise containing the user's name or null
 */
export async function getUserName(): Promise<string | null> {
    const session = await getSession();
    
    if (!session?.user) {
        return null;
    }

    // Try to get name from user object (NextAuth standard field)
    if (session.user.name) {
        return session.user.name;
    }

    // Try to get from Cognito claims
    const claims = await getUserClaims();
    
    if (claims) {
        // Try different name fields from Cognito
        if (claims.name) {
            return claims.name;
        }
        
        // Construct name from given_name and family_name
        const firstName = claims.given_name || '';
        const lastName = claims.family_name || '';
        
        if (firstName || lastName) {
            return [firstName, lastName].filter(Boolean).join(' ');
        }
        
        // Fallback to email prefix if no name is available
        if (claims.email) {
            return claims.email.split('@')[0];
        }
    }

    return null;
}

/**
 * Get the user's email from the current session
 * @returns Promise containing the user's email or null
 */
export async function getUserEmail(): Promise<string | null> {
    const session = await getSession();
    
    if (!session?.user) {
        return null;
    }

    // Try to get email from user object (NextAuth standard field)
    if (session.user.email) {
        return session.user.email;
    }

    // Try to get from Cognito claims
    const claims = await getUserClaims();
    
    if (claims?.email) {
        return claims.email;
    }

    return null;
}
