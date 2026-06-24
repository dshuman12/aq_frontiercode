import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { API_BASE_URL } from "@/app/constants/constants";

export async function POST(request: NextRequest) {
    try {
        // Get the current session
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code, platform } = await request.json();
        
        if (!code) {
            return NextResponse.json({ 
                error: "Authorization code is required" 
            }, { status: 400 });
        }

        console.log('=== INSTAGRAM TOKEN UPDATE REQUEST ===');
        console.log('Authorization code received');
        console.log('Platform:', platform);

        // Exchange code for access token
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.INSTAGRAM_APP_ID!,
                client_secret: process.env.INSTAGRAM_APP_SECRET!,
                grant_type: 'authorization_code',
                redirect_uri: `${process.env.NEXTAUTH_URL}/auth/instagram-reconnect/callback`,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            throw new Error('Failed to exchange authorization code for access token');
        }

        const tokenData = await tokenResponse.json();
        console.log('Token data received:', { 
            access_token: tokenData.access_token ? '***' : 'missing',
            user_id: tokenData.user_id 
        });

        // Exchange short-lived token for long-lived token
        const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`);

        if (!longLivedTokenResponse.ok) {
            console.error('Long-lived token exchange failed');
            // Continue with short-lived token if long-lived fails
        }

        let longLivedTokenData = null;
        if (longLivedTokenResponse.ok) {
            longLivedTokenData = await longLivedTokenResponse.json();
            console.log('Long-lived token received');
        }

        const finalAccessToken = longLivedTokenData?.access_token || tokenData.access_token;
        const instagramUserId = tokenData.user_id;

        // Update the platform in the backend with new token
        const updateResponse = await fetch(`${API_BASE_URL}/users/platforms/update-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platformName: platform,
                accessToken: finalAccessToken,
                instagramUserId: instagramUserId,
                tokenType: longLivedTokenData ? 'long_lived' : 'short_lived',
                expiresIn: longLivedTokenData?.expires_in || tokenData.expires_in,
            }),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Failed to update platform token:', errorData);
            throw new Error('Failed to update Instagram token in database');
        }

        const updateData = await updateResponse.json();
        console.log('Platform token updated successfully');

        return NextResponse.json({
            success: true,
            message: 'Instagram token updated successfully',
            platform: updateData.platform,
        });

    } catch (error) {
        console.error('Instagram token update error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to update Instagram token' 
            },
            { status: 500 }
        );
    }
}
