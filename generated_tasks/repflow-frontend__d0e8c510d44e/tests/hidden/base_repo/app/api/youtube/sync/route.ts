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

        const { accessToken, platform } = await request.json();
        
        if (!accessToken || !platform) {
            return NextResponse.json({ 
                error: "Access token and platform object are required" 
            }, { status: 400 });
        }

        // Extract channel ID from platform.handle
        const channelId = platform.handle.includes('/channel/') 
            ? platform.handle.split('/channel/')[1] 
            : platform.handle;

        if (!channelId) {
            return NextResponse.json({ 
                error: "YouTube channel ID not found in platform handle" 
            }, { status: 400 });
        }

        console.log('=== YOUTUBE SYNC REQUEST ===');
        console.log('Channel ID:', channelId);
        console.log('Platform Name:', platform.name);

        // Call the backend YouTube analytics endpoint
        const analyticsResponse = await fetch(`${API_BASE_URL}/users/youtube-analytics`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelId,
                include_demographics: true,
                oauth_credentials: {
                    access_token: accessToken,
                    // Add other OAuth credentials if available
                }
            }),
        });

        if (!analyticsResponse.ok) {
            const errorData = await analyticsResponse.json();
            console.log('Failed to fetch YouTube analytics:', errorData);
            throw new Error(`Failed to fetch YouTube analytics: ${errorData.message || 'Unknown error'}`);
        }

        const analyticsData = await analyticsResponse.json();
        console.log('YouTube analytics response:', analyticsData);

        if (!analyticsData.success) {
            throw new Error(`YouTube analytics failed: ${analyticsData.message}`);
        }

        return NextResponse.json({
            success: true,
            message: 'YouTube data synced successfully',
            platform: analyticsData.updatedPlatform,
        });

    } catch (error) {
        console.error('YouTube sync error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to sync YouTube data' 
            },
            { status: 500 }
        );
    }
}

