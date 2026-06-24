"use client";

import { ImageUpload } from "@/components/image-upload";
import TikTokIcon from "@/components/tiktok-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/auth-utils";
import { CountryData, DemographicData } from "@/lib/creator-data";
import { Platform, User } from "@/lib/models";
import { numberWithCommas } from "@/lib/utils";
import {
    CheckCircle,
    Edit,
    Instagram,
    MessageSquare,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Twitch,
    Twitter,
    X,
    Youtube,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import ConnectAccountModal from "./connect-account-modal";

export type CreatorProfileDisplayProps = {
    user: User;
    platforms: Platform[];
    demographics: DemographicData[];
    genderDemographics: DemographicData[];
    topCountries: CountryData[];
    isEditMode?: boolean;
    showConnectButtons?: boolean;
    channelName?: string;
    channelUrl?: string;
    onPlatformsUpdate?: (platforms: Platform[]) => void | Promise<void>;
    onPlatformDelete?: (platformHandle: string) => void | Promise<void>;
    onPlatformEdit?: (platform: Platform) => void | Promise<void>;
    onUserUpdate?: (user: User) => void | Promise<void>;
    onImageUpload?: (imageUrl: string) => void | Promise<void>;
};

// Type guard for platform with extended properties
const isExtendedPlatform = (
    platform: Platform
): platform is Platform & {
    platformType?: string;
    customFields?: Record<string, any>;
    youtubeAnalytics?: any;
    instagramAnalytics?: any;
} => true;

export default function CreatorProfileDisplay({
    user,
    platforms,
    demographics,
    genderDemographics,
    topCountries,
    isEditMode = false,
    showConnectButtons = false,
    channelName,
    channelUrl,
    onPlatformsUpdate,
    onPlatformDelete,
    onPlatformEdit,
    onUserUpdate,
    onImageUpload,
}: CreatorProfileDisplayProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
        platforms.length > 0 ? platforms[0] : null
    );
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedUser, setEditedUser] = useState<User>(user);
    const [editedPlatforms, setEditedPlatforms] =
        useState<Platform[]>(platforms);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const avatarSrc = user.profile?.avatar || "";

    // Function to get the appropriate icon component based on platform name or type
    const getPlatformIcon = (platformNameOrType: string) => {
        const name = platformNameOrType?.toLowerCase() || "youtube";
        switch (name) {
            case "youtube":
                return Youtube;
            case "instagram":
                return Instagram;
            case "tiktok":
                return TikTokIcon;
            case "twitter":
            case "x":
                return Twitter;
            case "twitch":
                return Twitch;
            case "discord":
                return MessageSquare;
            default:
                return Youtube; // Default fallback
        }
    };

    const handleConnectPlatform = (newPlatform: Platform) => {
        const updatedPlatforms = [...editedPlatforms, newPlatform];
        setEditedPlatforms(updatedPlatforms);
        onPlatformsUpdate?.(updatedPlatforms);

        // Auto-select the newly connected platform
        console.log(
            "🔗 Platform connected - Auto-selecting new platform:",
            newPlatform
        );
        setSelectedPlatform(newPlatform);
    };

    const handleDeletePlatform = async (platformHandle: string) => {
        try {
            await onPlatformDelete?.(platformHandle);

            // Update the platforms list by removing the deleted platform
            const updatedPlatforms = editedPlatforms.filter(
                (platform) => platform.handle !== platformHandle
            );
            setEditedPlatforms(updatedPlatforms);
            await onPlatformsUpdate?.(updatedPlatforms);

            // If the deleted platform was selected, select the first available platform
            if (selectedPlatform?.handle === platformHandle) {
                const newSelectedPlatform =
                    updatedPlatforms.length > 0 ? updatedPlatforms[0] : null;
                console.log("🗑️ Platform deleted - Selecting new platform:", {
                    deletedPlatform: platformHandle,
                    newSelectedPlatform: newSelectedPlatform,
                });
                setSelectedPlatform(newSelectedPlatform);
            }
        } catch (error) {
            console.error("Error deleting platform:", error);
            // You could add a toast notification here
        }
    };


    // Field change handlers
    const handlePlatformFieldChange = (
        platformIndex: number,
        field: string,
        value: any
    ) => {
        setEditedPlatforms((prev) =>
            prev.map((platform, index) =>
                index === platformIndex
                    ? { ...platform, [field]: value }
                    : platform
            )
        );
        setHasUnsavedChanges(true);
    };

    const handleTagChange = (index: number, value: string) => {
        setEditedUser((prev) => ({
            ...prev,
            profile: {
                ...prev.profile,
                tags: (prev.profile.tags || []).map((tag, i) =>
                    i === index ? value : tag
                ),
            },
        }));
        setHasUnsavedChanges(true);
    };

    const addTag = () => {
        setEditedUser((prev) => ({
            ...prev,
            profile: {
                ...prev.profile,
                tags: [...(prev.profile.tags || []), ""],
            },
        }));
        setHasUnsavedChanges(true);
    };

    const removeTag = (index: number) => {
        setEditedUser((prev) => ({
            ...prev,
            profile: {
                ...prev.profile,
                tags: (prev.profile.tags || []).filter((_, i) => i !== index),
            },
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        // Basic validation
        if (!editedUser.profile?.name?.trim()) {
            console.error("Name is required");
            return;
        }

        // Validate platforms
        const invalidPlatforms = editedPlatforms.some(
            (platform) => !platform.name?.trim() || !platform.handle?.trim()
        );

        if (invalidPlatforms) {
            console.error("All platforms must have a name and handle");
            return;
        }

        setIsLoading(true);
        try {
            // Update user
            if (onUserUpdate) {
                await onUserUpdate(editedUser);
            }

            // Update platforms
            if (onPlatformsUpdate) {
                await onPlatformsUpdate(editedPlatforms);
            }

            setIsEditing(false);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Error saving changes:", error);
            // You could add a toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditedUser(user);
        setEditedPlatforms(platforms);
        setIsEditing(false);
        setHasUnsavedChanges(false);
    };

    const handleInstagramSync = async () => {
        if (
            !selectedPlatform ||
            !isExtendedPlatform(selectedPlatform) ||
            selectedPlatform.platformType?.toLowerCase() !== "instagram"
        ) {
            return;
        }

        setIsSyncing(true);
        try {
            const accessToken = (selectedPlatform as any).customFields
                ?.accessToken;
            const instagramUserId = (selectedPlatform as any).customFields
                ?.instagramUserId;

            if (!accessToken || !instagramUserId) {
                toast({
                    title: "Connection required",
                    description: "Please connect your Instagram account first.",
                    variant: "destructive",
                });
                throw new Error("Instagram credentials not found");
            }

            // Get authentication headers
            const authHeaders = await getAuthHeaders();
            if (!authHeaders.Authorization) {
                throw new Error("User authentication token not found");
            }

            const response = await fetch("/api/instagram/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify({
                    accessToken,
                    instagramUserId,
                    platform: selectedPlatform,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.message || "Failed to sync Instagram data";
                
                toast({
                    title: "Sync failed",
                    description: errorMessage,
                    variant: "destructive",
                });

                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            if (responseData.requiresReauth) {
                router.push(
                    `/auth/instagram-reconnect?platform=${encodeURIComponent(
                        selectedPlatform.name
                    )}`
                );
                return;
            }
            const updatedPlatform = responseData.platform;

            console.log("Updated platform:", updatedPlatform);
            // Update the platforms list with the synced data
            if (onPlatformsUpdate) {
                const updatedPlatforms = editedPlatforms.map((platform) =>
                    platform.platformType === selectedPlatform.platformType
                        ? updatedPlatform
                        : platform
                );
                setEditedPlatforms(updatedPlatforms);
                await onPlatformsUpdate(updatedPlatforms);
            }

            // Update the selected platform with new data
            console.log("🔄 Platform synced - Updating selected platform:", {
                syncType: "Instagram data sync",
                updatedPlatform: updatedPlatform,
            });
            setSelectedPlatform(updatedPlatform);
            
            toast({
                title: "Sync successful",
                description: "Instagram data has been synced successfully.",
            });
        } catch (error) {
            console.error("Error syncing Instagram data:", error);
            // Toast notification already shown in specific error cases above
            if (!(error instanceof Error && error.message.includes("authentication") || error.message.includes("credentials"))) {
                toast({
                    title: "Sync failed",
                    description: error instanceof Error ? error.message : "An unexpected error occurred.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleYouTubeSync = async () => {
        if (
            !selectedPlatform ||
            (selectedPlatform as any).platformType?.toLowerCase() !== "youtube"
        ) {
            return;
        }

        setIsSyncing(true);
        try {
            // Extract channel ID from platform.handle (e.g., "youtube.com/channel/UC123456789" -> "UC123456789")
            const channelId = selectedPlatform.handle.includes("/channel/")
                ? selectedPlatform.handle.split("/channel/")[1]
                : selectedPlatform.handle;

            if (!channelId) {
                toast({
                    title: "Invalid channel",
                    description: "YouTube channel ID not found in platform handle.",
                    variant: "destructive",
                });
                throw new Error(
                    "YouTube channel ID not found in platform handle"
                );
            }

            // Get authentication headers
            const authHeaders = await getAuthHeaders();
            if (!authHeaders.Authorization) {
                toast({
                    title: "Authentication required",
                    description: "Please sign in to sync platform data.",
                    variant: "destructive",
                });
                throw new Error("User authentication token not found");
            }

            // Step 1: Get authorization URL
            const authResponse = await fetch("/api/youtube/oauth/authorize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify({
                    state: `youtube-sync-${selectedPlatform.name}`,
                }),
            });

            if (!authResponse.ok) {
                const errorData = await authResponse.json().catch(() => ({}));
                const errorMessage = errorData.message || "Failed to get YouTube authorization URL";
                
                toast({
                    title: "Connection failed",
                    description: errorMessage,
                    variant: "destructive",
                });
                
                throw new Error(errorMessage);
            }

            const authData = await authResponse.json();

            if (authData.authUrl) {
                // Redirect to YouTube OAuth
                router.push(authData.authUrl);
                return;
            } else {
                toast({
                    title: "Connection failed",
                    description: "No authorization URL received from YouTube.",
                    variant: "destructive",
                });
                throw new Error("No authorization URL received");
            }
        } catch (error) {
            console.error("Error syncing YouTube data:", error);
            // Toast notification already shown in specific error cases above
            if (!(error instanceof Error && error.message.includes("authentication") || error.message.includes("authorization"))) {
                toast({
                    title: "Sync failed",
                    description: error instanceof Error ? error.message : "An unexpected error occurred.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <>
            {/* Profile Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle>Profile Information</CardTitle>
                        {hasUnsavedChanges && isEditing && (
                            <div className="flex items-center gap-1 text-amber-600 text-sm">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                Unsaved changes
                            </div>
                        )}
                    </div>
                    {isEditMode && (
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 hover:bg-gray-50"
                                        disabled={isLoading}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        size="sm"
                                        className="bg-figma-green-primary hover:bg-figma-green-primary/90 text-white"
                                        disabled={
                                            isLoading || !hasUnsavedChanges
                                        }
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isLoading ? "Saving..." : "Save"}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white border-gray-300 hover:bg-gray-50"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <div className="flex flex-col items-center md:items-start">
                            <Avatar className="h-32 w-32 mb-4">
                                <AvatarImage src={avatarSrc} />
                                <AvatarFallback>
                                    {(user.profile?.name || "Creator")
                                        .split(" ")
                                        .filter(Boolean)
                                        .map((n) => n[0])
                                        .join("") || "?"}
                                </AvatarFallback>
                            </Avatar>
                            {isEditMode && isEditing && onImageUpload && (
                                <ImageUpload
                                    onImageUpload={onImageUpload}
                                    currentImageUrl={avatarSrc}
                                    label=""
                                    description=""
                                    className="w-full"
                                    showPreview={false}
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="mb-4">
                                <label className="text-sm text-gray-500">
                                    Profile Name
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedUser.profile.name}
                                        onChange={(e) => {
                                            setEditedUser((prev) => ({
                                                ...prev,
                                                profile: {
                                                    ...prev.profile,
                                                    name: e.target.value,
                                                },
                                            }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="text-2xl font-bold border-dashed border-gray-300 bg-transparent px-2"
                                        placeholder="Enter profile name"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {editedUser.profile.name}
                                    </h2>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-gray-500">
                                    Location
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={
                                            editedUser.profile.location || ""
                                        }
                                        onChange={(e) => {
                                            setEditedUser((prev) => ({
                                                ...prev,
                                                profile: {
                                                    ...prev.profile,
                                                    location: e.target.value,
                                                },
                                            }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="text-lg border-dashed border-gray-300 bg-transparent px-2"
                                        placeholder="Enter location"
                                    />
                                ) : (
                                    <p className="text-lg text-gray-800">
                                        {editedUser.profile.location || ""}
                                    </p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-gray-500">
                                    Category Tags
                                </label>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {isEditing ? (
                                        <>
                                            {(
                                                editedUser.profile.tags || []
                                            ).map((tag, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Input
                                                        value={tag}
                                                        onChange={(e) =>
                                                            handleTagChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="text-sm h-7 w-24"
                                                        placeholder="Tag"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeTag(index)
                                                        }
                                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                onClick={addTag}
                                                className="text-figma-green-primary p-0 h-7"
                                            >
                                                + Add Tag
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            {(
                                                editedUser.profile.tags || []
                                            ).map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="bg-gray-100 text-gray-800"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">
                                    Bio
                                </label>
                                {isEditing ? (
                                    <Textarea
                                        value={editedUser.profile.bio || ""}
                                        onChange={(e) => {
                                            setEditedUser((prev) => ({
                                                ...prev,
                                                profile: {
                                                    ...prev.profile,
                                                    bio: e.target.value,
                                                },
                                            }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="text-lg border-dashed border-gray-300 bg-transparent px-2 mt-1 min-h-[80px]"
                                        placeholder="Enter bio"
                                    />
                                ) : (
                                    <p className="text-lg text-gray-800 mt-1">
                                        {editedUser.profile.bio || ""}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Connected Platforms */}
            <Card>
                <CardHeader
                    className={
                        showConnectButtons
                            ? "flex flex-row items-center justify-between"
                            : ""
                    }
                >
                    <div className="flex items-center gap-3">
                        <CardTitle>Connected Platforms</CardTitle>
                        {hasUnsavedChanges && isEditing && (
                            <div className="flex items-center gap-1 text-amber-600 text-sm">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                Unsaved changes
                            </div>
                        )}
                    </div>
                    {showConnectButtons && (
                        <Button
                            onClick={() => setIsConnectModalOpen(true)}
                            className="bg-sage-primary hover:bg-figma-green-primary text-black"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Connect Account
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {editedPlatforms.map((platform, platformIndex) => (
                            <div
                                key={platform.name}
                                className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                                    selectedPlatform?.platformType ===
                                    platform.platformType
                                        ? "border-4 border-figma-green-primary bg-figma-green-primary/5"
                                        : "border border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div
                                        onClick={() => {
                                            console.log(
                                                "👆 User clicked platform - Selecting platform:",
                                                {
                                                    selectedPlatform: platform,
                                                    previousPlatform:
                                                        selectedPlatform,
                                                }
                                            );
                                            setSelectedPlatform(platform);
                                        }}
                                        className="flex items-center gap-4 flex-1 cursor-pointer"
                                    >
                                        {React.createElement(
                                            getPlatformIcon(
                                                platform.platformType ||
                                                    "youtube"
                                            ),
                                            {
                                                className: "h-6 w-6",
                                            }
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <Input
                                                        value={platform.name}
                                                        onChange={(e) =>
                                                            handlePlatformFieldChange(
                                                                platformIndex,
                                                                "name",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="text-sm font-semibold border-dashed border-gray-300 bg-transparent px-1 h-6"
                                                        placeholder="Platform name"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    />
                                                ) : (
                                                    <p className="font-semibold text-gray-800">
                                                        {platform.name}
                                                    </p>
                                                )}
                                                {platform.verified && (
                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                )}
                                            </div>
                                            {isEditing ? (
                                                <Input
                                                    value={platform.handle}
                                                    onChange={(e) =>
                                                        handlePlatformFieldChange(
                                                            platformIndex,
                                                            "handle",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="text-sm text-gray-500 border-dashed border-gray-300 bg-transparent px-1 h-5"
                                                    placeholder="Platform handle"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-500">
                                                    {platform.handle}
                                                </p>
                                            )}
                                            {isEditing && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-gray-500 w-16">
                                                            Type:
                                                        </label>
                                                        <Input
                                                            value={
                                                                platform.platformType ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handlePlatformFieldChange(
                                                                    platformIndex,
                                                                    "platformType",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="text-xs border-dashed border-gray-300 bg-transparent px-1 h-5"
                                                            placeholder="youtube, instagram, etc."
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-gray-500 w-16">
                                                            Color:
                                                        </label>
                                                        <Input
                                                            value=""
                                                            onChange={(e) =>
                                                                handlePlatformFieldChange(
                                                                    platformIndex,
                                                                    "color",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="text-xs border-dashed border-gray-300 bg-transparent px-1 h-5"
                                                            placeholder="#666666"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isEditMode && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePlatform(
                                                    platform.handle
                                                );
                                            }}
                                            className="h-8 w-8 p-0 hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Platform Analytics */}
            {selectedPlatform &&
            (selectedPlatform.metrics ||
                selectedPlatform.instagramAnalytics ||
                selectedPlatform.youtubeAnalytics) ? (
                <Card>
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                {React.createElement(
                                    getPlatformIcon(
                                        selectedPlatform.platformType ||
                                            "youtube"
                                    ),
                                    {
                                        className: "h-6 w-6",
                                    }
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-800">
                                            {selectedPlatform.name}
                                        </p>
                                        {selectedPlatform.verified && (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                <span className="text-emerald-500 text-sm">
                                                    Verified
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {selectedPlatform.handle}
                                    </p>
                                </div>
                            </div>
                            {showConnectButtons && (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={
                                            selectedPlatform.platformType?.toLowerCase() ===
                                            "instagram"
                                                ? handleInstagramSync
                                                : handleYouTubeSync
                                        }
                                        disabled={isSyncing}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 ${
                                                isSyncing ? "animate-spin" : ""
                                            }`}
                                        />
                                        {isSyncing ? "Syncing..." : "Sync Data"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Platform Analytics - Platform-specific or general metrics */}
                        {selectedPlatform.platformType?.toLowerCase() ===
                            "instagram" &&
                        selectedPlatform.instagramAnalytics ? (
                            /* Instagram-Specific Analytics */
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Followers
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    ?.followers || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Total Reach
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    ?.totalReach || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Short Views
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    .shortViews || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Engaged Users
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    .totalEngagedUsers || 0
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                    <div>
                                        <label className="text-sm text-gray-500">Total Posts</label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(selectedPlatform.instagramAnalytics.totalPosts || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Recent Reach (28d)</label>
                                        <p className="text-2xl font-bold text-green-600">
                                            {numberWithCommas(selectedPlatform.instagramAnalytics.recentReach || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Recent Reels Views (28d)</label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(selectedPlatform.instagramAnalytics.recentReelsViews || 0)}
                                        </p>
                                    </div>
                                </div> */}

                                {/* Engagement Metrics */}
                                {(() => {
                                    const hasAverageLikes =
                                        selectedPlatform.instagramAnalytics
                                            .averageLikes != null;
                                    const hasAverageComments =
                                        selectedPlatform.instagramAnalytics
                                            .averageComments != null;
                                    const hasAverageShares =
                                        selectedPlatform.instagramAnalytics
                                            .averageShares != null;

                                    const hasAnyEngagementData =
                                        hasAverageLikes ||
                                        hasAverageComments ||
                                        hasAverageShares;

                                    if (!hasAnyEngagementData) {
                                        return (
                                            <div className="text-center py-8 text-gray-500 mb-8">
                                                <p className="text-lg">💬</p>
                                                <p className="mt-2">
                                                    No engagement data found
                                                </p>
                                                <p className="text-sm mt-1">
                                                    Engagement metrics will
                                                    appear here once available
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                            {hasAverageLikes && (
                                                <div>
                                                    <label className="text-sm text-gray-500">
                                                        Avg. Likes
                                                    </label>
                                                    <p className="text-2xl font-bold text-gray-800">
                                                        {numberWithCommas(
                                                            selectedPlatform
                                                                .instagramAnalytics
                                                                .averageLikes ||
                                                                0
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                            {hasAverageComments && (
                                                <div>
                                                    <label className="text-sm text-gray-500">
                                                        Avg. Comments
                                                    </label>
                                                    <p className="text-2xl font-bold text-gray-800">
                                                        {numberWithCommas(
                                                            selectedPlatform
                                                                .instagramAnalytics
                                                                .averageComments ||
                                                                0
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                            {hasAverageShares && (
                                                <div>
                                                    <label className="text-sm text-gray-500">
                                                        Avg. Shares
                                                    </label>
                                                    <p className="text-2xl font-bold text-gray-800">
                                                        {numberWithCommas(
                                                            selectedPlatform
                                                                .instagramAnalytics
                                                                .averageShares ||
                                                                0
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {selectedPlatform.instagramAnalytics
                                    .lastUpdated && (
                                    <p className="text-xs text-gray-500 mt-4">
                                        Last updated:{" "}
                                        {new Date(
                                            selectedPlatform.instagramAnalytics.lastUpdated
                                        ).toLocaleString(undefined, {
                                            timeZone:
                                                Intl.DateTimeFormat().resolvedOptions()
                                                    .timeZone,
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                )}
                            </div>
                        ) : selectedPlatform.platformType?.toLowerCase() ===
                              "youtube" && selectedPlatform.youtubeAnalytics ? (
                            /* YouTube-Specific Analytics */
                            <div className="mb-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Subscribers
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .subscriberCount || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Total Videos
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .videoCount || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Total Views
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .viewCount || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Recent Views (28d)
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .recentViews || 0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Watch Time (28d)
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .recentWatchTimeMinutes || 0
                                            )}
                                            m
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Avg. View Duration
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {selectedPlatform.youtubeAnalytics
                                                .averageViewDuration
                                                ? `${Math.round(
                                                      selectedPlatform
                                                          .youtubeAnalytics
                                                          .averageViewDuration /
                                                          60
                                                  )}m ${Math.round(
                                                      selectedPlatform
                                                          .youtubeAnalytics
                                                          .averageViewDuration %
                                                          60
                                                  )}s`
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Subscribers Gained (28d)
                                        </label>
                                        <p className="text-2xl font-bold text-green-600">
                                            +
                                            {numberWithCommas(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .recentSubscribersGained ||
                                                    0
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Estimated Revenue (28d)
                                        </label>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {selectedPlatform.youtubeAnalytics
                                                .estimatedRevenue
                                                ? `$${numberWithCommas(
                                                      selectedPlatform
                                                          .youtubeAnalytics
                                                          .estimatedRevenue
                                                  )}`
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">
                                            Top Video
                                        </label>
                                        <p className="text-sm font-medium text-gray-800">
                                            {selectedPlatform.youtubeAnalytics
                                                .topVideoTitle || "N/A"}
                                        </p>
                                        {selectedPlatform.youtubeAnalytics
                                            .topVideoViews && (
                                            <p className="text-xs text-gray-500">
                                                {numberWithCommas(
                                                    selectedPlatform
                                                        .youtubeAnalytics
                                                        .topVideoViews
                                                )}{" "}
                                                views
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {selectedPlatform.youtubeAnalytics
                                    .lastUpdated && (
                                    <p className="text-xs text-gray-500 mt-4">
                                        Last updated:{" "}
                                        {new Date(
                                            selectedPlatform.youtubeAnalytics.lastUpdated
                                        ).toLocaleString(undefined, {
                                            timeZone:
                                                Intl.DateTimeFormat().resolvedOptions()
                                                    .timeZone,
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* Regular Platform Metrics */
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                <div>
                                    <label className="text-sm text-gray-500">
                                        Subscribers
                                    </label>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedPlatform.metrics
                                            ?.subscribers || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">
                                        Avg. Video Views
                                    </label>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedPlatform.metrics
                                            ?.avgVideoViews || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">
                                        Avg. Short Views
                                    </label>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedPlatform.metrics
                                            ?.avgShortViews || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">
                                        Engagement Rate
                                    </label>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedPlatform.metrics
                                            ?.engagementRate || "N/A"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            {/* Audience Demographics */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-6">
                                    Audience Demographics
                                </h3>

                                {selectedPlatform.platformType?.toLowerCase() ===
                                    "instagram" &&
                                selectedPlatform.instagramAnalytics ? (
                                    /* Instagram Demographics */
                                    (() => {
                                        // Check if any demographic data exists
                                        const hasAgeData =
                                            selectedPlatform.instagramAnalytics
                                                .demographicsByAge &&
                                            Object.keys(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    .demographicsByAge
                                            ).length > 0;
                                        const hasGenderData =
                                            selectedPlatform.instagramAnalytics
                                                .demographicsByGender &&
                                            Object.keys(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    .demographicsByGender
                                            ).length > 0;
                                        const hasCountryData =
                                            selectedPlatform.instagramAnalytics
                                                .demographicsByCountry &&
                                            Object.keys(
                                                selectedPlatform
                                                    .instagramAnalytics
                                                    .demographicsByCountry
                                            ).length > 0;

                                        const hasAnyDemographics =
                                            hasAgeData ||
                                            hasGenderData ||
                                            hasCountryData;

                                        if (!hasAnyDemographics) {
                                            return (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p className="text-lg">
                                                        📊
                                                    </p>
                                                    <p className="mt-2">
                                                        No audience demographics
                                                        found
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        Demographics data will
                                                        appear here once
                                                        available
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid md:grid-cols-2 gap-8 space-y-6">
                                                <div>
                                                    {/* Age Distribution */}
                                                    {selectedPlatform
                                                        .instagramAnalytics
                                                        .demographicsByAge &&
                                                        Object.keys(
                                                            selectedPlatform
                                                                .instagramAnalytics
                                                                .demographicsByAge
                                                        ).length > 0 && (
                                                            <div className="mb-6">
                                                                <label className="text-sm text-gray-500 mb-4 block">
                                                                    Age
                                                                    Distribution
                                                                </label>
                                                                <div className="space-y-4">
                                                                    {Object.entries(
                                                                        selectedPlatform
                                                                            .instagramAnalytics
                                                                            .demographicsByAge
                                                                    )
                                                                        .sort(
                                                                            (
                                                                                [
                                                                                    ,
                                                                                    a,
                                                                                ],
                                                                                [
                                                                                    ,
                                                                                    b,
                                                                                ]
                                                                            ) =>
                                                                                (b as number) -
                                                                                (a as number)
                                                                        )
                                                                        .map(
                                                                            ([
                                                                                age,
                                                                                count,
                                                                            ]) => {
                                                                                const total =
                                                                                    Object.values(
                                                                                        selectedPlatform
                                                                                            .instagramAnalytics
                                                                                            ?.demographicsByAge ||
                                                                                            {}
                                                                                    ).reduce(
                                                                                        (
                                                                                            sum,
                                                                                            val
                                                                                        ) =>
                                                                                            (sum as number) +
                                                                                            (val as number),
                                                                                        0
                                                                                    ) as number;
                                                                                const percentage =
                                                                                    total >
                                                                                    0
                                                                                        ? Math.round(
                                                                                              ((count as number) /
                                                                                                  total) *
                                                                                                  100
                                                                                          )
                                                                                        : 0;
                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            age
                                                                                        }
                                                                                    >
                                                                                        <div className="flex justify-between mb-1">
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    age
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    percentage
                                                                                                }

                                                                                                %
                                                                                            </span>
                                                                                        </div>
                                                                                        <Progress
                                                                                            value={
                                                                                                percentage
                                                                                            }
                                                                                            className="h-2"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {/* Gender Distribution */}
                                                    {selectedPlatform
                                                        .instagramAnalytics
                                                        .demographicsByGender &&
                                                        Object.keys(
                                                            selectedPlatform
                                                                .instagramAnalytics
                                                                .demographicsByGender
                                                        ).length > 0 && (
                                                            <div className="mb-6">
                                                                <label className="text-sm text-gray-500 mb-4 block">
                                                                    Gender
                                                                    Distribution
                                                                </label>
                                                                <div className="space-y-4">
                                                                    {Object.entries(
                                                                        selectedPlatform
                                                                            .instagramAnalytics
                                                                            .demographicsByGender
                                                                    )
                                                                        .sort(
                                                                            (
                                                                                [
                                                                                    ,
                                                                                    a,
                                                                                ],
                                                                                [
                                                                                    ,
                                                                                    b,
                                                                                ]
                                                                            ) =>
                                                                                (b as number) -
                                                                                (a as number)
                                                                        )
                                                                        .map(
                                                                            ([
                                                                                gender,
                                                                                count,
                                                                            ]) => {
                                                                                const total =
                                                                                    Object.values(
                                                                                        selectedPlatform
                                                                                            .instagramAnalytics
                                                                                            ?.demographicsByGender ||
                                                                                            {}
                                                                                    ).reduce(
                                                                                        (
                                                                                            sum,
                                                                                            val
                                                                                        ) =>
                                                                                            (sum as number) +
                                                                                            (val as number),
                                                                                        0
                                                                                    ) as number;
                                                                                const percentage =
                                                                                    total >
                                                                                    0
                                                                                        ? Math.round(
                                                                                              ((count as number) /
                                                                                                  total) *
                                                                                                  100
                                                                                          )
                                                                                        : 0;
                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            gender
                                                                                        }
                                                                                    >
                                                                                        <div className="flex justify-between mb-1">
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    gender
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    percentage
                                                                                                }

                                                                                                %
                                                                                            </span>
                                                                                        </div>
                                                                                        <Progress
                                                                                            value={
                                                                                                percentage
                                                                                            }
                                                                                            className="h-2"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Country Distribution */}
                                                {selectedPlatform
                                                    .instagramAnalytics
                                                    .demographicsByCountry &&
                                                    Object.keys(
                                                        selectedPlatform
                                                            .instagramAnalytics
                                                            .demographicsByCountry
                                                    ).length > 0 && (
                                                        <div>
                                                            <label className="text-sm text-gray-500 mb-4 block">
                                                                Top Countries
                                                            </label>
                                                            <div className="space-y-4">
                                                                {Object.entries(
                                                                    selectedPlatform
                                                                        .instagramAnalytics
                                                                        .demographicsByCountry
                                                                )
                                                                    .sort(
                                                                        (
                                                                            [
                                                                                ,
                                                                                a,
                                                                            ],
                                                                            [
                                                                                ,
                                                                                b,
                                                                            ]
                                                                        ) =>
                                                                            (b as number) -
                                                                            (a as number)
                                                                    )
                                                                    .slice(0, 5)
                                                                    .map(
                                                                        ([
                                                                            country,
                                                                            count,
                                                                        ]) => {
                                                                            const total =
                                                                                Object.values(
                                                                                    selectedPlatform
                                                                                        .instagramAnalytics
                                                                                        ?.demographicsByCountry ||
                                                                                        {}
                                                                                ).reduce(
                                                                                    (
                                                                                        sum,
                                                                                        val
                                                                                    ) =>
                                                                                        (sum as number) +
                                                                                        (val as number),
                                                                                    0
                                                                                ) as number;
                                                                            const percentage =
                                                                                total >
                                                                                0
                                                                                    ? Math.round(
                                                                                          ((count as number) /
                                                                                              total) *
                                                                                              100
                                                                                      )
                                                                                    : 0;
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        country
                                                                                    }
                                                                                >
                                                                                    <div className="flex justify-between mb-1">
                                                                                        <span className="text-sm font-medium text-gray-800">
                                                                                            {
                                                                                                country
                                                                                            }
                                                                                        </span>
                                                                                        <span className="text-sm font-medium text-gray-800">
                                                                                            {
                                                                                                percentage
                                                                                            }

                                                                                            %
                                                                                        </span>
                                                                                    </div>
                                                                                    <Progress
                                                                                        value={
                                                                                            percentage
                                                                                        }
                                                                                        className="h-2"
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        }
                                                                    )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })()
                                ) : selectedPlatform.platformType?.toLowerCase() ===
                                      "youtube" &&
                                  selectedPlatform.youtubeAnalytics ? (
                                    /* YouTube Demographics */
                                    (() => {
                                        // Check if any YouTube demographic data exists
                                        const hasAgeData =
                                            selectedPlatform.youtubeAnalytics
                                                .demographicsByAge &&
                                            Object.keys(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .demographicsByAge
                                            ).length > 0;
                                        const hasGenderData =
                                            selectedPlatform.youtubeAnalytics
                                                .demographicsByGender &&
                                            Object.keys(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .demographicsByGender
                                            ).length > 0;
                                        const hasCountryData =
                                            selectedPlatform.youtubeAnalytics
                                                .demographicsByCountry &&
                                            Object.keys(
                                                selectedPlatform
                                                    .youtubeAnalytics
                                                    .demographicsByCountry
                                            ).length > 0;

                                        const hasAnyDemographics =
                                            hasAgeData ||
                                            hasGenderData ||
                                            hasCountryData;

                                        if (!hasAnyDemographics) {
                                            return (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p className="text-lg">
                                                        📊
                                                    </p>
                                                    <p className="mt-2">
                                                        No audience demographics
                                                        found
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        Demographics data will
                                                        appear here once
                                                        available
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid md:grid-cols-2 gap-8 space-y-6">
                                                <div>
                                                    {/* Age Distribution */}
                                                    {selectedPlatform
                                                        .youtubeAnalytics
                                                        .demographicsByAge &&
                                                        Object.keys(
                                                            selectedPlatform
                                                                .youtubeAnalytics
                                                                .demographicsByAge
                                                        ).length > 0 && (
                                                            <div className="mb-6">
                                                                <label className="text-sm text-gray-500 mb-4 block">
                                                                    Age
                                                                    Distribution
                                                                </label>
                                                                <div className="space-y-4">
                                                                    {Object.entries(
                                                                        selectedPlatform
                                                                            .youtubeAnalytics
                                                                            .demographicsByAge
                                                                    )
                                                                        .sort(
                                                                            (
                                                                                [
                                                                                    ,
                                                                                    a,
                                                                                ],
                                                                                [
                                                                                    ,
                                                                                    b,
                                                                                ]
                                                                            ) =>
                                                                                (b as number) -
                                                                                (a as number)
                                                                        )
                                                                        .map(
                                                                            ([
                                                                                age,
                                                                                count,
                                                                            ]) => {
                                                                                const total =
                                                                                    Object.values(
                                                                                        selectedPlatform
                                                                                            .youtubeAnalytics
                                                                                            ?.demographicsByAge ||
                                                                                            {}
                                                                                    ).reduce(
                                                                                        (
                                                                                            sum,
                                                                                            val
                                                                                        ) =>
                                                                                            (sum as number) +
                                                                                            (val as number),
                                                                                        0
                                                                                    ) as number;
                                                                                const percentage =
                                                                                    total >
                                                                                    0
                                                                                        ? Math.round(
                                                                                              ((count as number) /
                                                                                                  total) *
                                                                                                  100
                                                                                          )
                                                                                        : 0;
                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            age
                                                                                        }
                                                                                    >
                                                                                        <div className="flex justify-between mb-1">
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    age
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    percentage
                                                                                                }

                                                                                                %
                                                                                            </span>
                                                                                        </div>
                                                                                        <Progress
                                                                                            value={
                                                                                                percentage
                                                                                            }
                                                                                            className="h-2"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {/* Gender Distribution */}
                                                    {selectedPlatform
                                                        .youtubeAnalytics
                                                        .demographicsByGender &&
                                                        Object.keys(
                                                            selectedPlatform
                                                                .youtubeAnalytics
                                                                .demographicsByGender
                                                        ).length > 0 && (
                                                            <div className="mb-6">
                                                                <label className="text-sm text-gray-500 mb-4 block">
                                                                    Gender
                                                                    Distribution
                                                                </label>
                                                                <div className="space-y-4">
                                                                    {Object.entries(
                                                                        selectedPlatform
                                                                            .youtubeAnalytics
                                                                            .demographicsByGender
                                                                    )
                                                                        .sort(
                                                                            (
                                                                                [
                                                                                    ,
                                                                                    a,
                                                                                ],
                                                                                [
                                                                                    ,
                                                                                    b,
                                                                                ]
                                                                            ) =>
                                                                                (b as number) -
                                                                                (a as number)
                                                                        )
                                                                        .map(
                                                                            ([
                                                                                gender,
                                                                                count,
                                                                            ]) => {
                                                                                const total =
                                                                                    Object.values(
                                                                                        selectedPlatform
                                                                                            .youtubeAnalytics
                                                                                            ?.demographicsByGender ||
                                                                                            {}
                                                                                    ).reduce(
                                                                                        (
                                                                                            sum,
                                                                                            val
                                                                                        ) =>
                                                                                            (sum as number) +
                                                                                            (val as number),
                                                                                        0
                                                                                    ) as number;
                                                                                const percentage =
                                                                                    total >
                                                                                    0
                                                                                        ? Math.round(
                                                                                              ((count as number) /
                                                                                                  total) *
                                                                                                  100
                                                                                          )
                                                                                        : 0;
                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            gender
                                                                                        }
                                                                                    >
                                                                                        <div className="flex justify-between mb-1">
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    gender
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                                {
                                                                                                    percentage
                                                                                                }

                                                                                                %
                                                                                            </span>
                                                                                        </div>
                                                                                        <Progress
                                                                                            value={
                                                                                                percentage
                                                                                            }
                                                                                            className="h-2"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Country Distribution */}
                                                {selectedPlatform
                                                    .youtubeAnalytics
                                                    .demographicsByCountry &&
                                                    Object.keys(
                                                        selectedPlatform
                                                            .youtubeAnalytics
                                                            .demographicsByCountry
                                                    ).length > 0 && (
                                                        <div>
                                                            <label className="text-sm text-gray-500 mb-4 block">
                                                                Top Countries
                                                            </label>
                                                            <div className="space-y-4">
                                                                {Object.entries(
                                                                    selectedPlatform
                                                                        .youtubeAnalytics
                                                                        .demographicsByCountry
                                                                )
                                                                    .sort(
                                                                        (
                                                                            [
                                                                                ,
                                                                                a,
                                                                            ],
                                                                            [
                                                                                ,
                                                                                b,
                                                                            ]
                                                                        ) =>
                                                                            (b as number) -
                                                                            (a as number)
                                                                    )
                                                                    .slice(0, 5)
                                                                    .map(
                                                                        ([
                                                                            country,
                                                                            count,
                                                                        ]) => {
                                                                            const total =
                                                                                Object.values(
                                                                                    selectedPlatform
                                                                                        .youtubeAnalytics
                                                                                        ?.demographicsByCountry ||
                                                                                        {}
                                                                                ).reduce(
                                                                                    (
                                                                                        sum,
                                                                                        val
                                                                                    ) =>
                                                                                        (sum as number) +
                                                                                        (val as number),
                                                                                    0
                                                                                ) as number;
                                                                            const percentage =
                                                                                total >
                                                                                0
                                                                                    ? Math.round(
                                                                                          ((count as number) /
                                                                                              total) *
                                                                                              100
                                                                                      )
                                                                                    : 0;
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        country
                                                                                    }
                                                                                >
                                                                                    <div className="flex justify-between mb-1">
                                                                                        <span className="text-sm font-medium text-gray-800">
                                                                                            {
                                                                                                country
                                                                                            }
                                                                                        </span>
                                                                                        <span className="text-sm font-medium text-gray-800">
                                                                                            {
                                                                                                percentage
                                                                                            }

                                                                                            %
                                                                                        </span>
                                                                                    </div>
                                                                                    <Progress
                                                                                        value={
                                                                                            percentage
                                                                                        }
                                                                                        className="h-2"
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        }
                                                                    )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-8 space-y-6">
                                        {/* Default Demographics */}
                                        <div className="mb-6">
                                            <label className="text-sm text-gray-500 mb-4 block">
                                                Age Distribution
                                            </label>
                                            <div className="space-y-4">
                                                {demographics.map((demo) => (
                                                    <div key={demo.label}>
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {demo.label}
                                                            </span>
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {
                                                                    demo.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={
                                                                demo.percentage
                                                            }
                                                            className="h-2"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500 mb-4 block">
                                                Gender
                                            </label>
                                            <div className="space-y-4">
                                                {genderDemographics.map(
                                                    (demo) => (
                                                        <div key={demo.label}>
                                                            <div className="flex justify-between mb-1">
                                                                <span className="text-sm font-medium text-gray-800">
                                                                    {demo.label}
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-800">
                                                                    {
                                                                        demo.percentage
                                                                    }
                                                                    %
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={
                                                                    demo.percentage
                                                                }
                                                                className="h-2"
                                                            />
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        {/* Top Countries */}
                                        <div>
                                            <h3 className="font-semibold text-gray-800 mb-6">
                                                Top Countries
                                            </h3>
                                            <div className="space-y-4">
                                                {topCountries.map((country) => (
                                                    <div key={country.country}>
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {
                                                                    country.country
                                                                }
                                                            </span>
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {
                                                                    country.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={
                                                                country.percentage
                                                            }
                                                            className="h-2"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : selectedPlatform ? (
                <Card>
                    <CardContent className="p-8">
                        <div className="text-center py-12">
                            <div className="flex items-center justify-center gap-4 mb-4">
                                {React.createElement(
                                    getPlatformIcon(
                                        selectedPlatform.platformType ||
                                            "youtube"
                                    ),
                                    {
                                        className: "h-8 w-8",
                                    }
                                )}
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {selectedPlatform.name} Analytics
                                </h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                No analytics data available for{" "}
                                {selectedPlatform.name} yet.
                            </p>
                            <p className="text-sm text-gray-500">
                                Connect your {selectedPlatform.name} account to
                                view detailed analytics.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-8">
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Platform Analytics
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Select a platform above to view its analytics
                                data.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Connect Account Modal */}
            <ConnectAccountModal
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                onConnect={handleConnectPlatform}
            />
        </>
    );
}
