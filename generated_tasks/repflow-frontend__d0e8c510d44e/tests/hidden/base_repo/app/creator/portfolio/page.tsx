"use client";

import CreatorProfileDisplay from "@/components/creator-profile-display";
import { Button } from "@/components/ui/button";
import {
    addPlatform,
    deletePlatform,
    getUser,
    updateUserProfile
} from "@/lib/api";
import {
    demographics,
    genderDemographics,
    topCountries
} from "@/lib/creator-data";
import { User } from "@/lib/models";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function PortfolioPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handlePlatformsUpdate = async (updatedPlatforms: any[]) => {
        if (user) {
            const currentPlatforms = user.platforms || [];

            // Check if a new platform was added (length increased)
            if (updatedPlatforms.length > currentPlatforms.length) {
                // Find the new platform (the one that wasn't in the current platforms)
                const newPlatform = updatedPlatforms.find(
                    (platform) =>
                        !currentPlatforms.some(
                            (current) =>
                                current.name === platform.name &&
                                current.handle === platform.handle
                        )
                );

                console.log("New platform:", newPlatform);
                if (newPlatform) {
                    try {
                        // Convert creator-data Platform to models Platform for API call
                        const apiPlatform = {
                            name: newPlatform.name,
                            handle: newPlatform.handle,
                            platformType: newPlatform.platformType || "youtube",
                            verified: newPlatform.verified,
                            metrics: newPlatform.metrics,
                            isActive: true,
                            connectedAt: new Date().toISOString(),
                            lastUpdated: new Date().toISOString(),
                            customFields: {},
                        };

                        // Add the new platform to the backend
                        await addPlatform(apiPlatform);
                        console.log(
                            "Platform added to backend successfully:",
                            apiPlatform
                        );
                    } catch (error) {
                        console.error(
                            "Failed to add platform to backend:",
                            error
                        );
                        // You might want to show an error message to the user here
                        // For now, we'll still update the UI but log the error
                    }
                }
            }

            // Update the user state with the new platforms
            setUser({
                ...user,
                platforms: updatedPlatforms,
            });
        }
    };

    const handlePlatformDelete = async (platformHandle: string) => {
        try {
            await deletePlatform(platformHandle);
            console.log("Platform deleted successfully:", platformHandle);
        } catch (error) {
            console.error("Failed to delete platform:", error);
            throw error; // Re-throw to let the component handle the error
        }
    };

    const handlePlatformEdit = async (platform: any) => {
        // The platform editing is now handled inline within the CreatorProfileDisplay component
        // This function is called when the "Edit Platform" button is clicked, but since
        // we're using inline editing, we don't need to do anything special here.
        // The actual editing happens through the handlePlatformFieldChange function
        // and the changes are saved through handlePlatformsUpdate.
        console.log("Platform edit requested:", platform);
    };

    const handleUserUpdate = async (updatedUser: any) => {
        try {
            console.log("Updating user profile:", updatedUser);
            const profile = updatedUser.profile;
            // Call the backend API to update the user profile
            const updatedUserProfile = await updateUserProfile(profile);
            console.log(
                "User profile updated successfully:",
                updatedUserProfile
            );

            // Update the local state with the updated user data
            setUser(updatedUserProfile);
        } catch (error) {
            console.error("Failed to update user profile:", error);
            throw error; // Re-throw to let the component handle the error
        }
    };

    const handleImageUpload = async (imageUrl: string) => {
        if (!user) {
            throw new Error("User not loaded");
        }
        await handleUserUpdate({
            ...user,
            profile: { ...user.profile, avatar: imageUrl },
        });
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                const user: User | null = await getUser();

                if (user) {
                    setUser(user);
                } else {
                    setError("Failed to load user data");
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
                setError("Failed to load user data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 p-8 space-y-8 bg-gray-50">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-green-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">
                            Loading portfolio data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex-1 p-8 space-y-8 bg-gray-50">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                            <Plus className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Failed to load portfolio
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {error ||
                                "Unable to load your portfolio information. Please try again later."}
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 space-y-8 bg-gray-50">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Portfolio</h1>
            </header>

            <CreatorProfileDisplay
                user={user}
                platforms={user.platforms || []}
                demographics={demographics}
                genderDemographics={genderDemographics}
                topCountries={topCountries}
                isEditMode={true}
                showConnectButtons={true}
                onPlatformsUpdate={handlePlatformsUpdate}
                onPlatformDelete={handlePlatformDelete}
                onPlatformEdit={handlePlatformEdit}
                onUserUpdate={handleUserUpdate}
                onImageUpload={handleImageUpload}
            />
        </div>
    );
}
