"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAuthHeaders } from "@/lib/auth-utils";
import { Platform, PlatformType } from "@/lib/models";
import { getPlatformIconByName } from "@/lib/platform-icons";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ConnectAccountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (platform: Platform) => void;
};

const PLATFORM_OPTIONS = [
    {
        name: "YouTube",
        placeholder: "@yourchannel",
    },
    {
        name: "Instagram",
        placeholder: "@yourusername",
    },
    {
        name: "TikTok",
        placeholder: "@yourusername",
    },
    {
        name: "X",
        placeholder: "@yourusername",
    }
];

export default function ConnectAccountModal({
    isOpen,
    onClose,
    onConnect,
}: ConnectAccountModalProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [selectedPlatform, setSelectedPlatform] = useState("");
    const [name, setName] = useState("");
    const [handle, setHandle] = useState("");
    const [subscribers, setSubscribers] = useState("");
    const [avgVideoViews, setAvgVideoViews] = useState("");
    const [avgShortViews, setAvgShortViews] = useState("");
    const [engagementRate, setEngagementRate] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handlePlatformOAuth = async (platform: "youtube" | "instagram") => {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders.Authorization) {
            throw new Error("User authentication token not found");
        }
        const endpoint = platform === "youtube" ? "/api/youtube/oauth/authorize" : "/api/instagram/oauth/authorize";
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ state: `${platform}-connect-new` }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? err.message ?? `Failed to get ${platform} authorization URL`);
        }
        const data = await res.json();
        const authUrl = data.authUrl ?? data.authorizationUrl;
        if (authUrl) {
            window.location.href = authUrl;
        } else {
            throw new Error("No authorization URL received");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedPlatform) {
            return;
        }

        // For all platforms, require form fields for manual input
        if (!handle || !name) {
            return;
        }

        setIsLoading(true);

        try {
            const platformOption = PLATFORM_OPTIONS.find(p => p.name === selectedPlatform);
            if (!platformOption) return;

            const newPlatform: Platform = {
                name: name,
                handle: handle.startsWith('@') ? handle : `@${handle}`,
                platformType: selectedPlatform.toLowerCase() as PlatformType,
                icon: selectedPlatform,
                verified: true, // Assume verified for now
                metrics: {
                    subscribers: subscribers || "0",
                    avgVideoViews: avgVideoViews || "0",
                    avgShortViews: avgShortViews || "0",
                    engagementRate: engagementRate || "0%",
                },
                isActive: true,
                connectedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                customFields: {},
            };

            onConnect(newPlatform);
            
            // Reset form
            setSelectedPlatform("");
            setHandle("");
            setSubscribers("");
            setAvgVideoViews("");
            setAvgShortViews("");
            setEngagementRate("");
            
            onClose();
        } catch (error) {
            console.error("Error connecting account:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setSelectedPlatform("");
        setHandle("");
        setSubscribers("");
        setAvgVideoViews("");
        setAvgShortViews("");
        setEngagementRate("");
        onClose();
    };

    const selectedPlatformOption = PLATFORM_OPTIONS.find(p => p.name === selectedPlatform);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Connect New Account
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Platform Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="platform">Platform</Label>
                            <Select
                                value={selectedPlatform}
                                onValueChange={setSelectedPlatform}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLATFORM_OPTIONS.map((platform) => (
                                        <SelectItem key={platform.name} value={platform.name}>
                                            <div className="flex items-center gap-2">
                                            {getPlatformIconByName(platform.name)}
                                                {platform.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Show form fields for all platforms */}
                        {selectedPlatform && (
                            <>
                                {/* Handle/Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="handle">
                                        {selectedPlatformOption?.name || "Platform"} Name
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        {selectedPlatformOption && (
                                            getPlatformIconByName(selectedPlatformOption.name)
                                        )}
                                        <Input
                                            id="name"
                                            placeholder="Enter the name of the account"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Handle/Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="handle">
                                        {selectedPlatformOption?.name || "Platform"} Handle
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        {selectedPlatformOption && (
                                            getPlatformIconByName(selectedPlatformOption.name)
                                        )}
                                        <Input
                                            id="handle"
                                            placeholder={selectedPlatformOption?.placeholder || "Enter your handle"}
                                            value={handle}
                                            onChange={(e) => setHandle(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* OAuth only for YouTube and Instagram (TikTok/X are manual-add only) */}
                        {selectedPlatform && ["YouTube", "Instagram"].includes(selectedPlatform) && (
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium text-gray-900">Optional: Connect with OAuth</h4>
                                <p className="text-sm text-gray-600">
                                    Connect with OAuth to link your {selectedPlatform} account and sync data.
                                </p>
                                <Button
                                    type="button"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        try {
                                            if (selectedPlatform === "YouTube") {
                                                await handlePlatformOAuth("youtube");
                                            } else {
                                                await handlePlatformOAuth("instagram");
                                            }
                                        } catch (error) {
                                            console.error(`${selectedPlatform} OAuth error:`, error);
                                            alert(`Failed to start ${selectedPlatform} connection: ${error instanceof Error ? error.message : "Unknown error"}`);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {isLoading ? "Connecting..." : `Connect with ${selectedPlatform}`}
                                </Button>
                            </div>
                        )}

                        {/* Metrics Section - show for all platforms */}
                        {selectedPlatform && (
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium text-gray-900">Account Metrics (Optional)</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subscribers">
                                            {selectedPlatform === "Instagram" || selectedPlatform === "TikTok" || selectedPlatform === "X" 
                                                ? "Followers" 
                                                : "Subscribers"}
                                        </Label>
                                        <Input
                                            id="subscribers"
                                            placeholder="e.g., 1.2M"
                                            value={subscribers}
                                            onChange={(e) => setSubscribers(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="engagementRate">Engagement Rate</Label>
                                        <Input
                                            id="engagementRate"
                                            placeholder="e.g., 3.5%"
                                            value={engagementRate}
                                            onChange={(e) => setEngagementRate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="avgVideoViews">
                                            {selectedPlatform === "Instagram" 
                                                ? "Avg. Reel Views" 
                                                : "Avg. Video Views"}
                                        </Label>
                                        <Input
                                            id="avgVideoViews"
                                            placeholder="e.g., 50K"
                                            value={avgVideoViews}
                                            onChange={(e) => setAvgVideoViews(e.target.value)}
                                        />
                                    </div>
                                    {selectedPlatform !== "X" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="avgShortViews">
                                                {selectedPlatform === "Instagram" || selectedPlatform === "TikTok"
                                                    ? "Avg. Story Views" 
                                                    : "Avg. Short Views"}
                                            </Label>
                                            <Input
                                                id="avgShortViews"
                                                placeholder="e.g., 100K"
                                                value={avgShortViews}
                                                onChange={(e) => setAvgShortViews(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            disabled={isLoading || !selectedPlatform || !handle || !name}
                        >
                            {isLoading ? "Connecting..." : "Connect Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
