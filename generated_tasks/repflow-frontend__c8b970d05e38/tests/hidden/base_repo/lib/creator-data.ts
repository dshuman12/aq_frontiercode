import { Youtube, Instagram } from "lucide-react";
import placeholderUser from "@/public/placeholder-user.png";
import TikTokIcon from "@/components/tiktok-icon";

// Mock platform type for demo data (not used for actual user data)
export type MockPlatform = {
    name: string;
    handle: string;
    platformType?: string;
    icon: React.ComponentType<{ className?: string }>;
    verified: boolean;
    color?: string;
    metrics?: {
        subscribers: string;
        avgVideoViews: string;
        avgShortViews: string;
        engagementRate: string;
    };
    youtubeAnalytics?: any;
    instagramAnalytics?: any;
    customFields?: Record<string, any>;
};

// Mock user type for demo data (not used for actual user data)
export type MockUser = {
    name: string;
    avatar: { src: string } | string;
    location: string;
    bio: string;
    tags: string[];
    platforms?: MockPlatform[];
};

export type DemographicData = {
    label: string;
    percentage: number;
};

export type CountryData = {
    country: string;
    percentage: number;
};

// Common demographic data
export const demographics: DemographicData[] = [
    { label: "18-24", percentage: 35 },
    { label: "25-34", percentage: 45 },
    { label: "35-44", percentage: 20 },
];

export const genderDemographics: DemographicData[] = [
    { label: "Male", percentage: 65 },
    { label: "Female", percentage: 35 },
];

export const topCountries: CountryData[] = [
    { country: "United States", percentage: 45 },
    { country: "United Kingdom", percentage: 15 },
    { country: "Canada", percentage: 12 },
    { country: "Australia", percentage: 8 },
    { country: "Germany", percentage: 5 },
];

// Default user for portfolio page (demo data)
export const portfolioUser: MockUser = {
    name: "Sarah Johnson",
    avatar: placeholderUser,
    location: "Los Angeles, United States",
    bio: "Tech and lifestyle content creator passionate about sharing the latest gadget reviews and digital lifestyle tips.",
    tags: ["Technology", "Lifestyle"],
};

// Default platforms for portfolio page (demo data)
export const portfolioPlatforms: MockPlatform[] = [
    {
        name: "Sarah Tech Reviews",
        handle: "youtube.com/sarahtechreviews",
        icon: Youtube,
        verified: true,
        metrics: {
            subscribers: "458K",
            avgVideoViews: "75K",
            avgShortViews: "125K",
            engagementRate: "8.2%",
        },
    },
    {
        name: "@sarahtech",
        handle: "instagram.com/sarahtech",
        icon: Instagram,
        verified: false,
    },
    {
        name: "@sarahtechlife",
        handle: "tiktok.com/@sarahtechlife",
        icon: TikTokIcon,
        verified: false,
    },
];

// Creator data for public profile page (demo data)
export const getCreatorData = (creatorId: string): MockUser => {
    const creators = {
        "1": {
            name: "Fredric Potter",
            avatar: placeholderUser,
            location: "New York, United States",
            bio: "Tech enthusiast and gadget reviewer with over 5 years of experience creating engaging content about the latest technology trends.",
            tags: ["Technology", "Gaming", "Reviews"],
        },
        "2": {
            name: "Tim Scott",
            avatar: placeholderUser,
            location: "San Francisco, United States",
            bio: "Content creator focused on tech reviews, unboxings, and digital lifestyle content. Passionate about making technology accessible to everyone.",
            tags: ["Technology", "Lifestyle", "Unboxing"],
        },
        "3": {
            name: "Jessica Fang",
            avatar: placeholderUser,
            location: "Los Angeles, United States",
            bio: "Creative content maker specializing in tech reviews and lifestyle vlogs. Building a community around technology and innovation.",
            tags: ["Technology", "Creative", "Innovation"],
        },
        "4": {
            name: "Adam Brown",
            avatar: placeholderUser,
            location: "Austin, United States",
            bio: "Tech content creator and reviewer helping people make informed decisions about their next gadget purchase.",
            tags: ["Technology", "Reviews", "Consumer Tech"],
        },
    };

    return creators[creatorId as keyof typeof creators] || creators["1"];
};

// Platforms for public profile page (demo data)
export const publicProfilePlatforms: MockPlatform[] = [
    {
        name: "Tech Reviews Channel",
        handle: "youtube.com/techreviews",
        icon: Youtube,
        verified: true,
        metrics: {
            subscribers: "458K",
            avgVideoViews: "75K",
            avgShortViews: "125K",
            engagementRate: "8.2%",
        },
    },
    {
        name: "@techcreator",
        handle: "instagram.com/techcreator",
        icon: Instagram,
        verified: false,
    },
    {
        name: "@techlife",
        handle: "tiktok.com/@techlife",
        icon: TikTokIcon,
        verified: false,
    },
];
