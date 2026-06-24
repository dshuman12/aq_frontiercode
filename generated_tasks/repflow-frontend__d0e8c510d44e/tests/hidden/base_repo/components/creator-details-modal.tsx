"use client";

import { useState } from "react";
import {
    X,
    Mail,
    Phone,
    Calendar,
    DollarSign,
    TrendingUp,
    Users,
    MessageCircle,
    Star,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Creator } from "@/lib/models";

type CreatorDetailsModalProps = {
    creator: Creator | null;
    isOpen: boolean;
    onClose: () => void;
};

// Extended creator data with preferences and additional details
const getExtendedCreatorData = (creator: Creator) => {
    return {
        ...creator,
        email: `${creator.name.toLowerCase().replace(" ", ".")}@email.com`,
        phone: "+1 (555) 123-4567",
        bio: "Passionate content creator specializing in lifestyle and fashion. Love connecting with brands that align with my values and aesthetic.",
        location: "Los Angeles, CA",
        platforms: [
            { name: "Instagram", followers: "2.1M", engagement: "4.2%" },
            { name: "TikTok", followers: "1.8M", engagement: "6.1%" },
            { name: "YouTube", followers: "890K", engagement: "3.8%" },
        ],
        preferences: {
            contentTypes: ["Photos", "Reels", "Stories", "IGTV"],
            categories: ["Fashion", "Lifestyle", "Beauty", "Travel"],
            minDealValue: 5000,
            avgDeliveryTime: "5-7 days",
            rating: 4.9,
        },
        dealHistory: [
            {
                brand: "Nike",
                value: "$12,000",
                status: "Complete",
                date: "Dec 2023",
            },
            {
                brand: "Adidas",
                value: "$8,500",
                status: "Complete",
                date: "Nov 2023",
            },
            {
                brand: "Puma",
                value: "$15,000",
                status: "Active",
                date: "Jan 2024",
            },
        ],
        metrics: {
            totalDeals: 24,
            totalValue: "$186,500",
            avgDealValue: "$7,771",
            completionRate: "96%",
        },
    };
};

export function CreatorDetailsModal({
    creator,
    isOpen,
    onClose,
}: CreatorDetailsModalProps) {
    if (!creator) return null;

    const extendedData = getExtendedCreatorData(creator);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border">
                <DialogHeader className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            Creator Details
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Creator Header */}
                    <div className="flex items-start gap-6">
                        <Avatar className="h-20 w-20 border-2 border-red-500">
                            <AvatarImage
                                src={extendedData.avatar}
                                alt={extendedData.name}
                            />
                            <AvatarFallback className="text-xl">
                                {extendedData.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {extendedData.name}
                                </h2>
                                <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                    {extendedData.type}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm font-medium">
                                        {extendedData.preferences.rating}
                                    </span>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-3">
                                {extendedData.bio}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {extendedData.email}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {extendedData.phone}
                                </div>
                                <div>{extendedData.location}</div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Current Deal Status */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-red-500" />
                            Current Deal
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Brand</p>
                                <p className="font-medium text-red-600">
                                    {extendedData.dealBrand}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Value</p>
                                <p className="font-medium">
                                    ${extendedData.dealValue.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <Badge
                                    variant={
                                        extendedData.status === "Active"
                                            ? "default"
                                            : "secondary"
                                    }
                                >
                                    {extendedData.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Due Date
                                </p>
                                <p className="font-medium flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {extendedData.dueDate}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-sm text-gray-600">
                                Assigned Agent
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage
                                        src={extendedData.agent.avatar}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {extendedData.agent.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                    {extendedData.agent.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Platform Metrics */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-red-500" />
                                Platform Metrics
                            </h3>
                            <div className="space-y-3">
                                {extendedData.platforms.map(
                                    (platform, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {platform.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {platform.followers}{" "}
                                                    followers
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-figma-green-primary">
                                                    {platform.engagement}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    engagement
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-red-500" />
                                Preferences
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Content Types
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {extendedData.preferences.contentTypes.map(
                                            (type, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                >
                                                    {type}
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Categories
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {extendedData.preferences.categories.map(
                                            (category, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                    className="border-red-200 text-red-700"
                                                >
                                                    {category}
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Min Deal Value
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {extendedData.preferences.minDealValue.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Avg Delivery
                                        </p>
                                        <p className="font-medium">
                                            {
                                                extendedData.preferences
                                                    .avgDeliveryTime
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-red-500" />
                            Performance Overview
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {extendedData.metrics.totalDeals}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Total Deals
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-figma-green-primary">
                                    {extendedData.metrics.totalValue}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Total Value
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-600">
                                    {extendedData.metrics.avgDealValue}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Avg Deal Value
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-red-600">
                                    {extendedData.metrics.completionRate}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Completion Rate
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Deal History */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Recent Deal History
                        </h3>
                        <div className="space-y-2">
                            {extendedData.dealHistory.map((deal, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-medium">
                                                {deal.brand}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {deal.date}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">
                                            {deal.value}
                                        </span>
                                        <Badge
                                            variant={
                                                deal.status === "Active"
                                                    ? "default"
                                                    : "secondary"
                                            }
                                            className={
                                                deal.status === "Active"
                                                    ? "bg-red-100 text-red-700"
                                                    : ""
                                            }
                                        >
                                            {deal.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
                        Send Message
                    </Button>
                    <Button className="bg-black hover:bg-gray-800 text-white">
                        Edit Creator
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
