"use client";

import {
    STRIPE_PUBLISHABLE_KEY,
    SUBSCRIPTION_TIERS,
} from "@/app/constants/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    CardElement,
    Elements,
    useElements,
    useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const stripePromise = STRIPE_PUBLISHABLE_KEY
    ? loadStripe(STRIPE_PUBLISHABLE_KEY)
    : null;

// Payment Method Update Form Component
function PaymentMethodUpdateForm({
    onSuccess,
    onError,
    isLoading,
    setIsLoading,
    userEmail,
}: {
    onSuccess: (billingInfo: any) => void;
    onError: (error: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    userEmail: string;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [billingDetails, setBillingDetails] = useState({
        name: "",
        address: {
            line1: "",
            line2: "",
            city: "",
            state: "",
            postalCode: "",
            country: "US",
        },
    });

    const handleBillingChange = (field: string, value: string) => {
        if (field.startsWith("address.")) {
            const addressField = field.split(".")[1];
            setBillingDetails((prev) => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressField]: value,
                },
            }));
        } else {
            setBillingDetails((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            onError("Stripe not loaded. Please try again.");
            return;
        }

        setIsLoading(true);

        try {
            // Create payment method
            const { error: paymentMethodError, paymentMethod } =
                await stripe.createPaymentMethod({
                    type: "card",
                    card: elements.getElement(CardElement)!,
                    billing_details: {
                        name: billingDetails.name,
                        email: userEmail, // Always use the registered user's email
                        address: {
                            line1: billingDetails.address.line1,
                            line2: billingDetails.address.line2 || undefined,
                            city: billingDetails.address.city,
                            state: billingDetails.address.state,
                            postal_code: billingDetails.address.postalCode,
                            country: billingDetails.address.country,
                        },
                    },
                });

            if (paymentMethodError) {
                throw new Error(paymentMethodError.message);
            }

            // Update payment method via API
            const response = await fetch("/api/stripe/update-payment-method", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethod.id,
                    billingDetails: billingDetails,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess(data.billingInfo);
            } else {
                throw new Error(
                    data.error || "Failed to update payment method"
                );
            }
        } catch (error) {
            onError(
                error instanceof Error
                    ? error.message
                    : "Failed to update payment method"
            );
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Billing Details Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                    Update Billing Details
                </h3>

                <div className="space-y-2">
                    <Label htmlFor="update-billing-name">Full Name *</Label>
                    <Input
                        id="update-billing-name"
                        type="text"
                        placeholder="John Doe"
                        value={billingDetails.name}
                        onChange={(e) =>
                            handleBillingChange("name", e.target.value)
                        }
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="update-billing-address1">
                        Address Line 1 *
                    </Label>
                    <Input
                        id="update-billing-address1"
                        type="text"
                        placeholder="123 Main St"
                        value={billingDetails.address.line1}
                        onChange={(e) =>
                            handleBillingChange("address.line1", e.target.value)
                        }
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="update-billing-address2">
                        Address Line 2
                    </Label>
                    <Input
                        id="update-billing-address2"
                        type="text"
                        placeholder="Apt 4B"
                        value={billingDetails.address.line2}
                        onChange={(e) =>
                            handleBillingChange("address.line2", e.target.value)
                        }
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="update-billing-city">City *</Label>
                        <Input
                            id="update-billing-city"
                            type="text"
                            placeholder="New York"
                            value={billingDetails.address.city}
                            onChange={(e) =>
                                handleBillingChange(
                                    "address.city",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="update-billing-state">State *</Label>
                        <Input
                            id="update-billing-state"
                            type="text"
                            placeholder="NY"
                            value={billingDetails.address.state}
                            onChange={(e) =>
                                handleBillingChange(
                                    "address.state",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="update-billing-postal">
                            ZIP Code *
                        </Label>
                        <Input
                            id="update-billing-postal"
                            type="text"
                            placeholder="10001"
                            value={billingDetails.address.postalCode}
                            onChange={(e) =>
                                handleBillingChange(
                                    "address.postalCode",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Payment Method Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                    New Payment Method
                </h3>
                <div className="p-4 border rounded-lg bg-gray-50">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: "16px",
                                    color: "#424770",
                                    "::placeholder": {
                                        color: "#aab7c4",
                                    },
                                },
                                invalid: {
                                    color: "#9e2146",
                                },
                            },
                        }}
                    />
                </div>
            </div>

            <Button
                type="submit"
                disabled={!stripe || isLoading}
                className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating Payment Method...
                    </>
                ) : (
                    "Update Payment Method"
                )}
            </Button>
        </form>
    );
}

import {
    addTeamMember,
    generateReferralCode,
    getCompleteUserProfileData,
    updateUserProfile
} from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
import {
    BillingInfo,
    ReferralData,
    TeamMember,
    UserProfile
} from "@/lib/models";
import { formatTimestamp } from "@/lib/utils";
import {
    Copy,
    CreditCard,
    Crown,
    DollarSign,
    Edit,
    ExternalLink,
    Gift,
    Key,
    Loader2,
    Lock,
    MoreVertical,
    Plus,
    Share,
    User,
    Users
} from "lucide-react";

type FeatureTabContentProps = {
    value: string;
    requiredTier?: string;
    lockedTitle: string;
    lockedDescription: string;
    /** When set, show this instead of the default "Upgrade to {tier}" button (e.g. for coming-soon contact CTA) */
    lockedAction?: { label: string; href: string };
    isFeatureLocked: (tier: string) => boolean;
    children: React.ReactNode;
    onUpgradeClick: () => void;
};

const FeatureTabContent = ({
    value,
    requiredTier,
    lockedTitle,
    lockedDescription,
    lockedAction,
    isFeatureLocked,
    children,
    onUpgradeClick,
}: FeatureTabContentProps) => {
    const isLocked = requiredTier && isFeatureLocked(requiredTier);

    return (
        <TabsContent value={value} className="space-y-6">
            {isLocked && (
                <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                    <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                        {lockedTitle}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {lockedDescription}
                    </p>
                    {lockedAction ? (
                        <Button
                            type="button"
                            asChild
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            <a href={lockedAction.href}>{lockedAction.label}</a>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={onUpgradeClick}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            <Crown className="mr-2 h-4 w-4" />
                            Upgrade to {requiredTier}
                        </Button>
                    )}
                </div>
            )}
            {!isLocked && children}
        </TabsContent>
    );
};

export default function ProfilePage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null | undefined>(undefined);
    const [referralData, setReferralData] = useState<ReferralData | null | undefined>(undefined);
    const [teamMembers, setTeamMembers] = useState<TeamMember[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [isPaymentUpdateModalOpen, setIsPaymentUpdateModalOpen] =
        useState(false);
    const [paymentUpdateLoading, setPaymentUpdateLoading] = useState(false);
    const [paymentUpdateError, setPaymentUpdateError] = useState("");
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [activeProfileTab, setActiveProfileTab] = useState("bio");
    const [referralCodeLoading, setReferralCodeLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState("");
    const [selectedUpgradeTier, setSelectedUpgradeTier] = useState("");
    const [isYouTubeSyncing, setIsYouTubeSyncing] = useState(false);

    // Fetch user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                // Single API call to fetch all profile data
                const data = await getCompleteUserProfileData();

                const referralLink = `https://${window.location.hostname}/auth/signup?ref=${data.referralData?.referralCode}`;

                const referralData = data.referralData ? {
                    ...data.referralData,
                    referralLink: referralLink
                } : null;

                setUserProfile(data.profile);
                setBillingInfo(data.billingInfo);
                setReferralData(referralData);
                setTeamMembers(data.teamMembers);
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Show loading state while data is being fetched
    if (isLoading) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-green-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">
                            Loading profile information...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if profile failed to load (null means error, undefined means loading)
    if (!isLoading && !userProfile) {
        return (
            <div className="flex-1 page-padding space-y-6 bg-gray-50">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Failed to load profile
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Unable to load your profile information. Please try
                            again later.
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Don't render main content if still loading or if critical data is missing
    if (isLoading || !userProfile) {
        return null;
    }

    const handleSaveProfile = async (updates: Partial<UserProfile>) => {
        try {
            setIsLoading(true);
            await updateUserProfile(updates);
            setIsEditing(false);
            console.log("Profile updated successfully");
        } catch (error) {
            console.error("Failed to update profile:", error);
            // Could add a toast notification here for better UX
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (imageUrl: string) => {
        if (!userProfile) {
            throw new Error("User profile not loaded");
        }
        try {
            // Send the full profile object with updated avatar
            const updatedProfile = {
                ...userProfile,
                avatar: imageUrl
            };
            await updateUserProfile(updatedProfile);
            setUserProfile(updatedProfile);
            toast.success("Profile picture updated successfully");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update profile picture";
            console.error("Failed to update profile picture:", error);
            toast.error(message);
            // Re-throw the error so ImageUpload component knows it failed
            throw error;
        }
    };

    const handleCopyReferralLink = () => {
        if (!referralData?.referralLink) return;
        navigator.clipboard.writeText(referralData.referralLink).then(
            () => toast.success("Referral link copied to clipboard!"),
            () => toast.error("Could not copy. Try selecting and copying manually.")
        );
    };

    const handleCopyReferralCode = () => {
        if (!referralData?.referralCode) return;
        navigator.clipboard.writeText(referralData.referralCode).then(
            () => toast.success("Referral code copied to clipboard!"),
            () => toast.error("Could not copy. Try selecting and copying manually.")
        );
    };

    /** Request the backend to generate or regenerate a referral code. Backend must implement POST /referrals/generate for a new code. */
    const handleGenerateReferralCode = async () => {
        try {
            setReferralCodeLoading(true);
            const data = await generateReferralCode();
            if (data) {
                setReferralData(data);
                const isNew = !referralData?.referralCode || data.referralCode !== referralData.referralCode;
                toast.success(isNew ? "Referral code generated!" : "Referral code updated.");
                const fresh = await getCompleteUserProfileData();
                if (fresh?.referralData) setReferralData(fresh.referralData);
            } else {
                const currentCode = referralData?.referralCode;
                toast.error(
                    currentCode
                        ? `Regenerate isn't supported yet — your code (${currentCode}) is unchanged. Contact support if you need a new code.`
                        : "Referral service isn't available yet (backend may not have this endpoint). Contact support to enable it.",
                    { duration: 8000 }
                );
            }
        } catch (error) {
            console.error("Failed to generate referral code:", error);
            toast.error(
                "Referral code could not be generated. Existing accounts may need reactivation (e.g. with Stripe). Contact support for help.",
                { duration: 6000 }
            );
        } finally {
            setReferralCodeLoading(false);
        }
    };

    const handleAddTeamMember = () => {
        if (newMemberEmail) {
            const newMember = addTeamMember({
                name: newMemberEmail.split("@")[0],
                email: newMemberEmail,
                avatar: "/placeholder-user.png",
                role: "Viewer",
                status: "pending",
                invitedAt: new Date().toLocaleDateString(),
            });
            setTeamMembers([...(teamMembers || []), newMember]);
            setNewMemberEmail("");
        }
    };

    const handlePaymentMethodUpdateSuccess = (updatedBillingInfo: any) => {
        setBillingInfo(updatedBillingInfo);
        setIsPaymentUpdateModalOpen(false);
        setPaymentUpdateError("");
        // You could add a toast notification here
        console.log("Payment method updated successfully:", updatedBillingInfo);
    };

    const handlePaymentMethodUpdateError = (error: string) => {
        setPaymentUpdateError(error);
    };

    const handlePlanUpgrade = async () => {
        if (!selectedUpgradeTier) {
            setUpgradeError("Please select a plan to upgrade to");
            return;
        }

        setUpgradeLoading(true);
        setUpgradeError("");

        try {
            const response = await fetch("/api/stripe/upgrade-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    newTier: selectedUpgradeTier,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update the user profile with new subscription
                setUserProfile((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        subscription: {
                            ...prev.subscription,
                            tier:
                                selectedUpgradeTier.charAt(0).toUpperCase() +
                                selectedUpgradeTier.slice(1).toLowerCase(),
                        },
                    };
                });

                setIsUpgradeModalOpen(false);
                setSelectedUpgradeTier("");
                console.log("Plan upgraded successfully:", data);
            } else {
                throw new Error(data.error || "Failed to upgrade plan");
            }
        } catch (error) {
            setUpgradeError(
                error instanceof Error
                    ? error.message
                    : "Failed to upgrade plan"
            );
        } finally {
            setUpgradeLoading(false);
        }
    };

    const handleYouTubeSync = async () => {
        if (!userProfile?.socialLinks?.youtube) {
            console.error("No YouTube URL provided");
            return;
        }

        setIsYouTubeSyncing(true);

        try {
            // Step 1: Get OAuth authorization URL
            const authResponse = await fetch("/api/youtube/oauth/authorize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    state: `youtube-sync-${encodeURIComponent(
                        userProfile.socialLinks.youtube
                    )}`,
                }),
            });

            if (!authResponse.ok) {
                const errorData = await authResponse.json();
                throw new Error(
                    errorData.error || "Failed to get YouTube authorization URL"
                );
            }

            const authData = await authResponse.json();

            if (authData.success && authData.authUrl) {
                // Step 2: Redirect to Google OAuth
                window.location.href = authData.authUrl;
            } else {
                throw new Error("Failed to get authorization URL");
            }
        } catch (error) {
            console.error("YouTube sync error:", error);
            alert(
                `Failed to start YouTube sync: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setIsYouTubeSyncing(false);
        }
    };

    const getAvailableUpgradeTiers = () => {
        const currentTier = userProfile?.subscription?.tier;
        const tierHierarchy: Record<string, number> = {
            Starter: 1,
            Growth: 2,
            Scale: 3,
        };
        const currentTierLevel = tierHierarchy[currentTier] || 0;
        const allTiers = ["Starter", "Growth", "Scale"];
        return allTiers.filter(
            (tier) => tierHierarchy[tier] > currentTierLevel
        );
    };

    const getAllAvailableTiers = () => {
        const currentTier = userProfile?.subscription?.tier;
        const allTiers = ["Starter", "Growth", "Scale"];
        return allTiers.filter((tier) => tier !== currentTier);
    };

    const getSubscriptionBadgeColor = (tier: string) => {
        switch (tier) {
            case "Growth":
                return "bg-purple-100 text-purple-700 hover:bg-purple-200";
            case "Starter":
                return "bg-blue-100 text-blue-700 hover:bg-blue-200";
            case "Scale":
                return "bg-green-100 text-green-700 hover:bg-green-200";
            default:
                return "bg-gray-100 text-gray-700 hover:bg-gray-200";
        }
    };

    const isFeatureLocked = (requiredTier: string) => {
        const tierHierarchy: Record<string, number> = {
            Starter: 1,
            Growth: 2,
            Scale: 3,
        };
        return (
            (tierHierarchy[userProfile?.subscription?.tier] || 0) <
            (tierHierarchy[requiredTier] || 0)
        );
    };

    return (
        <div className="flex-1 page-padding space-y-6 bg-gray-50">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Profile Settings
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        className={`${getSubscriptionBadgeColor(
                            userProfile.subscription.tier
                        )} rounded-lg px-3 py-1`}
                    >
                        {userProfile.subscription.tier} Plan
                    </Badge>
                    {getAvailableUpgradeTiers().length > 0 && (
                        <Dialog
                            open={isUpgradeModalOpen}
                            onOpenChange={setIsUpgradeModalOpen}
                        >
                            <DialogTrigger asChild>
                                <Button className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm">
                                    <Crown className="mr-2 h-4 w-4" /> Upgrade
                                    Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Upgrade Your Plan</DialogTitle>
                                    <DialogDescription>
                                        Choose a higher tier to unlock more
                                        features and capabilities.
                                    </DialogDescription>
                                </DialogHeader>

                                {upgradeError && (
                                    <Alert className="border-red-200 bg-red-50">
                                        <AlertDescription className="text-red-800">
                                            {upgradeError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Select New Plan
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {getAvailableUpgradeTiers().map(
                                            (tier) => {
                                                const tierInfo = Object.values(
                                                    SUBSCRIPTION_TIERS
                                                ).find((t) => t.name === tier);
                                                const isDisabled =
                                                    tierInfo?.disabled || false;
                                                return (
                                                    <div
                                                        key={tier}
                                                        className="relative"
                                                    >
                                                        {isDisabled && (
                                                            <div className="absolute -top-2 right-3 z-10">
                                                                <Badge className="bg-gray-500 text-white text-xs shadow-md">
                                                                    Coming Soon
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`p-4 border rounded-lg transition-all ${
                                                                isDisabled
                                                                    ? "opacity-50 cursor-not-allowed border-gray-200"
                                                                    : "cursor-pointer " +
                                                                      (selectedUpgradeTier ===
                                                                      tier.toLowerCase()
                                                                          ? "border-sage-primary bg-sage-primary/5"
                                                                          : "border-gray-200 hover:border-sage-primary/50")
                                                            }`}
                                                            onClick={() =>
                                                                !isDisabled &&
                                                                setSelectedUpgradeTier(
                                                                    tier.toLowerCase()
                                                                )
                                                            }
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900">
                                                                        {tier}{" "}
                                                                        Plan
                                                                    </h4>
                                                                    <p className="text-sm text-gray-600">
                                                                        {
                                                                            tierInfo?.description
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-gray-900">
                                                                        $
                                                                        {
                                                                            tierInfo?.price
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm text-gray-600">
                                                                        /month
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setIsUpgradeModalOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handlePlanUpgrade}
                                        disabled={
                                            !selectedUpgradeTier ||
                                            upgradeLoading
                                        }
                                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                    >
                                        {upgradeLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Upgrading...
                                            </>
                                        ) : (
                                            "Upgrade Plan"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </header>

            <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 bg-white">
                    <TabsTrigger
                        value="bio"
                        className="data-[state=active]:bg-sage-primary/30"
                    >
                        Bio
                    </TabsTrigger>
                    <TabsTrigger
                        value="security"
                        className="data-[state=active]:bg-sage-primary/30"
                    >
                        Security
                    </TabsTrigger>
                    <TabsTrigger
                        value="billing"
                        className="data-[state=active]:bg-sage-primary/30"
                    >
                        Billing
                    </TabsTrigger>
                    <TabsTrigger
                        value="referrals"
                        className="data-[state=active]:bg-sage-primary/30"
                    >
                        Referrals
                    </TabsTrigger>
                    <TabsTrigger
                        value="team"
                        className="data-[state=active]:bg-sage-primary/30"
                    >
                        Team
                    </TabsTrigger>
                </TabsList>

                <FeatureTabContent
                    value="bio"
                    lockedTitle="Your Bio"
                    lockedDescription="This feature is always available."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-gray-900">
                                    Your Bio
                                </CardTitle>
                                <Button
                                    onClick={() => setIsEditing(!isEditing)}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {isEditing ? "Cancel" : "Edit"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-start gap-6">
                                <div className="relative">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage
                                            src={userProfile.avatar}
                                            alt={userProfile.name}
                                        />
                                        <AvatarFallback>
                                            {userProfile.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                {isEditing && (
                                    <div className="flex-1">
                                        <ImageUpload
                                            onImageUpload={handleImageUpload}
                                            currentImageUrl={userProfile.avatar}
                                            label="Profile Picture"
                                            description="Upload a new profile picture. Max 5MB. Formats: JPEG, PNG, WebP."
                                            showPreview={false}
                                            className=""
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={userProfile.name}
                                        disabled={!isEditing}
                                        onChange={(e) =>
                                            setUserProfile({
                                                ...userProfile,
                                                name: e.target.value,
                                            })
                                        }
                                        className="focus:ring-2 focus:ring-figma-green-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Account Email</Label>
                                    <Input
                                        id="email"
                                        value={userProfile.email}
                                        disabled
                                        className="bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Linked to your login. Contact support to change.
                                    </p>
                                </div>
                                {/* Repflow email — derived from username, shown for clarity */}
                                <div className="space-y-2">
                                    <Label htmlFor="repflow-email">Repflow Email</Label>
                                    <Input
                                        id="repflow-email"
                                        value={
                                            userProfile.repflow_username
                                                ? `${userProfile.repflow_username}@repflow.me`
                                                : "Not set"
                                        }
                                        disabled
                                        className="bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Brands reach you at this address. Set during signup.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        value={userProfile.location || ""}
                                        disabled={!isEditing}
                                        onChange={(e) =>
                                            setUserProfile({
                                                ...userProfile,
                                                location: e.target.value,
                                            })
                                        }
                                        className="focus:ring-2 focus:ring-figma-green-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        value={userProfile.website || ""}
                                        disabled={!isEditing}
                                        onChange={(e) =>
                                            setUserProfile({
                                                ...userProfile,
                                                website: e.target.value,
                                            })
                                        }
                                        className="focus:ring-2 focus:ring-figma-green-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={userProfile.bio || ""}
                                    disabled={!isEditing}
                                    onChange={(e) =>
                                        setUserProfile({
                                            ...userProfile,
                                            bio: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="focus:ring-2 focus:ring-figma-green-primary"
                                />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="booking">
                                    AI Agent Booking Link
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="booking"
                                        value={userProfile.bookingLink || ""}
                                        disabled={!isEditing}
                                        onChange={(e) =>
                                            setUserProfile({
                                                ...userProfile,
                                                bookingLink: e.target.value.trim() || undefined,
                                            })
                                        }
                                        placeholder="https://calendly.com/your-link"
                                        className="focus:ring-2 focus:ring-figma-green-primary"
                                    />
                                    {userProfile.bookingLink && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const url = userProfile.bookingLink!.startsWith("http")
                                                    ? userProfile.bookingLink
                                                    : `https://${userProfile.bookingLink}`;
                                                window.open(url, "_blank", "noopener,noreferrer");
                                            }}
                                            title="Open booking link"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">
                                    Add a Calendly or other booking link. Our email agent can share it with prospects when they ask to book a call.
                                </p>
                            </div>

                            {isEditing && (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() =>
                                            handleSaveProfile(userProfile)
                                        }
                                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FeatureTabContent>

                <FeatureTabContent
                    value="security"
                    lockedTitle="Security Locked"
                    lockedDescription="This feature is always available."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <CardTitle className="text-xl text-gray-900">
                                Security Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Key className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            Password
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Last updated 3 months ago
                                        </p>
                                    </div>
                                </div>
                                <AlertDialog
                                    open={isPasswordModalOpen}
                                    onOpenChange={setIsPasswordModalOpen}
                                >
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            Change Password
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Change Password
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Enter your current password and
                                                new password to update your
                                                account security.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current-password">
                                                    Current Password
                                                </Label>
                                                <Input
                                                    id="current-password"
                                                    type="password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password">
                                                    New Password
                                                </Label>
                                                <Input
                                                    id="new-password"
                                                    type="password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-password">
                                                    Confirm New Password
                                                </Label>
                                                <Input
                                                    id="confirm-password"
                                                    type="password"
                                                />
                                            </div>
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark">
                                                Update Password
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </FeatureTabContent>

                <FeatureTabContent
                    value="billing"
                    lockedTitle="Billing Locked"
                    lockedDescription="This feature is always available."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <CardTitle className="text-xl text-gray-900">
                                Billing Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-gray-900">
                                        Current Plan
                                    </h3>
                                    <Dialog
                                        open={isUpgradeModalOpen}
                                        onOpenChange={setIsUpgradeModalOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                Change Plan
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Change Your Plan
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Choose a different plan to
                                                    change your subscription.
                                                </DialogDescription>
                                            </DialogHeader>

                                            {upgradeError && (
                                                <Alert className="border-red-200 bg-red-50">
                                                    <AlertDescription className="text-red-800">
                                                        {upgradeError}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="space-y-4">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    Select New Plan
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {getAllAvailableTiers().map(
                                                        (tier) => {
                                                            const tierInfo =
                                                                Object.values(
                                                                    SUBSCRIPTION_TIERS
                                                                ).find(
                                                                    (t) =>
                                                                        t.name ===
                                                                        tier
                                                                );
                                                            const isDisabled =
                                                                tierInfo?.disabled ||
                                                                false;
                                                            const isUpgrade =
                                                                (() => {
                                                                    const tierHierarchy: Record<
                                                                        string,
                                                                        number
                                                                    > = {
                                                                        Starter: 1,
                                                                        Growth: 2,
                                                                        Scale: 3,
                                                                    };
                                                                    const currentTierLevel =
                                                                        tierHierarchy[
                                                                            userProfile
                                                                                ?.subscription
                                                                                ?.tier
                                                                        ] || 0;
                                                                    return (
                                                                        tierHierarchy[
                                                                            tier
                                                                        ] >
                                                                        currentTierLevel
                                                                    );
                                                                })();
                                                            return (
                                                                <div
                                                                    key={tier}
                                                                    className="relative"
                                                                >
                                                                    {isDisabled && (
                                                                        <div className="absolute -top-2 right-3 z-10">
                                                                            <Badge className="bg-gray-500 text-white text-xs shadow-md">
                                                                                Coming
                                                                                Soon
                                                                            </Badge>
                                                                        </div>
                                                                    )}
                                                                    <div
                                                                        className={`p-4 border rounded-lg transition-all ${
                                                                            isDisabled
                                                                                ? "opacity-50 cursor-not-allowed border-gray-200"
                                                                                : "cursor-pointer " +
                                                                                  (selectedUpgradeTier ===
                                                                                  tier.toLowerCase()
                                                                                      ? "border-sage-primary bg-sage-primary/5"
                                                                                      : "border-gray-200 hover:border-sage-primary/50")
                                                                        }`}
                                                                        onClick={() =>
                                                                            !isDisabled &&
                                                                            setSelectedUpgradeTier(
                                                                                tier.toLowerCase()
                                                                            )
                                                                        }
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <h4 className="font-medium text-gray-900">
                                                                                        {
                                                                                            tier
                                                                                        }{" "}
                                                                                        Plan
                                                                                    </h4>
                                                                                    {!isDisabled && (
                                                                                        <>
                                                                                            {isUpgrade && (
                                                                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                                                                    Upgrade
                                                                                                </Badge>
                                                                                            )}
                                                                                            {!isUpgrade && (
                                                                                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                                                                                    Downgrade
                                                                                                </Badge>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm text-gray-600">
                                                                                    {
                                                                                        tierInfo?.description
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-2xl font-bold text-gray-900">
                                                                                    $
                                                                                    {
                                                                                        tierInfo?.price
                                                                                    }
                                                                                </p>
                                                                                <p className="text-sm text-gray-600">
                                                                                    /month
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>

                                            <DialogFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setIsUpgradeModalOpen(
                                                            false
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handlePlanUpgrade}
                                                    disabled={
                                                        !selectedUpgradeTier ||
                                                        upgradeLoading
                                                    }
                                                    className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                                >
                                                    {upgradeLoading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Changing Plan...
                                                        </>
                                                    ) : (
                                                        "Change Plan"
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-figma-green-primary/5 border border-figma-green-primary/20 rounded-lg">
                                    <div className="flex items-center gap-3 ">
                                        {userProfile.subscription.tier ===
                                            "Growth" && (
                                            <Crown className="h-5 w-5" />
                                        )}
                                        <div>
                                            <h3 className="font-medium ">
                                                {userProfile.subscription.tier}{" "}
                                                Plan
                                            </h3>
                                            <p className="text-sm text-figma-green-primary font-medium">
                                                Next billing:{" "}
                                                {formatTimestamp(
                                                    userProfile.subscription
                                                        .currentPeriodEnd
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-figma-green-primary/10 text-figma-green-primary">
                                        Active
                                    </Badge>
                                </div>
                            </div>

                            {billingInfo?.cardLast4 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">
                                        Payment Method
                                    </h3>
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="h-5 w-5 text-gray-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {billingInfo.cardBrand
                                                        ? billingInfo.cardBrand
                                                              .charAt(0)
                                                              .toUpperCase() +
                                                          billingInfo.cardBrand
                                                              .slice(1)
                                                              .toLowerCase()
                                                        : "Card"}{" "}
                                                    ending in{" "}
                                                    {billingInfo.cardLast4}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Expires{" "}
                                                    {
                                                        billingInfo.expirationMonth
                                                    }
                                                    /
                                                    {billingInfo.expirationYear}
                                                </p>
                                            </div>
                                        </div>
                                        <Dialog
                                            open={isPaymentUpdateModalOpen}
                                            onOpenChange={
                                                setIsPaymentUpdateModalOpen
                                            }
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Update
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Update Payment Method
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Update your payment
                                                        method and billing
                                                        information.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {paymentUpdateError && (
                                                    <Alert className="border-red-200 bg-red-50">
                                                        <AlertDescription className="text-red-800">
                                                            {paymentUpdateError}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                <Elements
                                                    stripe={stripePromise}
                                                >
                                                    <PaymentMethodUpdateForm
                                                        onSuccess={
                                                            handlePaymentMethodUpdateSuccess
                                                        }
                                                        onError={
                                                            handlePaymentMethodUpdateError
                                                        }
                                                        isLoading={
                                                            paymentUpdateLoading
                                                        }
                                                        setIsLoading={
                                                            setPaymentUpdateLoading
                                                        }
                                                        userEmail={
                                                            userProfile?.email ||
                                                            ""
                                                        }
                                                    />
                                                </Elements>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </FeatureTabContent>

                <FeatureTabContent
                    value="referrals"
                    requiredTier="Growth"
                    lockedTitle="Referrals Locked"
                    lockedDescription="Upgrade to Growth plan to unlock referrals."
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    {/* Show generate prompt when no referral data exists */}
                    {!referralData?.referralCode ? (
                        <Card className="bg-white border border-figma-green-primary/20">
                            <CardContent className="p-8">
                                <div className="text-center space-y-4">
                                    <Gift className="h-12 w-12 text-figma-green-primary mx-auto" />
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Set Up Your Referral Program
                                    </h3>
                                    <p className="text-gray-600 max-w-md mx-auto">
                                        Generate your unique referral code to share with other creators.
                                        They get 20% off their first subscription, and you earn rewards for every signup.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={handleGenerateReferralCode}
                                        disabled={referralCodeLoading}
                                        className="bg-figma-forest-dark text-white hover:bg-figma-forest-dark/90"
                                    >
                                        {referralCodeLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Gift className="h-4 w-4 mr-2" />
                                                Generate Referral Code
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-white border border-figma-green-primary/20">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <Users className="h-8 w-8 text-figma-green-primary" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {referralData?.totalReferrals ?? 0}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Total Referrals
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-figma-green-primary/20">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-8 w-8 text-green-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            ${referralData?.totalRevenue ?? 0}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Total Revenue
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-figma-green-primary/20">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-8 w-8 text-orange-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            $
                                            {(referralData?.pendingPayouts ?? 0).toFixed(
                                                2
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Pending Payouts
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="text-xl text-gray-900">
                                    Referral Code & Link
                                </CardTitle>
                                <Button
                                    type="button"
                                    onClick={handleGenerateReferralCode}
                                    disabled={referralCodeLoading}
                                    size="sm"
                                    variant={referralData?.referralCode && referralData?.referralLink ? "outline" : "default"}
                                    className={referralData?.referralCode && referralData?.referralLink ? "" : "bg-figma-forest-dark text-white hover:bg-figma-forest-dark/90"}
                                >
                                    {referralCodeLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Gift className="h-4 w-4 mr-2" />
                                    )}
                                    {referralData?.referralCode && referralData?.referralLink ? "Regenerate code" : "Generate referral code"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(!referralData?.referralCode || !referralData?.referralLink) && (
                                <p className="text-sm text-gray-500">
                                    Generate a code to share. Existing accounts may need reactivation via support (e.g. Stripe).
                                </p>
                            )}
                            <div className="space-y-2">
                                <Label>Your Referral Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={referralData?.referralCode || ""}
                                        readOnly
                                        placeholder="No referral code available"
                                        className="font-mono"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleCopyReferralCode}
                                        variant="outline"
                                        size="sm"
                                        disabled={!referralData?.referralCode}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Your Referral Link</Label>
                                <p className="text-xs text-gray-500">Share this link; new signups who use it get your referral code applied.</p>
                                <div className="flex gap-2">
                                    <Input
                                        value={referralData?.referralLink || ""}
                                        readOnly
                                        placeholder="No referral link available"
                                        className="text-sm"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleCopyReferralLink}
                                        variant="outline"
                                        size="sm"
                                        disabled={!referralData?.referralLink}
                                        title="Copy link"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => referralData?.referralLink && window.open(referralData.referralLink, "_blank", "noopener,noreferrer")}
                                        variant="outline"
                                        size="sm"
                                        disabled={!referralData?.referralLink}
                                        title="Open link in new tab"
                                    >
                                        <Share className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <CardTitle className="text-xl text-gray-900">
                                Referral History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {referralData?.referralHistory && referralData.referralHistory.length > 0 ? (
                                    referralData.referralHistory.map(
                                        (referral) => (
                                            <div
                                                key={referral.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>
                                                            {referral.referredUserName
                                                                .split(" ")
                                                                .map((n) => n[0])
                                                                .join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                referral.referredUserName
                                                            }
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {new Date(
                                                                referral.date
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    weekday:
                                                                        "short",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge
                                                        className={
                                                            referral.status ===
                                                            "completed"
                                                                ? "bg-green-100 text-green-700"
                                                                : referral.status ===
                                                                  "pending"
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : "bg-red-100 text-red-700"
                                                        }
                                                    >
                                                        {referral.status}
                                                    </Badge>
                                                    <span className="font-medium text-gray-900">
                                                        ${referral.revenue}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No referral history available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                        </>
                    )}
                </FeatureTabContent>

                <FeatureTabContent
                    value="team"
                    requiredTier="Scale"
                    lockedTitle="Coming soon"
                    lockedDescription="This feature is coming soon to the 'Scale' Plan. Contact support if you would like to request early access: henry@userepflow.com"
                    lockedAction={{ label: "Contact support", href: "mailto:henry@userepflow.com" }}
                    isFeatureLocked={isFeatureLocked}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                >
                    <Card className="bg-white border border-figma-green-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-gray-900">
                                    Team Members
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter email address"
                                        value={newMemberEmail}
                                        onChange={(e) =>
                                            setNewMemberEmail(e.target.value)
                                        }
                                        className="w-64"
                                    />
                                    <Button
                                        onClick={handleAddTeamMember}
                                        className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Invite Member
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {teamMembers && teamMembers.length > 0 ? (
                                    teamMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={member.avatar}
                                                        alt={member.name}
                                                    />
                                                    <AvatarFallback>
                                                        {member.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {member.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {member.email}
                                                    </p>
                                                    {member.lastActive && (
                                                        <p className="text-xs text-gray-500">
                                                            Last active:{" "}
                                                            {member.lastActive}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    className={
                                                        member.status === "active"
                                                            ? "bg-green-100 text-green-700"
                                                            : member.status ===
                                                              "pending"
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-gray-100 text-gray-700"
                                                    }
                                                >
                                                    {member.status}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {member.role}
                                                </Badge>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>
                                                            Change Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            Resend Invite
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">
                                                            Remove Member
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No team members yet. Invite someone to get started!
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </FeatureTabContent>
            </Tabs>
        </div>
    );
}
