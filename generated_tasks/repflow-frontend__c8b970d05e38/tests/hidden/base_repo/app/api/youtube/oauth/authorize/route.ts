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

        const { state } = await request.json();
        
        if (!state) {
            return NextResponse.json({ 
                error: "State parameter is required" 
            }, { status: 400 });
        }

        console.log('=== YOUTUBE OAUTH AUTHORIZE REQUEST ===');
        console.log('State:', state);

        // Call the backend YouTube OAuth authorize endpoint
        const authResponse = await fetch(`${API_BASE_URL}/users/youtube-oauth/authorize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state
            }),
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.json();
            console.log('Failed to get YouTube authorization URL:', errorData);
            throw new Error(`Failed to get YouTube authorization URL: ${errorData.message || 'Unknown error'}`);
        }

        const authData = await authResponse.json();
        console.log('YouTube authorization response:', authData);

        return NextResponse.json({
            success: true,
            authUrl: authData.authorizationUrl,
            state: authData.state,
        });

    } catch (error) {
        console.error('YouTube OAuth authorize error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to get YouTube authorization URL' 
            },
            { status: 500 }
        );
    }
}
