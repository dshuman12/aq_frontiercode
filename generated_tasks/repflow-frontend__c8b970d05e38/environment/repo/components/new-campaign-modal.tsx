"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    ArrowLeft,
    ArrowRight,
    X,
    Search,
    Plus,
    Minus,
    Check,
    ChevronDown,
    Users,
    DollarSign,
    Calendar,
    Target,
    Instagram,
    MessageSquare,
    Send,
} from "lucide-react";
import { NewCampaignStep } from "@/lib/models";
import { cn } from "@/lib/utils";

type NewCampaignModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (campaignData: any) => void;
};

type BrandInfo = {
    name: string;
    vertical: string;
    category: string;
    contactName: string;
    contactEmail: string;
};

type CreatorInfo = {
    id: string;
    name: string;
    avatar: string;
    type: string;
    followers: number;
    engagement: number;
    niche: string;
    tags: string[];
    represented: boolean;
    selected: boolean;
};

type DeliverableInfo = {
    platform: string;
    type: string;
    count: number;
    rate: number;
};

type CampaignData = {
    brand: BrandInfo;
    selectedCreators: CreatorInfo[];
    deliverables: { [creatorId: string]: DeliverableInfo[] };
    totalBudget: number;
};

// Mock data for creators
const mockCreators: CreatorInfo[] = [
    {
        id: "1",
        name: "Emma Davis",
        avatar: "/placeholder-user.png",
        type: "Fitness Creator",
        followers: 250000,
        engagement: 45000,
        niche: "Fitness",
        tags: ["fitness", "wellness", "lifestyle"],
        represented: true,
        selected: false,
    },
    {
        id: "2",
        name: "Alex Thompson",
        avatar: "/placeholder-user.png",
        type: "Urban Creator",
        followers: 180000,
        engagement: 25000,
        niche: "Fashion",
        tags: ["fashion", "streetwear", "lifestyle"],
        represented: true,
        selected: false,
    },
    {
        id: "3",
        name: "Sophie Martinez",
        avatar: "/placeholder-user.png",
        type: "Fashion Creator",
        followers: 320000,
        engagement: 65000,
        niche: "Fashion",
        tags: ["fashion", "beauty", "luxury"],
        represented: true,
        selected: false,
    },
    {
        id: "4",
        name: "James Wilson",
        avatar: "/placeholder-user.png",
        type: "Sports Creator",
        followers: 150000,
        engagement: 22000,
        niche: "Sports",
        tags: ["sports", "fitness", "outdoor"],
        represented: false,
        selected: false,
    },
];

const deliverablePresets = [
    {
        name: "Standard Package",
        deliverables: [
            { platform: "Instagram", type: "Post", count: 3, rate: 5000 },
            { platform: "Instagram", type: "Story", count: 5, rate: 2000 },
        ],
    },
    {
        name: "Premium Package",
        deliverables: [
            { platform: "Instagram", type: "Post", count: 5, rate: 8000 },
            { platform: "Instagram", type: "Story", count: 10, rate: 3000 },
            { platform: "TikTok", type: "Video", count: 2, rate: 6000 },
        ],
    },
    {
        name: "YouTube Focus",
        deliverables: [
            { platform: "YouTube", type: "Video", count: 1, rate: 15000 },
            { platform: "Instagram", type: "Post", count: 2, rate: 4000 },
        ],
    },
];

export function NewCampaignModal({
    isOpen,
    onClose,
    onSubmit,
}: NewCampaignModalProps) {
    const [currentStep, setCurrentStep] = useState<NewCampaignStep>("brand");
    const [campaignData, setCampaignData] = useState<CampaignData>({
        brand: {
            name: "",
            vertical: "",
            category: "",
            contactName: "",
            contactEmail: "",
        },
        selectedCreators: [],
        deliverables: {},
        totalBudget: 0,
    });
    const [creators, setCreators] = useState<CreatorInfo[]>(mockCreators);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedNiche, setSelectedNiche] = useState<string>("all");
    const [showRepresentedOnly, setShowRepresentedOnly] = useState(false);

    const steps: {
        key: NewCampaignStep;
        title: string;
        description: string;
    }[] = [
        {
            key: "brand",
            title: "Brand Information",
            description: "Enter brand details and contact information",
        },
        {
            key: "creators",
            title: "Select Creators",
            description: "Choose creators for your campaign",
        },
        {
            key: "deliverables",
            title: "Set Deliverables",
            description: "Define content requirements and rates",
        },
        {
            key: "review",
            title: "Review & Send",
            description: "Review campaign details and send offers",
        },
    ];

    const currentStepIndex = steps.findIndex(
        (step) => step.key === currentStep
    );

    const handleNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
            setCurrentStep(steps[nextIndex].key);
        }
    };

    const handlePrevious = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(steps[prevIndex].key);
        }
    };

    const handleCreatorSelection = (creatorId: string) => {
        const creator = creators.find((c) => c.id === creatorId);
        if (!creator) return;

        const isCurrentlySelected = campaignData.selectedCreators.some(
            (c) => c.id === creatorId
        );

        if (isCurrentlySelected) {
            setCampaignData((prev) => ({
                ...prev,
                selectedCreators: prev.selectedCreators.filter(
                    (c) => c.id !== creatorId
                ),
            }));
        } else {
            setCampaignData((prev) => ({
                ...prev,
                selectedCreators: [...prev.selectedCreators, creator],
            }));
        }
    };

    const handleBrandChange = (field: keyof BrandInfo, value: string) => {
        setCampaignData((prev) => ({
            ...prev,
            brand: {
                ...prev.brand,
                [field]: value,
            },
        }));
    };

    const handleDeliverableChange = (
        creatorId: string,
        index: number,
        field: keyof DeliverableInfo,
        value: string | number
    ) => {
        setCampaignData((prev) => ({
            ...prev,
            deliverables: {
                ...prev.deliverables,
                [creatorId]:
                    prev.deliverables[creatorId]?.map((d, i) =>
                        i === index ? { ...d, [field]: value } : d
                    ) || [],
            },
        }));
    };

    const addDeliverable = (creatorId: string) => {
        setCampaignData((prev) => ({
            ...prev,
            deliverables: {
                ...prev.deliverables,
                [creatorId]: [
                    ...(prev.deliverables[creatorId] || []),
                    { platform: "Instagram", type: "Post", count: 1, rate: 0 },
                ],
            },
        }));
    };

    const removeDeliverable = (creatorId: string, index: number) => {
        setCampaignData((prev) => ({
            ...prev,
            deliverables: {
                ...prev.deliverables,
                [creatorId]:
                    prev.deliverables[creatorId]?.filter(
                        (_, i) => i !== index
                    ) || [],
            },
        }));
    };

    const applyPreset = (preset: (typeof deliverablePresets)[0]) => {
        const newDeliverables: { [creatorId: string]: DeliverableInfo[] } = {};
        campaignData.selectedCreators.forEach((creator) => {
            newDeliverables[creator.id] = [...preset.deliverables];
        });
        setCampaignData((prev) => ({
            ...prev,
            deliverables: newDeliverables,
        }));
    };

    const calculateTotalBudget = () => {
        let total = 0;
        Object.values(campaignData.deliverables).forEach(
            (creatorDeliverables) => {
                creatorDeliverables.forEach((deliverable) => {
                    total += deliverable.rate * deliverable.count;
                });
            }
        );
        return total;
    };

    const filteredCreators = creators.filter((creator) => {
        const matchesSearch =
            creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            creator.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesNiche =
            selectedNiche === "all" || creator.niche === selectedNiche;
        const matchesRepresented = !showRepresentedOnly || creator.represented;
        return matchesSearch && matchesNiche && matchesRepresented;
    });

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    const formatBudget = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleSubmit = () => {
        const finalData = {
            ...campaignData,
            totalBudget: calculateTotalBudget(),
        };
        onSubmit(finalData);
        onClose();
    };

    const canProceed = () => {
        switch (currentStep) {
            case "brand":
                return (
                    campaignData.brand.name &&
                    campaignData.brand.contactName &&
                    campaignData.brand.contactEmail
                );
            case "creators":
                return campaignData.selectedCreators.length > 0;
            case "deliverables":
                return Object.keys(campaignData.deliverables).length > 0;
            case "review":
                return true;
            default:
                return false;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-semibold">
                                New Campaign
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {steps[currentStepIndex].description}
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 mt-4">
                        {steps.map((step, index) => (
                            <div key={step.key} className="flex items-center">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                        index <= currentStepIndex
                                            ? "bg-red-500 text-white"
                                            : "bg-gray-200 text-gray-500"
                                    )}
                                >
                                    {index + 1}
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            "w-12 h-1 mx-2",
                                            index < currentStepIndex
                                                ? "bg-red-500"
                                                : "bg-gray-200"
                                        )}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {/* Step 1: Brand Information */}
                    {currentStep === "brand" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="brandName">
                                        Brand Name *
                                    </Label>
                                    <Input
                                        id="brandName"
                                        value={campaignData.brand.name}
                                        onChange={(e) =>
                                            handleBrandChange(
                                                "name",
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., Nike, Apple, Adidas"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="vertical">Vertical</Label>
                                    <Select
                                        value={campaignData.brand.vertical}
                                        onValueChange={(value) =>
                                            handleBrandChange("vertical", value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select vertical" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fashion">
                                                Fashion
                                            </SelectItem>
                                            <SelectItem value="beauty">
                                                Beauty
                                            </SelectItem>
                                            <SelectItem value="fitness">
                                                Fitness
                                            </SelectItem>
                                            <SelectItem value="tech">
                                                Technology
                                            </SelectItem>
                                            <SelectItem value="lifestyle">
                                                Lifestyle
                                            </SelectItem>
                                            <SelectItem value="food">
                                                Food & Beverage
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={campaignData.brand.category}
                                    onValueChange={(value) =>
                                        handleBrandChange("category", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="product-launch">
                                            Product Launch
                                        </SelectItem>
                                        <SelectItem value="brand-awareness">
                                            Brand Awareness
                                        </SelectItem>
                                        <SelectItem value="seasonal">
                                            Seasonal Campaign
                                        </SelectItem>
                                        <SelectItem value="event">
                                            Event Promotion
                                        </SelectItem>
                                        <SelectItem value="collaboration">
                                            Collaboration
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="contactName">
                                        Contact Name *
                                    </Label>
                                    <Input
                                        id="contactName"
                                        value={campaignData.brand.contactName}
                                        onChange={(e) =>
                                            handleBrandChange(
                                                "contactName",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Brand contact person"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contactEmail">
                                        Contact Email *
                                    </Label>
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        value={campaignData.brand.contactEmail}
                                        onChange={(e) =>
                                            handleBrandChange(
                                                "contactEmail",
                                                e.target.value
                                            )
                                        }
                                        placeholder="contact@brand.com"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Creators */}
                    {currentStep === "creators" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search creators..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        className="pl-10"
                                    />
                                </div>
                                <Select
                                    value={selectedNiche}
                                    onValueChange={setSelectedNiche}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Filter by niche" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Niches
                                        </SelectItem>
                                        <SelectItem value="Fitness">
                                            Fitness
                                        </SelectItem>
                                        <SelectItem value="Fashion">
                                            Fashion
                                        </SelectItem>
                                        <SelectItem value="Sports">
                                            Sports
                                        </SelectItem>
                                        <SelectItem value="Lifestyle">
                                            Lifestyle
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="represented"
                                        checked={showRepresentedOnly}
                                        onCheckedChange={(checked) =>
                                            setShowRepresentedOnly(
                                                checked === "indeterminate"
                                                    ? false
                                                    : checked
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor="represented"
                                        className="text-sm"
                                    >
                                        Represented only
                                    </Label>
                                </div>
                            </div>

                            {campaignData.selectedCreators.length > 0 && (
                                <div className="bg-pink-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-pink-800 mb-2">
                                        Selected Creators (
                                        {campaignData.selectedCreators.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {campaignData.selectedCreators.map(
                                            (creator) => (
                                                <Badge
                                                    key={creator.id}
                                                    variant="secondary"
                                                    className="bg-pink-100 text-pink-800"
                                                >
                                                    {creator.name}
                                                    <button
                                                        onClick={() =>
                                                            handleCreatorSelection(
                                                                creator.id
                                                            )
                                                        }
                                                        className="ml-1 hover:text-pink-600"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                                {filteredCreators.map((creator) => (
                                    <Card
                                        key={creator.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            campaignData.selectedCreators.some(
                                                (c) => c.id === creator.id
                                            )
                                                ? "ring-2 ring-pink-500 bg-pink-50"
                                                : "hover:bg-gray-50"
                                        )}
                                        onClick={() =>
                                            handleCreatorSelection(creator.id)
                                        }
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-12 w-12">
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
                                                        <p className="text-sm text-gray-600">
                                                            {creator.type}
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-xs text-gray-500">
                                                                {formatNumber(
                                                                    creator.followers
                                                                )}{" "}
                                                                followers
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {formatNumber(
                                                                    creator.engagement
                                                                )}{" "}
                                                                engagement
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {creator.tags
                                                            .slice(0, 2)
                                                            .map((tag) => (
                                                                <Badge
                                                                    key={tag}
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                    {creator.represented && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-figma-green-primary/10 text-figma-green-primary text-xs"
                                                        >
                                                            Represented
                                                        </Badge>
                                                    )}
                                                    <Checkbox
                                                        checked={campaignData.selectedCreators.some(
                                                            (c) =>
                                                                c.id ===
                                                                creator.id
                                                        )}
                                                        onChange={() =>
                                                            handleCreatorSelection(
                                                                creator.id
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Deliverables & Rates */}
                    {currentStep === "deliverables" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-medium">
                                    Set Deliverables & Rates
                                </h3>
                                <div className="flex gap-2">
                                    {deliverablePresets.map((preset) => (
                                        <Button
                                            key={preset.name}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyPreset(preset)}
                                        >
                                            {preset.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {campaignData.selectedCreators.map(
                                    (creator) => (
                                        <Card key={creator.id}>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={creator.avatar}
                                                            alt={creator.name}
                                                        />
                                                        <AvatarFallback>
                                                            {creator.name[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{creator.name}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {(
                                                    campaignData.deliverables[
                                                        creator.id
                                                    ] || []
                                                ).map((deliverable, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3"
                                                    >
                                                        <Select
                                                            value={
                                                                deliverable.platform
                                                            }
                                                            onValueChange={(
                                                                value
                                                            ) =>
                                                                handleDeliverableChange(
                                                                    creator.id,
                                                                    index,
                                                                    "platform",
                                                                    value
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Instagram">
                                                                    Instagram
                                                                </SelectItem>
                                                                <SelectItem value="TikTok">
                                                                    TikTok
                                                                </SelectItem>
                                                                <SelectItem value="YouTube">
                                                                    YouTube
                                                                </SelectItem>
                                                                <SelectItem value="Twitter">
                                                                    Twitter
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Select
                                                            value={
                                                                deliverable.type
                                                            }
                                                            onValueChange={(
                                                                value
                                                            ) =>
                                                                handleDeliverableChange(
                                                                    creator.id,
                                                                    index,
                                                                    "type",
                                                                    value
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Post">
                                                                    Post
                                                                </SelectItem>
                                                                <SelectItem value="Story">
                                                                    Story
                                                                </SelectItem>
                                                                <SelectItem value="Video">
                                                                    Video
                                                                </SelectItem>
                                                                <SelectItem value="Reel">
                                                                    Reel
                                                                </SelectItem>
                                                                <SelectItem value="Thread">
                                                                    Thread
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                deliverable.count
                                                            }
                                                            onChange={(e) =>
                                                                handleDeliverableChange(
                                                                    creator.id,
                                                                    index,
                                                                    "count",
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                            className="w-20"
                                                            min="1"
                                                        />
                                                        <div className="flex items-center">
                                                            <span className="text-sm text-gray-500 mr-2">
                                                                $
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    deliverable.rate
                                                                }
                                                                onChange={(e) =>
                                                                    handleDeliverableChange(
                                                                        creator.id,
                                                                        index,
                                                                        "rate",
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                                className="w-24"
                                                                min="0"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeDeliverable(
                                                                    creator.id,
                                                                    index
                                                                )
                                                            }
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        addDeliverable(
                                                            creator.id
                                                        )
                                                    }
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Deliverable
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === "review" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-6">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="h-5 w-5 text-pink-600" />
                                            <span className="text-sm font-medium text-gray-600">
                                                Campaign
                                            </span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {campaignData.brand.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {campaignData.brand.category}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="h-5 w-5 text-pink-600" />
                                            <span className="text-sm font-medium text-gray-600">
                                                Creators
                                            </span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {
                                                campaignData.selectedCreators
                                                    .length
                                            }
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Selected
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="h-5 w-5 text-pink-600" />
                                            <span className="text-sm font-medium text-gray-600">
                                                Total Budget
                                            </span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatBudget(
                                                calculateTotalBudget()
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Estimated
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Campaign Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">
                                            Selected Creators
                                        </h4>
                                        <div className="space-y-2">
                                            {campaignData.selectedCreators.map(
                                                (creator) => (
                                                    <div
                                                        key={creator.id}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={
                                                                        creator.avatar
                                                                    }
                                                                    alt={
                                                                        creator.name
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {
                                                                        creator
                                                                            .name[0]
                                                                    }
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium text-gray-900">
                                                                    {
                                                                        creator.name
                                                                    }
                                                                </p>
                                                                <p className="text-sm text-gray-600">
                                                                    {
                                                                        creator.type
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium text-gray-900">
                                                                {formatBudget(
                                                                    (
                                                                        campaignData
                                                                            .deliverables[
                                                                            creator
                                                                                .id
                                                                        ] || []
                                                                    ).reduce(
                                                                        (
                                                                            sum,
                                                                            d
                                                                        ) =>
                                                                            sum +
                                                                            d.rate *
                                                                                d.count,
                                                                        0
                                                                    )
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {
                                                                    (
                                                                        campaignData
                                                                            .deliverables[
                                                                            creator
                                                                                .id
                                                                        ] || []
                                                                    ).length
                                                                }{" "}
                                                                deliverables
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentStepIndex === 0}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Previous
                        </Button>
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            {currentStepIndex < steps.length - 1 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!canProceed()}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Bulk Offer
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
