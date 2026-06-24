"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, Zap, Star } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@/app/constants/constants";

interface SubscriptionTierSelectorProps {
    selectedTier: string;
    onTierSelect: (tierId: string) => void;
    onContinue: () => void;
    isLoading?: boolean;
    isYearly: boolean;
    onToggleYearly: (isYearly: boolean) => void;
}

export function SubscriptionTierSelector({
    selectedTier,
    onTierSelect,
    onContinue,
    isLoading = false,
    isYearly,
    onToggleYearly,
}: SubscriptionTierSelectorProps) {
    const tiers = Object.values(SUBSCRIPTION_TIERS);

    const getTierIcon = (tierId: string) => {
        switch (tierId) {
            case "starter":
                return <Star className="w-6 h-6" />;
            case "growth":
                return <Zap className="w-6 h-6" />;
            case "scale":
                return <Crown className="w-6 h-6" />;
            default:
                return <Star className="w-6 h-6" />;
        }
    };

    const getTierBadge = (tierId: string) => {
        switch (tierId) {
            case "starter":
                return <Badge variant="secondary">Starter</Badge>;
            case "growth":
                return (
                    <Badge variant="default" className="bg-blue-500">
                        Most Popular
                    </Badge>
                );
            case "scale":
                return (
                    <Badge variant="default" className="bg-purple-500">
                        Enterprise
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-figma-forest-dark mb-2">
                    Choose Your Plan
                </h2>
                <p className="text-gray-600 text-lg">
                    Select the plan that best fits your creator journey
                </p>
            </div>

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
                <span className={`text-lg font-medium ${!isYearly ? 'text-figma-forest-dark' : 'text-gray-500'}`}>
                    Monthly
                </span>
                <Switch
                    checked={isYearly}
                    onCheckedChange={onToggleYearly}
                    className="data-[state=checked]:bg-sage-primary"
                />
                <span className={`text-lg font-medium ${isYearly ? 'text-figma-forest-dark' : 'text-gray-500'}`}>
                    Yearly
                </span>
                {isYearly && (
                    <Badge variant="default" className="bg-green-500 text-white ml-2">
                        Save 2 months
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:auto-rows-fr">
                {tiers.map((tier) => (
                    <div key={tier.id} className="relative flex">
                        {tier.disabled && (
                            <div className="absolute -top-3 right-3 z-10">
                                <Badge className="bg-gray-500 text-white shadow-md">
                                    Coming Soon
                                </Badge>
                            </div>
                        )}
                        <Card
                            className={`relative transition-all duration-200 flex flex-col w-full h-full ${
                                tier.disabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer " +
                                      (selectedTier === tier.id
                                          ? "ring-2 ring-sage-primary shadow-lg scale-105"
                                          : "hover:shadow-md hover:scale-102")
                            }`}
                            onClick={() =>
                                !tier.disabled && onTierSelect(tier.id)
                            }
                        >
                            {selectedTier === tier.id && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <div className="bg-sage-primary text-figma-forest-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                        <Check className="w-4 h-4" />
                                        Selected
                                    </div>
                                </div>
                            )}

                            <CardHeader className="text-center pb-4">
                                <div className="flex justify-center items-center gap-2 mb-2">
                                    {getTierIcon(tier.id)}
                                    {getTierBadge(tier.id)}
                                </div>
                                <CardTitle className="text-xl">
                                    {tier.name}
                                </CardTitle>
                                <CardDescription>
                                    {tier.description}
                                </CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold text-figma-forest-dark">
                                        ${isYearly ? tier.yearlyPrice : tier.price}
                                    </span>
                                    {tier.price > 0 && (
                                        <span className="text-gray-500">
                                            {isYearly ? '/year' : '/month'}
                                        </span>
                                    )}
                                    {isYearly && tier.price > 0 && (
                                        <div className="text-sm text-gray-500 mt-1">
                                            ${tier.price}/month, billed annually
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0 flex-grow flex flex-col">
                                <ul className="space-y-3 flex-grow">
                                    {tier.features.map((feature, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2"
                                        >
                                            <Check className="w-5 h-5 text-sage-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            <div className="text-center">
                <Button
                    onClick={onContinue}
                    disabled={!selectedTier || isLoading}
                    className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark px-8 py-3 text-lg"
                >
                    {isLoading ? "Processing..." : "Continue to Payment"}
                </Button>

                <p className="text-sm text-gray-500 mt-4">
                    You can cancel or change your plan anytime from your account
                    settings
                </p>
            </div>
        </div>
    );
}
