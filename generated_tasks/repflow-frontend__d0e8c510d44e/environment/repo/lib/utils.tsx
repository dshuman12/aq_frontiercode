import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    Youtube,
    Video,
    Instagram,
    Mic,
    MessageSquare,
    FileText,
} from "lucide-react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const getContentIcon = (type: string) => {
    let lowerCasedType = type.toLowerCase();

    switch (lowerCasedType) {
        case "youtube":
            return <Youtube className="w-4 h-4" />;
        case "tiktok":
            return <MessageSquare className="w-4 h-4" />;
        case "instagram":
            return <Instagram className="w-4 h-4" />;
        case "podcast":
            return <Mic className="w-4 h-4" />;
        case "twitter":
            return <MessageSquare className="w-4 h-4" />;
        case "video":
            return <Video className="w-4 h-4" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
};

export function numberWithCommas(x: number | string) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const formatTimestamp = (timestamp: string | Date) => {
    const date =
        typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    });
};

export const formatRelativeTime = (timestamp: string | Date) => {
    const date =
        typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "Just now";
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
    } else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
};

/**
 * Returns urgency for deal due-date highlighting. Uses date-only comparison in the
 * user's local timezone so server/client timezone differences don't affect the result.
 * Parses YYYY-MM-DD as local date to avoid UTC-midnight shifting the day.
 * @returns "overdue" if due date is in the past, "soon" if today or tomorrow, null otherwise
 */
export function getDueDateUrgency(
    dueDate: string | undefined
): "overdue" | "soon" | null {
    if (!dueDate || typeof dueDate !== "string" || !dueDate.trim())
        return null;
    const raw = dueDate.trim();
    // Parse YYYY-MM-DD as local date to avoid timezone shift (ISO string is UTC midnight)
    const localMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    const dueOnly = localMatch
        ? new Date(
              parseInt(localMatch[1], 10),
              parseInt(localMatch[2], 10) - 1,
              parseInt(localMatch[3], 10)
          )
        : new Date(raw);
    if (isNaN(dueOnly.getTime())) return null;
    const today = new Date();
    const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    const tomorrowOnly = new Date(todayOnly);
    tomorrowOnly.setDate(tomorrowOnly.getDate() + 1);
    if (dueOnly.getTime() < todayOnly.getTime()) return "overdue";
    if (
        dueOnly.getTime() === todayOnly.getTime() ||
        dueOnly.getTime() === tomorrowOnly.getTime()
    )
        return "soon";
    return null;
}
