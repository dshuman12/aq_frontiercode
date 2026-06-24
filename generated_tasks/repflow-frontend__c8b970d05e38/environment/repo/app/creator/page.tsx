"use client";

import { SUBSCRIPTION_TIERS } from "@/app/constants/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading-spinner";
import { ErrorDisplay } from "@/components/ui/error-display";
import { getUserFriendlyError } from "@/lib/error-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    getDealsGroupedByStatus,
    getReferralData,
    getUserProfile,
} from "@/lib/api";
import { Deal, ReferralData, UserProfile } from "@/lib/models";
import {
    Award,
    Check,
    ChevronRight,
    Copy,
    Crown,
    DollarSign,
    Loader2,
    Lock,
    Medal,
    Star,
    Target,
    TrendingUp,
    Users,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

// Feature Gate Content Component
type FeatureGateContentProps = {
    requiredTier?: string;
    lockedTitle: string;
    lockedDescription: string;
    isFeatureLocked: (tier: string) => boolean;
    children: React.ReactNode;
    onUpgradeClick: () => void;
};

const FeatureGateContent = ({
    requiredTier,
    lockedTitle,
    lockedDescription,
    isFeatureLocked,
    children,
    onUpgradeClick,
}: FeatureGateContentProps) => {
    const isLocked = requiredTier && isFeatureLocked(requiredTier);

    return (
        <>
            {isLocked && (
                <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                    <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                        {lockedTitle}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {lockedDescription}
                    </p>
                    <Button
                        onClick={onUpgradeClick}
                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                    >
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to {requiredTier}
                    </Button>
                </div>
            )}
            {!isLocked && children}
        </>
    );
};

// Helper functions to calculate dashboard metrics

// Archive deals should be treated as completed for all metric calculations
const isCompletedDeal = (deal: Deal) =>
    deal.status === "Complete" || deal.status === "Archive";

const calculateRevenueData = (deals: Deal[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const allTimeDeals = deals.filter((deal) => isCompletedDeal(deal));
    const ninetyDayDeals = deals.filter(
        (deal) =>
            isCompletedDeal(deal) &&
            new Date(deal.dateReceived) >= ninetyDaysAgo
    );
    const thirtyDayDeals = deals.filter(
        (deal) =>
            isCompletedDeal(deal) &&
            new Date(deal.dateReceived) >= thirtyDaysAgo
    );

    const allTimeTotal = allTimeDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );
    const ninetyDayTotal = ninetyDayDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );
    const thirtyDayTotal = thirtyDayDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );

    // Calculate previous period totals for change percentage
    const previousNinetyDays = new Date(
        ninetyDaysAgo.getTime() - 90 * 24 * 60 * 60 * 1000
    );
    const previousNinetyDayDeals = deals.filter(
        (deal) =>
            isCompletedDeal(deal) &&
            new Date(deal.dateReceived) >= previousNinetyDays &&
            new Date(deal.dateReceived) < ninetyDaysAgo
    );
    const previousNinetyDayTotal = previousNinetyDayDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );

    const previousThirtyDays = new Date(
        thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    const previousThirtyDayDeals = deals.filter(
        (deal) =>
            isCompletedDeal(deal) &&
            new Date(deal.dateReceived) >= previousThirtyDays &&
            new Date(deal.dateReceived) < thirtyDaysAgo
    );
    const previousThirtyDayTotal = previousThirtyDayDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );

    const ninetyDayChange =
        previousNinetyDayTotal > 0
            ? ((ninetyDayTotal - previousNinetyDayTotal) /
                  previousNinetyDayTotal) *
              100
            : 0;
    const thirtyDayChange =
        previousThirtyDayTotal > 0
            ? ((thirtyDayTotal - previousThirtyDayTotal) /
                  previousThirtyDayTotal) *
              100
            : 0;

    return {
        "30d": {
            total: Math.round(thirtyDayTotal),
            change: Math.round(thirtyDayChange * 10) / 10,
            isPositive: thirtyDayChange >= 0,
        },
        "90d": {
            total: Math.round(ninetyDayTotal),
            change: Math.round(ninetyDayChange * 10) / 10,
            isPositive: ninetyDayChange >= 0,
        },
        "All Time": {
            total: Math.round(allTimeTotal),
            change: 0,
            isPositive: true,
        },
    };
};

const calculateDealMetrics = (deals: Deal[]) => {
    const activeDeals = deals.filter((deal) =>
        [
            "New Offer",
            "Negotiating",
            "Contracting",
            "Drafting",
            "Live",
        ].includes(deal.status)
    ).length;

    const completedDeals = deals.filter(
        (deal) => isCompletedDeal(deal)
    ).length;

    const totalOffers = deals.filter((deal) =>
        [
            "New Offer",
            "Negotiating",
            "Contracting",
            "Drafting",
            "Live",
            "Complete",
            "Archive",
        ].includes(deal.status)
    ).length;

    const acceptanceRate =
        totalOffers > 0 ? Math.round((completedDeals / totalOffers) * 100) : 0;

    return {
        active: activeDeals,
        completed: completedDeals,
        acceptanceRate,
    };
};

const calculateTopSponsor = (deals: Deal[]) => {
    const companyTotals = deals.reduce((acc, deal) => {
        const companyName = deal.brand?.name ?? 'Unknown';
        if (!acc[companyName]) {
            acc[companyName] = { revenue: 0, deals: 0 };
        }
        acc[companyName].revenue += deal.value;
        acc[companyName].deals += 1;
        return acc;
    }, {} as Record<string, { revenue: number; deals: number }>);

    const topCompany = Object.entries(companyTotals).reduce(
        (max, [company, data]) => {
            return data.revenue > max.revenue ? { company, ...data } : max;
        },
        { company: "No deals yet", revenue: 0, deals: 0 }
    );

    return {
        name: topCompany.company,
        logo: "/placeholder-user.png",
        totalSpent: topCompany.revenue,
        activeDeals: deals.filter(
            (deal) =>
                (deal.brand?.name ?? 'Unknown') === topCompany.company &&
                [
                    "New Offer",
                    "Negotiating",
                    "Contracting",
                    "Drafting",
                    "Live",
                ].includes(deal.status)
        ).length,
    };
};

const calculateRevenueByPlatform = (deals: Deal[]) => {
    const completedDeals = deals.filter((deal) => isCompletedDeal(deal));
    const platformTotals = completedDeals.reduce((acc, deal) => {
        if (deal.deliverables && deal.deliverables.length > 0) {
            deal.deliverables.forEach((deliverable) => {
                const content = deliverable.contents?.[0];
                if (!content) return;
                const platform = content.contentType.toLowerCase();
                if (!acc[platform]) {
                    acc[platform] = 0;
                }
                // Distribute deal value across deliverables
                acc[platform] += deal.value / deal.deliverables.length;
            });
        }
        return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(platformTotals)
        .map(([platform, revenue]) => ({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            revenue: Math.round(revenue),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4);

    // Return default data if no platforms found
    return result.length > 0
        ? result
        : [
              { platform: "YouTube", revenue: 0 },
              { platform: "Instagram", revenue: 0 },
              { platform: "TikTok", revenue: 0 },
              { platform: "Twitter", revenue: 0 },
          ];
};

const calculateSourceDistribution = (deals: Deal[]) => {
    if (deals.length === 0) {
        return [
            { name: "Repflow", value: 0, color: "#A5D6B0" },
            { name: "Shared", value: 0, color: "#6B8F6E" },
            { name: "Inbound", value: 0, color: "#2D4A2F" },
        ];
    }

    const sourceCounts = deals.reduce((acc, deal) => {
        acc[deal.source] = (acc[deal.source] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const total = deals.length;
    const colors: Record<string, string> = {
        Repflow: "#A5D6B0",
        shared: "#6B8F6E",
        inbound: "#2D4A2F",
    };

    return Object.entries(sourceCounts)
        .map(([source, count]) => ({
            name: source.charAt(0).toUpperCase() + source.slice(1),
            value: Math.round((count / total) * 100),
            color: colors[source as keyof typeof colors] || "#6B8F6E",
        }))
        .sort((a, b) => b.value - a.value);
};

const calculateTopBrands = (deals: Deal[]) => {
    const completedDeals = deals.filter((deal) => isCompletedDeal(deal));

    if (completedDeals.length === 0) {
        return [{ name: "No completed deals yet", revenue: 0, deals: 0 }];
    }

    const companyTotals = completedDeals.reduce((acc, deal) => {
        const companyName = deal.brand?.name ?? 'Unknown';
        if (!acc[companyName]) {
            acc[companyName] = { revenue: 0, deals: 0 };
        }
        acc[companyName].revenue += deal.value;
        acc[companyName].deals += 1;
        return acc;
    }, {} as Record<string, { revenue: number; deals: number }>);

    return Object.entries(companyTotals)
        .map(([name, data]) => ({
            name,
            revenue: Math.round(data.revenue),
            deals: data.deals,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
};

const calculateTopCategories = (deals: Deal[]) => {
    // Since we don't have category data in deals, we'll use deal types as categories
    const completedDeals = deals.filter((deal) => isCompletedDeal(deal));

    if (completedDeals.length === 0) {
        return [{ name: "No completed deals yet", revenue: 0, deals: 0 }];
    }

    const categoryTotals = completedDeals.reduce((acc, deal) => {
        const category = deal.dealType;
        if (!acc[category]) {
            acc[category] = { revenue: 0, deals: 0 };
        }
        acc[category].revenue += deal.value;
        acc[category].deals += 1;
        return acc;
    }, {} as Record<string, { revenue: number; deals: number }>);

    return Object.entries(categoryTotals)
        .map(([name, data]) => ({
            name,
            revenue: Math.round(data.revenue),
            deals: data.deals,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
};

// Calculate revenue badges based on actual total revenue
const calculateRevenueBadges = (deals: Deal[]) => {
    const allTimeDeals = deals.filter((deal) => isCompletedDeal(deal));
    const totalRevenue = allTimeDeals.reduce(
        (sum, deal) => sum + deal.value,
        0
    );

    return [
        {
            name: "Silver Creator",
            threshold: 50000,
            earned: totalRevenue >= 50000,
            current: totalRevenue,
        },
        {
            name: "Gold Creator",
            threshold: 100000,
            earned: totalRevenue >= 100000,
            current: totalRevenue,
        },
        {
            name: "Diamond Creator",
            threshold: 1000000,
            earned: totalRevenue >= 1000000,
            current: totalRevenue,
        },
    ];
};

// Calculate referral badges based on actual referral data
const calculateReferralBadges = (referralData: ReferralData | null) => {
    const totalReferrals = referralData?.totalReferrals || 0;

    return [
        {
            name: "Networker",
            threshold: 5,
            earned: totalReferrals >= 5,
            current: totalReferrals,
        },
        {
            name: "Connector",
            threshold: 10,
            earned: totalReferrals >= 10,
            current: totalReferrals,
        },
        {
            name: "Influencer",
            threshold: 100,
            earned: totalReferrals >= 100,
            current: totalReferrals,
        },
        {
            name: "Thought Leader",
            threshold: 1000,
            earned: totalReferrals >= 1000,
            current: totalReferrals,
        },
    ];
};

// Special badges are admin-controlled (e.g. Admin Panel > User Detail > Badges).
// Only show when the API explicitly returns true for the corresponding profile field.
const SPECIAL_BADGE_CONFIG: {
    name: string;
    description: string;
    getEarned: (profile: UserProfile | null) => boolean;
}[] = [
    {
        name: "Founding Creator",
        description: "First 100 creators",
        getEarned: (profile) => profile?.foundingCreator === true,
    },
];

const calculateSpecialBadges = (userProfile: UserProfile | null) => {
    return SPECIAL_BADGE_CONFIG.map(({ name, description, getEarned }) => ({
        name,
        description,
        earned: getEarned(userProfile),
    }));
};

export default function CreatorDashboard() {
    const [selectedPeriod, setSelectedPeriod] = useState<
        "30d" | "90d" | "All Time"
    >("All Time");
    const [showAllBrands, setShowAllBrands] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState("");
    const [selectedUpgradeTier, setSelectedUpgradeTier] = useState("");

    // Calculate all metrics from deals data
    const revenueData = calculateRevenueData(deals);
    const dealMetrics = calculateDealMetrics(deals);
    const topSponsor = calculateTopSponsor(deals);
    const revenueByPlatform = calculateRevenueByPlatform(deals);
    const sourceDistribution = calculateSourceDistribution(deals);
    const topBrands = calculateTopBrands(deals);
    const topCategories = calculateTopCategories(deals);
    const revenueBadges = calculateRevenueBadges(deals);
    const referralBadges = calculateReferralBadges(referralData);
    const specialBadges = calculateSpecialBadges(userProfile);

    const currentRevenue = revenueData[selectedPeriod];

    // Feature locking logic
    const isFeatureLocked = (requiredTier: string) => {
        const tierHierarchy: Record<string, number> = {
            Starter: 1,
            Growth: 2,
            Scale: 3,
        };
        const currentTier = userProfile?.subscription?.tier || "Starter";
        return (
            (tierHierarchy[currentTier] || 0) <
            (tierHierarchy[requiredTier] || 0)
        );
    };

    const getAvailableUpgradeTiers = () => {
        const currentTier = userProfile?.subscription?.tier || "Starter";
        const tierHierarchy: Record<string, number> = {
            Starter: 1,
            Growth: 2,
            Scale: 3,
        };
        const currentTierLevel = tierHierarchy[currentTier] || 0;
        const allTiers = ["Starter", "Growth", "Scale"];
        return allTiers.filter(
            (tier) => tierHierarchy[tier] > currentTierLevel
        );
    };

    const getSubscriptionBadgeColor = (tier: string) => {
        switch (tier) {
            case "Growth":
                return "bg-purple-100 text-purple-700 hover:bg-purple-200";
            case "Starter":
                return "bg-blue-100 text-blue-700 hover:bg-blue-200";
            case "Scale":
                return "bg-green-100 text-green-700 hover:bg-green-200";
            default:
                return "bg-gray-100 text-gray-700 hover:bg-gray-200";
        }
    };

    const handlePlanUpgrade = async () => {
        if (!selectedUpgradeTier) {
            setUpgradeError("Please select a plan to upgrade to");
            return;
        }

        setUpgradeLoading(true);
        setUpgradeError("");

        try {
            const response = await fetch("/api/stripe/upgrade-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    newTier: selectedUpgradeTier,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update the user profile with new subscription
                setUserProfile((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        subscription: {
                            ...prev.subscription,
                            tier:
                                selectedUpgradeTier.charAt(0).toUpperCase() +
                                selectedUpgradeTier.slice(1).toLowerCase(),
                        },
                    };
                });

                setIsUpgradeModalOpen(false);
                setSelectedUpgradeTier("");
                console.log("Plan upgraded successfully:", data);
            } else {
                throw new Error(data.error || "Failed to upgrade plan");
            }
        } catch (error) {
            setUpgradeError(
                error instanceof Error
                    ? error.message
                    : "Failed to upgrade plan"
            );
        } finally {
            setUpgradeLoading(false);
        }
    };

    // Load deals data, user profile, and referral data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [dealsData, profileData, referralDataResult] =
                    await Promise.all([
                        getDealsGroupedByStatus(),
                        getUserProfile(),
                        getReferralData(),
                    ]);

                // Flatten all deals from all statuses into a single array
                const allDeals: Deal[] = [];
                Object.values(dealsData).forEach((column) => {
                    allDeals.push(...column.deals);
                });

                setDeals(allDeals);
                setUserProfile(profileData);
                setReferralData(referralDataResult);
            } catch (err) {
                console.error("Error loading data:", err);
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(`${window.location.origin}/proposal`);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    if (loading) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <PageLoading message="Loading dashboard..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <ErrorDisplay
                    error={getUserFriendlyError(error, "network")}
                    variant="page"
                    onAction={() => window.location.reload()}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 page-padding space-y-6 bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-figma-forest-dark">
                        Creator Dashboard
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Track your performance and revenue insights
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {userProfile && (
                        <Badge
                            className={`${getSubscriptionBadgeColor(
                                userProfile.subscription?.tier || "Starter"
                            )} rounded-lg px-3 py-1`}
                        >
                            {userProfile.subscription?.tier || "Starter"} Plan
                        </Badge>
                    )}
                    {userProfile && getAvailableUpgradeTiers().length > 0 && (
                        <Dialog
                            open={isUpgradeModalOpen}
                            onOpenChange={setIsUpgradeModalOpen}
                        >
                            <DialogTrigger asChild>
                                <Button className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm">
                                    <Crown className="mr-2 h-4 w-4" /> Upgrade
                                    Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Upgrade Your Plan</DialogTitle>
                                    <DialogDescription>
                                        Choose a higher tier to unlock more
                                        features and capabilities.
                                    </DialogDescription>
                                </DialogHeader>

                                {upgradeError && (
                                    <Alert className="border-red-200 bg-red-50">
                                        <AlertDescription className="text-red-800">
                                            {upgradeError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Select New Plan
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {getAvailableUpgradeTiers().map(
                                            (tier) => {
                                                const tierInfo = Object.values(
                                                    SUBSCRIPTION_TIERS
                                                ).find((t) => t.name === tier);
                                                const isDisabled =
                                                    tierInfo?.disabled || false;
                                                return (
                                                    <div
                                                        key={tier}
                                                        className="relative"
                                                    >
                                                        {isDisabled && (
                                                            <div className="absolute -top-2 right-3 z-10">
                                                                <Badge className="bg-gray-500 text-white text-xs shadow-md">
                                                                    Coming Soon
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`p-4 border rounded-lg transition-all ${
                                                                isDisabled
                                                                    ? "opacity-50 cursor-not-allowed border-gray-200"
                                                                    : "cursor-pointer " +
                                                                      (selectedUpgradeTier ===
                                                                      tier.toLowerCase()
                                                                          ? "border-sage-primary bg-sage-primary/5"
                                                                          : "border-gray-200 hover:border-sage-primary/50")
                                                            }`}
                                                            onClick={() =>
                                                                !isDisabled &&
                                                                setSelectedUpgradeTier(
                                                                    tier.toLowerCase()
                                                                )
                                                            }
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900">
                                                                        {tier} Plan
                                                                    </h4>
                                                                    <p className="text-sm text-gray-600">
                                                                        {
                                                                            tierInfo?.description
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-gray-900">
                                                                        $
                                                                        {
                                                                            tierInfo?.price
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm text-gray-600">
                                                                        /month
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setIsUpgradeModalOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handlePlanUpgrade}
                                        disabled={
                                            !selectedUpgradeTier ||
                                            upgradeLoading
                                        }
                                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                    >
                                        {upgradeLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Upgrading...
                                            </>
                                        ) : (
                                            "Upgrade Plan"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Button
                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                        onClick={handleCopy}
                    >
                        <span className="w-24 flex items-center justify-center">
                            {isCopied ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Portfolio Link
                                </>
                            )}
                        </span>
                    </Button>
                </div>
            </header>

            {/* Revenue Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-figma-forest-dark">
                            Revenue Overview
                        </CardTitle>
                        <Select
                            value={selectedPeriod}
                            onValueChange={(
                                value: "30d" | "90d" | "All Time"
                            ) => setSelectedPeriod(value)}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30d">30 Days</SelectItem>
                                <SelectItem value="90d">90 Days</SelectItem>
                                <SelectItem value="All Time">
                                    All Time
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-8 w-8 text-figma-green-primary" />
                            <div>
                                <p className="text-3xl font-bold text-figma-forest-dark">
                                {currentRevenue.total.toLocaleString()}
                                </p>
                                {currentRevenue.change > 0 && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <TrendingUp className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            +{currentRevenue.change}% from
                                            previous period
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Zap className="h-6 w-6 text-black" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Active Deals
                                </p>
                                <p className="text-2xl font-bold text-figma-forest-dark">
                                    {dealMetrics.active}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Award className="h-6 w-6 text-black" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Completed
                                </p>
                                <p className="text-2xl font-bold text-figma-forest-dark">
                                    {dealMetrics.completed}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Target className="h-6 w-6 text-black" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Acceptance Rate
                                </p>
                                <p className="text-2xl font-bold text-figma-forest-dark">
                                    {dealMetrics.acceptanceRate}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Sponsor Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-figma-forest-dark">
                        Top Sponsor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <img
                                    src={topSponsor.logo}
                                    alt={topSponsor.name}
                                    className="w-8 h-8 object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold text-figma-forest-dark">
                                    {topSponsor.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {topSponsor.activeDeals} active deals
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-figma-green-primary">
                                ${topSponsor.totalSpent.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                                Total Revenue
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Platform */}
                <FeatureGateContent
                    requiredTier="Growth"
                    lockedTitle="Advanced Analytics Locked"
                    lockedDescription="Upgrade to Growth plan to unlock detailed revenue analytics and insights."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-figma-forest-dark">
                                Revenue by Platform
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="ps-0">
                            <ChartContainer
                                config={{
                                    revenue: {
                                        label: "Revenue",
                                        color: "hsl(var(--figma-green-primary))",
                                    },
                                }}
                                className="h-64"
                            >
                                <ResponsiveContainer>
                                    <BarChart data={revenueByPlatform}>
                                        <XAxis
                                            dataKey="platform"
                                            tick={{ fontSize: 12 }}
                                            tickLine={{ stroke: "#E5E7EB" }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickLine={{ stroke: "#E5E7EB" }}
                                            tickFormatter={(value) =>
                                                `$${value / 1000}k`
                                            }
                                        />
                                        <ChartTooltip
                                            content={<ChartTooltipContent />}
                                            formatter={(value) => [
                                                `$${value.toLocaleString()} `,
                                                "Revenue",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="revenue"
                                            fill="var(--color-revenue)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </FeatureGateContent>

                {/* Source Distribution */}
                <FeatureGateContent
                    requiredTier="Growth"
                    lockedTitle="Source Analytics Locked"
                    lockedDescription="Upgrade to Growth plan to unlock deal source analytics and distribution insights."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-figma-forest-dark">
                                Deal Sources
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="ps-0">
                            <ChartContainer
                                config={{
                                    Repflow: {
                                        label: "Repflow",
                                        color: "#A5D6B0",
                                    },
                                    shared: {
                                        label: "Shared",
                                        color: "#6B8F6E",
                                    },
                                    inbound: {
                                        label: "Inbound",
                                        color: "#2D4A2F",
                                    },
                                }}
                                className="h-64"
                            >
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={sourceDistribution}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) =>
                                                `${name}: ${value}%`
                                            }
                                        >
                                            {sourceDistribution.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                    />
                                                )
                                            )}
                                        </Pie>
                                        <ChartTooltip
                                            content={<ChartTooltipContent />}
                                            formatter={(value) => [
                                                `${value}%`,
                                                "",
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </FeatureGateContent>
            </div>

            {/* Top Brands and Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Brands */}
                <FeatureGateContent
                    requiredTier="Growth"
                    lockedTitle="Brand Analytics Locked"
                    lockedDescription="Upgrade to Growth plan to unlock detailed brand performance analytics and insights."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-figma-forest-dark">
                                    Top Brands
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setShowAllBrands(!showAllBrands)
                                    }
                                    className="text-figma-green-primary"
                                >
                                    {showAllBrands ? "Show Less" : "View All"}
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topBrands
                                    .slice(
                                        0,
                                        showAllBrands ? topBrands.length : 5
                                    )
                                    .map((brand, index) => (
                                        <div
                                            key={brand.name}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-500 w-4">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-figma-forest-dark">
                                                        {brand.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {brand.deals} deals
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-figma-green-primary">
                                                    $
                                                    {brand.revenue.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </FeatureGateContent>

                {/* Top Categories */}
                <FeatureGateContent
                    requiredTier="Growth"
                    lockedTitle="Category Analytics Locked"
                    lockedDescription="Upgrade to Growth plan to unlock detailed category performance analytics and insights."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-figma-forest-dark">
                                    Top Categories
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setShowAllCategories(!showAllCategories)
                                    }
                                    className="text-figma-green-primary"
                                >
                                    {showAllCategories
                                        ? "Show Less"
                                        : "View All"}
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topCategories
                                    .slice(
                                        0,
                                        showAllCategories
                                            ? topCategories.length
                                            : 5
                                    )
                                    .map((category, index) => (
                                        <div
                                            key={category.name}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-500 w-4">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-figma-forest-dark">
                                                        {category.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {category.deals} deals
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-figma-green-primary">
                                                    $
                                                    {category.revenue.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </FeatureGateContent>
            </div>

            {/* Badge Tracker */}
            <FeatureGateContent
                requiredTier="Growth"
                lockedTitle="Advanced Badge Tracking Locked"
                lockedDescription="Upgrade to Growth plan to unlock detailed badge tracking, progress analytics, and milestone insights."
                isFeatureLocked={isFeatureLocked}
                onUpgradeClick={() => setIsUpgradeModalOpen(true)}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-figma-forest-dark">
                            Badge Tracker
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            Track your progress towards revenue and referral
                            milestones
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="revenue" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="revenue">
                                    Revenue
                                </TabsTrigger>
                                <TabsTrigger value="referrals">
                                    Referrals
                                </TabsTrigger>
                                <TabsTrigger value="special">
                                    Special
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="revenue" className="space-y-4">
                                {revenueBadges.map((badge) => (
                                    <div
                                        key={badge.name}
                                        className={`p-4 rounded-lg border ${
                                            badge.earned
                                                ? "bg-yellow-50 border-yellow-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-2 rounded-lg ${
                                                        badge.earned
                                                            ? "bg-yellow-200"
                                                            : "bg-gray-200"
                                                    }`}
                                                >
                                                    {badge.name ===
                                                        "Silver Creator" && (
                                                        <Medal className="h-6 w-6 text-gray-600" />
                                                    )}
                                                    {badge.name ===
                                                        "Gold Creator" && (
                                                        <Award className="h-6 w-6 text-yellow-600" />
                                                    )}
                                                    {badge.name ===
                                                        "Diamond Creator" && (
                                                        <Crown className="h-6 w-6 text-purple-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-figma-forest-dark">
                                                        {badge.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        $
                                                        {badge.threshold.toLocaleString()}{" "}
                                                        revenue threshold
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-figma-green-primary">
                                                    $
                                                    {badge.current.toLocaleString()}{" "}
                                                    / $
                                                    {badge.threshold.toLocaleString()}
                                                </p>
                                                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-figma-green-primary h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.min(
                                                                (badge.current /
                                                                    badge.threshold) *
                                                                    100,
                                                                100
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>

                            <TabsContent
                                value="referrals"
                                className="space-y-4"
                            >
                                {referralBadges.map((badge) => (
                                    <div
                                        key={badge.name}
                                        className={`p-4 rounded-lg border bg-gray-50 border-gray-200`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-2 rounded-lg ${
                                                        badge.earned
                                                            ? "bg-green-200"
                                                            : "bg-gray-200"
                                                    }`}
                                                >
                                                    <Users className="h-6 w-6 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-figma-forest-dark">
                                                        {badge.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {badge.threshold}{" "}
                                                        referrals
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {badge.earned ? (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        Earned ✓
                                                    </Badge>
                                                ) : (
                                                    <p className="text-sm font-medium text-figma-green-primary">
                                                        {badge.current} /{" "}
                                                        {badge.threshold}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>

                            <TabsContent value="special" className="space-y-4">
                                {specialBadges.map((badge) => (
                                    <div
                                        key={badge.name}
                                        className="p-4 rounded-lg border bg-gray-50 border-gray-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-200 rounded-lg">
                                                    <Star className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-figma-forest-dark">
                                                        {badge.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {badge.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-purple-100 text-purple-800">
                                                Earned ✓
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </FeatureGateContent>
        </div>
    );
}
