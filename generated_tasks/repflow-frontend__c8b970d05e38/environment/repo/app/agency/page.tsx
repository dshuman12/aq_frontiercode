"use client";

import { CreatorDetailsModal } from "@/components/creator-details-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Creator } from "@/lib/models";
import {
    Download,
    Eye,
    MoreVertical,
    Plus,
    Search,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { useState } from "react";

// Types for the deal tracker
type DealTrackerStatus = "Leads" | "Negotiation" | "Contract" | "Closed";

type DealTrackerItem = {
    id: string;
    brand: string;
    value: string;
    creator: {
        name: string;
        avatar: string;
        type: string;
    };
    agent: {
        name: string;
        avatar: string;
    };
    dueDate: string;
    status: DealTrackerStatus;
};

// Function to convert DealTrackerItem to Creator for modal
const convertDealToCreator = (deal: DealTrackerItem): Creator => {
    return {
        id: deal.id,
        name: deal.creator.name,
        avatar: deal.creator.avatar,
        type: deal.creator.type as any, // Type assertion for creator type
        followers: 180000, // Mock data since not in deal tracker
        engagement: 18000, // Mock data since not in deal tracker
        dealType: deal.brand,
        dealBrand: deal.brand,
        dealValue: parseInt(deal.value.replace(/[$,]/g, "")),
        agent: deal.agent,
        dueDate: deal.dueDate.replace("Due ", "").replace("Closed ", ""),
        status: deal.status === "Closed" ? "Active" : "Active", // Convert status
    };
};

// Mock data matching the Figma design
const dealTrackerData: DealTrackerItem[] = [
    {
        id: "1",
        brand: "Nike",
        value: "$15,000",
        creator: {
            name: "Sarah Johnson",
            avatar: "/placeholder-user.png",
            type: "Lifestyle Creator",
        },
        agent: {
            name: "M. Chen",
            avatar: "/placeholder-user.png",
        },
        dueDate: "Due Jan 30",
        status: "Leads",
    },
    {
        id: "2",
        brand: "Adidas",
        value: "$8,500",
        creator: {
            name: "James Wilson",
            avatar: "/placeholder-user.png",
            type: "Sports Creator",
        },
        agent: {
            name: "R. Smith",
            avatar: "/placeholder-user.png",
        },
        dueDate: "Due Feb 15",
        status: "Leads",
    },
    {
        id: "3",
        brand: "Under Armour",
        value: "$25,000",
        creator: {
            name: "Emma Davis",
            avatar: "/placeholder-user.png",
            type: "Fitness Creator",
        },
        agent: {
            name: "M. Chen",
            avatar: "/placeholder-user.png",
        },
        dueDate: "Due Mar 5",
        status: "Negotiation",
    },
    {
        id: "4",
        brand: "Puma",
        value: "$18,000",
        creator: {
            name: "Alex Thompson",
            avatar: "/placeholder-user.png",
            type: "Urban Creator",
        },
        agent: {
            name: "R. Smith",
            avatar: "/placeholder-user.png",
        },
        dueDate: "Due Mar 15",
        status: "Contract",
    },
    {
        id: "5",
        brand: "Reebok",
        value: "$22,000",
        creator: {
            name: "Sophie Martinez",
            avatar: "/placeholder-user.png",
            type: "Fashion Creator",
        },
        agent: {
            name: "M. Chen",
            avatar: "/placeholder-user.png",
        },
        dueDate: "Closed Feb 28",
        status: "Closed",
    },
];

// Stats data
const stats = [
    {
        title: "Active Deals",
        value: "47",
        change: "+12%",
        changeType: "up" as const,
    },
    {
        title: "Total Value",
        value: "$247,500",
        change: "+8%",
        changeType: "up" as const,
    },
    {
        title: "Avg. Deal Size",
        value: "$5,265",
        change: "-3%",
        changeType: "down" as const,
    },
    {
        title: "Close Rate",
        value: "68%",
        change: "+5%",
        changeType: "up" as const,
    },
];

// Column data
const columns = [
    { id: "Leads", title: "Leads", count: 8 },
    { id: "Negotiation", title: "Negotiation", count: 12 },
    { id: "Contract", title: "Contract", count: 15 },
    { id: "Closed", title: "Closed", count: 12 },
];

export default function DealTrackerPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCreator, setSelectedCreator] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedCreatorForModal, setSelectedCreatorForModal] =
        useState<Creator | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDealClick = (deal: DealTrackerItem) => {
        const creator = convertDealToCreator(deal);
        setSelectedCreatorForModal(creator);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCreatorForModal(null);
    };

    const getDealsForColumn = (status: DealTrackerStatus) => {
        return dealTrackerData.filter((deal) => deal.status === status);
    };

    const StatCard = ({
        title,
        value,
        change,
        changeType,
    }: (typeof stats)[0]) => (
        <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500 text-sm">{title}</div>
                    <div className="flex items-center gap-1">
                        {changeType === "up" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span
                            className={`text-sm ${
                                changeType === "up"
                                    ? "text-emerald-500"
                                    : "text-red-500"
                            }`}
                        >
                            {change}
                        </span>
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
            </CardContent>
        </Card>
    );

    const DealCard = ({
        deal,
        onClick,
    }: {
        deal: DealTrackerItem;
        onClick: () => void;
    }) => (
        <Card
            className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-4 cursor-pointer"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-sm font-medium text-red-500">
                        {deal.brand}
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                        {deal.value}
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={deal.creator.avatar} />
                        <AvatarFallback>
                            {deal.creator.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {deal.creator.name}
                        </div>
                        <div className="text-xs text-gray-500">
                            {deal.creator.type}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={deal.agent.avatar} />
                            <AvatarFallback>
                                {deal.agent.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500">
                            {deal.agent.name}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">
                        {deal.dueDate}
                    </span>
                </div>
            </CardContent>
        </Card>
    );

    const ColumnHeader = ({
        title,
        count,
    }: {
        title: string;
        count: number;
    }) => (
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">
                    {title}
                </span>
                <span className="text-sm text-gray-500">({count})</span>
            </div>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <div className="flex-1 bg-gray-50 page-padding w-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Roster Deal Tracker
                    </h1>
                    <p className="text-gray-600">
                        Managing 30 creators&apos; sponsorship deals
                    </p>
                </div>
                <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Deal
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            {/* Search and Filters */}
            <Card className="bg-white border border-gray-200 shadow-sm mb-8">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 gap-4">
                            <div className="relative flex-1 max-w-xs w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search deals or creators..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-10"
                                />
                            </div>
                            <Select
                                value={selectedCreator}
                                onValueChange={setSelectedCreator}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="All Creators" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Creators
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={selectedBrand}
                                onValueChange={setSelectedBrand}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Brands
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={selectedStatus}
                                onValueChange={setSelectedStatus}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Deal Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Deal Status
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
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
                </CardContent>
            </Card>

            {/* Kanban Board */}
            <div className="flex gap-6 overflow-x-auto w-full">
                {columns.map((column) => (
                    <Card
                        key={column.id}
                        className="bg-white border border-gray-200 shadow-sm min-w-[280px] sm:min-w-64"
                    >
                        <CardHeader className="pb-4">
                            <ColumnHeader
                                title={column.title}
                                count={column.count}
                            />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-0">
                                {getDealsForColumn(
                                    column.id as DealTrackerStatus
                                ).map((deal) => (
                                    <DealCard
                                        key={deal.id}
                                        deal={deal}
                                        onClick={() => handleDealClick(deal)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Creator Details Modal */}
            <CreatorDetailsModal
                creator={selectedCreatorForModal}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}
