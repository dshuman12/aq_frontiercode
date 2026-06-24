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

        const { oauth_credentials, include_demographics = false } = await request.json();
        
        if (!oauth_credentials) {
            return NextResponse.json({ 
                error: "OAuth credentials are required" 
            }, { status: 400 });
        }

        console.log('=== YOUTUBE ANALYTICS REQUEST ===');
        console.log('Include demographics:', include_demographics);

        // Call the backend YouTube analytics endpoint
        const analyticsResponse = await fetch(`${API_BASE_URL}/users/youtube-analytics`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                include_demographics,
                oauth_credentials
            }),
        });

        if (!analyticsResponse.ok) {
            const errorData = await analyticsResponse.json();
            console.log('Failed to fetch YouTube analytics:', errorData);
            throw new Error(`Failed to fetch YouTube analytics: ${errorData.message || 'Unknown error'}`);
        }

        const analyticsData = await analyticsResponse.json();
        console.log('YouTube analytics response:', analyticsData);

        return NextResponse.json({
            success: true,
            message: 'YouTube analytics fetched successfully',
            analytics: analyticsData.analytics,
            channelId: analyticsData.channelId,
        });

    } catch (error) {
        console.error('YouTube analytics error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to fetch YouTube analytics' 
            },
            { status: 500 }
        );
    }
}
