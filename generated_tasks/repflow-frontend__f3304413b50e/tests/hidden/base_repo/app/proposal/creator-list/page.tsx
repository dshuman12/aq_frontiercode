"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Send } from "lucide-react";
import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { CreatorCard } from "@/components/creator-card";
import { useSelectedUsers, CreatorProposal } from "@/contexts/SelectedUsersContext";

type CreatorListItem = {
    id: string;
    name: string;
    avatar: string;
    responseTime: string;
    campaignRate: number;
    deliverables: {
        platform: string;
        type: string;
        count: number;
    }[];
    selected: boolean;
};

const mockCreators: CreatorListItem[] = [
    {
        id: "1",
        name: "Tim Scott",
        avatar: "/placeholder-user.png",
        responseTime: "<12h",
        campaignRate: 7200,
        deliverables: [
            { platform: "YouTube", type: "Integration", count: 1 },
            { platform: "Instagram", type: "Reels", count: 2 },
        ],
        selected: false,
    },
    {
        id: "2",
        name: "Jessica Fang",
        avatar: "/placeholder-user.png",
        responseTime: "<12h",
        campaignRate: 4000,
        deliverables: [
            { platform: "YouTube", type: "Integration", count: 1 },
            { platform: "Instagram", type: "Reels", count: 2 },
        ],
        selected: false,
    },
    {
        id: "3",
        name: "Adam Brown",
        avatar: "/placeholder-user.png",
        responseTime: "<12h",
        campaignRate: 3150,
        deliverables: [
            { platform: "YouTube", type: "Integration", count: 1 },
            { platform: "Instagram", type: "Reels", count: 2 },
        ],
        selected: false,
    },
];

export default function CreatorListPage() {
    const router = useRouter();
    const { selectedUsers, removeFromSelectedUsers, clearSelectedUsers } = useSelectedUsers();
    const [creators, setCreators] = useState<CreatorListItem[]>([]);
    const selectedCount = creators.filter((creator) => creator.selected).length;
    const allSelected = selectedCount === creators.length && creators.length > 0;

    // Convert selectedUsers from context to CreatorListItem format
    const convertToCreatorListItem = (creator: CreatorProposal): CreatorListItem => ({
        id: creator.id,
        name: creator.name,
        avatar: creator.avatar,
        responseTime: creator.responseTime,
        campaignRate: creator.campaignRate,
        deliverables: creator.deliverables,
        selected: false, // Will be managed by local state
    });

    // Update creators when selectedUsers changes
    useEffect(() => {
        const convertedCreators = selectedUsers.map(convertToCreatorListItem);
        startTransition(() => {
            setCreators(convertedCreators);
        });
    }, [selectedUsers]);

    const handleSelectAll = () => {
        setCreators((prev) =>
            prev.map((creator) => ({ ...creator, selected: !allSelected }))
        );
    };

    const handleSelectCreator = (id: string) => {
        setCreators((prev) =>
            prev.map((creator) =>
                creator.id === id
                    ? { ...creator, selected: !creator.selected }
                    : creator
            )
        );
    };

    const handleDeleteCreator = (id: string) => {
        // Remove from both local state and context
        setCreators((prev) => prev.filter((creator) => creator.id !== id));
        removeFromSelectedUsers(id);
    };

    return (
        <div className="flex-1 page-padding space-y-6 bg-gray-50">
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

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-figma-green-primary/20 page-padding">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Creator List
                    </h1>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="border-figma-green-primary/20 text-gray-700 hover:bg-sage-primary/10 hover:border-figma-green-primary/50"
                            onClick={handleSelectAll}
                        >
                            Select All
                        </Button>
                        <Button
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                            disabled={selectedCount === 0}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Send Bulk Proposals
                            {selectedCount > 0 && (
                                <Badge className="bg-white text-figma-forest-dark rounded-full px-2 py-1">
                                    {selectedCount}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            onClick={clearSelectedUsers}
                            disabled={selectedUsers.length === 0}
                        >
                            Clear All
                        </Button>
                    </div>
                </div>
            </div>

            {/* Creator Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creators.map((creator) => (
                    <CreatorCard
                        key={creator.id}
                        id={creator.id}
                        name={creator.name}
                        avatar={creator.avatar}
                        responseTime={creator.responseTime}
                        campaignRate={creator.campaignRate}
                        deliverables={creator.deliverables}
                        selected={creator.selected}
                        showCheckbox={true}
                        showDeleteButton={true}
                        onSelect={handleSelectCreator}
                        onDelete={handleDeleteCreator}
                        onViewProfile={(id) =>
                            router.push(`/proposal/profile/${id}`)
                        }
                        onAddToList={() => {
                            // Handle add to list logic
                        }}
                        onEditProposal={() => {
                            // Handle edit proposal logic
                        }}
                    />
                ))}
            </div>

            {/* Empty State */}
            {creators.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                        No creators in your list
                    </p>
                    <Button
                        className="mt-4 bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        onClick={() => (window.location.href = "/proposal")}
                    >
                        Browse Creators
                    </Button>
                </div>
            )}
        </div>
    );
}
