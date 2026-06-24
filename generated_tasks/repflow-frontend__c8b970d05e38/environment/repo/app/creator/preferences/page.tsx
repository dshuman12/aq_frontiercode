"use client";
import { DollarInput } from "@/components/dollar-input";
import { NewDeliverableModal } from "@/components/new-deliverable-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { getUser, getUserPreferences, updateUserPreferences, updateUserDeliverables } from "@/lib/api";
import {
    Deliverable,
    DeliverableType,
    PartnershipPreferences,
    PricingTiers,
    User,
    UserPreferences
} from "@/lib/models";
import { getPlatformIconByName, getPlatformIconComponent } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import {
    Check,
    Plus,
    Search,
    Trash2,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Deliverable types for autosuggest
const deliverableTypes = [
    "Preroll",
    "Midroll",
    "Postroll", 
    "Dedicated Video",
    "Semi-Dedicated Video",
    "Interview",
    "Segment",
    "Feed Post",
    "Reel",
    "Story",
    "Story Set",
    "Link-in-Bio 7 Days",
    "Link-in-Bio 30 Days",
    "Video",
    "Product/Logo Placement",
    "Podcast Episode",
    "1 Hour Stream",
    "2 Hour Stream",
    "Gameplay Stream",
    "Panel",
    "15 min Chatbot",
    "Logo Overlay",
    "30 Day Panel + Chatbot + Overlay",
    "Text Post",
    "Text + Image Post",
    "Text + Video Post",
    "Banner",
    "Newsletter Segment",
    "Newsletter Image",
    "Newsletter Video",
    "Blog Post",
    "Twitter Thread",
    "Custom",
];

// Pre-built sponsorship categories for auto-suggest
const preBuiltCategories = [
    "Beauty",
    "Tech",
    "Fitness",
    "Fashion",
    "Food & Beverage",
    "Travel",
    "Gaming",
    "Entertainment",
    "Lifestyle",
    "Health & Wellness",
    "Finance",
    "Education",
    "Sports",
    "Automotive",
    "Home & Garden",
    "Pet Care",
    "Parenting",
    "Business",
    "Music",
    "Art & Design",
    "Photography",
    "Books & Literature",
    "Podcasts",
    "Streaming",
    "Social Media",
    "E-commerce",
    "SaaS",
    "Mobile Apps",
    "Software",
    "Hardware",
    "Gadgets",
    "Wearables",
    "Skincare",
    "Makeup",
    "Hair Care",
    "Fragrance",
    "Wellness Products",
    "Supplements",
    "Nutrition",
    "Meal Prep",
    "Restaurants",
    "Coffee & Tea",
    "Alcohol",
    "Beverages",
    "Athletic Wear",
    "Activewear",
    "Outdoor Gear",
    "Travel Accessories",
    "Luggage",
    "Hotels",
    "Airlines",
    "Tourism",
    "Video Games",
    "Gaming Accessories",
    "Streaming Equipment",
    "Music Equipment",
    "Instruments",
    "Home Decor",
    "Furniture",
    "Kitchenware",
    "Appliances",
    "Pet Food",
    "Pet Supplies",
    "Baby Products",
    "Kids Products",
    "Toys",
    "Educational Content",
    "Online Courses",
    "Tutoring",
    "Professional Services",
    "Consulting",
    "Real Estate",
    "Insurance",
    "Banking",
    "Investment",
    "Cryptocurrency",
    "Trading",
    "Crypto/Blockchain/NFTs",
    "Adult Content",
    "Gambling",
    "Political Content",
    "Pharmaceuticals",
    "Weight Loss Products",
    "Get Rich Quick Schemes",
    "Tobacco/Vaping",
    "Dating Apps",
    "MLM/Pyramid Schemes",
    "Unethical Business Practices",
];

// Pricing tiers - using correct API values
const pricingTiers = [
    { value: "low_tier", label: "Low Tier", symbol: "Low" },
    { value: "premium_tier", label: "Premium Tier", symbol: "Premium" },
    { value: "ultra_premium", label: "Ultra Premium", symbol: "Ultra" },
];

// DeliverableRow component for editable table rows
type DeliverableRowProps = {
    deliverable: Deliverable;
    onUpdate: (id: number, updates: Partial<Deliverable>) => void;
    onDelete: (id: number) => void;
    getPlatformIcon: (accountName: string) => React.ReactNode;
};

function DeliverableRow({ deliverable, onUpdate, onDelete, getPlatformIcon }: DeliverableRowProps) {
    const [deliverableType, setDeliverableType] = useState<string>(deliverable.deliverableType || "");
    const [showDeliverableDropdown, setShowDeliverableDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [tier, setTier] = useState(deliverable.tier || "");
    const [rate, setRate] = useState(deliverable.rate || 0);
    const [price, setPrice] = useState(deliverable.price || 0);
    const [lockRate, setLockRate] = useState(deliverable.lockRate || false);

    // Filter deliverable types based on input
    const filteredDeliverableTypes = useMemo(() => {
        if (!deliverableType) return deliverableTypes;
        return deliverableTypes.filter(type =>
            type.toLowerCase().includes(deliverableType.toLowerCase())
        );
    }, [deliverableType]);

    // Handle deliverable type change
    const handleDeliverableTypeChange = (value: string) => {
        setDeliverableType(value);
        onUpdate(deliverable.id, { deliverableType: value as DeliverableType });
    };

    // Handle tier change
    const handleTierChange = (value: string) => {
        setTier(value);
        onUpdate(deliverable.id, { tier: value });
    };

    // Handle rate change
    const handleRateChange = (value: number) => {
        setRate(value);
        onUpdate(deliverable.id, { rate: value });
    };

    // Handle price change
    const handlePriceChange = (value: number) => {
        setPrice(value);
        onUpdate(deliverable.id, { price: value });
    };

    // Handle lock rate toggle
    const handleLockRateChange = (checked: boolean) => {
        setLockRate(checked);
        onUpdate(deliverable.id, { lockRate: checked });
    };

    // If this is a bundle deliverable, render special bundle display
    if (deliverable.bundle) {
        // Calculate number of rows needed for content (4 items per row)
        const itemsPerRow = 4;
        const totalRows = Math.ceil(deliverable.content.length / itemsPerRow);

        return (
            <>
                {/* Bundle Header Row */}
                <tr className="border-b-0 bg-gray-50">
                    {/* Account */}
                    <td className="py-6 px-2 w-32">
                        <div className="flex items-center align-center w-full justify-center">
                            <span className="text-gray-800 font-medium truncate">Bundle</span>
                        </div>
                    </td>

                    {/* Deliverable Type */}
                    <td className="py-6 px-2 w-32">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                {deliverable.content.length} item{deliverable.content.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </td>

                    {/* Tier */}
                    <td className="py-6 px-2 w-32">
                        <div className="min-w-0">
                            <Select
                                value={tier || "none"}
                                onValueChange={(value) => handleTierChange(value === "none" ? "" : value)}
                            >
                                <SelectTrigger className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent">
                                    <SelectValue placeholder="No Tier">
                                        {tier ? (
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span className="truncate">{pricingTiers.find(t => t.value === tier)?.label}</span>
                                            </div>
                                        ) : (
                                            "Select tier"
                                        )}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-500">No pricing tier</span>
                                        </div>
                                    </SelectItem>
                                    {pricingTiers.map((tierOption) => (
                                        <SelectItem key={tierOption.value} value={tierOption.value}>
                                            <div className="flex items-center space-x-2">
                                                <span>{tierOption.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </td>

                    {/* Rate */}
                    <td className="py-6 px-2 w-32">
                        <div className="flex w-full items-center space-x-1 min-w-0">
                            <DollarInput
                                value={rate}
                                disabled={deliverable.rateType === "FLAT"}
                                onChange={handleRateChange}
                                placeholder="0"
                                className="focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                containerClassName="flex-1 min-w-0"
                            />
                            <span className="text-xs text-gray-500 font-medium w-8 text-center flex-shrink-0">
                                {deliverable.rateType}
                            </span>
                        </div>
                    </td>

                    {/* Lock Rate */}
                    <td className="py-6 px-2 w-20">
                        <div className="flex items-center justify-center">
                            <Switch
                                disabled={deliverable.rateType === "FLAT"}
                                checked={lockRate}
                                onCheckedChange={handleLockRateChange}
                                className="data-[state=checked]:bg-figma-green-primary"
                            />
                        </div>
                    </td>

                    {/* Price */}
                    <td className="py-6 px-2 w-28">
                        <div className="flex items-center space-x-2 min-w-0">
                            <DollarInput
                                value={price}
                                onChange={handlePriceChange}
                                placeholder="0"
                                className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                disabled={lockRate}
                            />
                        </div>
                    </td>

                    {/* Delete button */}
                    <td className="py-6 px-2 w-12">
                        <div className="flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                onClick={() => onDelete(deliverable.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </td>
                </tr>

                {/* Bundle Content Rows - Single chip layout with 4 chips per row */}
                {Array.from({ length: totalRows }, (_, rowIndex) => {
                    const startIndex = rowIndex * itemsPerRow;
                    const endIndex = Math.min(startIndex + itemsPerRow, deliverable.content.length);
                    const rowItems = deliverable.content.slice(startIndex, endIndex);
                    const isLastRow = rowIndex === totalRows - 1;

                    return (
                        <tr key={rowIndex} className={`bg-gray-50 ${isLastRow ? 'border-b border-gray-100' : 'border-b-0'}`}>
                            {/* Combined Content Column - Show chips spanning multiple columns */}
                            <td colSpan={7} className="py-3 px-4">
                                <div className="grid grid-cols-4 gap-3">
                                    {rowItems.map((contentItem, itemIndex) => (
                                        <div key={startIndex + itemIndex} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                                                    {getPlatformIcon(contentItem.account || "")}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-gray-800 font-medium text-xs truncate">
                                                        {contentItem.account || "No account"}
                                                    </div>
                                                    <div className="text-gray-600 text-xs truncate">
                                                        {contentItem.deliverableType}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors h-6 w-6 p-0 flex-shrink-0 ml-2"
                                                onClick={() => {
                                                    const updatedContent = deliverable.content.filter((_, i) => i !== (startIndex + itemIndex));
                                                    onUpdate(deliverable.id, { content: updatedContent });
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {/* Fill empty slots to maintain grid alignment */}
                                    {Array.from({ length: itemsPerRow - rowItems.length }, (_, emptyIndex) => (
                                        <div key={`empty-${emptyIndex}`} className="h-12"></div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </>
        );
    }

    // Regular deliverable display
    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            {/* Account */}
            <td className="py-6 px-2 w-32">
                <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        {getPlatformIcon(deliverable.account || "")}
                    </div>
                    <span className="text-gray-800 font-medium truncate">
                        {deliverable.account || "No account"}
                    </span>
                </div>
            </td>

            {/* Deliverable Type - Editable with autosuggest */}
            <td className="py-6 px-2 w-32">
                <div className="relative min-w-0">
                    <Input
                        value={deliverableType}
                        onChange={(e) => {
                            setDeliverableType(e.target.value);
                            setShowDeliverableDropdown(true);
                            setSelectedIndex(-1);
                        }}
                        onFocus={() => setShowDeliverableDropdown(true)}
                        onBlur={() => {
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
                                    handleDeliverableTypeChange(filteredDeliverableTypes[selectedIndex]);
                                    setShowDeliverableDropdown(false);
                                    setSelectedIndex(-1);
                                }
                            } else if (e.key === 'Escape') {
                                setShowDeliverableDropdown(false);
                                setSelectedIndex(-1);
                            }
                        }}
                        placeholder="Type to search..."
                        className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                    />
                    
                    {/* Dropdown List */}
                    {showDeliverableDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto max-h-60">
                            {filteredDeliverableTypes.length > 0 ? (
                                filteredDeliverableTypes.map((type: string, index: number) => (
                                    <div
                                        key={type}
                                        className={cn(
                                            "cursor-pointer px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors",
                                            index === selectedIndex 
                                                ? "bg-figma-green-primary/10 text-figma-green-primary" 
                                                : "hover:bg-gray-50 text-gray-900"
                                        )}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleDeliverableTypeChange(type);
                                            setShowDeliverableDropdown(false);
                                            setSelectedIndex(-1);
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <span className="text-sm truncate block">{type}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-gray-500 px-3 py-2">
                                    {deliverableType ? (
                                        <>
                                            <p>No matches found.</p>
                                            <p className="text-xs mt-1">
                                                Press Enter or click outside to use &quot;{deliverableType}&quot; as custom type.
                                            </p>
                                        </>
                                    ) : (
                                        "Start typing to see suggestions..."
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </td>

            {/* Tier - Dropdown select */}
            <td className="py-6 px-2 w-32">
                <div className="min-w-0">
                    <Select
                        value={tier || "none"}
                        onValueChange={(value) => handleTierChange(value === "none" ? "" : value)}
                    >
                        <SelectTrigger className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent">
                            <SelectValue placeholder="No Tier">
                                {tier ? (
                                    <div className="flex items-center space-x-2 min-w-0">
                                        <span className="truncate">{pricingTiers.find(t => t.value === tier)?.label}</span>
                                    </div>
                                ) : (
                                    "Select tier"
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">No pricing tier</span>
                                </div>
                            </SelectItem>
                            {pricingTiers.map((tierOption) => (
                                <SelectItem key={tierOption.value} value={tierOption.value}>
                                    <div className="flex items-center space-x-2">
                                        <span>{tierOption.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </td>

            {/* Rate - Editable number input with rate type */}
            <td className="py-6 px-2 w-32">
                <div className="flex w-full items-center space-x-1 min-w-0">
                    <DollarInput
                        value={rate}
                        disabled={deliverable.rateType === "FLAT"}
                        onChange={handleRateChange}
                        placeholder="0"
                        className="focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                        containerClassName="flex-1 min-w-0"
                    />
                    <span className="text-xs text-gray-500 font-medium w-8 text-center flex-shrink-0">
                        {deliverable.rateType}
                    </span>
                </div>
            </td>

            {/* Lock Rate - Toggle switch */}
            <td className="py-6 px-2 w-20">
                <div className="flex items-center justify-center">
                    <Switch
                        disabled={deliverable.rateType === "FLAT"}
                        checked={lockRate}
                        onCheckedChange={handleLockRateChange}
                        className="data-[state=checked]:bg-figma-green-primary"
                    />
                </div>
            </td>

            {/* Price - Editable number input */}
            <td className="py-6 px-2 w-28">
                <div className="flex items-center space-x-2 min-w-0">
                    <DollarInput
                        value={price}
                        onChange={handlePriceChange}
                        placeholder="0"
                        className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                        disabled={lockRate}
                    />
                </div>
            </td>

            {/* Delete button */}
            <td className="py-6 px-2 w-12">
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => onDelete(deliverable.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

// CategoryDropdown component for auto-suggest category selection
type CategoryDropdownProps = {
    value: string;
    onChange: (value: string) => void;
    onAdd: (category: string) => void;
    placeholder?: string;
    existingCategories?: string[];
};

function CategoryDropdown({
    value,
    onChange,
    onAdd,
    placeholder = "Type to search categories...",
    existingCategories = [],
}: CategoryDropdownProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter categories based on input and exclude already selected ones
    const filteredCategories = useMemo(() => {
        if (!value) return preBuiltCategories.filter(cat => !existingCategories.includes(cat));
        
        const lowerValue = value.toLowerCase();
        return preBuiltCategories.filter(
            cat => 
                cat.toLowerCase().includes(lowerValue) && 
                !existingCategories.includes(cat)
        );
    }, [value, existingCategories]);

    // Check if current input is a custom category (not in pre-built list)
    const isCustomCategory = useMemo(() => {
        if (!value) return false;
        return !preBuiltCategories.some(
            cat => cat.toLowerCase() === value.toLowerCase()
        );
    }, [value]);

    const handleSelectCategory = (category: string) => {
        onChange("");
        onAdd(category);
        setShowDropdown(false);
        setSelectedIndex(-1);
    };

    const handleAddCustom = () => {
        if (value.trim() && !existingCategories.includes(value.trim())) {
            onChange("");
            onAdd(value.trim());
            setShowDropdown(false);
            setSelectedIndex(-1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                setShowDropdown(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => 
                prev < filteredCategories.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredCategories.length) {
                handleSelectCategory(filteredCategories[selectedIndex]);
            } else if (isCustomCategory && value.trim()) {
                handleAddCustom();
            }
        } else if (e.key === "Escape") {
            setShowDropdown(false);
            setSelectedIndex(-1);
        }
    };

    return (
        <div className="relative flex-1">
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowDropdown(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => {
                        // Delay to allow click events on dropdown items
                        setTimeout(() => setShowDropdown(false), 150);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange("");
                            setShowDropdown(false);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Dropdown List */}
            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto max-h-60">
                    {filteredCategories.length > 0 ? (
                        <>
                            {filteredCategories.map((category, index) => (
                                <div
                                    key={category}
                                    className={cn(
                                        "cursor-pointer px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors flex items-center justify-between",
                                        index === selectedIndex 
                                            ? "bg-figma-green-primary/10 text-figma-green-primary" 
                                            : "hover:bg-gray-50 text-gray-900"
                                    )}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectCategory(category);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <span className="text-sm">{category}</span>
                                    <span className="text-xs text-gray-500">Suggested</span>
                                </div>
                            ))}
                            {isCustomCategory && value.trim() && (
                                <div
                                    className={cn(
                                        "cursor-pointer px-3 py-2 border-t border-gray-200 bg-gray-50 transition-colors flex items-center justify-between",
                                        selectedIndex === filteredCategories.length
                                            ? "bg-figma-green-primary/10 text-figma-green-primary"
                                            : "hover:bg-gray-100 text-gray-900"
                                    )}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleAddCustom();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(filteredCategories.length)}
                                >
                                    <span className="text-sm font-medium">
                                        Add &quot;{value}&quot; as custom category
                                    </span>
                                    <span className="text-xs text-gray-500">Custom</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2">
                            {value ? (
                                <>
                                    {isCustomCategory ? (
                                        <div>
                                            <p>No matches found.</p>
                                            <p className="text-xs mt-1">
                                                Press Enter to add &quot;{value}&quot; as a custom category.
                                            </p>
                                        </div>
                                    ) : (
                                        <p>This category is already added.</p>
                                    )}
                                </>
                            ) : (
                                "Start typing to see suggestions..."
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function PreferencesPage() {
    // CRITICAL: All hooks must be called in the same order every time
    const { toast } = useToast();

    // Core state - always initialized in the same order
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Autosave state
    const [autoSaveStatus, setAutoSaveStatus] = useState<
        "idle" | "saving" | "saved" | "error"
    >("idle");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Refs for autosave functionality
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const deliverableUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedDataRef = useRef<string>("");
    const mountedRef = useRef(true);

    // Preferences state - now initialized from user profile when available
    const [partnershipTypes, setPartnershipTypes] =
        useState<PartnershipPreferences>({
            flatRate: true,
            performanceHybrid: false,
            affiliate: true,
            ugc: false,
            gifting: false,
            events: false,
        });


    const [absoluteMinimumRate, setAbsoluteMinimumRate] = useState<number>(0);
    const [autoRejectCategories, setAutoRejectCategories] = useState<string[]>([]);

    const [pricingTiers, setPricingTiers] = useState<PricingTiers>({
        lowTier: { enabled: true, categories: [] },
        premiumTier: { enabled: true, categories: [] },
        ultraPremium: { enabled: false, categories: [] },
    });

    // State for category dropdown inputs for each tier
    const [categoryInputs, setCategoryInputs] = useState({
        autoReject: "",
        lowTier: "",
        premiumTier: "",
        ultraPremium: "",
    });

    // State for new deliverable modal
    const [isNewDeliverableModalOpen, setIsNewDeliverableModalOpen] = useState(false);

    // Cleanup effect to set mounted flag
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            if (deliverableUpdateTimeoutRef.current) {
                clearTimeout(deliverableUpdateTimeoutRef.current);
            }
        };
    }, []);

    // Debounced autosave function
    const debouncedAutoSave = useCallback(
        async (preferencesData: Partial<UserPreferences>) => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }

            autoSaveTimeoutRef.current = setTimeout(async () => {
                if (!mountedRef.current) return;

                try {
                    setAutoSaveStatus("saving");

                    const dataString = JSON.stringify(preferencesData);

                    // Only save if data has actually changed
                    if (dataString === lastSavedDataRef.current) {
                        setAutoSaveStatus("idle");
                        return;
                    }

                    const savedPreferences = await updateUserPreferences(
                        preferencesData
                    );

                    if (mountedRef.current) {
                        lastSavedDataRef.current = dataString;
                        setAutoSaveStatus("saved");
                        setHasUnsavedChanges(false);

                        // Reset to idle after showing success for 2 seconds
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setAutoSaveStatus("idle");
                            }
                        }, 2000);
                    }
                } catch (error) {
                    console.error("Autosave error:", error);
                    if (mountedRef.current) {
                        setAutoSaveStatus("error");
                        toast({
                            title: "Autosave Failed",
                            description:
                                "Your changes couldn't be saved automatically. Please try again.",
                            variant: "destructive",
                        });

                        // Reset to idle after showing error
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setAutoSaveStatus("idle");
                            }
                        }, 3000);
                    }
                }
            }, 1000); // 1 second debounce
        },
        [toast]
    );

    // Function to trigger autosave with current preferences
    const triggerAutoSave = useCallback(() => {
        console.log("triggerAutoSave");

        if (!hasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }

        // Exclude deliverables from preferences update - they have their own endpoint
        const currentPreferences: Partial<UserPreferences> = {
            partnershipTypes,
            absoluteMinimumRate: absoluteMinimumRate,
            autoRejectCategories,
            pricingTiers,
            // Note: deliverables are NOT included here - they use updateUserDeliverables endpoint
        };

        debouncedAutoSave(currentPreferences);
    }, [
        partnershipTypes,
        absoluteMinimumRate,
        autoRejectCategories,
        pricingTiers,
        // Note: deliverables are NOT included here - they use updateUserDeliverables endpoint
        hasUnsavedChanges,
        debouncedAutoSave,
    ]);

    // Effect to trigger autosave when preferences change
    // NOTE: deliverables are excluded — they save via their own endpoint (updateUserDeliverables).
    // Including them here would trigger a PUT to /users/preferences that could overwrite deliverables.
    useEffect(() => {
        // Don't autosave during initial load
        if (isLoading) return;

        // Don't autosave if we're already saving
        if (autoSaveStatus === "saving") return;

        triggerAutoSave();
    }, [
        partnershipTypes,
        absoluteMinimumRate,
        autoRejectCategories,
        pricingTiers,
        isLoading,
        autoSaveStatus,
        triggerAutoSave,
    ]);

    // Fetch user preferences and user data on component mount
    useEffect(() => {
        const fetchUserPreferences = async () => {
            try {
                setIsLoading(true);
                const [preferences, userData] = await Promise.all([
                    getUserPreferences(),
                    getUser()
                ]);
                setUser(userData);

                // Initialize preferences from user preferences if available
                if (preferences) {
                    // Update partnership types if available
                    if (preferences.partnershipTypes) {
                        setPartnershipTypes(preferences.partnershipTypes);
                    }


                    // Update minimum rate if available
                    if (preferences.absoluteMinimumRate) {
                        setAbsoluteMinimumRate(
                            preferences.absoluteMinimumRate
                        );
                    }

                    // Update auto-reject categories if available
                    if (preferences.autoRejectCategories) {
                        setAutoRejectCategories(
                            preferences.autoRejectCategories
                        );
                    }

                    // Update pricing tiers if available
                    if (preferences.pricingTiers) {
                        setPricingTiers(preferences.pricingTiers);
                    }

                    // Deliverables are now managed through the user state directly

                    // Initialize the last saved data reference
                    const initialData: Partial<UserPreferences> = {
                        partnershipTypes: preferences.partnershipTypes || {
                            flatRate: true,
                            performanceHybrid: false,
                            affiliate: true,
                            ugc: false,
                            gifting: false,
                            events: false,
                        },
                        absoluteMinimumRate:
                            preferences.absoluteMinimumRate || 1000,
                        autoRejectCategories:
                            preferences.autoRejectCategories || [],
                        pricingTiers: preferences.pricingTiers || {
                            lowTier: {
                                enabled: true,
                                categories: [],
                            },
                            premiumTier: {
                                enabled: true,
                                categories: [],
                            },
                            ultraPremium: { enabled: false, categories: [] },
                        },
                    };
                    lastSavedDataRef.current = JSON.stringify(initialData);
                }
            } catch (error) {
                console.error("Error fetching user preferences:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserPreferences();
    }, []);

    // Show loading state while fetching user data
    if (isLoading) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-green-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading preferences...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Helper function to check if a category is pre-built
    const isPreBuiltCategory = (category: string): boolean => {
        return preBuiltCategories.some(
            cat => cat.toLowerCase() === category.toLowerCase()
        );
    };

    const handleAutoRejectCategoryAdd = (category: string) => {
        if (category && !autoRejectCategories.includes(category)) {
            setAutoRejectCategories([
                ...autoRejectCategories,
                category,
            ]);
            setCategoryInputs(prev => ({ ...prev, autoReject: "" }));
        }
    };

    const handleAutoRejectCategoryRemove = (categoryToRemove: string) => {
        setAutoRejectCategories(
            autoRejectCategories.filter((cat) => cat !== categoryToRemove)
        );
    };

    const handlePricingTierCategoryRemove = (
        tier: keyof typeof pricingTiers,
        categoryToRemove: string
    ) => {
        setPricingTiers((prev) => ({
            ...prev,
            [tier]: {
                ...prev[tier],
                categories: prev[tier].categories.filter(
                    (cat: string) => cat !== categoryToRemove
                ),
            },
        }));
    };

    const handlePricingTierCategoryAdd = (
        tier: keyof typeof pricingTiers,
        category: string
    ) => {
        if (category && !pricingTiers[tier].categories.includes(category)) {
            setPricingTiers((prev) => ({
                ...prev,
                [tier]: {
                    ...prev[tier],
                    categories: [...prev[tier].categories, category],
                },
            }));
            setCategoryInputs((prev) => ({
                ...prev,
                [tier]: "",
            }));
        }
    };

    const handleAddNewDeliverable = async (newDeliverable: Omit<Deliverable, "id">) => {
        console.log("handleAddNewDeliverable called with:", newDeliverable);
        try {
            if (!user) {
                toast({
                    title: "Error",
                    description: "User data not loaded. Please refresh the page.",
                    variant: "destructive",
                });
                return;
            }
            
            // Deliverable type required; account is optional (uncoupled from OAuth/connected platforms)
            if (!newDeliverable.bundle && !newDeliverable.deliverableType) {
                toast({
                    title: "Validation Error",
                    description: "Deliverable Type is required.",
                    variant: "destructive",
                });
                return;
            }
            
            if (newDeliverable.bundle && newDeliverable.content.length === 0) {
                toast({
                    title: "Validation Error",
                    description: "Bundle must contain at least one content item.",
                    variant: "destructive",
                });
                return;
            }
            
            const currentDeliverables = user.preferences.deliverables || [];
            const deliverableWithId: Deliverable = {
                ...newDeliverable,
                id: Math.max(...currentDeliverables.map(d => d.id || 0), 0) + 1,
            };
            
            const updatedDeliverables = [...currentDeliverables, deliverableWithId];
            
            console.log("Saving deliverables to API:", updatedDeliverables);
            
            // Optimistically update UI
            setUser(prev => prev ? {
                ...prev,
                preferences: {
                    ...prev.preferences,
                    deliverables: updatedDeliverables
                }
            } : null);
            
            setIsNewDeliverableModalOpen(false);
            
            // Save deliverables using the dedicated endpoint
            try {
                const updatedUser = await updateUserDeliverables(updatedDeliverables);
                // Update user state with the response from API
                setUser(updatedUser);
                toast({
                    title: "Success",
                    description: "Deliverable added successfully.",
                });
            } catch (error) {
                console.error("Error saving deliverable:", error);
                // Revert optimistic update on error
                setUser(prev => prev ? {
                    ...prev,
                    preferences: {
                        ...prev.preferences,
                        deliverables: currentDeliverables
                    }
                } : null);
                
                const errorMessage = error instanceof Error 
                    ? error.message 
                    : "Failed to add deliverable. Please check the console for details.";
                
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error adding deliverable:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add deliverable. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteDeliverable = async (deliverableId: number) => {
        try {
            if (!user) return;
            
            const currentDeliverables = user.preferences.deliverables || [];
            const updatedDeliverables = currentDeliverables.filter(d => d.id !== deliverableId);
            
            // Optimistically update UI
            setUser(prev => prev ? {
                ...prev,
                preferences: {
                    ...prev.preferences,
                    deliverables: updatedDeliverables
                }
            } : null);
            
            // Save deliverables using the dedicated endpoint
            try {
                await updateUserDeliverables(updatedDeliverables);
                toast({
                    title: "Success",
                    description: "Deliverable deleted successfully.",
                });
            } catch (error) {
                console.error("Error saving deliverable deletion:", error);
                // Revert optimistic update on error
                setUser(prev => prev ? {
                    ...prev,
                    preferences: {
                        ...prev.preferences,
                        deliverables: currentDeliverables
                    }
                } : null);
                
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to delete deliverable. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting deliverable:", error);
            toast({
                title: "Error",
                description: "Failed to delete deliverable. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleUpdateDeliverable = async (deliverableId: number, updates: Partial<Deliverable>) => {
        try {
            if (!user) return;
            
            const currentDeliverables = user.preferences.deliverables || [];
            const updatedDeliverables = currentDeliverables.map(d => 
                d.id === deliverableId 
                    ? { ...d, ...updates, updatedAt: new Date().toISOString() } as Deliverable
                    : d
            );
            
            // Optimistically update UI
            setUser(prev => prev ? {
                ...prev,
                preferences: {
                    ...prev.preferences,
                    deliverables: updatedDeliverables
                }
            } : null);
            
            // Save deliverables using the dedicated endpoint (debounced to avoid too many API calls)
            // Use a ref to debounce deliverable updates
            if (deliverableUpdateTimeoutRef.current) {
                clearTimeout(deliverableUpdateTimeoutRef.current);
            }
            
            deliverableUpdateTimeoutRef.current = setTimeout(async () => {
                try {
                    await updateUserDeliverables(updatedDeliverables);
                } catch (error) {
                    console.error("Error saving deliverable update:", error);
                    // Revert optimistic update on error
                    setUser(prev => prev ? {
                        ...prev,
                        preferences: {
                            ...prev.preferences,
                            deliverables: currentDeliverables
                        }
                    } : null);
                    
                    toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to update deliverable. Please try again.",
                        variant: "destructive",
                    });
                }
            }, 1000); // 1 second debounce for deliverable updates
        } catch (error) {
            console.error("Error updating deliverable:", error);
            toast({
                title: "Error",
                description: "Failed to update deliverable. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Render autosave status indicator
    const renderAutoSaveStatus = () => {
        switch (autoSaveStatus) {
            case "saving":
                return (
                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Saving...</span>
                    </div>
                );
            case "saved":
                return (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Saved</span>
                    </div>
                );
            case "error":
                return (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                        <X className="h-4 w-4" />
                        <span>Save failed</span>
                    </div>
                );
            default:
                    return (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>No changes</span>
                    </div>
                );
        }
    };

    // Function to get platform icon based on account name
    const getPlatformIcon = (accountName: string) => {
        // First try to find a matching platform in user's connected platforms
        const matchingPlatform = user?.platforms.find(platform => 
            platform.handle === accountName || platform.name === accountName
        );
        
        if (matchingPlatform) {
            return getPlatformIconComponent(matchingPlatform.platformType, "w-4 h-4");
        }

        // Fallback to name-based matching
        return getPlatformIconByName(accountName, "w-4 h-4");
    };

    const partnershipTypeData = [
        {
            key: "flatRate",
            label: "Flat Rate",
            description: "Fixed pricing for deliverables.",
        },
        {
            key: "performanceHybrid",
            label: "Performance/Hybrid",
            description: "Based on reach & engagement.",
        },
        {
            key: "affiliate",
            label: "Affiliate",
            description: "Commission-based payment.",
        },
        {
            key: "ugc",
            label: "UGC",
            description: "User-generated content partnerships.",
        },
        {
            key: "gifting",
            label: "Gifting",
            description: "Product gifting collaborations.",
        },
        {
            key: "events",
            label: "Events",
            description: "Event sponsorships and appearances.",
        },
    ];


    const pricingTierData: Array<{
        key: keyof typeof pricingTiers;
        label: string;
        symbol: string;
    }> = [
        { key: "lowTier", label: "Low Tier", symbol: "Low" },
        { key: "premiumTier", label: "Premium Tier", symbol: "Premium" },
        { key: "ultraPremium", label: "Ultra Premium", symbol: "Ultra" },
    ];

    return (
        <div className="flex-1 page-padding space-y-6 bg-gray-50">
            {/* Autosave Status Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Preferences
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Manage your collaboration preferences and pricing
                        settings
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    {renderAutoSaveStatus()}
                </div>
            </div>

            {/* Deliverables & Pricing - Moved to top */}
            <Card className="bg-white border border-figma-green-primary/20 hover:border-figma-green-primary/50 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Deliverables & Pricing
                            </CardTitle>
                            <CardDescription className="text-gray-600 mt-1">
                                Manage your content types, pricing structure,
                                and minimum rates
                            </CardDescription>
                        </div>
                        <Button 
                            onClick={() => setIsNewDeliverableModalOpen(true)}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-black shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Deliverable
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Minimum Rate Section - Integrated */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-semibold text-gray-900">
                                    Absolute Minimum Rate
                                </Label>
                                <p className="text-sm text-gray-600 mt-1">
                                    Set the lowest amount you&apos;ll accept for any
                                    deal
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <DollarInput
                                    value={absoluteMinimumRate}
                                    onChange={(value) =>
                                        setAbsoluteMinimumRate(value)
                                    }
                                    className="w-36 focus:ring-2 focus:ring-figma-green-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-32">
                                        Account
                                    </th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-32">
                                        Deliverable Type
                                    </th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-32">
                                        Tier
                                    </th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-32">
                                        Rate
                                    </th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-20">
                                        Lock Rate
                                    </th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-700 w-28">
                                        Price
                                    </th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(user?.preferences?.deliverables || []).map((deliverable) => (
                                    <DeliverableRow
                                        key={deliverable.id}
                                        deliverable={deliverable}
                                        onUpdate={handleUpdateDeliverable}
                                        onDelete={handleDeleteDeliverable}
                                        getPlatformIcon={getPlatformIcon}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Partnership Types */}
            <Card className="bg-white border border-figma-green-primary/20 hover:border-figma-green-primary/50 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                        Partnership Types
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Select the types of partnerships you&apos;re open to
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {partnershipTypeData.map(
                        ({ key, label, description }) => (
                            <div key={key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <Switch
                                            id={key}
                                            checked={
                                                partnershipTypes[
                                                    key as keyof typeof partnershipTypes
                                                ]
                                            }
                                            onCheckedChange={(checked) =>
                                                setPartnershipTypes(
                                                    (prev) => ({
                                                        ...prev,
                                                        [key]: checked,
                                                    })
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor={key}
                                            className="text-base font-medium text-gray-800 cursor-pointer"
                                        >
                                            {label}
                                        </Label>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 ml-16">
                                    {description}
                                </p>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {/* Auto-Reject Categories and Pricing Tiers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border border-figma-green-primary/20 hover:border-figma-green-primary/50 shadow-md hover:shadow-lg transition-all">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                            Pricing Tiers
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Organize clients into pricing categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {pricingTierData.map(({ key, label, symbol }) => (
                            <div key={key} className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <Switch
                                        id={key}
                                        checked={
                                            pricingTiers[
                                                key as keyof typeof pricingTiers
                                            ].enabled
                                        }
                                        onCheckedChange={(checked) =>
                                            setPricingTiers((prev) => ({
                                                ...prev,
                                                [key]: {
                                                    ...prev[
                                                        key as keyof typeof prev
                                                    ],
                                                    enabled: checked,
                                                },
                                            }))
                                        }
                                    />
                                    <Label
                                        htmlFor={key}
                                        className="text-base font-medium text-gray-800 cursor-pointer"
                                    >
                                        {label}
                                    </Label>
                                </div>

                                <div className="ml-16 space-y-3">
                                    {/* Display categories for this specific tier only */}
                                    <div className="flex flex-wrap gap-2">
                                        {pricingTiers[key].categories.map(
                                            (category) => {
                                                const isPreBuilt = isPreBuiltCategory(category);
                                                return (
                                                    <Badge
                                                        key={category}
                                                        variant="secondary"
                                                        className={cn(
                                                            "transition-colors",
                                                            isPreBuilt
                                                                ? "bg-tier-neutral-bg text-tier-neutral-text border border-tier-neutral-border hover:bg-gray-200"
                                                                : "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                                                        )}
                                                    >
                                                        {category}
                                                        {!isPreBuilt && (
                                                            <span className="ml-1 text-xs opacity-70">(custom)</span>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                handlePricingTierCategoryRemove(
                                                                    key,
                                                                    category
                                                                )
                                                            }
                                                            className="ml-2 hover:text-gray-700 transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                );
                                            }
                                        )}
                                    </div>

                                    {/* Category dropdown for this specific tier */}
                                    <CategoryDropdown
                                        value={categoryInputs[key]}
                                        onChange={(value) =>
                                            setCategoryInputs((prev) => ({
                                                ...prev,
                                                [key]: value,
                                            }))
                                        }
                                        onAdd={(category) =>
                                            handlePricingTierCategoryAdd(key, category)
                                        }
                                        placeholder="Type to search categories..."
                                        existingCategories={pricingTiers[key].categories}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-white border border-figma-green-primary/20 hover:border-figma-green-primary/50 shadow-md hover:shadow-lg transition-all">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                            Auto-Reject Categories
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Industries you don&apos;t want to work with
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {autoRejectCategories.map((category) => {
                                const isPreBuilt = isPreBuiltCategory(category);
                                return (
                                    <Badge
                                        key={category}
                                        variant="secondary"
                                        className={cn(
                                            "transition-colors",
                                            isPreBuilt
                                                ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                                : "bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                                        )}
                                    >
                                        {category}
                                        {!isPreBuilt && (
                                            <span className="ml-1 text-xs opacity-70">(custom)</span>
                                        )}
                                        <button
                                            onClick={() =>
                                                handleAutoRejectCategoryRemove(
                                                    category
                                                )
                                            }
                                            className="ml-2 hover:text-red-900 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>

                        <CategoryDropdown
                            value={categoryInputs.autoReject}
                            onChange={(value) =>
                                setCategoryInputs((prev) => ({
                                    ...prev,
                                    autoReject: value,
                                }))
                            }
                            onAdd={handleAutoRejectCategoryAdd}
                            placeholder="Type to search categories..."
                            existingCategories={autoRejectCategories}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* New Deliverable Modal */}
            <NewDeliverableModal
                open={isNewDeliverableModalOpen}
                onOpenChange={setIsNewDeliverableModalOpen}
                onSubmit={handleAddNewDeliverable}
                connectedPlatforms={user?.platforms || []}
            />
        </div>
    );
}
