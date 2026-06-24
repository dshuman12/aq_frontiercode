"use client";

import CreatorProfileDisplay from "@/components/creator-profile-display";
import PortfolioChatbot from "@/components/portfolio-chatbot";
import { Button } from "@/components/ui/button";
import { getPublicUserPortfolio } from "@/lib/api";
import {
    demographics,
    genderDemographics,
    topCountries
} from "@/lib/creator-data";
import { User } from "@/lib/models";
import { AlertCircle, Mail } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Normalize user data from API to ensure required fields exist with fallbacks */
function normalizePortfolioUser(raw: User): User {
    const profile = raw.profile ?? {} as User["profile"];
    return {
        ...raw,
        profile: {
            id: profile.id ?? raw.uuid ?? "",
            name: profile.name ?? "Creator",
            email: profile.email ?? "",
            repflow_username: profile.repflow_username ?? "",
            avatar: profile.avatar,
            bio: profile.bio,
            tags: profile.tags ?? [],
            location: profile.location,
            website: profile.website,
            socialLinks: profile.socialLinks ?? {},
            subscription: profile.subscription ?? { tier: "", status: "", currentPeriodEnd: "" },
            createdAt: profile.createdAt ?? raw.createdAt ?? "",
            updatedAt: profile.updatedAt ?? raw.updatedAt ?? "",
        },
        platforms: raw.platforms ?? [],
        preferences: raw.preferences ?? {
            partnershipTypes: { flatRate: false, performanceHybrid: false, affiliate: false, gifting: false, ugc: false, events: false },
            absoluteMinimumRate: 0,
            deliverables: [],
            pricingTiers: { lowTier: { enabled: false, categories: [] }, premiumTier: { enabled: false, categories: [] }, ultraPremium: { enabled: false, categories: [] } },
            autoRejectCategories: [],
            preferredContactMethod: "email",
            responseTimeHours: 24,
            timezone: "UTC",
            language: "en",
            emailNotifications: false,
            pushNotifications: false,
            dealAlerts: false,
            weeklyReports: false,
        },
        teamMembers: raw.teamMembers ?? [],
    };
}

export default function PublicPortfolioPage() {
    const params = useParams();
    const userId = params.userId as string;
    
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isChatbotMinimized, setIsChatbotMinimized] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!userId) {
                setError("User ID is required");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const userData = await getPublicUserPortfolio(userId);
                
                if (userData) {
                    setUser(normalizePortfolioUser(userData));
                } else {
                    setError("User not found or portfolio is private");
                }
            } catch (err) {
                console.error("Error fetching public user portfolio:", err);
                setError("Failed to load portfolio data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading portfolio data...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Failed to load portfolio
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {error || "Unable to load portfolio information. Please try again later."}
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Repflow branding */}
            <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <Image
                            src="/repflow-logo.png"
                            alt="Repflow"
                            width={120}
                            height={40}
                            className="h-8 w-auto"
                        />
                        <div className="h-6 w-px bg-gray-300"></div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
                            {user?.profile?.name}&apos;s Portfolio
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {user?.profile?.repflow_username && (
                            <Button
                                onClick={() => window.open(`mailto:${user.profile?.repflow_username}@repflow.me`, '_blank')}
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            >
                                <Mail className="h-4 w-4 mr-2" />
                                Contact Me
                            </Button>
                        )}
                        <div className="text-sm text-gray-500">
                            Public Portfolio
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto p-4 sm:p-8">
                <CreatorProfileDisplay
                    user={user}
                    platforms={user.platforms || []}
                    demographics={demographics}
                    genderDemographics={genderDemographics}
                    topCountries={topCountries}
                    isEditMode={false} // Disable editing for public view
                    showConnectButtons={false} // Hide connect buttons for public view
                />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/repflow-logo.png"
                                alt="Repflow"
                                width={80}
                                height={26}
                                className="h-6 w-auto"
                            />
                            <span className="text-sm text-gray-600">
                                Powered by Repflow
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            © 2025 Repflow. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>

            {/* Chatbot */}
            {user && (
                <PortfolioChatbot
                    userData={user}
                    isMinimized={isChatbotMinimized}
                    onToggleMinimize={() => setIsChatbotMinimized(!isChatbotMinimized)}
                />
            )}
        </div>
    );
}
