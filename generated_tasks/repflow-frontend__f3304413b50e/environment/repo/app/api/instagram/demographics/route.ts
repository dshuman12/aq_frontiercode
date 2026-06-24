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

        const { instagramAccountId, accessToken } = await request.json();
        
        if (!instagramAccountId || !accessToken) {
            return NextResponse.json({ 
                error: "Instagram account ID and access token are required" 
            }, { status: 400 });
        }

        // Fetch demographic insights
        const demographics = await fetchDemographicInsights(instagramAccountId, accessToken);

        return NextResponse.json({
            success: true,
            demographics: demographics,
        });

    } catch (error) {
        console.error('Instagram demographics error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to fetch demographic insights' 
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get the current session
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's Instagram platforms from backend
        const authHeaders = {
            'Authorization': `Bearer ${(session as any).accessToken}`,
            'Content-Type': 'application/json',
        };

        const userResponse = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: authHeaders,
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();
        const instagramPlatforms = userData.platforms?.filter((platform: any) => 
            platform.platformType === 'instagram' && platform.isActive
        ) || [];

        if (instagramPlatforms.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No Instagram accounts connected',
                demographics: [],
            });
        }

        // Fetch demographics for all Instagram accounts
        const demographicsResults = [];
        
        for (const platform of instagramPlatforms) {
            try {
                const accessToken = platform.customFields?.accessToken;
                const instagramUserId = platform.customFields?.instagramUserId;
                
                if (accessToken && instagramUserId) {
                    const demographics = await fetchDemographicInsights(instagramUserId, accessToken);
                    demographicsResults.push({
                        platformId: platform.id,
                        platformName: platform.name,
                        handle: platform.handle,
                        demographics: demographics,
                    });
                }
            } catch (error) {
                console.error(`Error fetching demographics for platform ${platform.id}:`, error);
                demographicsResults.push({
                    platformId: platform.id,
                    platformName: platform.name,
                    handle: platform.handle,
                    error: error instanceof Error ? error.message : 'Failed to fetch demographics',
                });
            }
        }

        return NextResponse.json({
            success: true,
            demographics: demographicsResults,
        });

    } catch (error) {
        console.error('Instagram demographics error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to fetch demographic insights' 
            },
            { status: 500 }
        );
    }
}

async function fetchDemographicInsights(instagramUserId: string, accessToken: string) {
    try {
        // Note: Instagram API with Instagram Login has limited insights access
        // Demographic insights are typically available through Instagram Business API
        // which requires Facebook Page connection and different permissions
        
        // For now, we'll return basic account metrics that are available
        // In a production environment, you might need to use the Facebook Graph API
        // with proper Business account permissions to get demographic insights
        
        console.log('Instagram API with Instagram Login has limited insights access');
        console.log('For demographic insights, consider using Instagram Business API with Facebook Page connection');
        
        return {
            note: 'Demographic insights require Instagram Business API with Facebook Page connection',
            availableMetrics: ['followers_count', 'follows_count', 'media_count'],
            instagramUserId: instagramUserId
        };

    } catch (error) {
        console.error('Error fetching demographic insights:', error);
        return {};
    }
}
