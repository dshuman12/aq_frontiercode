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

        const { code, state } = await request.json();
        
        if (!code || !state) {
            return NextResponse.json({ 
                error: "Code and state parameters are required" 
            }, { status: 400 });
        }

        console.log('=== YOUTUBE OAUTH CALLBACK REQUEST ===');
        console.log('Code received');
        console.log('State:', state);

        // Call the backend YouTube OAuth callback endpoint
        const callbackResponse = await fetch(`${API_BASE_URL}/users/youtube-oauth/callback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                state
            }),
        });

        if (!callbackResponse.ok) {
            const errorData = await callbackResponse.json();
            console.log('Failed to exchange YouTube authorization code:', errorData);
            throw new Error(`Failed to exchange authorization code: ${errorData.message || 'Unknown error'}`);
        }

        const callbackData = await callbackResponse.json();
        console.log('YouTube OAuth callback response:', callbackData);

        return NextResponse.json({
            success: true,
            tokens: callbackData.tokens,
            channelInfo: callbackData.channelInfo,
            message: 'YouTube authorization successful',
        });

    } catch (error) {
        console.error('YouTube OAuth callback error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to exchange YouTube authorization code' 
            },
            { status: 500 }
        );
    }
}
