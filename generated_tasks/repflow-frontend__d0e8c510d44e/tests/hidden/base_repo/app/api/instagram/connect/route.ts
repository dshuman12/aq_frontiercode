import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { API_BASE_URL } from "@/app/constants/constants";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const META_APP_ID = "2229467730901564";
const META_APP_SECRET = "b775083f4b9ed1a28c7f20e2a92895b2";
const REDIRECT_URI = "https://cnhp2ujpjm.us-east-2.awsapprunner.com/creator/meta-login";

export async function POST(request: NextRequest) {
    try {
        // Get the current session
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code } = await request.json();
        
        if (!code) {
            return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
        }

        // Exchange authorization code for access token
        const requestBody = new URLSearchParams({
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code: code,
        });
        
        console.log('Token exchange request details:');
        console.log('URL:', 'https://api.instagram.com/oauth/access_token');
        console.log('Redirect URI:', REDIRECT_URI);
        console.log('Request body:', requestBody.toString());
        
        const tokenResponse = await fetch(`https://api.instagram.com/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody,
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            throw new Error(`Failed to exchange code for token: ${errorData.error?.message || 'Unknown error'}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Get user's Instagram account details using the /me endpoint
        const meResponse = await fetch(`https://graph.instagram.com/v23.0/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count&access_token=${accessToken}`);
        
        if (!meResponse.ok) {
            throw new Error('Failed to fetch Instagram business account');
        }

        const accountData = await meResponse.json();
        console.log('Account data:', accountData);
        
        // Extract Instagram User ID from the response
        const instagramUserId = accountData.user_id;

        if (!instagramUserId) {
            throw new Error('No Instagram user ID found in response');
        }

        // Fetch demographic insights, engagement metrics, and video metrics
        const [demographics, engagementMetrics, videoMetrics] = await Promise.all([
            fetchDemographicInsights(instagramUserId, accessToken),
            fetchEngagementMetrics(accessToken),
            fetchVideoMetrics(accessToken)
        ]);

        // Calculate engagement rate now that we have follower count
        const followersCount = accountData.followers_count || 0;
        if (followersCount > 0 && engagementMetrics.mediaCount > 0) {
            engagementMetrics.engagementRate = Math.round(
                (engagementMetrics.totalEngagement / (followersCount * engagementMetrics.mediaCount)) * 100 * 100
            ) / 100; // Round to 2 decimal places
        }

        console.log(`\n--- Final Engagement Rate Calculation ---`);
        console.log(`Engagement Rate: ${engagementMetrics.engagementRate}%`);
        console.log(`Formula: (${engagementMetrics.totalEngagement} / (${followersCount} × ${engagementMetrics.mediaCount})) × 100`);

        // Save Instagram connection to backend
        const platformData = {
            name: accountData.name || accountData.username || 'Instagram Account',
            handle: `@${accountData.username}`,
            platformType: 'instagram',
            icon: 'Instagram',
            verified: false,
            color: 'text-pink-500',
            instagramAnalytics: {
                // Core metrics
                followers: accountData.followers_count || 0,
                totalReach: 0, // Not available from current API calls
                shortViews: videoMetrics.totalReelsViews,
                totalEngagedUsers: demographics.totalEngagedUsers,
                
                // Engagement metrics
                engagementRate: engagementMetrics.engagementRate,
                averageLikes: engagementMetrics.averageLikes,
                averageComments: engagementMetrics.averageComments,
                averageShares: 0, // Not available from current API calls
                
                // Content metrics
                totalPosts: accountData.media_count || 0,
                totalStories: 0, // Not available from current API calls
                totalReels: engagementMetrics.mediaAnalysis.reels,
                
                // Recent performance (last 28 days) - using analyzed data as proxy
                recentFollowersGained: 0, // Not available from current API calls
                recentReach: 0, // Not available from current API calls
                recentEngagement: engagementMetrics.totalEngagement,
                recentReelsViews: videoMetrics.totalReelsViews,
                
                // Demographics data
                demographicsByAge: demographics.ageGroups,
                demographicsByGender: demographics.genders,
                demographicsByCountry: demographics.countries,
                demographicsByCity: {}, // Not available from current API calls
                
                // Top performing content - using averages as proxy
                topPostLikes: Math.round(engagementMetrics.averageLikes * 2), // Estimate top post as 2x average
                topPostComments: Math.round(engagementMetrics.averageComments * 2), // Estimate top post as 2x average
                topReelViews: Math.round(videoMetrics.averageReelsViews * 2), // Estimate top reel as 2x average
                
                // Analytics metadata
                lastUpdated: new Date().toISOString(),
                accountId: instagramUserId,
            },
            isActive: true,
            connectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            customFields: {
                instagramUserId: instagramUserId,
                accessToken: accessToken,
                accountType: accountData.account_type,
                mediaCount: accountData.media_count,
                profilePictureUrl: accountData.profile_picture_url,
            },
        };

        // Save to backend
        const authHeaders = {
            'Authorization': `Bearer ${(session as any).accessToken}`,
            'Content-Type': 'application/json',
        };

        const saveResponse = await fetch(`${API_BASE_URL}/users/platforms`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(platformData),
        });

        if (!saveResponse.ok) {
            throw new Error('Failed to save Instagram platform to backend');
        }

        return NextResponse.json({
            success: true,
            message: 'Instagram account connected successfully',
            platform: {
                name: platformData.name,
                handle: platformData.handle,
                instagramUserId: instagramUserId,
                demographics: demographics,
            },
        });

    } catch (error) {
        console.error('Instagram connection error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to connect Instagram account' 
            },
            { status: 500 }
        );
    }
}

async function fetchDemographicInsights(instagramUserId: string, accessToken: string) {
    try {
        console.log('=== FETCHING DEMOGRAPHIC INSIGHTS ===');
        console.log('Instagram User ID:', instagramUserId);
        
        // Initialize result object
        const finalResult = {
            countries: {} as Record<string, number>,
            ageGroups: {} as Record<string, number>,
            genders: {} as Record<string, number>,
            totalEngagedUsers: 0
        };
        
        // Request 1: Fetch age demographics
        console.log('\n--- Request 1: Age Demographics ---');
        try {
            const ageResponse = await fetch(`https://graph.instagram.com/v23.0/${instagramUserId}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&breakdown=age&metric_type=total_value&access_token=${accessToken}`);
            
            if (ageResponse.ok) {
                const ageData = await ageResponse.json();
                console.log('Age API Response:', JSON.stringify(ageData, null, 2));
                processAgeData(ageData, finalResult);
            } else {
                console.log('❌ Age demographics request failed:', ageResponse.status);
            }
        } catch (error) {
            console.log('❌ Error fetching age demographics:', error);
        }
        
        // Request 2: Fetch gender demographics
        console.log('\n--- Request 2: Gender Demographics ---');
        try {
            const genderResponse = await fetch(`https://graph.instagram.com/v23.0/${instagramUserId}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&breakdown=gender&metric_type=total_value&access_token=${accessToken}`);
            
            if (genderResponse.ok) {
                const genderData = await genderResponse.json();
                console.log('Gender API Response:', JSON.stringify(genderData, null, 2));
                processGenderData(genderData, finalResult);
            } else {
                console.log('❌ Gender demographics request failed:', genderResponse.status);
            }
        } catch (error) {
            console.log('❌ Error fetching gender demographics:', error);
        }
        
        // Request 3: Fetch country demographics
        console.log('\n--- Request 3: Country Demographics ---');
        try {
            const countryResponse = await fetch(`https://graph.instagram.com/v23.0/${instagramUserId}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&breakdown=country&metric_type=total_value&access_token=${accessToken}`);
            
            if (countryResponse.ok) {
                const countryData = await countryResponse.json();
                console.log('Country API Response:', JSON.stringify(countryData, null, 2));
                processCountryData(countryData, finalResult);
            } else {
                console.log('❌ Country demographics request failed:', countryResponse.status);
            }
        } catch (error) {
            console.log('❌ Error fetching country demographics:', error);
        }
        
        console.log('\n=== FINAL DEMOGRAPHICS RESULT ===');
        console.log('Final result:', JSON.stringify(finalResult, null, 2));
        
        return finalResult;

    } catch (error) {
        console.error('Error fetching demographic insights:', error);
        return {
            countries: {},
            ageGroups: {},
            genders: {},
            totalEngagedUsers: 0,
            note: 'Demographic insights not available'
        };
    }
}

function processAgeData(ageData: any, finalResult: any) {
    console.log('Processing age data...');
    try {
        const demographicInfo = ageData.data?.[0];
        if (demographicInfo?.total_value?.breakdowns) {
            for (const breakdown of demographicInfo.total_value.breakdowns) {
                if (breakdown.dimension_keys?.includes('age') && breakdown.results) {
                    for (const result of breakdown.results) {
                        if (result.dimension_values && result.value > 0) {
                            const ageIndex = breakdown.dimension_keys.indexOf('age');
                            if (ageIndex < result.dimension_values.length) {
                                const ageGroup = result.dimension_values[ageIndex];
                                const value = result.value;
                                finalResult.ageGroups[ageGroup] = (finalResult.ageGroups[ageGroup] || 0) + value;
                                finalResult.totalEngagedUsers += value;
                                console.log(`Added age group ${ageGroup}: +${value} (total: ${finalResult.ageGroups[ageGroup]})`);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing age data:', error);
    }
}

function processGenderData(genderData: any, finalResult: any) {
    console.log('Processing gender data...');
    try {
        const demographicInfo = genderData.data?.[0];
        if (demographicInfo?.total_value?.breakdowns) {
            for (const breakdown of demographicInfo.total_value.breakdowns) {
                if (breakdown.dimension_keys?.includes('gender') && breakdown.results) {
                    for (const result of breakdown.results) {
                        if (result.dimension_values && result.value > 0) {
                            const genderIndex = breakdown.dimension_keys.indexOf('gender');
                            if (genderIndex < result.dimension_values.length) {
                                const gender = result.dimension_values[genderIndex];
                                const value = result.value;
                                const formattedGender = gender.charAt(0).toUpperCase() + gender.slice(1);
                                finalResult.genders[formattedGender] = (finalResult.genders[formattedGender] || 0) + value;
                                finalResult.totalEngagedUsers += value;
                                console.log(`Added gender ${formattedGender}: +${value} (total: ${finalResult.genders[formattedGender]})`);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing gender data:', error);
    }
}

function processCountryData(countryData: any, finalResult: any) {
    console.log('Processing country data...');
    try {
        const demographicInfo = countryData.data?.[0];
        if (demographicInfo?.total_value?.breakdowns) {
            for (const breakdown of demographicInfo.total_value.breakdowns) {
                if (breakdown.dimension_keys?.includes('country') && breakdown.results) {
                    for (const result of breakdown.results) {
                        if (result.dimension_values && result.value > 0) {
                            const countryIndex = breakdown.dimension_keys.indexOf('country');
                            if (countryIndex < result.dimension_values.length) {
                                const countryCode = result.dimension_values[countryIndex];
                                const value = result.value;
                                
                                // Convert country codes to readable names
                                const countryNames: Record<string, string> = {
                                    'US': 'United States', 'ES': 'Spain', 'AR': 'Argentina', 'RU': 'Russia',
                                    'MA': 'Morocco', 'LA': 'Laos', 'IQ': 'Iraq', 'MX': 'Mexico',
                                    'FR': 'France', 'NL': 'Netherlands', 'TR': 'Turkey', 'GB': 'United Kingdom',
                                    'CA': 'Canada', 'AU': 'Australia', 'DE': 'Germany', 'IT': 'Italy',
                                    'BR': 'Brazil', 'IN': 'India', 'JP': 'Japan', 'CN': 'China'
                                };
                                
                                const countryName = countryNames[countryCode] || countryCode;
                                finalResult.countries[countryName] = (finalResult.countries[countryName] || 0) + value;
                                finalResult.totalEngagedUsers += value;
                                console.log(`Added country ${countryName} (${countryCode}): +${value} (total: ${finalResult.countries[countryName]})`);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing country data:', error);
    }
}

async function fetchEngagementMetrics(accessToken: string) {
    try {
        console.log('=== FETCHING ENGAGEMENT METRICS ===');
        
        // Initialize result object
        const result = {
            totalLikes: 0,
            totalComments: 0,
            totalEngagement: 0,
            mediaCount: 0,
            engagementRate: 0,
            averageLikes: 0,
            averageComments: 0,
            averageEngagement: 0,
            mediaAnalysis: {
                posts: 0,
                reels: 0,
                carousels: 0
            }
        };

        console.log('\n--- Fetching Recent Media ---');
        
        // Fetch recent media (last 25 posts for accurate engagement calculation)
        const mediaResponse = await fetch(
            `https://graph.instagram.com/v23.0/me/media?fields=id,media_type,like_count,comments_count,timestamp,permalink&limit=25&access_token=${accessToken}`
        );

        if (!mediaResponse.ok) {
            console.error('Failed to fetch media:', await mediaResponse.text());
            return result; // Return empty result on error
        }

        const mediaData = await mediaResponse.json();
        const media = mediaData.data || [];
        
        console.log(`Found ${media.length} recent posts`);

        // Process each media item
        for (const item of media) {
            // Add likes and comments (handle undefined values)
            const likes = item.like_count || 0;
            const comments = item.comments_count || 0;
            
            result.totalLikes += likes;
            result.totalComments += comments;

            // Categorize media types
            switch (item.media_type) {
                case 'IMAGE':
                    result.mediaAnalysis.posts++;
                    break;
                case 'VIDEO':
                    result.mediaAnalysis.reels++;
                    break;
                case 'CAROUSEL_ALBUM':
                    result.mediaAnalysis.carousels++;
                    break;
            }

            console.log(`Post ${item.id}: ${likes} likes, ${comments} comments (${item.media_type})`);
        }

        result.totalEngagement = result.totalLikes + result.totalComments;
        result.mediaCount = media.length;

        // Calculate averages
        if (result.mediaCount > 0) {
            result.averageLikes = Math.round((result.totalLikes / result.mediaCount) * 100) / 100;
            result.averageComments = Math.round((result.totalComments / result.mediaCount) * 100) / 100;
            result.averageEngagement = Math.round((result.totalEngagement / result.mediaCount) * 100) / 100;
        }

        console.log('\n--- Engagement Calculation Results ---');
        console.log(`Total Likes: ${result.totalLikes.toLocaleString()}`);
        console.log(`Total Comments: ${result.totalComments.toLocaleString()}`);
        console.log(`Total Engagement: ${result.totalEngagement.toLocaleString()}`);
        console.log(`Media Count: ${result.mediaCount}`);
        console.log(`Average Likes: ${result.averageLikes}`);
        console.log(`Average Comments: ${result.averageComments}`);
        console.log(`Content Breakdown: ${result.mediaAnalysis.posts} posts, ${result.mediaAnalysis.reels} reels, ${result.mediaAnalysis.carousels} carousels`);

        // Note: Engagement rate calculation requires follower count, which will be calculated in the main function
        // We'll set it to 0 here and calculate it in the main function where we have access to follower count
        result.engagementRate = 0;

        return result;

    } catch (error) {
        console.error('Error fetching engagement metrics:', error);
        
        // Return empty result on error
        return {
            totalLikes: 0,
            totalComments: 0,
            totalEngagement: 0,
            mediaCount: 0,
            engagementRate: 0,
            averageLikes: 0,
            averageComments: 0,
            averageEngagement: 0,
            mediaAnalysis: {
                posts: 0,
                reels: 0,
                carousels: 0
            }
        };
    }
}

async function fetchVideoMetrics(accessToken: string) {
    try {
        console.log('=== FETCHING VIDEO METRICS ===');
        
        // Initialize result object
        const result = {
            totalViews: 0,
            totalVideoViews: 0,
            totalReelsViews: 0,
            videoCount: 0,
            reelsCount: 0,
            averageVideoViews: 0,
            averageReelsViews: 0,
            videoAnalysis: {
                videos: 0,
                reels: 0,
                totalVideoPosts: 0
            }
        };

        console.log('\n--- Fetching Recent Video Media ---');
        
        // Fetch recent media with video metrics (last 25 posts)
        const mediaResponse = await fetch(
            `https://graph.instagram.com/v23.0/me/media?fields=id,media_type,timestamp,permalink&limit=25&access_token=${accessToken}`
        );

        if (!mediaResponse.ok) {
            console.error('Failed to fetch media for video metrics:', await mediaResponse.text());
            return result; // Return empty result on error
        }

        const mediaData = await mediaResponse.json();
        const media = mediaData.data || [];
        
        console.log(`Found ${media.length} recent posts for video analysis`);

        // Process each media item to get video insights
        for (const item of media) {
            if (item.media_type === 'VIDEO') {
                try {
                    // Fetch insights for this video
                    const insightsResponse = await fetch(
                        `https://graph.instagram.com/v23.0/${item.id}/insights?metric=video_views,plays&access_token=${accessToken}`
                    );

                    if (insightsResponse.ok) {
                        const insightsData = await insightsResponse.json();
                        const insights = insightsData.data || [];
                        
                        let videoViews = 0;
                        let plays = 0;

                        // Extract video views and plays
                        for (const insight of insights) {
                            if (insight.name === 'video_views' && insight.values && insight.values.length > 0) {
                                videoViews = insight.values[0].value || 0;
                            }
                            if (insight.name === 'plays' && insight.values && insight.values.length > 0) {
                                plays = insight.values[0].value || 0;
                            }
                        }

                        // Use the higher value between video_views and plays
                        const views = Math.max(videoViews, plays);
                        
                        // Determine if it's a Reel or regular video based on duration/format
                        // For now, we'll treat all videos as potential Reels since Instagram API doesn't clearly distinguish
                        // In practice, Reels are typically shorter and have different engagement patterns
                        result.totalReelsViews += views;
                        result.totalVideoViews += views;
                        result.reelsCount++;
                        result.videoCount++;
                        result.videoAnalysis.reels++;
                        result.videoAnalysis.videos++;

                        console.log(`Video ${item.id}: ${views} views (video_views: ${videoViews}, plays: ${plays})`);
                    } else {
                        console.log(`Could not fetch insights for video ${item.id}: ${insightsResponse.status}`);
                        // Count the video even if we can't get insights
                        result.videoCount++;
                        result.reelsCount++;
                        result.videoAnalysis.videos++;
                        result.videoAnalysis.reels++;
                    }
                } catch (error) {
                    console.error(`Error fetching insights for video ${item.id}:`, error);
                    // Count the video even if there's an error
                    result.videoCount++;
                    result.reelsCount++;
                    result.videoAnalysis.videos++;
                    result.videoAnalysis.reels++;
                }
            }
        }

        result.totalViews = result.totalVideoViews;
        result.videoAnalysis.totalVideoPosts = result.videoCount;

        // Calculate averages
        if (result.videoCount > 0) {
            result.averageVideoViews = Math.round((result.totalVideoViews / result.videoCount) * 100) / 100;
        }
        
        if (result.reelsCount > 0) {
            result.averageReelsViews = Math.round((result.totalReelsViews / result.reelsCount) * 100) / 100;
        }

        console.log('\n--- Video Metrics Calculation Results ---');
        console.log(`Total Views: ${result.totalViews.toLocaleString()}`);
        console.log(`Total Video Views: ${result.totalVideoViews.toLocaleString()}`);
        console.log(`Total Reels Views: ${result.totalReelsViews.toLocaleString()}`);
        console.log(`Video Count: ${result.videoCount}`);
        console.log(`Reels Count: ${result.reelsCount}`);
        console.log(`Average Video Views: ${result.averageVideoViews.toLocaleString()}`);
        console.log(`Average Reels Views: ${result.averageReelsViews.toLocaleString()}`);

        return result;

    } catch (error) {
        console.error('Error fetching video metrics:', error);
        
        // Return empty result on error
        return {
            totalViews: 0,
            totalVideoViews: 0,
            totalReelsViews: 0,
            videoCount: 0,
            reelsCount: 0,
            averageVideoViews: 0,
            averageReelsViews: 0,
            videoAnalysis: {
                videos: 0,
                reels: 0,
                totalVideoPosts: 0
            }
        };
    }
}

