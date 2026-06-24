export type DealStatus =
    | "New Offer"
    | "Negotiating"
    | "Contracting"
    | "Drafting"
    | "Live"
    | "Complete"
    | "Archive"
    | "Lost"
    | "Abandoned";

export type DealType =
    | "Flat Rate"
    | "Affiliate"
    | "UGC"
    | "Sponsored Post"
    | "Brand Partnership"
    | "Revenue Share"
    | "Performance / Hybrid";

export type DueDateType = "specific" | "reminder";

/** Backend accepts: 'inbound', 'shared', 'Repflow' */
export type DealSource = "inbound" | "shared" | "Repflow";

export type DeliverableType =
    // YouTube
    | "Preroll"
    | "Midroll"
    | "Postroll"
    | "Dedicated Video"
    | "Semi-Dedicated Video"
    | "Interview"
    | "Segment"
    // Instagram
    | "Feed Post"
    | "Reel"
    | "Story"
    | "Story Set"
    | "Link-in-Bio 7 Days"
    | "Link-in-Bio 30 Days"
    // TikTok
    | "Video"
    | "Product/Logo Placement"
    // Podcast
    | "Podcast Episode"
    // Twitch
    | "1 Hour Stream"
    | "2 Hour Stream"
    | "Gameplay Stream"
    | "Panel"
    | "15 min Chatbot"
    | "Logo Overlay"
    | "30 Day Panel + Chatbot + Overlay"
    // LinkedIn
    | "Text Post"
    | "Text + Image Post"
    | "Text + Video Post"
    // Newsletter
    | "Banner"
    | "Newsletter Segment"
    | "Newsletter Image"
    | "Newsletter Video"
    // Legacy/Other
    | "Blog Post"
    | "Twitter Thread"
    | "Custom";

export type PricingTier = "low_tier" | "premium_tier" | "ultra_premium";

export type RateType = "FLAT" | "CPM" | "CVV";

export type DeliverableContent = {
    account?: string;
    deliverableType: DeliverableType;
};

export type Deliverable = {
    id: number;
    bundle: boolean;
    content: DeliverableContent[];
    account?: string;
    deliverableType: DeliverableType;
    tier?: string;
    rate: number;
    rateType: RateType;
    lockRate: boolean;
    price: number;
    createdAt: string;
    updatedAt: string;
};

export type PartnershipPreferences = {
    flatRate: boolean;
    performanceHybrid: boolean;
    affiliate: boolean;
    gifting: boolean;
    ugc: boolean;
    events: boolean;
};

export type NegotiationPreferences = {
    bundleDeals: boolean;
    crossPostingUpsell: boolean;
    rushProposalFee: boolean;
    minimumDaysWithoutRushFee: number;
};

export type PricingTierConfig = {
    enabled: boolean;
    categories: string[];
};

export type PricingTiers = {
    lowTier: PricingTierConfig;
    premiumTier: PricingTierConfig;
    ultraPremium: PricingTierConfig;
};

export type DealDeliverableContent = {
    contentType: string; // Type of content (youtube, tiktok, video, podcast, instagram, twitter)
    text: string; // Description of the deliverable
};

export type DealDeliverable = {
    contents: DealDeliverableContent[]; // List of deliverable contents
    isBundle: boolean; // Whether the deliverable is a bundle
    draftLink?: string | null; // Link to draft content
    invoiceLink?: string | null; // Link to invoice
    createdAt: string;
    updatedAt: string;
};

export type Communication = {
    sender: string; // Name of the sender
    message: string; // Message content
    timestamp: string;
    avatar?: string; // Avatar URL
    isYou: boolean; // Whether the message is from the current user
    createdAt: string;
};

export type Contact = {
    name: string; // Contact name
    role?: string; // Contact role
    avatar?: string; // Avatar URL
    email?: string; // Contact email
    phone?: string; // Contact phone number
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type StageHistory = {
    stage: DealStatus; // Stage name
    enteredAt: string;
    exitedAt?: string; // When the stage was exited
    daysInStage?: number; // Number of days spent in this stage
    createdAt: string;
};

export type Brief = {
    link: string; // Link to the brief
    promoCode: string; // Promotional code
};

export type Deal = {
    id?: string;
    uuid: string;
    title: string; // Deal title
    status: DealStatus; // Current deal status
    dealType: DealType; // Type of deal
    lastActivity: string;
    value: number; // Deal value in USD
    valueCurrency: string; // Currency of the deal value (default: "USD")
    dueDate?: string; // Due date for the deal
    performanceRate?: string; // Performance rate for affiliate or performance based deals
    dueDateType: DueDateType; // Type of due date (default: "reminder")
    reminderDays?: number; // Days before due date to send reminder (default: 3)
    isPriority: boolean; // Whether this is a priority deal
    isHighValue: boolean; // Whether this is a high-value deal
    isAiPaused: boolean; // Whether AI automation is paused
    dateReceived: string; // Date when the deal was received
    comments?: string; // Additional comments
    brief: Brief; // Brief information
    deliverables: DealDeliverable[]; // List of deliverables
    communicationHistory: Communication[]; // Communication history
    source: DealSource; // Source of the deal (default: "inbound")
    timeInStage?: number; // Days in current stage
    stageHistory: StageHistory[]; // History of stage transitions
    createdAt: string;
    updatedAt: string;
    createdBy?: string; // User ID who created the deal
    updatedBy?: string; // User ID who last updated the deal
    userId?: string; // User ID who created the deal
    brandId?: string; // Linked Brand UUID from CRM
    contactId?: string; // Primary Contact UUID for this deal from CRM
    // Populated when needed (not stored on deal)
    brand?: Brand; // Brand entity (populated on fetch)
    contact?: BrandContact; // Contact entity (populated on fetch)
};

export type CreatorType =
    | "Urban Creator"
    | "Sports Creator"
    | "Lifestyle Creator"
    | "Fashion Creator"
    | "Tech Creator";

export type Creator = {
    id: string;
    name: string;
    avatar: string;
    type: CreatorType;
    followers: number;
    engagement: number;
    dealType: string;
    dealBrand: string;
    dealValue: number;
    agent: {
        name: string;
        avatar: string;
    };
    dueDate: string;
    status: "Active" | "Inactive" | "Pending";
};

export type AgencyUser = {
    id: string;
    name: string;
    avatar: string;
    role: "Talent Manager" | "Account Manager" | "Creative Director" | "Admin";
};

// Campaign types
export type CampaignStatus =
    | "Draft"
    | "Offers Sent"
    | "Live"
    | "Completed"
    | "Archived";

export type Campaign = {
    id: string;
    name: string;
    brand: {
        name: string;
        avatar: string;
        contact: {
            name: string;
            email: string;
        };
    };
    creators: {
        id: string;
        name: string;
        avatar: string;
        status: "Pending" | "Accepted" | "Declined" | "Delivered";
        rate: number;
        deliverables: {
            platform: string;
            type: string;
            count: number;
        }[];
    }[];
    budget: number;
    progress: number; // 0-100
    status: CampaignStatus;
    dueDate: string;
    createdAt: string;
    notes?: string;
    timeline: {
        start: string;
        end: string;
    };
    category: string;
    activityLog: {
        id: string;
        type:
            | "creator_action"
            | "agent_comment"
            | "auto_reminder"
            | "status_change";
        message: string;
        timestamp: string;
        user?: {
            name: string;
            avatar: string;
        };
    }[];
};

export type CampaignFilter = "Draft" | "Active" | "Completed" | "Archived";

export type BulkAction = "bulk_offer" | "bulk_reminder" | "export_csv";

export type NewCampaignStep = "brand" | "creators" | "deliverables" | "review";

export type CampaignInsights = {
    totalActiveCampaigns: number;
    totalBudget: number;
    avgAcceptanceRate: number;
};

// Profile and account types
export type TeamMember = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    status: "active" | "pending" | "inactive";
    invitedAt: string;
    lastActive?: string;
};

// New types based on Pydantic models
export type PartnershipType =
    | "flat_rate"
    | "performance_hybrid"
    | "affiliate"
    | "custom";

export type SocialLinks = {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
};

export type Subscription = {
    tier: string;
    status: string;
    currentPeriodEnd: string;
};

export type BillingAddress = {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
};

export type BillingInfo = {
    cardLast4: string;
    cardBrand?: string;
    nextBillingDate: string;
    expirationMonth: number;
    paymentMethodId?: string;
    expirationYear: number;
    billingEmail: string;
    billingAddress?: BillingAddress;
};

export type ReferralHistory = {
    id: string;
    referredUserName: string;
    status: string;
    revenue: number;
    date: string;
};

export type ReferralData = {
    referralCode: string;
    referralLink: string;
    totalReferrals: number;
    totalRevenue: number;
    pendingPayouts: number;
    referralHistory: ReferralHistory[];
};

export type UserPreferences = {
    partnershipTypes: PartnershipPreferences;
    absoluteMinimumRate: number;
    deliverables: Deliverable[];
    pricingTiers: PricingTiers;
    autoRejectCategories: string[];
    preferredContactMethod: string;
    responseTimeHours: number;
    timezone: string;
    language: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    dealAlerts: boolean;
    weeklyReports: boolean;
};

export type YouTubeAnalytics = {
    subscriberCount?: number;
    videoCount?: number;
    viewCount?: number;
    recentViews?: number;
    recentWatchTimeMinutes?: number;
    recentSubscribersGained?: number;
    recentSubscribersLost?: number;
    averageViewDuration?: number;
    estimatedRevenue?: number;
    topVideoTitle?: string;
    topVideoViews?: number;
    lastUpdated: string;
    channelId?: string;

    // Demographics data
    demographicsByAge?: Record<string, number>;
    demographicsByGender?: Record<string, number>;
    demographicsByCountry?: Record<string, number>;
};

export type InstagramAnalytics = {
    // Core metrics
    followers?: number;
    totalReach?: number;
    shortViews?: number;
    totalEngagedUsers?: number;

    // Engagement metrics
    engagementRate?: number;
    averageLikes?: number;
    averageComments?: number;
    averageShares?: number;

    // Content metrics
    totalPosts?: number;
    totalStories?: number;
    totalReels?: number;

    // Recent performance (last 28 days)
    recentFollowersGained?: number;
    recentReach?: number;
    recentEngagement?: number;
    recentReelsViews?: number;

    // Demographics data
    demographicsByAge?: Record<string, number>;
    demographicsByGender?: Record<string, number>;
    demographicsByCountry?: Record<string, number>;
    demographicsByCity?: Record<string, number>;

    // Top performing content
    topPostLikes?: number;
    topPostComments?: number;
    topReelViews?: number;

    // Analytics metadata
    lastUpdated: string;
    accountId?: string;
};

export type PlatformMetrics = {
    subscribers?: string;
    avgVideoViews?: string;
    avgShortViews?: string;
    engagementRate?: string;
    totalViews?: string;
    avgLikes?: string;
    avgComments?: string;
    avgShares?: string;
    monthlyReach?: string;
    demographics?: Record<string, any>;
};

export enum PlatformType {
    YOUTUBE = "youtube",
    INSTAGRAM = "instagram",
    TIKTOK = "tiktok",
    TWITTER = "twitter",
    LINKEDIN = "linkedin",
    FACEBOOK = "facebook",
    TWITCH = "twitch",
    PODCAST = "podcast",
    BLOG = "blog",
    WEBSITE = "website",
    OTHER = "other",
}

export type Platform = {
    name: string;
    handle: string;
    platformType: PlatformType;
    icon?: string;
    verified: boolean;
    color?: string;
    metrics: PlatformMetrics;
    youtubeAnalytics?: YouTubeAnalytics;
    instagramAnalytics?: InstagramAnalytics;
    isActive: boolean;
    connectedAt: string;
    lastUpdated: string;
    customFields: Record<string, any>;
};

export type UserProfile = {
    id: string;
    name: string;
    email: string;
    repflow_username: string;
    avatar?: string;
    bio?: string;
    tags?: string[];
    location?: string;
    website?: string;
    socialLinks: SocialLinks;
    bookingLink?: string;
    subscription: Subscription;
    /** When true, user sees "Founding Creator" / First 100 badge. Set via Admin Panel. */
    foundingCreator?: boolean;
    createdAt: string;
    updatedAt: string;
};

export type User = {
    id?: string;
    uuid: string;
    profile: UserProfile;
    platforms: Platform[];
    preferences: UserPreferences;
    billingInfo?: BillingInfo;
    referralData?: ReferralData;
    teamMembers: TeamMember[];
    isActive: boolean;
    isVerified: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
};

// Updated messaging models to match backend
export enum MessageType {
    EMAIL = "email",
    AI_ASSISTANT = "ai_assistant",
}

export enum ConversationType {
    EMAIL = "email",
    AI_CHAT = "ai_chat",
}

export enum ConversationStatus {
    ACTIVE = "active",
    DRAFT = "draft",
    ARCHIVED = "archived",
    COMPLETED = "completed",
}

export enum MessageStatus {
    SENT = "sent",
    RECEIVED = "received",
    DRAFT = "draft",
    FAILED = "failed",
    PENDING = "pending",
}

export type EmailMessage = {
    subject?: string;
    toEmails: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    replyTo?: string;
    emailId?: string;
    attachments?: any[];
    headers?: Record<string, string>;
    isImportant?: boolean;
};

export type AIAssistantMessage = {
    assistantId: string;
    assistantName: string;
    modelUsed?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    temperature?: number;
    maxTokens?: number;
    contextData?: Record<string, any>;
    confidenceScore?: number;
    suggestions?: string[];
    actionTaken?: string;
};

export type Conversation = {
    id?: string;
    _id?: string;
    name: string;
    status: ConversationStatus;
    dealId: string;
    userId: string;
    contactName: string;
    contactEmail?: string;
    avatar?: string;
    subject?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    messageCount: number;
    participants: string[];
    threadId?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
};

export type Message = {
    id?: string;
    _id?: string;
    messageType: MessageType;
    content: string;
    status: MessageStatus;
    conversationId: string;
    dealId: string;
    userId: string;
    senderName: string;
    senderEmail?: string;
    senderId?: string;
    senderAvatar?: string;
    inReplyTo?: string;
    threadPosition: number;
    isInternal: boolean;
    isAutomated: boolean;
    priority: number;
    tags: string[];
    emailData?: EmailMessage;
    aiData?: AIAssistantMessage;
    sentAt: string;
    receivedAt?: string;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
    externalId?: string;
};

export type MessageThread = {
    threadId: string;
    dealId: string;
    userId: string;
    subject?: string;
    participants: string[];
    messageCount: number;
    lastMessageAt?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type ConversationSummary = {
    _id: string;
    uuid: string;
    name: string;
    status: ConversationStatus;
    dealId: string;
    userId: string;
    contactName: string;
    contactEmail?: string;
    avatar?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    metadata?: {
        processingState?: string;
        [key: string]: any;
    };
};

export type MessageSummary = {
    dealId: string;
    totalConversations: number;
    totalMessages: number;
    emailMessages: number;
    aiMessages: number;
    unreadCount: number;
    lastMessageAt?: string;
    lastMessageType?: MessageType;
    lastMessagePreview?: string;
};

// CRM Types for Brands and Contacts
export type Brand = {
    uuid: string;
    name: string;
    website?: string;
    category?: string;
    logoUrl?: string;
    isAgency: boolean;
    agencyName?: string;
    emailDomain?: string;
    totalRevenue: number;
    dealCount: number;
    lastTouchpoint?: string;
    currentStatus?: string;
    notes?: string;
    contactsCount: number;
    contacts?: BrandContact[];
    createdAt: string;
    updatedAt: string;
};

export type BrandContact = {
    uuid: string;
    name: string;
    email: string;
    title?: string;
    phone?: string;
    isAgencyContact: boolean;
    isPrimary: boolean;
    notes?: string;
    role?: string;
};

export type CRMContact = {
    uuid: string;
    name: string;
    email: string;
    title?: string;
    phone?: string;
    isAgencyContact: boolean;
    notes?: string;
    brandsCount: number;
    brands?: BrandForContact[];
    createdAt: string;
    updatedAt: string;
};

export type BrandForContact = {
    uuid: string;
    name: string;
    website?: string;
    category?: string;
    logoUrl?: string;
    isAgency: boolean;
    role?: string;
    isPrimary: boolean;
};

// Legacy types for backward compatibility
export type ConversationMessage = Message;
export type ChatMessage = Message;
