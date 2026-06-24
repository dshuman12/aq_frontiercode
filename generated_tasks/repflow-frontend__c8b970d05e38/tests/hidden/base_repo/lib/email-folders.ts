"use client";

/**
 * Email folder configuration for FSM state-based filtering.
 * Maps folders to their associated processing states.
 */

export enum EmailFolder {
    ALL_MAIL = "all_mail",
    SPONSORSHIP = "sponsorship",
    NON_SPONSORSHIP = "non_sponsorship",
    REJECTED = "rejected",
    ARCHIVE = "archive",
}

export type FolderConfig = {
    id: EmailFolder;
    label: string;
    states: string[];
    icon: string;
    color: string;
    badgeColor?: string; // For archive folder status badges
};

export const FOLDER_CONFIGS: Record<EmailFolder, FolderConfig> = {
    [EmailFolder.ALL_MAIL]: {
        id: EmailFolder.ALL_MAIL,
        label: "All Mail",
        states: [], // Empty = all states
        icon: "Mail",
        color: "text-gray-600",
    },
    [EmailFolder.SPONSORSHIP]: {
        id: EmailFolder.SPONSORSHIP,
        label: "Sponsorship",
        states: [
            "NEEDS_CLASSIFICATION",
            "NEEDS_INFO",
            "NEEDS_EVALUATION",
            "NEEDS_NEGOTIATION",
            "READY_FOR_DEAL",
            "DEAL_CREATED",
            "NEEDS_RETRY",
        ],
        icon: "Briefcase",
        color: "text-blue-600",
    },
    [EmailFolder.NON_SPONSORSHIP]: {
        id: EmailFolder.NON_SPONSORSHIP,
        label: "Other Conversations",
        states: ["REJECTED_NON_SPONSORSHIP"],
        icon: "Mail",
        color: "text-gray-500",
    },
    [EmailFolder.REJECTED]: {
        id: EmailFolder.REJECTED,
        label: "Rejected",
        states: [
            "REJECTED",
            "ERROR_CLASSIFICATION_FAILED",
            "ERROR_DEAL_CREATION_FAILED",
        ],
        icon: "Ban",
        color: "text-red-600",
    },
    [EmailFolder.ARCHIVE]: {
        id: EmailFolder.ARCHIVE,
        label: "Archive",
        states: [
            "COMPLETE",
            "GHOSTED",
            "ABANDONED",
            "LOST",
        ],
        icon: "Archive",
        color: "text-purple-600",
    },
};

/**
 * Get the folder for a given processing state
 */
export const getFolderForState = (state: string): EmailFolder => {
    const upperState = state.toUpperCase();
    for (const [folder, config] of Object.entries(FOLDER_CONFIGS)) {
        if (config.states.includes(upperState)) {
            return folder as EmailFolder;
        }
    }
    return EmailFolder.ALL_MAIL; // Default fallback
};

/**
 * Get processing states string for API filtering
 */
export const getStatesForFolder = (folder: EmailFolder): string | undefined => {
    if (folder === EmailFolder.ALL_MAIL) {
        return undefined; // No filter for All Mail
    }
    return FOLDER_CONFIGS[folder].states.join(",");
};

/**
 * Get status badge config for archive folder items
 */
export const getArchiveStatusBadge = (state: string): { label: string; className: string } | null => {
    const upperState = state.toUpperCase();
    const badges: Record<string, { label: string; className: string }> = {
        COMPLETE: {
            label: "Complete",
            className: "bg-green-100 text-green-700 border-green-300",
        },
        GHOSTED: {
            label: "Ghosted",
            className: "bg-orange-100 text-orange-700 border-orange-300",
        },
        ABANDONED: {
            label: "Abandoned",
            className: "bg-gray-100 text-gray-700 border-gray-300",
        },
        LOST: {
            label: "Lost",
            className: "bg-red-100 text-red-700 border-red-300",
        },
    };
    return badges[upperState] || null;
};

/**
 * Ordered list of folders for display
 */
export const FOLDER_ORDER: EmailFolder[] = [
    EmailFolder.ALL_MAIL,
    EmailFolder.SPONSORSHIP,
    EmailFolder.NON_SPONSORSHIP,
    EmailFolder.REJECTED,
    EmailFolder.ARCHIVE,
];

/**
 * Rows of folders for display organization
 */
export const FOLDER_ROWS: EmailFolder[][] = [
    [EmailFolder.SPONSORSHIP, EmailFolder.NON_SPONSORSHIP],
    [EmailFolder.REJECTED, EmailFolder.ARCHIVE, EmailFolder.ALL_MAIL],
];

/**
 * Get unread count for a folder based on unread counts map
 */
export const getUnreadCountForFolder = (folder: EmailFolder, counts: Record<string, number>): number => {
    if (!counts || Object.keys(counts).length === 0) return 0;

    const config = FOLDER_CONFIGS[folder];
    
    if (folder === EmailFolder.ALL_MAIL) {
         return Object.values(counts).reduce((sum, count) => sum + count, 0);
    }
    
    let total = 0;
    for (const state of config.states) {
        if (counts[state]) {
            total += counts[state];
        }
    }
    return total;
};
