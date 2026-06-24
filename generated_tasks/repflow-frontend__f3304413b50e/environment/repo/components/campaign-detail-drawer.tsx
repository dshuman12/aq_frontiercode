"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    X,
    Edit3,
    MoreVertical,
    Mail,
    Phone,
    Calendar,
    DollarSign,
    Users,
    Target,
    Copy,
    Archive,
    Instagram,
    MessageSquare,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Send,
    Youtube,
    Video,
} from "lucide-react";
import { Campaign } from "@/lib/models";
import { cn } from "@/lib/utils";

type CampaignDetailDrawerProps = {
    campaign: Campaign | null;
    isOpen: boolean;
    onClose: () => void;
};

export function CampaignDetailDrawer({
    campaign,
    isOpen,
    onClose,
}: CampaignDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState("overview");
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState(campaign?.notes || "");

    if (!campaign) return null;

    const formatBudget = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status: Campaign["status"]) => {
        switch (status) {
            case "Draft":
                return "bg-gray-100 text-gray-800";
            case "Offers Sent":
                return "bg-blue-100 text-blue-800";
            case "Live":
                return "bg-figma-green-primary/10 text-figma-green-primary";
            case "Completed":
                return "bg-purple-100 text-purple-800";
            case "Archived":
                return "bg-gray-100 text-gray-500";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getCreatorStatusColor = (status: string) => {
        switch (status) {
            case "Pending":
                return "bg-yellow-100 text-yellow-800";
            case "Accepted":
                return "bg-figma-green-primary/10 text-figma-green-primary";
            case "Declined":
                return "bg-red-100 text-red-800";
            case "Delivered":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getCreatorStatusIcon = (status: string) => {
        switch (status) {
            case "Pending":
                return <Clock className="h-4 w-4" />;
            case "Accepted":
                return <CheckCircle className="h-4 w-4" />;
            case "Declined":
                return <XCircle className="h-4 w-4" />;
            case "Delivered":
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case "instagram":
                return <Instagram className="h-4 w-4" />;
            case "tiktok":
                return <MessageSquare className="h-4 w-4" />;
            case "youtube":
                return <Youtube className="h-4 w-4" />;
            case "twitter":
                return <MessageSquare className="h-4 w-4" />;
            default:
                return <Video className="h-4 w-4" />;
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress <= 49) return "bg-pink-500";
        if (progress <= 99) return "bg-emerald-500";
        return "bg-teal-500";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="w-[640px] sm:max-w-[640px] p-0 overflow-y-auto"
            >
                <SheetHeader className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage
                                    src={campaign.brand.avatar}
                                    alt={campaign.brand.name}
                                />
                                <AvatarFallback>
                                    {campaign.brand.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-lg font-semibold text-gray-900">
                                    {campaign.name}
                                </SheetTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                        variant="secondary"
                                        className="bg-gray-100 text-gray-800"
                                    >
                                        {campaign.brand.name}
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className={getStatusColor(
                                            campaign.status
                                        )}
                                    >
                                        {campaign.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Edit3 className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate Campaign
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </SheetHeader>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="creators">Creators</TabsTrigger>
                            <TabsTrigger value="activity">
                                Activity Log
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent
                            value="overview"
                            className="space-y-6 mt-6"
                        >
                            {/* Campaign Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Campaign Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-500">
                                                Brand Contact
                                            </Label>
                                            <div className="mt-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {
                                                        campaign.brand.contact
                                                            .name
                                                    }
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {
                                                        campaign.brand.contact
                                                            .email
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-500">
                                                Category
                                            </Label>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {campaign.category}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-500">
                                                Total Budget
                                            </Label>
                                            <p className="text-lg font-bold text-gray-900 mt-1">
                                                {formatBudget(campaign.budget)}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-500">
                                                Timeline
                                            </Label>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {formatDate(
                                                    campaign.timeline.start
                                                )}{" "}
                                                -{" "}
                                                {formatDate(
                                                    campaign.timeline.end
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-500">
                                            Progress
                                        </Label>
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-gray-600">
                                                    {
                                                        campaign.creators.filter(
                                                            (c) =>
                                                                c.status ===
                                                                    "Accepted" ||
                                                                c.status ===
                                                                    "Delivered"
                                                        ).length
                                                    }{" "}
                                                    of{" "}
                                                    {campaign.creators.length}{" "}
                                                    creators accepted
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {campaign.progress}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={cn(
                                                        "h-2 rounded-full transition-all",
                                                        getProgressColor(
                                                            campaign.progress
                                                        )
                                                    )}
                                                    style={{
                                                        width: `${campaign.progress}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notes */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            Notes
                                        </CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setEditingNotes(!editingNotes)
                                            }
                                        >
                                            {editingNotes ? "Save" : "Edit"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {editingNotes ? (
                                        <Textarea
                                            value={notes}
                                            onChange={(e) =>
                                                setNotes(e.target.value)
                                            }
                                            placeholder="Add campaign notes..."
                                            className="min-h-[100px]"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {notes || "No notes added yet."}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent
                            value="creators"
                            className="space-y-4 mt-6"
                        >
                            {campaign.creators.map((creator) => (
                                <Card key={creator.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage
                                                        src={creator.avatar}
                                                        alt={creator.name}
                                                    />
                                                    <AvatarFallback>
                                                        {creator.name[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {creator.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge
                                                            variant="secondary"
                                                            className={getCreatorStatusColor(
                                                                creator.status
                                                            )}
                                                        >
                                                            {getCreatorStatusIcon(
                                                                creator.status
                                                            )}
                                                            <span className="ml-1">
                                                                {creator.status}
                                                            </span>
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">
                                                            {formatBudget(
                                                                creator.rate
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {creator.status ===
                                                    "Pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Send className="h-4 w-4 mr-1" />
                                                        Resend Offer
                                                    </Button>
                                                )}
                                                {creator.status ===
                                                    "Accepted" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Mail className="h-4 w-4 mr-1" />
                                                        Message
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-sm font-medium text-gray-500">
                                                Deliverables
                                            </Label>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {creator.deliverables.map(
                                                    (deliverable, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="outline"
                                                            className="flex items-center gap-1"
                                                        >
                                                            {getPlatformIcon(
                                                                deliverable.platform
                                                            )}
                                                            <span>
                                                                {
                                                                    deliverable.count
                                                                }{" "}
                                                                {
                                                                    deliverable.type
                                                                }
                                                                {deliverable.count >
                                                                1
                                                                    ? "s"
                                                                    : ""}
                                                            </span>
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent
                            value="activity"
                            className="space-y-4 mt-6"
                        >
                            <div className="space-y-4">
                                {campaign.activityLog.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex gap-3 p-4 bg-gray-50 rounded-lg"
                                    >
                                        <div className="w-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {activity.message}
                                                </p>
                                                <span className="text-xs text-gray-500">
                                                    {formatTimestamp(
                                                        activity.timestamp
                                                    )}
                                                </span>
                                            </div>
                                            {activity.user && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage
                                                            src={
                                                                activity.user
                                                                    .avatar
                                                            }
                                                            alt={
                                                                activity.user
                                                                    .name
                                                            }
                                                        />
                                                        <AvatarFallback className="text-xs">
                                                            {
                                                                activity.user
                                                                    .name[0]
                                                            }
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-gray-600">
                                                        {activity.user.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <SheetFooter className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Campaign
                        </Button>
                        <Button variant="outline">
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                        </Button>
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
