"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import CreatorProfileDisplay from "@/components/creator-profile-display";
import {
    publicProfilePlatforms,
    demographics,
    genderDemographics,
    topCountries,
} from "@/lib/creator-data";
import { Platform, PlatformType, PlatformMetrics } from "@/lib/models";
import { getPublicUserPortfolio } from "@/lib/api";
import { User } from "@/lib/creator-data";
import React, { useEffect, useState } from "react";
import { Youtube, Instagram } from "lucide-react";
import TikTokIcon from "@/components/tiktok-icon";

// Helper functions to map platform types to icons and colors
const getPlatformIcon = (platformType: string) => {
    switch (platformType.toLowerCase()) {
        case 'youtube':
            return Youtube;
        case 'instagram':
            return Instagram;
        case 'tiktok':
            return TikTokIcon;
        default:
            return Youtube; // Default fallback
    }
};

const getPlatformColor = (platformType: string) => {
    switch (platformType.toLowerCase()) {
        case 'youtube':
            return 'text-red-500';
        case 'instagram':
            return 'text-pink-500';
        case 'tiktok':
            return 'text-black';
        default:
            return 'text-gray-500';
    }
};

export default function PublicProfilePage() {
    const router = useRouter();
    const { creatorId } = useParams();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                if (!creatorId || typeof creatorId !== 'string') {
                    throw new Error('Invalid creator ID');
                }

                const userData = await getPublicUserPortfolio(creatorId);
                if (userData) {
                    setUser(userData);
                } else {
                    setError('User not found');
                }
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [creatorId]);

    if (loading) {
        return (
            <div className="flex-1 page-padding space-y-6 sm:space-y-8 bg-gray-50">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="text-gray-600 hover:text-figma-green-primary hover:bg-sage-primary/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Creator Profile
                        </h1>
                    </div>
                </header>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading creator profile...</div>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex-1 page-padding space-y-6 sm:space-y-8 bg-gray-50">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="text-gray-600 hover:text-figma-green-primary hover:bg-sage-primary/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Creator Profile
                        </h1>
                    </div>
                </header>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="text-red-500 text-lg mb-4">
                            {error || 'User not found'}
                        </div>
                        <Button
                            onClick={() => router.back()}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            Go Back
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Transform user data to match the expected format
    const transformedUser = {
        name: user.name || 'Unknown Creator',
        avatar: user.avatar || '/placeholder-user.png',
        location: user.location || 'Unknown Location',
        bio: user.bio || 'No bio available',
        tags: user.tags || [],
    };

    // Transform platforms data to match the expected Platform type
    const transformedPlatforms: Platform[] = user.platforms?.map((platform: any) => ({
        name: platform.name || platform.platformType.toUpperCase(),
        handle: platform.handle || '',
        platformType: platform.platformType as PlatformType || PlatformType.OTHER,
        icon: platform.icon || '',
        verified: platform.verified || false,
        metrics: platform.metrics ? {
            subscribers: platform.metrics.subscribers || '0',
            avgVideoViews: platform.metrics.avgVideoViews || '0',
            avgShortViews: platform.metrics.avgShortViews || '0',
            engagementRate: platform.metrics.engagementRate || '0%',
            totalViews: platform.metrics.totalViews || '0',
            avgLikes: platform.metrics.avgLikes || '0',
            avgComments: platform.metrics.avgComments || '0',
            avgShares: platform.metrics.avgShares || '0',
            monthlyReach: platform.metrics.monthlyReach || '0',
            demographics: platform.metrics.demographics || {},
        } : {
            subscribers: '0',
            avgVideoViews: '0',
            avgShortViews: '0',
            engagementRate: '0%',
            totalViews: '0',
            avgLikes: '0',
            avgComments: '0',
            avgShares: '0',
            monthlyReach: '0',
            demographics: {},
        },
        youtubeAnalytics: platform.youtubeAnalytics,
        instagramAnalytics: platform.instagramAnalytics,
        isActive: platform.isActive || true,
        connectedAt: platform.connectedAt || new Date().toISOString(),
        lastUpdated: platform.lastUpdated || new Date().toISOString(),
        customFields: platform.customFields || {},
    })) || [];

    return (
        <div className="flex-1 p-8 space-y-8 bg-gray-50">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-figma-green-primary hover:bg-sage-primary/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Creator Profile
                    </h1>
                </div>
            </header>

            <CreatorProfileDisplay
                user={transformedUser}
                platforms={transformedPlatforms}
                demographics={demographics}
                genderDemographics={genderDemographics}
                topCountries={topCountries}
                isEditMode={false}
                showConnectButtons={false}
                channelName={transformedPlatforms[0]?.name || "Creator Channel"}
                channelUrl={transformedPlatforms[0]?.handle || ""}
            />
        </div>
    );
}
