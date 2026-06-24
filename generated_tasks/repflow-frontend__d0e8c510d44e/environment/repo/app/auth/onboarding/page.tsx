"use client";

import { ImageUpload } from "@/components/image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Deliverable,
    DeliverableType,
    NegotiationPreferences,
    PartnershipPreferences,
    PricingTiers,
    RateType,
    UserPreferences
} from "@/lib/models";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CheckCircle,
    Loader2,
    Package,
    Settings,
    Shield,
    User,
    X
} from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OnboardingStep = "profile" | "preferences" | "deliverables" | "calendly" | "categories" | "complete";


const commonCategories = [
    "Adult Content",
    "Gambling",
    "Cryptocurrency",
    "Political Content",
    "Pharmaceuticals",
    "Weight Loss Products",
    "Get Rich Quick Schemes",
    "Tobacco/Vaping",
    "Alcohol",
    "Dating Apps",
    "MLM/Pyramid Schemes",
    "Unethical Business Practices"
];

const contactMethods = [
    "Email",
    "Direct Message",
    "Phone",
    "Video Call"
];

const platformOptions = [
    "YouTube",
    "Instagram",
    "TikTok",
    "Podcast",
    "Twitch",
    "LinkedIn",
    "Newsletter"
];

const platformDeliverableTypes: Record<string, DeliverableType[]> = {
    "YouTube": [
        "Preroll",
        "Midroll", 
        "Postroll",
        "Dedicated Video",
        "Semi-Dedicated Video",
        "Interview",
        "Segment"
    ],
    "Instagram": [
        "Feed Post",
        "Reel",
        "Story",
        "Story Set",
        "Link-in-Bio 7 Days",
        "Link-in-Bio 30 Days"
    ],
    "TikTok": [
        "Video",
        "Product/Logo Placement",
        "Link-in-Bio 7 Days",
        "Link-in-Bio 30 Days"
    ],
    "Podcast": [
        "Preroll",
        "Midroll",
        "Postroll",
        "Interview",
        "Segment"
    ],
    "Twitch": [
        "1 Hour Stream",
        "2 Hour Stream",
        "Gameplay Stream",
        "Panel",
        "15 min Chatbot",
        "Logo Overlay",
        "30 Day Panel + Chatbot + Overlay"
    ],
    "LinkedIn": [
        "Text Post",
        "Text + Image Post",
        "Text + Video Post"
    ],
    "Newsletter": [
        "Banner",
        "Newsletter Segment",
        "Newsletter Image",
        "Newsletter Video"
    ]
};

const timezones = [
    "UTC-12:00 (Baker Island)",
    "UTC-11:00 (American Samoa)",
    "UTC-10:00 (Hawaii)",
    "UTC-09:00 (Alaska)",
    "UTC-08:00 (Pacific)",
    "UTC-07:00 (Mountain)",
    "UTC-06:00 (Central)",
    "UTC-05:00 (Eastern)",
    "UTC-04:00 (Atlantic)",
    "UTC-03:00 (Argentina)",
    "UTC-02:00 (South Georgia)",
    "UTC-01:00 (Azores)",
    "UTC+00:00 (GMT/UTC)",
    "UTC+01:00 (Central European)",
    "UTC+02:00 (Eastern European)",
    "UTC+03:00 (Moscow)",
    "UTC+04:00 (Gulf)",
    "UTC+05:00 (Pakistan)",
    "UTC+05:30 (India)",
    "UTC+06:00 (Bangladesh)",
    "UTC+07:00 (Thailand)",
    "UTC+08:00 (China)",
    "UTC+09:00 (Japan)",
    "UTC+10:00 (Australia East)",
    "UTC+11:00 (Solomon Islands)",
    "UTC+12:00 (New Zealand)"
];

// Utility functions for number formatting
const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString();
};

const parseNumberFromFormatted = (formattedValue: string): number => {
    // Remove commas and parse as number
    const cleanValue = formattedValue.replace(/,/g, '');
    return parseFloat(cleanValue) || 0;
};

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Profile state
    const [profileImage, setProfileImage] = useState("");

    // Payment state
    const [isYearlyBilling, setIsYearlyBilling] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string>("");

    // Preferences state
    const [partnershipTypes, setPartnershipTypes] = useState<PartnershipPreferences>({
        flatRate: true,
        performanceHybrid: true,
        affiliate: true,
        gifting: true,
        ugc: true,
        events: true
    });

    const [negotiationOptions, setNegotiationOptions] = useState<NegotiationPreferences>({
        bundleDeals: true,
        crossPostingUpsell: true,
        rushProposalFee: false,
        minimumDaysWithoutRushFee: 7
    });

    const [preferences, setPreferences] = useState({
        absoluteMinimumRate: 100,
        preferredContactMethod: "Email",
        responseTimeHours: 24,
        timezone: "UTC-05:00 (Eastern)",
        language: "English",
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        weeklyReports: true
    });

    // Deliverables state
    const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
    const [newDeliverable, setNewDeliverable] = useState({
        platform: "",
        deliverableType: "" as DeliverableType,
        rate: 0,
        rateType: "FLAT" as RateType,
        lockRate: false,
        price: 0
    });
    const [formattedRate, setFormattedRate] = useState("");
    const [showDeliverableDropdown, setShowDeliverableDropdown] = useState(false);
    const [selectedDeliverableIndex, setSelectedDeliverableIndex] = useState(-1);

    const [pricingTiers, setPricingTiers] = useState<PricingTiers>({
        lowTier: { enabled: true, categories: [] },
        premiumTier: { enabled: false, categories: [] },
        ultraPremium: { enabled: false, categories: [] }
    });

    // Categories state
    const [autoRejectCategories, setAutoRejectCategories] = useState<string[]>([]);
    const [customCategory, setCustomCategory] = useState("");

    // Calendly state
    const [calendlyMeetingScheduled, setCalendlyMeetingScheduled] = useState(false);
    const [isAdvancingStep, setIsAdvancingStep] = useState(false);

    // Filter deliverable types based on platform and input
    const filteredDeliverableTypes = useMemo(() => {
        const availableTypes = newDeliverable.platform 
            ? (platformDeliverableTypes[newDeliverable.platform] || [])
            : [];
        
        if (!newDeliverable.deliverableType) return availableTypes;
        
        return availableTypes.filter(type =>
            type.toLowerCase().includes(newDeliverable.deliverableType.toLowerCase())
        );
    }, [newDeliverable.platform, newDeliverable.deliverableType]);

    // Listen for Calendly events
    useEffect(() => {
        const handleCalendlyEvent = (e: any) => {
            console.log("Calendly event received:", e.data.event);
            
            if (e.data.event === 'calendly.event_scheduled') {
                console.log("Meeting scheduled successfully!");
                setCalendlyMeetingScheduled(true);
                setIsAdvancingStep(true);
                
                // Auto-advance to next step after a short delay
                setTimeout(() => {
                    if (currentStep === "calendly") {
                        handleNext();
                        setIsAdvancingStep(false);
                    }
                }, 2000); // 2 second delay to show success message
            }
        };

        // Add event listener for Calendly events
        if (typeof window !== 'undefined') {
            window.addEventListener('message', handleCalendlyEvent);
        }

        // Cleanup event listener
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('message', handleCalendlyEvent);
            }
        };
    }, [currentStep]);

    const getStepNumber = (step: OnboardingStep): number => {
        const steps = ["profile", "payment", "preferences", "deliverables", "calendly", "categories", "complete"];
        return steps.indexOf(step) + 1;
    };

    const getProgressPercentage = (): number => {
        const stepNumber = getStepNumber(currentStep);
        return (stepNumber / 7) * 100;
    };

    const handlePartnershipChange = (type: keyof PartnershipPreferences, checked: boolean) => {
        setPartnershipTypes(prev => ({
            ...prev,
            [type]: checked
        }));
    };

    const handleNegotiationChange = (type: keyof NegotiationPreferences, value: boolean | number) => {
        setNegotiationOptions(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const handlePlatformChange = (platform: string) => {
        setNewDeliverable(prev => ({
            ...prev,
            platform
        }));
        setShowDeliverableDropdown(false);
        setSelectedDeliverableIndex(-1);
    };

    const isDeliverableValid = (deliverable: typeof newDeliverable): boolean => {
        return !!(deliverable.platform && deliverable.deliverableType && deliverable.rate > 0);
    };

    const addDeliverable = () => {
        if (!isDeliverableValid(newDeliverable)) {
            setError("Please fill in all deliverable fields");
            return;
        }

        const deliverable: Deliverable = {
            id: Date.now(),
            bundle: false,
            content: [{
                deliverableType: newDeliverable.deliverableType
            }],
            deliverableType: newDeliverable.deliverableType,
            rate: newDeliverable.rate,
            rateType: newDeliverable.rateType,
            lockRate: newDeliverable.lockRate,
            price: newDeliverable.price,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Replace any existing deliverable with the new one (single deliverable only)
        setDeliverables([deliverable]);
        setNewDeliverable({
            platform: "",
            deliverableType: "" as DeliverableType,
            rate: 0,
            rateType: "FLAT",
            lockRate: false,
            price: 0
        });
        setFormattedRate("");
        setError("");
    };

    const autoSaveDeliverable = () => {
        if (isDeliverableValid(newDeliverable)) {
            const deliverable: Deliverable = {
                id: Date.now(),
                bundle: false,
                content: [{
                    deliverableType: newDeliverable.deliverableType
                }],
                deliverableType: newDeliverable.deliverableType,
                rate: newDeliverable.rate,
                rateType: newDeliverable.rateType,
                lockRate: newDeliverable.lockRate,
                price: newDeliverable.price,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Replace any existing deliverable with the new one (single deliverable only)
            setDeliverables([deliverable]);
            setNewDeliverable({
                platform: "",
                deliverableType: "" as DeliverableType,
                rate: 0,
                rateType: "FLAT",
                lockRate: false,
                price: 0
            });
            setFormattedRate("");
        }
    };

    const removeDeliverable = (id: number) => {
        setDeliverables(prev => prev.filter(d => d.id !== id));
    };

    const toggleCategory = (category: string) => {
        setAutoRejectCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const addCustomCategory = () => {
        if (customCategory.trim() && !autoRejectCategories.includes(customCategory.trim())) {
            setAutoRejectCategories(prev => [...prev, customCategory.trim()]);
            setCustomCategory("");
        }
    };

    const removeCategory = (category: string) => {
        setAutoRejectCategories(prev => prev.filter(c => c !== category));
    };

    const handleNext = () => {
        // Auto-save deliverable if we're on the deliverables step and there's valid data
        if (currentStep === "deliverables") {
            autoSaveDeliverable();
        }

        const steps: OnboardingStep[] = ["profile", "preferences", "deliverables", "calendly", "categories", "complete"];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const steps: OnboardingStep[] = ["profile", "preferences", "deliverables", "calendly", "categories", "complete"];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1]);
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Get user data from localStorage
            const pendingUserData = localStorage.getItem('pendingUserData');
            let userData = null;
            
            if (pendingUserData) {
                userData = JSON.parse(pendingUserData);
            }

            const userPreferences: UserPreferences = {
                partnershipTypes,
                absoluteMinimumRate: preferences.absoluteMinimumRate,
                deliverables,
                pricingTiers,
                autoRejectCategories,
                preferredContactMethod: preferences.preferredContactMethod,
                responseTimeHours: preferences.responseTimeHours,
                timezone: preferences.timezone,
                language: preferences.language,
                emailNotifications: preferences.emailNotifications,
                pushNotifications: preferences.pushNotifications,
                dealAlerts: preferences.dealAlerts,
                weeklyReports: preferences.weeklyReports
            };

            const response = await fetch("/api/auth/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    preferences: userPreferences,
                    profileImage: profileImage,
                    userData: userData // Send the localStorage data
                }),
            });

            if (response.ok) {
                // Show completion step briefly
                setCurrentStep("complete");
                
                // Sign the user in programmatically with their credentials
                if (userData && userData.email && userData.password) {
                    const result = await signIn('credentials', {
                        username: userData.email,
                        password: userData.password,
                        redirect: false, // Don't auto-redirect, we'll handle it manually
                    });

                    if (result?.ok) {
                        // Clean up localStorage after successful authentication
                        localStorage.removeItem('pendingUserData');
                        
                        // Redirect to deal tracker page
                        setTimeout(() => {
                            router.push("/creator/deals");
                        }, 1000);
                    } else {
                        // If auto-sign in fails, fall back to sign in page
                        localStorage.removeItem('pendingUserData');
                        setError("Account created successfully! Please sign in.");
                        setTimeout(() => {
                            router.push("/auth/signin");
                        }, 2000);
                    }
                } else {
                    // Fallback if we don't have credentials
                    localStorage.removeItem('pendingUserData');
                    setTimeout(() => {
                        router.push("/auth/signin");
                    }, 1000);
                }
            } else {
                const data = await response.json();
                const detail =
                    typeof data.detail === "string"
                        ? data.detail
                        : data.detail != null
                          ? JSON.stringify(data.detail)
                          : "";
                setError(
                    [data.error || "Failed to save preferences", detail]
                        .filter(Boolean)
                        .join(" — ")
                );
            }
        } catch (error) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };


    const renderProfileStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <User className="w-12 h-12 text-sage-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-figma-forest-dark">Complete Your Profile</h2>
                <p className="text-gray-600">Add a profile image to personalize your account</p>
            </div>

            <div className="max-w-md mx-auto">
                <ImageUpload
                    onImageUpload={setProfileImage}
                    currentImageUrl={profileImage}
                    label="Profile Picture"
                    description="Upload a professional profile photo. This will be visible to brands and collaborators. Max size 5MB."
                />
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>You can skip this step and add a profile image later from your settings.</p>
            </div>
        </div>
    );

    const renderPreferencesStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Settings className="w-12 h-12 text-sage-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-figma-forest-dark">Customize Your Preferences</h2>
                <p className="text-gray-600">Set up your partnership and notification preferences</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Partnership Types</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="flatRate" className="text-sm font-medium">Flat Rate</Label>
                            <Switch
                                id="flatRate"
                                checked={partnershipTypes.flatRate}
                                onCheckedChange={(checked) => handlePartnershipChange("flatRate", checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="performanceHybrid" className="text-sm font-medium">Performance Hybrid</Label>
                            <Switch
                                id="performanceHybrid"
                                checked={partnershipTypes.performanceHybrid}
                                onCheckedChange={(checked) => handlePartnershipChange("performanceHybrid", checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="affiliate" className="text-sm font-medium">Affiliate</Label>
                            <Switch
                                id="affiliate"
                                checked={partnershipTypes.affiliate}
                                onCheckedChange={(checked) => handlePartnershipChange("affiliate", checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="gifting" className="text-sm font-medium">Gifting</Label>
                            <Switch
                                id="gifting"
                                checked={partnershipTypes.gifting}
                                onCheckedChange={(checked) => handlePartnershipChange("gifting", checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="ugc" className="text-sm font-medium">UGC</Label>
                            <Switch
                                id="ugc"
                                checked={partnershipTypes.ugc}
                                onCheckedChange={(checked) => handlePartnershipChange("ugc", checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <Label htmlFor="events" className="text-sm font-medium">Events</Label>
                            <Switch
                                id="events"
                                checked={partnershipTypes.events}
                                onCheckedChange={(checked) => handlePartnershipChange("events", checked)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="minimumRate">Absolute Minimum Rate ($)</Label>
                        <Input
                            id="minimumRate"
                            type="number"
                            min="0"
                            value={preferences.absoluteMinimumRate}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                absoluteMinimumRate: parseInt(e.target.value) || 0
                            }))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDeliverablesStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Package className="w-12 h-12 text-sage-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-figma-forest-dark">Set Your Deliverables</h2>
                <p className="text-gray-600">Set at least 1 preferred deliverable for brand partnerships</p>
            </div>

            <div className="space-y-6">
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Set Your Deliverable</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="platform">Platform</Label>
                            <Select
                                value={newDeliverable.platform}
                                onValueChange={handlePlatformChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    {platformOptions.map(platform => (
                                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deliverableType">Deliverable Type</Label>
                            <div className="relative">
                                <Input
                                    id="deliverableType"
                                    value={newDeliverable.deliverableType}
                                    onChange={(e) => {
                                        setNewDeliverable(prev => ({
                                            ...prev,
                                            deliverableType: e.target.value as DeliverableType
                                        }));
                                        setShowDeliverableDropdown(true);
                                        setSelectedDeliverableIndex(-1);
                                    }}
                                    onFocus={() => setShowDeliverableDropdown(true)}
                                    onBlur={() => {
                                        setTimeout(() => setShowDeliverableDropdown(false), 150);
                                    }}
                                    onKeyDown={(e) => {
                                        if (!showDeliverableDropdown) return;
                                        
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSelectedDeliverableIndex(prev => 
                                                prev < filteredDeliverableTypes.length - 1 ? prev + 1 : prev
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSelectedDeliverableIndex(prev => prev > 0 ? prev - 1 : -1);
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (selectedDeliverableIndex >= 0 && selectedDeliverableIndex < filteredDeliverableTypes.length) {
                                                setNewDeliverable(prev => ({
                                                    ...prev,
                                                    deliverableType: filteredDeliverableTypes[selectedDeliverableIndex] as DeliverableType
                                                }));
                                                setShowDeliverableDropdown(false);
                                                setSelectedDeliverableIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowDeliverableDropdown(false);
                                            setSelectedDeliverableIndex(-1);
                                        }
                                    }}
                                    placeholder={newDeliverable.platform ? "Type to search..." : "Select platform first"}
                                    disabled={!newDeliverable.platform}
                                />
                                
                                {/* Dropdown List */}
                                {showDeliverableDropdown && newDeliverable.platform && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto max-h-60">
                                        {filteredDeliverableTypes.length > 0 ? (
                                            filteredDeliverableTypes.map((type: string, index: number) => (
                                                <div
                                                    key={type}
                                                    className={cn(
                                                        "cursor-pointer px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors",
                                                        index === selectedDeliverableIndex 
                                                            ? "bg-sage-primary/10 text-figma-forest-dark" 
                                                            : "hover:bg-gray-50 text-gray-900"
                                                    )}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setNewDeliverable(prev => ({
                                                            ...prev,
                                                            deliverableType: type as DeliverableType
                                                        }));
                                                        setShowDeliverableDropdown(false);
                                                        setSelectedDeliverableIndex(-1);
                                                    }}
                                                    onMouseEnter={() => setSelectedDeliverableIndex(index)}
                                                >
                                                    <span className="text-sm truncate block">{type}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-500 px-3 py-2">
                                                {newDeliverable.deliverableType ? (
                                                    <>
                                                        <p>No matches found.</p>
                                                        <p className="text-xs mt-1">
                                                            Press Enter or click outside to use &quot;{newDeliverable.deliverableType}&quot; as custom type.
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate">Rate ($)</Label>
                            <Input
                                id="rate"
                                type="text"
                                placeholder="0"
                                value={formattedRate}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    setFormattedRate(inputValue);
                                    
                                    // Parse the formatted value back to a number
                                    const numericValue = parseNumberFromFormatted(inputValue);
                                    setNewDeliverable(prev => ({
                                        ...prev,
                                        rate: numericValue
                                    }));
                                }}
                                onBlur={() => {
                                    // Format the display value when user finishes editing
                                    if (newDeliverable.rate > 0) {
                                        setFormattedRate(formatNumberWithCommas(newDeliverable.rate));
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                        <p>You can add more deliverables later in your Preferences page.</p>
                    </div>
                </div>

                {deliverables.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Your Deliverable</h3>
                        <div className="space-y-2">
                            {deliverables.map((deliverable) => (
                                <div key={deliverable.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{deliverable.platform} - {deliverable.deliverableType}</div>
                                        <div className="text-sm text-gray-600">
                                            ${deliverable.rate}
                                            {deliverable.lockRate && " • Locked"}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeDeliverable(deliverable.id)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCategoriesStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Shield className="w-12 h-12 text-sage-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-figma-forest-dark">Auto-Reject Categories</h2>
                <p className="text-gray-600">Select categories you want to automatically reject</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Common Categories</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {commonCategories.map(category => (
                            <div key={category} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                <Label htmlFor={category} className="text-sm font-medium">{category}</Label>
                                <Switch
                                    id={category}
                                    checked={autoRejectCategories.includes(category)}
                                    onCheckedChange={() => toggleCategory(category)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Add Custom Category</h3>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter custom category"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                        />
                        <Button 
                            onClick={addCustomCategory} 
                            variant="outline"
                            className="border-sage-primary/20 text-figma-forest-dark hover:bg-sage-primary/10 hover:border-sage-primary/50"
                        >
                            Add
                        </Button>
                    </div>
                </div>

                {autoRejectCategories.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-figma-forest-dark">Selected Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {autoRejectCategories.map(category => (
                                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                                    {category}
                                    <X 
                                        className="w-3 h-3 cursor-pointer" 
                                        onClick={() => removeCategory(category)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCompleteStep = () => (
        <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-sage-primary mx-auto" />
            <div>
                <h2 className="text-2xl font-bold text-figma-forest-dark">Setup Complete!</h2>
                <p className="text-gray-600 mt-2">
                    Your profile has been configured successfully. Redirecting to your dashboard...
                </p>
            </div>
        </div>
    );

    const renderCalendlyStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-sage-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-figma-forest-dark">Schedule Your Onboarding Call</h2>
                <p className="text-gray-600">Book a call with our team to get started with Repflow</p>
            </div>

            <div className="space-y-6">
                <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-figma-forest-dark">Required Onboarding Call</h3>
                    
                    {!calendlyMeetingScheduled ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-800 text-sm">
                                    <strong>Important:</strong> All new users are required to schedule an onboarding call with our team. 
                                    This call will help you get the most out of Repflow and answer any questions you may have.
                                </p>
                            </div>
                            
                            <div className="text-center">
                                <Button 
                                    onClick={() => {
                                        // Open Calendly popup widget with event tracking
                                        if (typeof window !== 'undefined' && (window as any).Calendly) {
                                            (window as any).Calendly.initPopupWidget({
                                                url: 'https://calendly.com/henryburreson/repflow-onboarding-w-henry',
                                                prefill: {},
                                                utm: {}
                                            });
                                        } else {
                                            // Fallback to new tab
                                            window.open('https://calendly.com/henryburreson/repflow-onboarding-w-henry', '_blank');
                                        }
                                    }}
                                    className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Schedule Onboarding Call
                                </Button>
                            </div>
                            
                            <div className="text-center">
                                <Button 
                                    variant="outline"
                                    onClick={() => setCalendlyMeetingScheduled(true)}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                >
                                    I&apos;ve Already Scheduled My Call
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    {isAdvancingStep ? (
                                        <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    )}
                                    <div>
                                        <p className="font-medium text-green-800">Onboarding Call Scheduled!</p>
                                        <p className="text-sm text-green-600">
                                            Thank you! We&apos;ll see you on your scheduled call. 
                                            {isAdvancingStep && " Moving to next step..."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {currentStep !== "calendly" && (
                                <div className="text-center">
                                    <Button 
                                        variant="outline"
                                        onClick={() => setCalendlyMeetingScheduled(false)}
                                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                    >
                                        Reschedule Call
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-center text-sm text-gray-500">
                    <p>This call is required to complete your onboarding and unlock all Repflow features.</p>
                </div>
            </div>
        </div>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case "profile":
                return renderProfileStep();
            case "preferences":
                return renderPreferencesStep();
            case "deliverables":
                return renderDeliverablesStep();
            case "calendly":
                return renderCalendlyStep();
            case "categories":
                return renderCategoriesStep();
            case "complete":
                return renderCompleteStep();
            default:
                return renderProfileStep();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <Image
                        src="/repflow-logo.png"
                        alt="Repflow"
                        width={120}
                        height={40}
                        className="dark:invert mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold">Welcome to Repflow!</h1>
                    <p className="text-gray-600 mt-2">Let&apos;s set up your profile in a few easy steps</p>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">
                            Step {getStepNumber(currentStep)} of 7
                        </span>
                        <span className="text-sm text-gray-600">
                            {Math.round(getProgressPercentage())}% complete
                        </span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                <Card className="mb-8">
                    <CardContent className="p-8">
                        {error && (
                            <Alert className="border-red-200 bg-red-50 mb-6">
                                <AlertDescription className="text-red-800">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {renderCurrentStep()}
                    </CardContent>
                </Card>

                {currentStep !== "complete" && (
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === "profile"}
                            className="border-sage-primary/20 text-figma-forest-dark hover:bg-sage-primary/10 hover:border-sage-primary/50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>

                        {currentStep === "categories" ? (
                            <Button 
                                onClick={handleComplete} 
                                disabled={isLoading}
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Complete Setup
                                        <CheckCircle className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleNext}
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            >
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
