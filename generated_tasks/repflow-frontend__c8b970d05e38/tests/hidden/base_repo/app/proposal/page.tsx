"use client";

import AICreatorChatbot from "@/components/ai-creator-chatbot";
import { CreatorCard } from "@/components/creator-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSelectedUsers } from "@/contexts/SelectedUsersContext";
import { getAllUsers } from "@/lib/api";
import { User } from "@/lib/models";
import {
    Check,
    CreditCard,
    Filter,
    Instagram,
    Mail,
    MessageSquare,
    Users,
    Youtube,
    Zap
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CreatorProposal = {
    id: string;
    name: string;
    avatar: string;
    responseTime: string;
    campaignRate: number;
    isRecommended: boolean;
    deliverables: {
        platform: string;
        type: string;
        count: number;
    }[];
};

export default function ProposalPage() {
    const router = useRouter();
    const [creators, setCreators] = useState<CreatorProposal[]>([]);
    const [filteredCreators, setFilteredCreators] = useState<CreatorProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPriceRange, setSelectedPriceRange] = useState<string>("");
    const [selectedTimeline, setSelectedTimeline] = useState<string>("Within 30 days");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const { addToSelectedUsers, isCreatorSelected, selectedUsers } = useSelectedUsers();
    const { userId } = useParams();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const users = await getAllUsers();
                
                // Transform users to CreatorProposal format
                const transformedCreators: CreatorProposal[] = users.map((user: User) => {
                    // Calculate campaign rate based on preferences or use a default
                    const campaignRate = user.preferences?.absoluteMinimumRate || 5000; // Higher default rate
                    
                    // Generate deliverables from user's platforms
                    const deliverables = user.platforms?.map(platform => ({
                        platform: platform.name || platform.platformType.toUpperCase(),
                        type: getDeliverableType(platform.platformType),
                        count: 1
                    })) || [];

                    console.log(`Transformed creator: ${user.profile?.name || "Unknown"}, rate: ${campaignRate}`);

                    return {
                        id: user.uuid,
                        name: user.profile?.name || "Unknown Creator",
                        avatar: user.profile?.avatar || "/placeholder-user.png",
                        responseTime: "<12h", // Default response time
                        campaignRate: campaignRate,
                        isRecommended: false, // Default to not recommended
                        deliverables: deliverables
                    };
                });

                setCreators(transformedCreators);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter creators based on selected filters
    useEffect(() => {
        let filtered = [...creators];

        console.log('Filtering creators:', { 
            totalCreators: creators.length, 
            selectedPriceRange, 
            selectedPlatforms,
            creatorRates: creators.map(c => ({ name: c.name, rate: c.campaignRate }))
        });

        // Filter by price range
        if (selectedPriceRange) {
            const beforePriceFilter = filtered.length;
            filtered = filtered.filter(creator => {
                const creatorRate = creator.campaignRate;
                const range = selectedPriceRange;
                let matches = false;
                
                if (range.includes(' - ')) {
                    // Range tier (e.g., "$5K - $15K")
                    const rangeParts = range.replace('$', '').split(' - ');
                    if (rangeParts.length === 2) {
                        const minRateStr = rangeParts[0].replace('K', '').replace('$', '');
                        const maxRateStr = rangeParts[1].replace('K', '').replace('$', '');
                        console.log(`Min rate: ${minRateStr}, Max rate: ${maxRateStr}`);
                        const minRate = parseInt(minRateStr) * 1000;
                        const maxRate = parseInt(maxRateStr) * 1000;
                        matches = creatorRate >= minRate && creatorRate <= maxRate;
                        console.log(`Range filter: ${creator.name} rate ${creatorRate} between ${minRate}-${maxRate} = ${matches}`);
                    } else {
                        console.warn(`Invalid range format: ${range}`);
                        matches = true; // Don't filter if format is invalid
                    }
                } else {
                    console.warn(`Unknown range format: ${range}`);
                    matches = true; // Don't filter if format is unknown
                }
                
                return matches;
            });
            console.log(`Price filter: ${beforePriceFilter} -> ${filtered.length} creators`);
        }

        // Filter by platforms
        if (selectedPlatforms.length > 0) {
            const beforePlatformFilter = filtered.length;
            filtered = filtered.filter(creator => {
                const hasPlatform = creator.deliverables.some(deliverable => 
                    selectedPlatforms.includes(deliverable.platform)
                );
                console.log(`Platform filter: ${creator.name} has platforms ${creator.deliverables.map(d => d.platform)} matches ${selectedPlatforms} = ${hasPlatform}`);
                return hasPlatform;
            });
            console.log(`Platform filter: ${beforePlatformFilter} -> ${filtered.length} creators`);
        }

        console.log('Final filtered creators:', filtered.length);
        setFilteredCreators(filtered);
    }, [creators, selectedPriceRange, selectedPlatforms]);

    // Helper function to map platform types to deliverable types
    const getDeliverableType = (platformType: string): string => {
        switch (platformType.toLowerCase()) {
            case 'youtube':
                return 'Integration';
            case 'instagram':
                return 'Reels';
            case 'tiktok':
                return 'Video';
            case 'twitter':
                return 'Tweet';
            default:
                return 'Post';
        }
    };

    // Calculate price ranges based on fetched user data
    const calculatePriceRanges = () => {
        if (creators.length === 0) return ['$1,000 - $8,000'];

        const rates = creators.map(creator => creator.campaignRate).filter(rate => rate > 0);
        if (rates.length === 0) return ['$1,000 - $8,000'];

        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

        console.log('Price range calculation:', { minRate, maxRate, avgRate, rates });

        // Create meaningful ranges based on actual data
        const ranges = [];
        
        // Ensure we have at least one range that includes all creators
        ranges.push(`$${Math.floor(minRate / 1000)}K - $${Math.floor(maxRate / 1000)}K`);

        // If there's enough variation, create additional tiers
        if (maxRate > minRate * 1.5) {
            const midPoint = Math.floor((minRate + maxRate) / 2);
            
            // Low tier: below midpoint
            if (midPoint > minRate) {
                ranges.push(`$${Math.floor(minRate / 1000)}K - $${Math.floor(midPoint / 1000)}K`);
            }
            
            // High tier: above midpoint
            if (midPoint < maxRate) {
                ranges.push(`$${Math.floor(midPoint / 1000)}K - $${Math.floor(maxRate / 1000)}K`);
            }
        }


        return ranges.length > 0 ? ranges : ['$1,000 - $8,000'];
    };

    const priceRanges = creators.length > 0 ? calculatePriceRanges() : ['$1,000 - $8,000'];

    // Calculate platform filters based on fetched user data
    const calculatePlatformFilters = () => {
        if (creators.length === 0) return ['YouTube', 'Instagram'];

        const platformCounts: { [key: string]: number } = {};
        
        creators.forEach(creator => {
            creator.deliverables.forEach(deliverable => {
                const platform = deliverable.platform;
                platformCounts[platform] = (platformCounts[platform] || 0) + 1;
            });
        });

        // Sort platforms by frequency and return top ones
        return Object.entries(platformCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([platform]) => platform);
    };

    const platformFilters = calculatePlatformFilters();

    // Helper function to get platform icon
    const getPlatformIcon = (platformName: string) => {
        switch (platformName.toLowerCase()) {
            case 'youtube':
                return Youtube;
            case 'instagram':
                return Instagram;
            case 'tiktok':
                return MessageSquare; // Using a generic icon for TikTok
            default:
                return MessageSquare;
        }
    };

    // Filter handlers
    const handlePriceRangeChange = (value: string) => {
        setSelectedPriceRange(value);
    };

    const handleTimelineChange = (value: string) => {
        setSelectedTimeline(value);
    };

    const handlePlatformToggle = (platform: string) => {
        setSelectedPlatforms(prev => {
            if (prev.includes(platform)) {
                return prev.filter(p => p !== platform);
            } else {
                return [...prev, platform];
            }
        });
    };

    const clearAllFilters = () => {
        setSelectedPriceRange("");
        setSelectedTimeline("Within 30 days");
        setSelectedPlatforms([]);
    };

    if (loading) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading creators...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 px-8 pt-8 space-y-6 bg-gray-50">
            {/* Header Banner */}
            <div className="relative -mx-8 -mt-8 mb-6">
                <div className="bg-figma-green-medium h-[58px] flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                        <Check className="h-6 w-6" />
                        <span className="font-medium">
                            No account required to view and contact creators
                        </span>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-white rounded-lg shadow-sm border border-figma-green-primary/20 page-padding mb-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Browse & Send Proposals Directly
                    </h1>

                    {/* Features */}
                    <div className="flex items-center justify-center gap-12">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 mb-3 bg-sage-primary/20 rounded-lg flex items-center justify-center">
                                <Mail className="w-6 h-6 text-figma-green-primary" />
                            </div>
                            <span className="text-gray-700 font-medium">
                                Only Email
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 mb-3 bg-sage-primary/20 rounded-lg flex items-center justify-center">
                                <Zap className="w-6 h-6 text-figma-green-primary" />
                            </div>
                            <span className="text-gray-700 font-medium">
                                Quick Set Up
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 mb-3 bg-sage-primary/20 rounded-lg flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-figma-green-primary" />
                            </div>
                            <span className="text-gray-700 font-medium">
                                No Payment Required
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Campaign Header */}
            <Card className="bg-white border border-figma-green-primary/20 shadow-sm">
                <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Lenovo
                    </h3>
                    <p className="text-gray-600">
                        Based on your conversation with @linustechtips
                    </p>
                </CardContent>
            </Card>

            {/* Page Header */}
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Creator Proposal
                </h1>
                <div className="flex items-center gap-3">
                    <Button asChild className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm">
                        <Link
                            href="/proposal/creator-list"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Creator List
                            <Badge className="ml-2 bg-figma-green-primary/10 text-figma-green-primary rounded-lg px-2 py-1">
                                {selectedUsers.length}
                            </Badge>
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Active Filters */}
            <Card className="bg-white border border-figma-green-primary/20 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Active Filters
                            </h3>
                            {filteredCreators.length > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Showing {filteredCreators.length} of {creators.length} creators • Price range: ${Math.floor(Math.min(...filteredCreators.map(c => c.campaignRate)) / 1000)}K - ${Math.floor(Math.max(...filteredCreators.map(c => c.campaignRate)) / 1000)}K
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            className="text-gray-600 hover:text-figma-green-primary hover:bg-sage-primary/10"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Edit Filters
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            {platformFilters.map((platform, index) => {
                                const IconComponent = getPlatformIcon(platform);
                                const isSelected = selectedPlatforms.includes(platform);
                                return (
                                    <Badge 
                                        key={platform}
                                        onClick={() => handlePlatformToggle(platform)}
                                        className={`cursor-pointer border-0 ${
                                            isSelected 
                                                ? 'bg-figma-green-primary text-white hover:bg-figma-green-primary/90' 
                                                : index === 0 
                                                    ? 'bg-sage-primary/30 text-figma-forest-dark hover:bg-sage-primary/40' 
                                                    : 'bg-figma-green-primary/10 text-figma-green-primary hover:bg-figma-green-primary/20'
                                        }`}
                                    >
                                        <IconComponent className="h-4 w-4 mr-1" />
                                        {platform}
                                        {isSelected && <span className="ml-1">×</span>}
                                    </Badge>
                                );
                            })}
                            <Badge className="bg-figma-green-primary/10 text-figma-green-primary hover:bg-figma-green-primary/20 border-0">
                                Technology
                            </Badge>
                            {(selectedPriceRange || selectedPlatforms.length > 0) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="text-xs text-gray-500 hover:text-figma-green-primary"
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <select 
                                value={selectedPriceRange}
                                onChange={(e) => handlePriceRangeChange(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                            >
                                <option value="">All Price Ranges</option>
                                {priceRanges.map((range, index) => (
                                    <option key={index} value={range}>
                                        {range}
                                    </option>
                                ))}
                            </select>
                            <select 
                                value={selectedTimeline}
                                onChange={(e) => handleTimelineChange(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                            >
                                <option>Within 30 days</option>
                                <option>Within 14 days</option>
                                <option>Within 7 days</option>
                                <option>Within 3 days</option>
                                <option>Within 1 day</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Creator Cards */}
            {filteredCreators.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {filteredCreators.map((creator) => {
                        const isAlreadySelected = isCreatorSelected(creator.id);
                        return (
                            <div key={creator.id} className="relative">
                                {isAlreadySelected && (
                                    <div className="absolute top-2 right-2 z-10">
                                        <Badge className="bg-figma-green-primary text-white">
                                            In List
                                        </Badge>
                                    </div>
                                )}
                                <CreatorCard
                                    id={creator.id}
                                    name={creator.name}
                                    avatar={creator.avatar}
                                    responseTime={creator.responseTime}
                                    campaignRate={creator.campaignRate}
                                    deliverables={creator.deliverables}
                                    isRecommended={creator.isRecommended}
                                    onViewProfile={(id) =>
                                        router.push(`/proposal/profile/${id}`)
                                    }
                                    onAddToList={() => {
                                        addToSelectedUsers(creator);
                                    }}
                                    onEditProposal={() => {
                                        // Handle edit proposal logic
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">
                        No creators match your current filters
                    </div>
                    <Button
                        onClick={clearAllFilters}
                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                    >
                        Clear all filters
                    </Button>
                </div>
            )}

            {/* AI Chatbot */}
            <AICreatorChatbot
                creators={creators}
                filteredCreators={filteredCreators}
            />
        </div>
    );
}
