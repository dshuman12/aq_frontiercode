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

        const { accessToken, instagramUserId, platform } = await request.json();
        
        if (!accessToken || !instagramUserId || !platform) {
            return NextResponse.json({ 
                error: "Access token, Instagram user ID, and platform object are required" 
            }, { status: 400 });
        }

        console.log('=== INSTAGRAM SYNC REQUEST ===');
        console.log('Instagram User ID:', instagramUserId);
        console.log('Platform Name:', platform.name);

        // Call the backend Instagram analytics endpoint
        const analyticsResponse = await fetch(`${API_BASE_URL}/users/instagram-analytics`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accessToken,
                instagramUserId,
                platform
            }),
        });

        if (!analyticsResponse.ok) {
            const errorData = await analyticsResponse.json();
            console.log('Failed to fetch Instagram analytics:', errorData);
        }

        const analyticsData = await analyticsResponse.json();
        console.log('Instagram analytics response:', analyticsData);

        if (!analyticsData.success) {
            // Handle 203 - Instagram user needs re-authentication
            if (analyticsResponse.status === 203) {
                return NextResponse.json({
                    success: false,
                    message: 'Instagram authentication expired. Please reconnect your Instagram account.',
                    requiresReauth: true,
                    redirectUrl: `/auth/instagram-reconnect?platform=${encodeURIComponent(platform.name)}`
                }, { status: 203 });
            }
            
            throw new Error(`Failed to fetch Instagram analytics: ${analyticsData.message || 'Unknown error'}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Instagram data synced successfully',
            platform: analyticsData.updatedPlatform,
        });

    } catch (error) {
        console.error('Instagram sync error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to sync Instagram data' 
            },
            { status: 500 }
        );
    }
}