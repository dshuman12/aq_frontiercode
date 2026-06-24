"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
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
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Deliverable, DeliverableContent, DeliverableType, Platform, PlatformType, RateType } from "@/lib/models";
import { getPlatformIconComponent } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import {
    Info
} from "lucide-react";
import { useMemo, useState } from "react";
import { DollarInput } from "./dollar-input";

type NewDeliverableModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (deliverable: Omit<Deliverable, "id">) => void;
    connectedPlatforms?: Platform[];
};

const deliverableTypes = [
    // YouTube
    "Preroll",
    "Midroll",
    "Postroll", 
    "Dedicated Video",
    "Semi-Dedicated Video",
    "Interview",
    "Segment",
    // Instagram
    "Feed Post",
    "Reel",
    "Story",
    "Story Set",
    "Link-in-Bio 7 Days",
    "Link-in-Bio 30 Days",
    // TikTok
    "Video",
    "Product/Logo Placement",
    // Podcast
    "Podcast Episode",
    // Twitch
    "1 Hour Stream",
    "2 Hour Stream",
    "Gameplay Stream",
    "Panel",
    "15 min Chatbot",
    "Logo Overlay",
    "30 Day Panel + Chatbot + Overlay",
    // LinkedIn
    "Text Post",
    "Text + Image Post",
    "Text + Video Post",
    // Newsletter
    "Banner",
    "Newsletter Segment",
    "Newsletter Image",
    "Newsletter Video",
    // Legacy/Other
    "Blog Post",
    "Twitter Thread",
    "Custom",
];

const pricingTiers = [
    { value: "low_tier", label: "Low Tier", symbol: "Low" },
    { value: "premium_tier", label: "Premium Tier", symbol: "Premium" },
    { value: "ultra_premium", label: "Ultra Premium", symbol: "Ultra" },
];


export function NewDeliverableModal({
    open,
    onOpenChange,
    onSubmit,
    connectedPlatforms = [],
}: NewDeliverableModalProps) {
    const [platform, setPlatform] = useState("");
    const [manualPlatformType, setManualPlatformType] = useState<PlatformType | "">("");
    const [manualMetricInput, setManualMetricInput] = useState("");
    /** When set, overrides dropdown for account (manual handle without connected platform) */
    const [manualHandle, setManualHandle] = useState("");
    const [deliverableType, setDeliverableType] = useState("");
    const [showDeliverableDropdown, setShowDeliverableDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [rate, setRate] = useState(0);
    const [rateType, setRateType] = useState<string>("FLAT");
    const [price, setPrice] = useState(0);
    const [lockRate, setLockRate] = useState(false);
    const [pricingTier, setPricingTier] = useState<string>("");
    const [bundle, setBundle] = useState(false);
    const [contentList, setContentList] = useState<DeliverableContent[]>([]);

    // Keep all connected platforms selectable; inactive accounts can still be priced manually.
    const selectablePlatforms = useMemo(() => connectedPlatforms, [connectedPlatforms]);

    // Filter deliverable types based on input
    const filteredDeliverableTypes = useMemo(() => {
        if (!deliverableType) return deliverableTypes;
        return deliverableTypes.filter(type =>
            type.toLowerCase().includes(deliverableType.toLowerCase())
        );
    }, [deliverableType]);

    // Functions to manage content list for bundles
    const addContentItem = () => {
        const account = (manualHandle.trim() || (platform && platform !== "__none__" ? platform : "")).trim();
        if (deliverableType) {
            const newContent: DeliverableContent = {
                account: account || undefined,
                deliverableType: deliverableType as DeliverableType,
            };
            setContentList([...contentList, newContent]);
            setPlatform("");
            setManualHandle("");
            setDeliverableType("");
        }
    };

    const removeContentItem = (index: number) => {
        setContentList(contentList.filter((_, i) => i !== index));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Form submitted with values:", { platform: platform.trim(), deliverableType, rate, price, rateType, lockRate, bundle, contentList });

        // Validation: account/platform optional (uncoupled from OAuth); only type + pricing required
        const errors = [];
        
        if (bundle) {
            if (contentList.length === 0) {
                errors.push("Bundle must contain at least one content item");
            }
        } else {
            if (!deliverableType) errors.push("Deliverable Type is required");
        }
        
        if (rate <= 0 && price <= 0) errors.push("Rate or Price must be greater than 0");
        
        if (errors.length > 0) {
            console.log("Validation failed:", { platform: platform.trim(), deliverableType, rate, price, errors });
            // You could add a toast notification here to show the user what's wrong
            alert(`Please fix the following errors:\n${errors.join('\n')}`);
            return;
        }

        const now = new Date();
        const finalPrice = lockRate && rateType !== "FLAT" ? calculatePrice() : price;
        // Account optional: use manual handle, or selected platform, or leave empty (price by type only)
        const accountValue = (manualHandle.trim() || (platform && platform !== "__none__" ? platform : "")).trim() || undefined;

        const finalContent = bundle
            ? contentList
            : deliverableType
                ? [{ account: accountValue, deliverableType: deliverableType as DeliverableType }]
                : [];

        const newDeliverable: Omit<Deliverable, "id"> = {
            bundle,
            content: finalContent,
            account: bundle ? undefined : accountValue,
            deliverableType: bundle ? ("Custom" as DeliverableType) : (deliverableType as DeliverableType),
            rate,
            rateType: rateType as RateType,
            lockRate,
            price: finalPrice,
            tier: pricingTier && pricingTier !== "none" ? pricingTier : undefined,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        console.log("Calling onSubmit with:", newDeliverable);
        onSubmit(newDeliverable);

        // Reset form
        setPlatform("");
        setManualPlatformType("");
        setManualMetricInput("");
        setManualHandle("");
        setDeliverableType("");
        setShowDeliverableDropdown(false);
        setSelectedIndex(-1);
        setRate(0);
        setRateType("FLAT");
        setPrice(0);
        setLockRate(false);
        setPricingTier("");
        setBundle(false);
        setContentList([]);
    };

    const selectedPlatform = platform && platform !== "__none__" ? selectablePlatforms.find(p => p.handle === platform) : null;

    // Parse shorthand social metrics (for example: 12.5K, 1.2M) into integers.
    const parseMetricNumber = (rawValue: string): number => {
        const normalized = rawValue.trim().replace(/,/g, "").toLowerCase();
        if (!normalized) return 0;

        const multiplier = normalized.endsWith("k")
            ? 1_000
            : normalized.endsWith("m")
                ? 1_000_000
                : normalized.endsWith("b")
                    ? 1_000_000_000
                    : 1;

        const numericPart = multiplier === 1 ? normalized : normalized.slice(0, -1);
        const parsed = Number.parseFloat(numericPart);
        if (Number.isNaN(parsed)) return 0;
        return Math.round(parsed * multiplier);
    };

    const getMetricMeta = (platformType: PlatformType | "") => {
        switch (platformType) {
            case PlatformType.INSTAGRAM:
                return { label: "Followers", unit: "followers" };
            case PlatformType.TWITCH:
                return { label: "Concurrent Viewers", unit: "viewers" };
            case PlatformType.YOUTUBE:
            case PlatformType.TIKTOK:
                return { label: "Avg Views", unit: "views" };
            default:
                return { label: "Reach/Following", unit: "followers" };
        }
    };

    // Helper functions for platform metrics and calculations
    const getPlatformMetric = () => {
        const effectivePlatformType = selectedPlatform?.platformType || manualPlatformType;

        // Allow manual metrics to drive pricing even without OAuth analytics.
        if (manualMetricInput.trim() && effectivePlatformType) {
            const meta = getMetricMeta(effectivePlatformType);
            return {
                label: meta.label,
                value: manualMetricInput.trim(),
                unit: meta.unit,
                source: selectedPlatform ? selectedPlatform.handle : "manual input",
            };
        }

        if (!selectedPlatform) return null;
        
        const platformType = selectedPlatform.platformType;
        const metrics = selectedPlatform.metrics;
        const youtubeAnalytics = selectedPlatform.youtubeAnalytics;
        const instagramAnalytics = selectedPlatform.instagramAnalytics;

        switch (platformType) {
            case PlatformType.YOUTUBE:
                return {
                    label: "Avg Views",
                    value: youtubeAnalytics?.topVideoViews?.toString() || metrics?.avgVideoViews || "0",
                    unit: "views",
                    source: selectedPlatform.handle
                };
            case PlatformType.INSTAGRAM:
                return {
                    label: "Followers",
                    value: instagramAnalytics?.followers?.toString() || metrics?.subscribers || "0",
                    unit: "followers",
                    source: selectedPlatform.handle
                };
            case PlatformType.TWITCH:
                return {
                    label: "Concurrent Viewers",
                    value: metrics?.avgVideoViews || "0",
                    unit: "viewers",
                    source: selectedPlatform.handle
                };
            case PlatformType.TIKTOK:
                return {
                    label: "Avg Views",
                    value: metrics?.avgVideoViews || "0",
                    unit: "views",
                    source: selectedPlatform.handle
                };
            default:
                return {
                    label: "Reach/Following",
                    value: metrics?.subscribers || "0",
                    unit: "followers",
                    source: selectedPlatform.handle
                };
        }
    };

    const calculatePrice = () => {
        if (rateType === "FLAT" || !lockRate) return price;
        
        const metric = getPlatformMetric();
        if (!metric) return price;
        
        const metricValue = parseMetricNumber(metric.value);
        let calculatedPrice = 0;
        
        if (rateType === "CPM") {
            // Rate is per 1,000 views/impressions
            calculatedPrice = (rate * metricValue) / 1000;
        } else if (rateType === "CVV") {
            // Rate is per concurrent viewer
            calculatedPrice = rate * metricValue;
        }
        
        // Round to nearest hundred, or thousand if above threshold
        if (calculatedPrice >= 1000) {
            calculatedPrice = Math.ceil(calculatedPrice / 1000) * 1000;
        } else {
            calculatedPrice = Math.ceil(calculatedPrice / 100) * 100;
        }
        
        return calculatedPrice;
    };

    const formatPrice = (value: number) => {
        if (value >= 1000) {
            return Math.ceil(value / 1000) * 1000;
        } else {
            return Math.ceil(value / 100) * 100;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[600px] max-h-[90vh] p-0 overflow-auto">
                {/* Header */}
                <DialogHeader className="p-6 border-b border-gray-200">
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                        Add New Deliverable
                    </DialogTitle>
                </DialogHeader>

                {/* Main Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Bundle Configuration - Moved to top */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Bundle Configuration
                        </h3>
                        <div className="space-y-4">
                            <div
                                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                                    bundle
                                        ? "border-figma-green-primary bg-green-50"
                                        : "border-gray-200 bg-gray-50"
                                }`}
                                onClick={() => {
                                    const newBundleState = !bundle;
                                    setBundle(newBundleState);
                                    // When enabling bundle, set rate type to FLAT and clear deliverable type
                                    if (newBundleState) {
                                        setRateType("FLAT");
                                        setLockRate(false);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={`font-medium text-sm ${
                                            bundle ? "text-green-700" : "text-gray-600"
                                        }`}>
                                            Bundle Deliverable
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Create a bundle with multiple content items
                                        </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded border-2 transition-all ${
                                        bundle 
                                            ? "bg-figma-green-primary border-figma-green-primary" 
                                            : "border-gray-300"
                                    }`}>
                                        {bundle && (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Information - Always show, adapts based on bundle mode */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Deliverable Content
                        </h3>
                        
                        {/* Content List Display - Show existing items for bundles */}
                        {bundle && (
                            <div className="space-y-2 mb-4">
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {contentList.length === 0 && (
                                           <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-500">
                                            No Items Added
                                       </div>
                                    )}
                                    {contentList.map((content, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-6 h-6 bg-figma-green-primary/20 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-medium text-figma-green-primary">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {content.deliverableType}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {content.account}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeContentItem(index)}
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Input Form - For adding new items */}
                        <div className={`${bundle ? 'border border-gray-200 rounded-lg p-4 bg-gray-50' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label
                                        htmlFor="platform"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Platform/Account {bundle ? "" : "(optional)"}
                                    </Label>
                                    {selectablePlatforms.length > 0 ? (
                                        <div className="space-y-2 mt-1">
                                            <Select
                                                value={platform || "__none__"}
                                                onValueChange={(v) => {
                                                    setPlatform(v);
                                                    setManualHandle("");
                                                }}
                                            >
                                                <SelectTrigger className={`focus:ring-2 focus:ring-figma-green-primary focus:border-transparent ${bundle ? "h-8 text-sm" : ""}`}>
                                                    <SelectValue>
                                                        {selectedPlatform ? (
                                                            <div className="flex items-center space-x-2">
                                                                {getPlatformIconComponent(selectedPlatform.platformType, bundle ? "w-3 h-3" : "w-4 h-4")}
                                                                <span className={bundle ? "text-xs" : ""}>{selectedPlatform.name}</span>
                                                                <span className={`text-gray-500 ${bundle ? "text-xs" : "text-sm"}`}>({selectedPlatform.handle})</span>
                                                            </div>
                                                        ) : (
                                                            bundle ? "Select platform" : "No specific account (price by type only)"
                                                        )}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        <span className="text-gray-500">No specific account (price by type only)</span>
                                                    </SelectItem>
                                                    {selectablePlatforms.map((p) => (
                                                        <SelectItem key={p.handle} value={p.handle}>
                                                            <div className="flex items-center space-x-2">
                                                                {getPlatformIconComponent(p.platformType, bundle ? "w-3 h-3" : "w-4 h-4")}
                                                                <span className={bundle ? "text-sm" : ""}>{p.name}</span>
                                                                <span className={`text-gray-500 ${bundle ? "text-xs" : "text-sm"}`}>({p.handle})</span>
                                                                {!p.isActive && (
                                                                    <span className={`text-amber-600 ${bundle ? "text-xs" : "text-sm"}`}>(inactive)</span>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                id="manual-handle"
                                                value={manualHandle}
                                                onChange={(e) => setManualHandle(e.target.value)}
                                                placeholder="Or enter handle manually (e.g. @handle)"
                                                className={`focus:ring-2 focus:ring-figma-green-primary focus:border-transparent ${bundle ? "h-8 text-sm" : ""}`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mt-1">
                                            <Input
                                                id="platform"
                                                value={platform}
                                                onChange={(e) => setPlatform(e.target.value)}
                                                placeholder={bundle ? "e.g., @sarahjohnson" : "e.g., @sarahjohnson (optional)"}
                                                className={`focus:ring-2 focus:ring-figma-green-primary focus:border-transparent ${bundle ? "h-8 text-sm" : ""}`}
                                            />
                                            {!bundle && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Optional. Add platforms in Portfolio or set price by deliverable type only.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <Label
                                        htmlFor="deliverableType"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Deliverable Type {!bundle && '*'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="deliverableType"
                                            type="text"
                                            value={deliverableType}
                                            onChange={(e) => {
                                                setDeliverableType(e.target.value);
                                                setShowDeliverableDropdown(true);
                                                setSelectedIndex(-1);
                                            }}
                                            onFocus={() => {
                                                setShowDeliverableDropdown(true);
                                            }}
                                            onBlur={() => {
                                                // Delay hiding to allow for clicks on dropdown items
                                                setTimeout(() => setShowDeliverableDropdown(false), 150);
                                            }}
                                            onKeyDown={(e) => {
                                                if (!showDeliverableDropdown) return;
                                                
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setSelectedIndex(prev => 
                                                        prev < filteredDeliverableTypes.length - 1 ? prev + 1 : prev
                                                    );
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (selectedIndex >= 0 && selectedIndex < filteredDeliverableTypes.length) {
                                                        setDeliverableType(filteredDeliverableTypes[selectedIndex]);
                                                        setShowDeliverableDropdown(false);
                                                        setSelectedIndex(-1);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setShowDeliverableDropdown(false);
                                                    setSelectedIndex(-1);
                                                }
                                            }}
                                            className={`mt-1 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent ${bundle ? 'h-8 text-sm' : ''}`}
                                            required={!bundle}
                                        />
                                        
                                        {/* Dropdown List */}
                                        {showDeliverableDropdown && (
                                            <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto ${bundle ? 'max-h-40' : 'max-h-60'}`}>
                                                {filteredDeliverableTypes.length > 0 ? (
                                                    filteredDeliverableTypes.map((type, index) => (
                                                        <div
                                                            key={type}
                                                            className={cn(
                                                                `cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${bundle ? 'px-2 py-1 text-sm' : 'px-3 py-2'}`,
                                                                index === selectedIndex 
                                                                    ? "bg-figma-green-primary/10 text-figma-green-primary" 
                                                                    : "hover:bg-gray-50 text-gray-900"
                                                            )}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent input blur
                                                                setDeliverableType(type);
                                                                setShowDeliverableDropdown(false);
                                                                setSelectedIndex(-1);
                                                            }}
                                                            onMouseEnter={() => setSelectedIndex(index)}
                                                        >
                                                            <span className={bundle ? 'text-sm' : 'text-sm'}>{type}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className={`text-sm text-gray-500 ${bundle ? 'px-2 py-1' : 'px-3 py-2'}`}>
                                                        {deliverableType ? (
                                                            <p>No matches found.</p>
                                                        ) : (
                                                            "Start typing to see suggestions..."
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Add Button for bundles */}
                            {bundle && (
                                <Button
                                    type="button"
                                    onClick={addContentItem}
                                    disabled={!deliverableType}
                                    className="mt-3 h-8 px-3 text-sm bg-figma-green-primary hover:bg-figma-green-primary/90 text-black"
                                >
                                    Add to Bundle
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Pricing Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Pricing Information
                        </h3>
                        
                        {/* 2x2 Grid Layout */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Top-left: Price */}
                            <div>
                                <Label
                                    htmlFor="price"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Price *
                                </Label>
                                <DollarInput
                                    id="price"
                                    value={lockRate && rateType !== "FLAT" ? calculatePrice() : price}
                                    onChange={setPrice}
                                    placeholder="e.g., 1500"
                                    className="mt-1 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                    disabled={lockRate && rateType !== "FLAT"}
                                    required
                                />
                            </div>
                            
                                                   
                            {/* Top-right: Type dropdown */}
                            <div>
                                <Label
                                    htmlFor="rateType"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Type
                                </Label>
                                <Select
                                    value={bundle ? "FLAT" : rateType}
                                    onValueChange={(value) => {
                                        if (!bundle) {
                                            setRateType(value);
                                            if (value === "FLAT") {
                                                setLockRate(false);
                                            }
                                        } else {
                                            setRateType("FLAT");
                                        }
                                    }}
                                    disabled={bundle}
                                >
                                    <SelectTrigger className={`mt-1 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent ${bundle ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FLAT">Flat Rate</SelectItem>
                                        <SelectItem value="CPM">CPM</SelectItem>
                                        <SelectItem value="CVV">CVV</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {rateType !== "FLAT" && (
                            <>     
                            
                            {/* Bottom-left: Rate input */}
                            <div>
                                <Label
                                    htmlFor="rate"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Rate *
                                </Label>
                                <DollarInput
                                    id="rate"
                                    value={rate}
                                    onChange={setRate}
                                    placeholder={rateType === "CPM" ? "e.g., 25" : rateType === "CVV" ? "e.g., 2" : "e.g., 1500"}
                                    className="mt-1 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                    disabled={rateType === "FLAT"}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {rateType === "CPM" && "Rate per 1,000 views/impressions"}
                                    {rateType === "CVV" && "Rate per concurrent viewer"}
                                    {rateType === "FLAT" && "Flat rate pricing"}
                                </p>
                            </div>
           
                            {/* Bottom-right: Platform metrics, lock rate, and calculation preview */}
                            <div className="flex flex-col h-full">
                                <Label className="text-sm font-medium text-gray-700">
                                    Platform Metrics & Controls
                                </Label>

                                {/* Manual metrics keep CPM/CVV usable when OAuth analytics are unavailable. */}
                                {!selectedPlatform && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <Select
                                            value={manualPlatformType || "none"}
                                            onValueChange={(value) =>
                                                setManualPlatformType(value === "none" ? "" : (value as PlatformType))
                                            }
                                        >
                                            <SelectTrigger className="h-9 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent">
                                                <SelectValue placeholder="Select platform type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No platform type</SelectItem>
                                                <SelectItem value={PlatformType.INSTAGRAM}>Instagram</SelectItem>
                                                <SelectItem value={PlatformType.YOUTUBE}>YouTube</SelectItem>
                                                <SelectItem value={PlatformType.TIKTOK}>TikTok</SelectItem>
                                                <SelectItem value={PlatformType.TWITCH}>Twitch</SelectItem>
                                                <SelectItem value={PlatformType.OTHER}>Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={manualMetricInput}
                                            onChange={(e) => setManualMetricInput(e.target.value)}
                                            placeholder="Metric (e.g. 120K)"
                                            className="h-9 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                        />
                                    </div>
                                )}

                                {selectedPlatform && (
                                    <div className="mt-2">
                                        <Input
                                            value={manualMetricInput}
                                            onChange={(e) => setManualMetricInput(e.target.value)}
                                            placeholder="Optional metric override (e.g. 250K)"
                                            className="h-9 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                        />
                                    </div>
                                )}
                                
                                {/* Platform metric display */}
                                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md flex-1 flex-row flex items-center justify-between">
                                    <div className="text-lg font-semibold text-gray-900">
                                        {getPlatformMetric()?.value || "No metric entered"}
                                    </div>
                                    {getPlatformMetric() && (
                                        <p className="text-xs text-gray-500">
                                            {getPlatformMetric()?.label} from {getPlatformMetric()?.source}
                                        </p>
                                    )}
                                </div>
                                
                                {/* Lock Rate toggle */}
                                {rateType !== "FLAT" && (
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={lockRate}
                                                onCheckedChange={setLockRate}
                                                className="data-[state=checked]:bg-figma-green-primary"
                                            />
                                            <span className="text-sm text-gray-700">Lock Rate</span>
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="end" className="max-w-xs">
                                                    <p className="text-sm">Auto-updates price based on platform metrics</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}
                                
                                {/* Calculation preview when Lock Rate is off but rate-based */}
                                {rateType !== "FLAT" && !lockRate && rate > 0 && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        <div className="flex items-center space-x-1">
                                            <Info className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                            <p className="text-xs text-blue-800">
                                                Projected: <span className="font-semibold">${calculatePrice().toLocaleString()}</span>
                                            </p>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Override above when Lock Rate is off
                                        </p>
                                    </div>
                                )}
                            </div>
                            </>)}
                        </div>
                        
                    </div>

                    {/* Pricing Tier */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Pricing Tier
                        </h3>
                        <div>
                            <Select
                                value={pricingTier || "none"}
                                onValueChange={(value) => setPricingTier(value === "none" ? "" : value)}
                            >
                                <SelectTrigger className="focus:ring-2 focus:ring-figma-green-primary focus:border-transparent">
                                    <SelectValue placeholder="Select a pricing tier (optional)">
                                        {pricingTier ? (
                                            <div className="flex items-center space-x-2">
                                                <span>{pricingTiers.find(t => t.value === pricingTier)?.label || pricingTier}</span>
                                            </div>
                                        ) : (
                                            "Select a pricing tier (optional)"
                                        )}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-500">No pricing tier</span>
                                        </div>
                                    </SelectItem>
                                    {pricingTiers.map((tier) => (
                                        <SelectItem key={tier.value} value={tier.value}>
                                            <div className="flex items-center space-x-2">
                                                <span>{tier.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="bg-white border-gray-200 hover:bg-gray-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-sage-primary hover:bg-sage-primary/90 text-black shadow-sm"
                        >
                            Add Deliverable
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
