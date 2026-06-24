"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Star, Crown } from "lucide-react";
import {
    Deal,
    DealStatus,
    DealType,
    DealSource,
    DealDeliverable,
} from "@/lib/models";
import { DollarInput } from "./dollar-input";
import { findOrCreateBrand, findOrCreateContact } from "@/lib/api";
import { getContentTypeIcon } from "@/lib/platform-icons";
import { toast } from "sonner";

type NewDealModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (deal: Omit<Deal, "id">) => void;
};

type DeliverableType = {
    contentType: string;
    text: string;
    createdAt: string;
    updatedAt: string;
};

const contentTypes = [
    "youTube",
    "instagram",
    "tiktok",
    "x",
    "twitch",
    "video",
    "podcast",
    "article",
    "linkedin",
];

export function NewDealModal({
    open,
    onOpenChange,
    onSubmit,
}: NewDealModalProps) {
    const [company, setCompany] = useState("");
    const [value, setValue] = useState(0);
    const [performanceRate, setPerformanceRate] = useState("");
    // Rate structure for performance deals (e.g., "$5 per 1000 impressions")
    const [performanceRateAmount, setPerformanceRateAmount] = useState(0);
    const [performanceRateUnit, setPerformanceRateUnit] = useState("per 1000 impressions");
    // Affiliate rate (commission percentage or structure)
    const [affiliateCommission, setAffiliateCommission] = useState("");
    const [affiliateStructure, setAffiliateStructure] = useState<"percentage" | "structure">("percentage");
    // Hybrid deal rates (combination of flat + performance)
    const [hybridFlatRate, setHybridFlatRate] = useState(0);
    const [hybridPerformanceRate, setHybridPerformanceRate] = useState("");
    const [status, setStatus] = useState<DealStatus>("New Offer");
    const [source, setSource] = useState<DealSource>("inbound");
    const [dealType, setDealType] = useState<DealType>("Flat Rate");
    const [dueDate, setDueDate] = useState(() => {
        // Set default to today's date in YYYY-MM-DD format
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [dueDateType, setDueDateType] = useState<"specific" | "reminder">(
        "specific"
    );
    const [reminderDays, setReminderDays] = useState(3);
    const [isPriority, setIsPriority] = useState(false);
    const [isHighValue, setIsHighValue] = useState(false);
    const [comments, setComments] = useState("");
    const [briefLink, setBriefLink] = useState("");
    const [promoCode, setPromoCode] = useState("");
    const [deliverables, setDeliverables] = useState<DeliverableType[]>([]);
    const [contactName, setContactName] = useState("");
    const [contactMethod, setContactMethod] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const [newDeliverable, setNewDeliverable] = useState({
        contentType: "youTube",
        text: "",
        createdAt: "",
        updatedAt: "",
    });

    const handleAddDeliverable = () => {
        if (newDeliverable.text.trim()) {
            const deliverableWithTimestamps = {
                ...newDeliverable,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setDeliverables([...deliverables, deliverableWithTimestamps]);
            setNewDeliverable({
                contentType: "youTube",
                text: "",
                createdAt: "",
                updatedAt: "",
            });
        }
    };

    const handleRemoveDeliverable = (index: number) => {
        setDeliverables(deliverables.filter((_, i) => i !== index));
    };

    // Validation function based on deal type
    const validateRateInputs = (): boolean => {
        switch (dealType) {
            case "Flat Rate":
                return value > 0;
            case "Performance / Hybrid":
                return performanceRate.trim().length > 0 || (performanceRateAmount > 0 && performanceRateUnit.trim().length > 0);
            case "Affiliate":
                return affiliateCommission.trim().length > 0;
            case "Revenue Share":
                return affiliateCommission.trim().length > 0;
            case "Brand Partnership":
            case "Sponsored Post":
            case "UGC":
                // These can have either flat rate or performance rate
                return value > 0 || performanceRate.trim().length > 0;
            default:
                return value > 0;
        }
    };

    // Helper function to get rate display text for deal cards
    const getRateDisplayText = (deal: Deal): string => {
        if (deal.dealType === "Flat Rate" || (deal.value > 0 && !deal.performanceRate)) {
            return `$${deal.value.toLocaleString()}`;
        } else if (deal.performanceRate) {
            return deal.performanceRate;
        } else if (deal.value > 0) {
            return `$${deal.value.toLocaleString()}`;
        }
        return "Rate TBD";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!company.trim() || !validateRateInputs()) {
            toast.error("Please fill in all required rate fields based on the deal type.");
            return;
        }

        const now = new Date().toISOString();

        // Transform deliverables to match backend format
        // Backend expects: { contents: [{contentType, text}], isBundle, draftLink, invoiceLink, createdAt, updatedAt }
        const transformedDeliverables: DealDeliverable[] = deliverables.map(
            (d) => ({
                contents: [
                    {
                        contentType: d.contentType,
                        text: d.text,
                    },
                ],
                isBundle: false,
                draftLink: null,
                invoiceLink: null,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })
        );

        // Create brand first
        let brandId: string | undefined;
        if (company.trim()) {
            try {
                const brand = await findOrCreateBrand({
                    name: company.trim(),
                });
                brandId = brand.uuid;
            } catch (error) {
                console.error("Failed to create brand:", error);
            }
        }

        // Create contact if an email address is provided.
        // The backend requires a valid email, so skip contact creation for phone-only contacts.
        let contactId: string | undefined;
        const contactValue = contactInfo.trim();
        const isEmail = contactValue.includes("@");
        if (contactName.trim() && contactValue && isEmail) {
            try {
                const contact = await findOrCreateContact({
                    name: contactName.trim(),
                    email: contactValue,
                    title: contactMethod,
                    brand_id: brandId,
                });
                contactId = contact.uuid;
            } catch (error) {
                console.error("Failed to create contact:", error);
                toast.error("Failed to create contact");
            }
        }

        // Format performance rate based on deal type
        let formattedPerformanceRate = "";
        if (dealType === "Performance / Hybrid") {
            if (performanceRate.trim()) {
                formattedPerformanceRate = performanceRate.trim();
            } else if (performanceRateAmount > 0) {
                formattedPerformanceRate = `$${performanceRateAmount} ${performanceRateUnit}`;
            }
        } else if (dealType === "Affiliate" || dealType === "Revenue Share") {
            formattedPerformanceRate = affiliateCommission.trim();
        } else if (performanceRate.trim()) {
            formattedPerformanceRate = performanceRate.trim();
        }

        // Set value based on deal type
        let dealValue = value;
        if (dealType === "Performance / Hybrid" && value === 0 && performanceRateAmount > 0) {
            // Use performance rate amount as estimated value
            dealValue = performanceRateAmount;
        }

        const newDeal: Omit<Deal, "id"> = {
            uuid: crypto.randomUUID(),
            title: company.trim(),
            status,
            dealType,
            lastActivity: now,
            value: dealValue,
            valueCurrency: "USD",
            dueDate:
                dueDateType === "reminder"
                    ? new Date(
                          Date.now() + reminderDays * 24 * 60 * 60 * 1000
                      ).toISOString()
                    : dueDate,
            performanceRate: formattedPerformanceRate,
            dueDateType,
            reminderDays: dueDateType === "reminder" ? reminderDays : undefined,
            isPriority,
            isHighValue,
            isAiPaused: false,
            dateReceived: now,
            comments: comments.trim(),
            deliverables: transformedDeliverables,
            brief:
                briefLink.trim() || promoCode.trim()
                    ? {
                          link: briefLink.trim() || "N/A",
                          promoCode: promoCode.trim() || "N/A",
                      }
                    : {
                          link: "N/A",
                          promoCode: "N/A",
                      },
            communicationHistory: [],
            brandId,
            contactId,
            source: source,
            stageHistory: [
                {
                    stage: status,
                    enteredAt: now,
                    createdAt: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        };

        onSubmit(newDeal);

        // Reset form
        setCompany("");
        setValue(0);
        setPerformanceRate("");
        setPerformanceRateAmount(0);
        setPerformanceRateUnit("per 1000 impressions");
        setAffiliateCommission("");
        setAffiliateStructure("percentage");
        setHybridFlatRate(0);
        setHybridPerformanceRate("");
        setStatus("New Offer");
        setSource("inbound");
        setDealType("Flat Rate");
        setDueDate("");
        setDueDateType("reminder");
        setReminderDays(3);
        setIsPriority(false);
        setIsHighValue(false);
        setComments("");
        setBriefLink("");
        setPromoCode("");
        setDeliverables([]);
        setNewDeliverable({
            contentType: "youTube",
            text: "",
            createdAt: "",
            updatedAt: "",
        });
        setContactName("");
        setContactMethod("");
        setContactInfo("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] p-0 overflow-auto">
                {/* Header */}
                <DialogHeader className="p-6 border-b border-gray-200">
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                        Create New Deal
                    </DialogTitle>
                </DialogHeader>

                {/* Main Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label
                                    htmlFor="company"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Company Name *
                                </Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="e.g., Adobe, Microsoft"
                                    className="mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="dealType"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Deal Type *
                                </Label>
                                <Select
                                    value={dealType}
                                    onValueChange={(value: DealType) =>
                                        setDealType(value)
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Flat Rate">
                                            Flat Rate
                                        </SelectItem>
                                        <SelectItem value="Affiliate">
                                            Affiliate
                                        </SelectItem>
                                        <SelectItem value="UGC">UGC</SelectItem>
                                        <SelectItem value="Sponsored Post">
                                            Sponsored Post
                                        </SelectItem>
                                        <SelectItem value="Brand Partnership">
                                            Brand Partnership
                                        </SelectItem>
                                        <SelectItem value="Revenue Share">
                                            Revenue Share
                                        </SelectItem>
                                        <SelectItem value="Performance / Hybrid">
                                            Performance / Hybrid
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label
                                    htmlFor="status"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Source *
                                </Label>
                                <Select
                                    required
                                    value={source}
                                    onValueChange={(value: DealSource) =>
                                        setSource(value)
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound">
                                            Inbound
                                        </SelectItem>
                                        <SelectItem value="shared">
                                            Shared
                                        </SelectItem>
                                        <SelectItem value="Repflow">
                                            Repflow
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Dynamic Rate Input Section */}
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                Rate Information
                            </h3>
                            
                            {/* Flat Rate Deal */}
                            {dealType === "Flat Rate" && (
                                <div>
                                    <Label
                                        htmlFor="value"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Flat Rate *
                                    </Label>
                                    <DollarInput
                                        id="value"
                                        value={value}
                                        onChange={(e) => setValue(e)}
                                        placeholder="e.g., 5000 or $5,000"
                                        className="mt-1"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter the fixed amount for this deal
                                    </p>
                                </div>
                            )}

                            {/* Performance / Hybrid Deal */}
                            {dealType === "Performance / Hybrid" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Rate Structure *
                                        </Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <DollarInput
                                                    value={performanceRateAmount}
                                                    onChange={(e) => setPerformanceRateAmount(e)}
                                                    placeholder="Amount"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Select
                                                    value={performanceRateUnit}
                                                    onValueChange={setPerformanceRateUnit}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="per 1000 impressions">
                                                            per 1000 impressions
                                                        </SelectItem>
                                                        <SelectItem value="per sale">
                                                            per sale
                                                        </SelectItem>
                                                        <SelectItem value="per click">
                                                            per click
                                                        </SelectItem>
                                                        <SelectItem value="per conversion">
                                                            per conversion
                                                        </SelectItem>
                                                        <SelectItem value="per view">
                                                            per view
                                                        </SelectItem>
                                                        <SelectItem value="per engagement">
                                                            per engagement
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Or enter a custom rate structure below
                                        </p>
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="performanceRate"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Custom Rate Structure
                                        </Label>
                                        <Input
                                            id="performanceRate"
                                            value={performanceRate}
                                            onChange={(e) => setPerformanceRate(e.target.value)}
                                            placeholder="e.g., $10 per sale, 5% commission"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="value"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Estimated Value (Optional)
                                        </Label>
                                        <DollarInput
                                            id="value"
                                            value={value}
                                            onChange={(e) => setValue(e)}
                                            placeholder="Estimated total value"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Affiliate Deal */}
                            {dealType === "Affiliate" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Commission Structure *
                                        </Label>
                                        <div className="flex gap-2 mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="affiliateStructure"
                                                    value="percentage"
                                                    checked={affiliateStructure === "percentage"}
                                                    onChange={(e) => setAffiliateStructure(e.target.value as "percentage" | "structure")}
                                                    className="text-figma-green-primary"
                                                />
                                                <span className="text-sm text-gray-700">Percentage</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="affiliateStructure"
                                                    value="structure"
                                                    checked={affiliateStructure === "structure"}
                                                    onChange={(e) => setAffiliateStructure(e.target.value as "percentage" | "structure")}
                                                    className="text-figma-green-primary"
                                                />
                                                <span className="text-sm text-gray-700">Custom Structure</span>
                                            </label>
                                        </div>
                                        {affiliateStructure === "percentage" ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={affiliateCommission}
                                                    onChange={(e) => setAffiliateCommission(e.target.value)}
                                                    placeholder="e.g., 10"
                                                    className="mt-1 w-24"
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="text-sm text-gray-600 mt-1">%</span>
                                                <p className="text-xs text-gray-500 mt-1 ml-2">
                                                    Commission percentage
                                                </p>
                                            </div>
                                        ) : (
                                            <Input
                                                value={affiliateCommission}
                                                onChange={(e) => setAffiliateCommission(e.target.value)}
                                                placeholder="e.g., $5 per sale, 10% + $2 per conversion"
                                                className="mt-1"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="value"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Estimated Value (Optional)
                                        </Label>
                                        <DollarInput
                                            id="value"
                                            value={value}
                                            onChange={(e) => setValue(e)}
                                            placeholder="Estimated total value"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Revenue Share Deal */}
                            {dealType === "Revenue Share" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label
                                            htmlFor="affiliateCommission"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Revenue Share Percentage *
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="affiliateCommission"
                                                type="number"
                                                value={affiliateCommission}
                                                onChange={(e) => setAffiliateCommission(e.target.value)}
                                                placeholder="e.g., 20"
                                                className="mt-1 w-24"
                                                min="0"
                                                max="100"
                                            />
                                            <span className="text-sm text-gray-600 mt-1">%</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Percentage of revenue you will receive
                                        </p>
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="value"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Estimated Value (Optional)
                                        </Label>
                                        <DollarInput
                                            id="value"
                                            value={value}
                                            onChange={(e) => setValue(e)}
                                            placeholder="Estimated total value"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Brand Partnership, Sponsored Post, UGC - Can be either flat or performance */}
                            {(dealType === "Brand Partnership" || dealType === "Sponsored Post" || dealType === "UGC") && (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Rate Type *
                                        </Label>
                                        <div className="flex gap-4 mb-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rateType"
                                                    value="flat"
                                                    checked={value > 0 && !performanceRate}
                                                    onChange={() => {
                                                        setPerformanceRate("");
                                                        if (value === 0) setValue(1000);
                                                    }}
                                                    className="text-figma-green-primary"
                                                />
                                                <span className="text-sm text-gray-700">Flat Rate</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rateType"
                                                    value="performance"
                                                    checked={performanceRate.length > 0 || value === 0}
                                                    onChange={() => {
                                                        setValue(0);
                                                        if (!performanceRate) setPerformanceRate("");
                                                    }}
                                                    className="text-figma-green-primary"
                                                />
                                                <span className="text-sm text-gray-700">Performance Based</span>
                                            </label>
                                        </div>
                                    </div>
                                    {value > 0 && !performanceRate ? (
                                        <div>
                                            <Label
                                                htmlFor="value"
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                Flat Rate *
                                            </Label>
                                            <DollarInput
                                                id="value"
                                                value={value}
                                                onChange={(e) => setValue(e)}
                                                placeholder="e.g., 5000 or $5,000"
                                                className="mt-1"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label
                                                htmlFor="performanceRate"
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                Performance Rate *
                                            </Label>
                                            <Input
                                                id="performanceRate"
                                                value={performanceRate}
                                                onChange={(e) => setPerformanceRate(e.target.value)}
                                                placeholder="e.g., $10 per sale, $5 per 1000 impressions"
                                                className="mt-1"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Due Date Section */}
                        <div className="mt-4">
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                Due Date Options
                            </Label>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="dueDateType"
                                            value="specific"
                                            checked={dueDateType === "specific"}
                                            onChange={(e) =>
                                                setDueDateType(
                                                    e.target.value as "specific"
                                                )
                                            }
                                            className="text-figma-green-primary"
                                        />
                                        <span className="text-sm text-gray-700">
                                            Set specific due date
                                        </span>
                                    </label>
                                    {dueDateType === "specific" && (
                                        <Input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) =>
                                                setDueDate(e.target.value)
                                            }
                                            className="h-8 text-sm"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Brand Contact */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gray-700">
                            Brand Contact
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <Label
                                    htmlFor="contactName"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Contact Name
                                </Label>
                                <Input
                                    id="contactName"
                                    value={contactName}
                                    onChange={(e) =>
                                        setContactName(e.target.value)
                                    }
                                    placeholder="Enter contact name"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="contactMethod"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Contact Method
                                </Label>
                                <Select
                                    value={contactMethod}
                                    onValueChange={setContactMethod}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Email">
                                            Email
                                        </SelectItem>
                                        <SelectItem value="Phone">
                                            Phone
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label
                                    htmlFor="contactInfo"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Contact Information
                                </Label>
                                <Input
                                    id="contactInfo"
                                    value={contactInfo}
                                    onChange={(e) =>
                                        setContactInfo(e.target.value)
                                    }
                                    placeholder="Enter email or phone"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Deal Properties */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Deal Properties
                        </h3>
                        <div className="flex gap-4">
                            <div
                                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                    isPriority
                                        ? "border-green-400 bg-green-50"
                                        : "border-gray-200 bg-gray-50"
                                }`}
                                onClick={() => setIsPriority(!isPriority)}
                            >
                                <div className="flex items-center gap-2">
                                    <Star
                                        className={`w-5 h-5 ${
                                            isPriority
                                                ? "text-green-600 fill-green-600"
                                                : "text-gray-400"
                                        }`}
                                    />
                                    <span
                                        className={`font-medium ${
                                            isPriority
                                                ? "text-green-700"
                                                : "text-gray-600"
                                        }`}
                                    >
                                        Priority Deal
                                    </span>
                                </div>
                            </div>
                            <div
                                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                    isHighValue
                                        ? "border-yellow-400 bg-yellow-50"
                                        : "border-gray-200 bg-gray-50"
                                }`}
                                onClick={() => setIsHighValue(!isHighValue)}
                            >
                                <div className="flex items-center gap-2">
                                    <Crown
                                        className={`w-5 h-5 ${
                                            isHighValue
                                                ? "text-yellow-600 fill-yellow-600"
                                                : "text-gray-400"
                                        }`}
                                    />
                                    <span
                                        className={`font-medium ${
                                            isHighValue
                                                ? "text-yellow-700"
                                                : "text-gray-600"
                                        }`}
                                    >
                                        High Value
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Internal Comments
                        </h3>
                        <div>
                            <Label
                                htmlFor="comments"
                                className="text-sm font-medium text-gray-700"
                            >
                                Notes for internal use
                            </Label>
                            <Textarea
                                id="comments"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any internal notes or comments about this deal..."
                                className="mt-1 min-h-[80px]"
                            />
                        </div>
                    </div>

                    {/* Deliverables */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Deliverables
                        </h3>

                        {/* Add Deliverable */}
                        <div className="flex gap-2 mb-4">
                            <Select
                                value={newDeliverable.contentType}
                                onValueChange={(value) =>
                                    setNewDeliverable({
                                        ...newDeliverable,
                                        contentType: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {contentTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            <div className="flex items-center gap-2">
                                                {getContentTypeIcon(
                                                    type,
                                                    "w-4 h-4"
                                                )}
                                                <span className="capitalize">
                                                    {type}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={newDeliverable.text}
                                onChange={(e) =>
                                    setNewDeliverable({
                                        ...newDeliverable,
                                        text: e.target.value,
                                    })
                                }
                                placeholder="Describe the deliverable..."
                                className="flex-1"
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddDeliverable();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                onClick={handleAddDeliverable}
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Deliverables List */}
                        {deliverables.length > 0 && (
                            <div className="space-y-2">
                                {deliverables.map((deliverable, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center text-figma-green-primary">
                                            {getContentTypeIcon(
                                                deliverable.contentType,
                                                "w-4 h-4"
                                            )}
                                        </div>
                                        <span className="flex-1 text-gray-700">
                                            {deliverable.text}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleRemoveDeliverable(index)
                                            }
                                            className="h-6 w-6 p-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Brief Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">
                            Brief Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="briefLink"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Brief Link
                                </Label>
                                <Input
                                    id="briefLink"
                                    value={briefLink}
                                    onChange={(e) =>
                                        setBriefLink(e.target.value)
                                    }
                                    placeholder="https://example.com/brief"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="promoCode"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Promo Code
                                </Label>
                                <Input
                                    id="promoCode"
                                    value={promoCode}
                                    onChange={(e) =>
                                        setPromoCode(e.target.value)
                                    }
                                    placeholder="e.g., SAVE20"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="bg-white border-gray-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            Create Deal
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
