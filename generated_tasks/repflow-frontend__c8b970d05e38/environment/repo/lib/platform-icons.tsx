import React from "react";
import {
    Youtube,
    Instagram,
    MessageSquare,
    Twitch,
    Mic,
    FileText,
    Video,
    Linkedin,
    Facebook,
} from "lucide-react";
import { PlatformType } from "./models";

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => {
    return (
        <svg
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="100%"
            height="100%"
            className={className}
        >
            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
    );
};

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1200"
            height="1227"
            viewBox="0 0 1200 1227"
            fill="none"
            className={className}
        >
            <path
                d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                fill="currentColor"
            />
        </svg>
    );
};

// Platform icon mapping based on PlatformType enum
export const platformIcons: Record<
    PlatformType,
    React.ComponentType<{ className?: string }>
> = {
    [PlatformType.YOUTUBE]: Youtube,
    [PlatformType.INSTAGRAM]: Instagram,
    [PlatformType.TIKTOK]: TikTokIcon,
    [PlatformType.TWITTER]: XIcon,
    [PlatformType.LINKEDIN]: Linkedin,
    [PlatformType.FACEBOOK]: Facebook,
    [PlatformType.TWITCH]: Twitch,
    [PlatformType.PODCAST]: Mic,
    [PlatformType.BLOG]: FileText,
    [PlatformType.WEBSITE]: FileText,
    [PlatformType.OTHER]: FileText,
};

// Legacy content type icons for backward compatibility (used in new-deal-modal)
export const contentTypeIcons: { [key: string]: React.ReactNode } = {
    youTube: <Youtube className="w-4 h-4" />,
    instagram: <Instagram className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    podcast: <Mic className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
    tiktok: <MessageSquare className="w-4 h-4" />,
    twitter: <MessageSquare className="w-4 h-4" />,
    twitch: <Twitch className="w-4 h-4" />,
    linkedin: <Linkedin className="w-4 h-4" />,
    facebook: <Facebook className="w-4 h-4" />,
    x: <MessageSquare className="w-4 h-4" />,
};

/**
 * Get platform icon component based on PlatformType enum
 * @param platformType - The platform type from PlatformType enum
 * @param className - Optional CSS classes to apply to the icon
 * @returns React component for the platform icon
 */
export function getPlatformIconComponent(
    platformType: PlatformType,
    className: string = "w-4 h-4"
): React.ReactElement {
    const IconComponent =
        platformIcons[platformType] || platformIcons[PlatformType.OTHER];

    return <IconComponent className={className} />;
}

/**
 * Get platform icon component based on platform name (legacy support)
 * This function provides backward compatibility for string-based platform names
 * @param platformName - Platform name as string
 * @param className - Optional CSS classes to apply to the icon
 * @returns React component for the platform icon
 */
export function getPlatformIconByName(
    platformName: string,
    className: string = "w-4 h-4"
): React.ReactElement {
    const name = platformName?.toLowerCase() || "";

    // Map common string variations to PlatformType enum values
    if (name.includes("youtube") || name.includes("yt")) {
        return getPlatformIconComponent(PlatformType.YOUTUBE, className);
    } else if (name.includes("instagram") || name.includes("ig")) {
        return getPlatformIconComponent(PlatformType.INSTAGRAM, className);
    } else if (name.includes("tiktok") || name.includes("tt")) {
        return getPlatformIconComponent(PlatformType.TIKTOK, className);
    } else if (
        name.includes("twitter") ||
        name.includes("x.com") ||
        name.includes("x")
    ) {
        return getPlatformIconComponent(PlatformType.TWITTER, className);
    } else if (name.includes("twitch")) {
        return getPlatformIconComponent(PlatformType.TWITCH, className);
    } else if (name.includes("podcast")) {
        return getPlatformIconComponent(PlatformType.PODCAST, className);
    } else if (name.includes("linkedin")) {
        return getPlatformIconComponent(PlatformType.LINKEDIN, className);
    } else if (name.includes("facebook") || name.includes("fb")) {
        return getPlatformIconComponent(PlatformType.FACEBOOK, className);
    } else if (name.includes("blog")) {
        return getPlatformIconComponent(PlatformType.BLOG, className);
    } else if (name.includes("website") || name.includes("web")) {
        return getPlatformIconComponent(PlatformType.WEBSITE, className);
    } else {
        return getPlatformIconComponent(PlatformType.OTHER, className);
    }
}

/**
 * Get platform icon component for legacy content types (used in new-deal-modal)
 * @param contentType - Content type string
 * @param className - Optional CSS classes to apply to the icon
 * @returns React component for the content type icon
 */
export function getContentTypeIcon(
    contentType: string,
    className: string = "w-4 h-4"
): React.ReactElement {
    const icon = contentTypeIcons[contentType];
    if (icon) {
        return React.cloneElement(icon as React.ReactElement, { className });
    }
    return <FileText className={className} />;
}
