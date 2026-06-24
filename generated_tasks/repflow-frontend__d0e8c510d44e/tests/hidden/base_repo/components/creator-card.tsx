"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Youtube, Instagram, Trash2 } from "lucide-react";

type CreatorDeliverable = {
    platform: string;
    type: string;
    count: number;
};

type CreatorCardProps = {
    id: string;
    name: string;
    avatar: string;
    responseTime: string;
    campaignRate: number;
    deliverables: CreatorDeliverable[];
    isRecommended?: boolean;
    selected?: boolean;
    showCheckbox?: boolean;
    showDeleteButton?: boolean;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    onViewProfile: (id: string) => void;
    onAddToList?: () => void;
    onEditProposal?: () => void;
    className?: string;
};

export function CreatorCard({
    id,
    name,
    avatar,
    responseTime,
    campaignRate,
    deliverables,
    isRecommended = false,
    selected = false,
    showCheckbox = false,
    showDeleteButton = false,
    onSelect,
    onDelete,
    onViewProfile,
    onAddToList,
    onEditProposal,
    className = "",
}: CreatorCardProps) {
    const getCardStyle = () => {
        if (selected) {
            return "border-blue-200 bg-blue-50/50 shadow-md";
        }
        if (isRecommended) {
            return "border-figma-green-primary/50 hover:border-figma-green-primary shadow-md";
        }
        return "border-figma-green-primary/20 hover:border-figma-green-primary/50";
    };

    return (
        <Card
            className={`relative transition-all cursor-pointer bg-white border hover:shadow-lg ${getCardStyle()} ${className}`}
        >
            {/* Recommended Badge */}
            {isRecommended && (
                <div className="absolute -top-4 left-3 bg-sage-primary px-3 py-0.5 rounded-lg text-sm text-figma-forest-dark flex items-center gap-1 shadow-sm">
                    <Star className="h-3.5 w-3.5" />
                    Recommended
                </div>
            )}

            {/* Checkbox for selection */}
            {showCheckbox && (
                <div className="absolute top-3 right-3 z-10">
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => onSelect?.(id)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                </div>
            )}

            <CardContent className="p-4 h-full flex flex-col">
                {/* Creator Header */}
                <div className="flex items-start gap-3 mb-4">
                    <Avatar
                        className={`border-2 border-figma-green-primary/20 ${
                            showCheckbox ? "h-16 w-16" : "h-12 w-12"
                        }`}
                    >
                        <AvatarImage src={avatar} alt={name} />
                        <AvatarFallback
                            className={`bg-sage-primary/20 text-figma-forest-dark font-medium ${
                                showCheckbox ? "text-lg" : ""
                            }`}
                        >
                            {name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <h4
                            className={`font-semibold text-gray-900 mb-1 truncate ${
                                showCheckbox ? "text-lg" : ""
                            }`}
                        >
                            {name}
                        </h4>
                        <p
                            className={`text-gray-600 ${
                                showCheckbox ? "text-sm mb-3" : "text-xs mb-2"
                            }`}
                        >
                            Response time: {responseTime}
                        </p>
                    </div>
                </div>

                {/* Campaign Rate - More prominent */}
                <div className="mb-4 p-3 bg-sage-primary/10 rounded-lg border border-figma-green-primary/10">
                    <div className="text-center">
                        <div
                            className={`font-bold text-figma-green-primary ${
                                showCheckbox ? "text-xl" : "text-lg"
                            }`}
                        >
                            ${campaignRate.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                            Campaign Rate
                        </div>
                    </div>
                </div>

                {/* Deliverables - Better organized */}
                <div className="mb-4">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Deliverables
                    </h5>
                    <div className="space-y-2">
                        {deliverables.map((deliverable, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                            >
                                <div className="flex items-center gap-2">
                                    {deliverable.platform === "YouTube" ? (
                                        <Youtube className="h-4 w-4" />
                                    ) : (
                                        <Instagram className="h-4 w-4" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700">
                                        {deliverable.platform}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {deliverable.count}x
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {deliverable.type}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-600 hover:text-figma-green-primary hover:bg-sage-primary/10"
                        onClick={() => onViewProfile(id)}
                    >
                        View Profile
                    </Button>
                    {onAddToList && (
                        <Button
                            size="sm"
                            className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                            onClick={onAddToList}
                        >
                            Add to List
                        </Button>
                    )}
                    {onEditProposal && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-figma-green-primary/20 text-gray-700 hover:bg-sage-primary/10 hover:border-figma-green-primary/50"
                            onClick={onEditProposal}
                        >
                            Edit Proposal
                        </Button>
                    )}

                    {/* Delete Option */}
                    {showDeleteButton && onDelete && (
                        <button
                            onClick={() => onDelete(id)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-600 py-2 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete from list
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
