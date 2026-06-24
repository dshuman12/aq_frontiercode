"use client";

import { CreatorDetailsModal } from "@/components/creator-details-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Creator } from "@/lib/models";
import { Download, Eye, Plus, Search } from "lucide-react";
import { useState } from "react";

// Mock data for creators
const mockCreators: Creator[] = [
    {
        id: "1",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Followers",
        dealBrand: "Active",
        dealValue: 8500,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "2",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Followers",
        dealBrand: "Active",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "3",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Puma",
        dealBrand: "Puma",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "4",
        name: "James Wilson",
        avatar: "/placeholder-user.png",
        type: "Sports Creator",
        followers: 0,
        engagement: 0,
        dealType: "Adidas",
        dealBrand: "Adidas",
        dealValue: 8500,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Feb 15",
        status: "Active",
    },
    {
        id: "5",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Followers",
        dealBrand: "Active",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "6",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Puma",
        dealBrand: "Puma",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "7",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Followers",
        dealBrand: "Active",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
    {
        id: "8",
        name: "James Wilson",
        avatar: "/placeholder-user.png",
        type: "Sports Creator",
        followers: 0,
        engagement: 0,
        dealType: "Adidas",
        dealBrand: "Adidas",
        dealValue: 8500,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Feb 15",
        status: "Active",
    },
    {
        id: "9",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 18000,
        engagement: 18000,
        dealType: "Puma",
        dealBrand: "Puma",
        dealValue: 18000,
        agent: { name: "R. Smith", avatar: "/placeholder-user.png" },
        dueDate: "Mar 15",
        status: "Active",
    },
];

function CreatorCard({
    creator,
    onClick,
}: {
    creator: Creator;
    onClick: () => void;
}) {
    return (
        <Card
            className="h-full hover:shadow-md transition-shadow cursor-pointer"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage
                                src={creator.avatar}
                                alt={creator.name}
                            />
                            <AvatarFallback>
                                {creator.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-sm">
                                {creator.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {creator.type}
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant={
                            creator.dealBrand === "Active"
                                ? "default"
                                : "secondary"
                        }
                        className={
                            creator.dealBrand === "Active"
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-gray-100 text-gray-700"
                        }
                    >
                        {creator.dealBrand}
                    </Badge>
                </div>

                <div className="space-y-2 mb-4">
                    {creator.followers > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                                Followers
                            </span>
                            <span className="text-sm font-medium">
                                ${creator.followers.toLocaleString()}
                            </span>
                        </div>
                    )}
                    {creator.engagement > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                                Engagement
                            </span>
                            <span className="text-sm font-medium">
                                ${creator.engagement.toLocaleString()}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                            {creator.dealType}
                        </span>
                        <span className="text-sm font-medium">
                            ${creator.dealValue.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage
                                src={creator.agent.avatar}
                                alt={creator.agent.name}
                            />
                            <AvatarFallback className="text-xs">
                                {creator.agent.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500">
                            {creator.agent.name}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            Due {creator.dueDate}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function CreatorRosterPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCreators, setSelectedCreators] = useState("All Creators");
    const [selectedBrands, setSelectedBrands] = useState("All Brands");
    const [selectedStatus, setSelectedStatus] = useState("Deal Status");
    const [selectedCreator, setSelectedCreator] = useState<Creator | null>(
        null
    );
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreatorClick = (creator: Creator) => {
        setSelectedCreator(creator);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCreator(null);
    };

    const filteredCreators = mockCreators.filter((creator) => {
        const matchesSearch =
            creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            creator.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            creator.dealBrand.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    return (
        <div className="flex-1 bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b page-padding py-4 sm:py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Creator Roster
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Managing 30 creators&apos; sponsorship deals
                        </p>
                    </div>
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Creator
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="page-padding py-4 sm:py-6 bg-white border-b">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search deals or creators..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select
                        value={selectedCreators}
                        onValueChange={setSelectedCreators}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All Creators">
                                All Creators
                            </SelectItem>
                            <SelectItem value="Urban Creator">
                                Urban Creator
                            </SelectItem>
                            <SelectItem value="Sports Creator">
                                Sports Creator
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedBrands}
                        onValueChange={setSelectedBrands}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All Brands">
                                All Brands
                            </SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Adidas">Adidas</SelectItem>
                            <SelectItem value="Puma">Puma</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Deal Status">
                                Deal Status
                            </SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* Creator Grid */}
            <div className="page-padding py-4 sm:py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCreators.map((creator) => (
                        <CreatorCard
                            key={creator.id}
                            creator={creator}
                            onClick={() => handleCreatorClick(creator)}
                        />
                    ))}
                </div>
            </div>

            {/* Creator Details Modal */}
            <CreatorDetailsModal
                creator={selectedCreator}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}
