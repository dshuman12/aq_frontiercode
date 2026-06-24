"use client";

import { CampaignDetailDrawer } from "@/components/campaign-detail-drawer";
import { NewCampaignModal } from "@/components/new-campaign-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Campaign, CampaignFilter, CampaignInsights } from "@/lib/models";
import { cn } from "@/lib/utils";
import {
    AlertCircle,
    Calendar,
    Clock,
    MoreVertical,
    Plus,
    Search,
    Target
} from "lucide-react";
import { useState } from "react";

// Mock data for campaigns
const mockCampaigns: Campaign[] = [
    {
        id: "1",
        name: "Summer Athletic Collection",
        brand: {
            name: "Nike",
            avatar: "/placeholder-logo.svg",
            contact: {
                name: "Sarah Johnson",
                email: "sarah.johnson@nike.com",
            },
        },
        creators: [
            {
                id: "c1",
                name: "Emma Davis",
                avatar: "/placeholder-user.png",
                status: "Accepted",
                rate: 15000,
                deliverables: [
                    { platform: "Instagram", type: "Post", count: 3 },
                    { platform: "TikTok", type: "Video", count: 2 },
                ],
            },
            {
                id: "c2",
                name: "Alex Thompson",
                avatar: "/placeholder-user.png",
                status: "Pending",
                rate: 12000,
                deliverables: [
                    { platform: "Instagram", type: "Story", count: 5 },
                    { platform: "YouTube", type: "Video", count: 1 },
                ],
            },
        ],
        budget: 75000,
        progress: 65,
        status: "Live",
        dueDate: "2024-02-15",
        createdAt: "2024-01-10",
        category: "Sports & Fitness",
        timeline: {
            start: "2024-01-15",
            end: "2024-02-15",
        },
        activityLog: [
            {
                id: "a1",
                type: "creator_action",
                message: "Emma Davis accepted the offer",
                timestamp: "2024-01-12T10:30:00Z",
                user: {
                    name: "Emma Davis",
                    avatar: "/placeholder-user.png",
                },
            },
        ],
    },
    {
        id: "2",
        name: "Spring Fashion Launch",
        brand: {
            name: "Adidas",
            avatar: "/placeholder-logo.svg",
            contact: {
                name: "Michael Chen",
                email: "michael.chen@adidas.com",
            },
        },
        creators: [
            {
                id: "c3",
                name: "Sophie Martinez",
                avatar: "/placeholder-user.png",
                status: "Delivered",
                rate: 18000,
                deliverables: [
                    { platform: "Instagram", type: "Post", count: 4 },
                    { platform: "TikTok", type: "Video", count: 3 },
                ],
            },
        ],
        budget: 95000,
        progress: 100,
        status: "Completed",
        dueDate: "2024-01-30",
        createdAt: "2024-01-05",
        category: "Fashion",
        timeline: {
            start: "2024-01-10",
            end: "2024-01-30",
        },
        activityLog: [
            {
                id: "a2",
                type: "status_change",
                message: "Campaign completed successfully",
                timestamp: "2024-01-30T16:45:00Z",
            },
        ],
    },
    {
        id: "3",
        name: "Tech Innovation Series",
        brand: {
            name: "Apple",
            avatar: "/placeholder-logo.svg",
            contact: {
                name: "Jennifer Wu",
                email: "jennifer.wu@apple.com",
            },
        },
        creators: [
            {
                id: "c4",
                name: "James Wilson",
                avatar: "/placeholder-user.png",
                status: "Pending",
                rate: 25000,
                deliverables: [
                    { platform: "YouTube", type: "Video", count: 2 },
                    { platform: "Instagram", type: "Post", count: 3 },
                ],
            },
            {
                id: "c5",
                name: "Lisa Park",
                avatar: "/placeholder-user.png",
                status: "Pending",
                rate: 20000,
                deliverables: [
                    { platform: "TikTok", type: "Video", count: 4 },
                    { platform: "Twitter", type: "Thread", count: 2 },
                ],
            },
        ],
        budget: 120000,
        progress: 15,
        status: "Offers Sent",
        dueDate: "2024-03-01",
        createdAt: "2024-01-20",
        category: "Technology",
        timeline: {
            start: "2024-02-01",
            end: "2024-03-01",
        },
        activityLog: [
            {
                id: "a3",
                type: "auto_reminder",
                message: "Reminder sent to pending creators",
                timestamp: "2024-01-25T09:00:00Z",
            },
        ],
    },
];

const mockInsights: CampaignInsights = {
    totalActiveCampaigns: 5,
    totalBudget: 485000,
    avgAcceptanceRate: 72,
};

export default function CampaignsPage() {
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<CampaignFilter>("Active");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
        null
    );
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);

    const filteredCampaigns = mockCampaigns.filter((campaign) => {
        const matchesSearch =
            campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.brand.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

        const matchesFilter =
            activeFilter === "Active"
                ? ["Live", "Offers Sent"].includes(campaign.status)
                : activeFilter === "Completed"
                ? campaign.status === "Completed"
                : activeFilter === "Draft"
                ? campaign.status === "Draft"
                : activeFilter === "Archived"
                ? campaign.status === "Archived"
                : true;

        return matchesSearch && matchesFilter;
    });

    const handleSelectCampaign = (campaignId: string) => {
        setSelectedCampaigns((prev) =>
            prev.includes(campaignId)
                ? prev.filter((id) => id !== campaignId)
                : [...prev, campaignId]
        );
    };

    const handleCampaignClick = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setShowDetailDrawer(true);
    };

    const getStatusColor = (status: Campaign["status"]) => {
        // Use consistent neutral colors for all statuses
        return "bg-gray-100 text-gray-700";
    };

    const getProgressColor = (progress: number) => {
        // Use red for low progress, neutral for everything else
        if (progress <= 25) return "bg-red-500";
        return "bg-gray-400";
    };

    const formatBudget = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const isOverdue = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 7;
    };

    const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
        <Card
            className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleCampaignClick(campaign)}
        >
            <CardContent className="p-5">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                            checked={selectedCampaigns.includes(campaign.id)}
                            onCheckedChange={() =>
                                handleSelectCampaign(campaign.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                        />

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 hover:text-red-600 transition-colors truncate">
                                {campaign.name}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                                {campaign.brand.name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {campaign.category}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Content Section */}
                <div className="space-y-3">
                    {/* Status and Budget Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className={getStatusColor(campaign.status)}
                            >
                                {campaign.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                {campaign.creators.length} Creator
                                {campaign.creators.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                                {formatBudget(campaign.budget)}
                            </div>
                        </div>
                    </div>

                    {/* Due Date Row */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Due Date</span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(campaign.dueDate).toLocaleDateString()}
                            {isOverdue(campaign.dueDate) && (
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                        </div>
                    </div>

                    {/* Progress Row */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                Progress
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                                {campaign.progress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={cn(
                                    "h-2 rounded-full transition-all",
                                    getProgressColor(campaign.progress)
                                )}
                                style={{ width: `${campaign.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex-1 bg-gray-50 page-padding">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Campaigns
                    </h1>
                    <p className="text-gray-600">
                        Manage your brand campaigns and creator collaborations
                    </p>
                </div>
                <Button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                </Button>
            </div>

            {/* Filters and Search */}
            <Card className="bg-white border border-gray-200 shadow-sm mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <Tabs
                            value={activeFilter}
                            onValueChange={(value) =>
                                setActiveFilter(value as CampaignFilter)
                            }
                        >
                            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                                <TabsTrigger value="Draft">Draft</TabsTrigger>
                                <TabsTrigger value="Active">Active</TabsTrigger>
                                <TabsTrigger value="Completed">
                                    Completed
                                </TabsTrigger>
                                <TabsTrigger value="Archived">
                                    Archived
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search campaigns..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-10 w-full sm:w-64"
                                />
                            </div>
                            <Button variant="outline" size="sm">
                                <Calendar className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedCampaigns.length > 0 && (
                <Card className="bg-red-50 border-red-200 shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-red-800">
                                {selectedCampaigns.length} campaign
                                {selectedCampaigns.length > 1 ? "s" : ""}{" "}
                                selected
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                    Bulk Reminder
                                </Button>
                                <Button variant="outline" size="sm">
                                    Export
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Campaign Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
            </div>

            {/* Empty State */}
            {filteredCampaigns.length === 0 && (
                <div className="text-center py-12">
                    <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                        <Target className="h-full w-full" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No campaigns found
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm
                            ? "Try adjusting your search terms"
                            : "Create your first campaign to get started"}
                    </p>
                    <Button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                    </Button>
                </div>
            )}

            {/* Campaign Detail Drawer */}
            <CampaignDetailDrawer
                campaign={selectedCampaign}
                isOpen={showDetailDrawer}
                onClose={() => setShowDetailDrawer(false)}
            />

            {/* New Campaign Modal */}
            <NewCampaignModal
                isOpen={showNewCampaignModal}
                onClose={() => setShowNewCampaignModal(false)}
                onSubmit={(campaignData) => {
                    console.log("New campaign created:", campaignData);
                    // In a real app, this would call an API to create the campaign
                }}
            />
        </div>
    );
}
