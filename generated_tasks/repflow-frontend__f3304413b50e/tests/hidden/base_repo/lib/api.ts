import { API_BASE_URL } from "@/app/constants/constants";
import { getAuthHeaders, getUserId } from "./auth-utils";
import { Conversation, ConversationStatus, ConversationSummary, Deal, Deliverable, Message, MessageType, User } from "./models";


console.log("API_BASE_URL", API_BASE_URL);

export const addDeal = async (newDeal: Omit<Deal, "id">) => {
    try {
        const authHeaders = await getAuthHeaders();
        const userId = await getUserId();
        if (userId) {
            newDeal.userId = userId;
        }
        console.log("newDeal", newDeal);
        const response = await fetch(`${API_BASE_URL}/deals/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(newDeal),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`addDeal failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to create deal (${response.status}): ${errorBody}`);
        }

        const createdDeal = await response.json();
        return createdDeal;
    } catch (error) {
        console.error("Error creating deal:", error);
        throw error;
    }
};

export const updateDeal = async (dealId: string, updates: Partial<Deal>) => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/deals/${dealId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) {
            // Log the actual backend error for easier debugging
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`updateDeal failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to update deal (${response.status})`);
        }

        const updatedDeal = await response.json();
        return updatedDeal;
    } catch (error) {
        console.error("Error updating deal:", error);
        throw error;
    }
};

/** Archive a deal by setting its status to "Archive".
 *  Sends the full deal object to satisfy the backend's PUT contract. */
export const archiveDeal = async (deal: Deal) => {
    return updateDeal(deal.uuid, {
        ...deal,
        status: "Archive" as Deal["status"],
        updatedAt: new Date().toISOString(),
    });
};

/** Permanently delete a deal */
export const deleteDeal = async (dealId: string) => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
            method: "DELETE",
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to delete deal");
        }

        return true;
    } catch (error) {
        console.error("Error deleting deal:", error);
        throw error;
    }
};

export const getDealsGroupedByStatus = async (): Promise<{
    [key: string]: { title: string; deals: Deal[] };
}> => {
    try {
        console.log("fetching deals");
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/deals/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            console.log(response);
            throw new Error("Failed to fetch deals");
        }
        const data = await response.json();
        const statusKeys = [
            "new-offer",
            "negotiating",
            "contracting",
            "drafting",
            "live",
            "complete",
            "archive",
            "lost",
            "abandoned",
        ];
        const statusTitles = [
            "New Offer",
            "Negotiating",
            "Contracting",
            "Drafting",
            "Live",
            "Complete",
            "Archive",
            "Lost",
            "Abandoned",
        ];

        const groupedDeals: {
            [key: string]: { title: string; deals: Deal[] };
        } = {};

        statusKeys.forEach((key, index) => {
            groupedDeals[key] = {
                title: statusTitles[index],
                deals: data.filter(
                    (deal: Deal) => deal.status === statusTitles[index]
                ),
            };
        });
        return groupedDeals;
    } catch (error) {
        console.error("Error fetching deals:", error);
        throw error;
    }
};

// Profile API functions
import {
    BillingInfo,
    ReferralData,
    TeamMember,
    UserPreferences,
    UserProfile,
} from "./models";


export const getUserPreferences = async (): Promise<UserPreferences> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch user preferences");
        }
        const userData = await response.json();
        return userData.preferences;
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        throw error;
    }
};


export const getUser = async (): Promise<User | null> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch user");
        }
        const userData = await response.json();
        console.log("user", userData);
        return userData;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

// Consolidated function to fetch all user profile data in a single API call
export const getCompleteUserProfileData = async (): Promise<{
    profile: UserProfile | null;
    billingInfo: BillingInfo | null;
    referralData: ReferralData | null;
    teamMembers: TeamMember[] | null;
}> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch user profile data");
        }
        const userData = await response.json();
        console.log("Complete user data fetched:", userData);
        
        // Extract and return all necessary data from the single API response
        const profileWithTeam = userData.profile ? {
            ...userData.profile,
            teamMembers: userData.teamMembers || [],
        } : null;
        
        return {
            profile: profileWithTeam,
            billingInfo: userData.billingInfo || null,
            referralData: userData.referralData || null,
            teamMembers: userData.teamMembers || null,
        };
    } catch (error) {
        console.error("Error fetching complete user profile data:", error);
        throw error;
    }
};

export const getUserProfile = async (): Promise<UserProfile> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch user profile");
        }
        const userData = await response.json();
        console.log("userData", userData);
        // Add teamMembers to the profile object
        const profileWithTeam = {
            ...userData.profile,
            teamMembers: userData.teamMembers || [],
        };
        console.log("profileWithTeam", profileWithTeam);
        return profileWithTeam;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

export const getBillingInfo = async (): Promise<BillingInfo> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch billing info");
        }
        const userData = await response.json();
        if (!userData.billingInfo) throw new Error("Billing info not found");
        return userData.billingInfo;
    } catch (error) {
        console.error("Error fetching billing info:", error);
        throw error;
    }
};

export const getReferralData = async (): Promise<ReferralData | null> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch referral data");
        }
        const userData = await response.json();
        // Return null if referral data doesn't exist yet (e.g., for new users)
        return userData.referralData || null;
    } catch (error) {
        console.error("Error fetching referral data:", error);
        throw error;
    }
};

/**
 * Ask the backend to generate a referral code for the current user.
 * Returns null if the endpoint is not available (404/501) or request fails.
 */
export const generateReferralCode = async (): Promise<ReferralData | null> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/referrals/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
        });

        if (response.status === 404 || response.status === 501) {
            console.warn("Referral generate endpoint not available:", response.status);
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`generateReferralCode failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to generate referral code (${response.status}): ${errorBody}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error generating referral code:", error);
        throw error;
    }
};

export const getTeamMembers = async (): Promise<TeamMember[]> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch team members");
        }
        const userData = await response.json();
        if (!userData.teamMembers) throw new Error("Team members not found");
        return userData.teamMembers;
    } catch (error) {
        console.error("Error fetching team members:", error);
        throw error;
    }
};

export const updateUserProfile = async (
    updates: Partial<any>
): Promise<any> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(updates),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message =
                (data?.message as string) ||
                (data?.error as string) ||
                (typeof data === "string" ? data : null) ||
                `Failed to update user profile (${response.status})`;
            throw new Error(message);
        }

        return data;
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};

export const updateBillingInfo = (updates: Partial<BillingInfo>) => {
    throw new Error("Billing info updates not supported yet");
};

export const addTeamMember = (member: Omit<TeamMember, "id">) => {
    throw new Error("Adding team members not supported yet");
};

export const mockUserPreferences: UserPreferences = {
    partnershipTypes: {
        flatRate: true,
        performanceHybrid: false,
        affiliate: true,
        ugc: false,
        gifting: false,
        events: false,
    },
    absoluteMinimumRate: 1000,
    deliverables: [
        {
            id: 1,
            bundle: false,
            content: [{ account: "@sarahjohnson", deliverableType: "Preroll" }],
            account: "@sarahjohnson",
            deliverableType: "Preroll",
            rate: 25,
            rateType: "CPM",
            lockRate: false,
            price: 1500,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
        },
        {
            id: 2,
            bundle: false,
            content: [{ account: "@sarahjgaming", deliverableType: "1 Hour Stream" }],
            account: "@sarahjgaming",
            deliverableType: "1 Hour Stream",
            rate: 30,
            rateType: "CVV",
            lockRate: true,
            price: 2000,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
        },
    ],
    pricingTiers: {
        lowTier: { enabled: true, categories: ["Local Businesses"] },
        premiumTier: { enabled: true, categories: ["Tech Companies"] },
        ultraPremium: { enabled: false, categories: [] },
    },
    autoRejectCategories: [
        "Nutritional Supplements",
        "Crypto/Blockchain/NFTs",
        "Video Games",
    ],
    preferredContactMethod: "email",
    responseTimeHours: 24,
    timezone: "America/New_York",
    language: "en",
    emailNotifications: true,
    pushNotifications: true,
    dealAlerts: true,
    weeklyReports: true,
};

export const updateUserPreferences = async (
    updates: Partial<UserPreferences>
): Promise<UserPreferences> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/users/preferences`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`updateUserPreferences failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to update preferences (${response.status}): ${errorBody}`);
        }

        const updatedPreferences = await response.json();
        return updatedPreferences;
    } catch (error) {
        console.error("Error updating user preferences:", error);
        throw error;
    }
};

export const updateUserDeliverables = async (
    deliverables: Deliverable[]
): Promise<User> => {
    try {
        const authHeaders = await getAuthHeaders();
        
        // Log the request payload for debugging
        console.log("Updating deliverables:", {
            count: deliverables.length,
            deliverables: deliverables.map(d => ({
                id: d.id,
                bundle: d.bundle,
                account: d.account,
                deliverableType: d.deliverableType,
                contentLength: d.content?.length || 0,
                rate: d.rate,
                rateType: d.rateType,
                price: d.price,
                tier: d.tier,
            })),
        });
        
        const response = await fetch(
            `${API_BASE_URL}/users/preferences/deliverables`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify(deliverables),
            }
        );

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`updateUserDeliverables failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to update deliverables (${response.status}): ${errorBody}`);
        }

        const updatedUser = await response.json();
        return updatedUser;
    } catch (error) {
        console.error("Error updating deliverables:", error);
        throw error;
    }
};

// Helper functions for deliverable management
export const addDeliverable = async (newDeliverable: Omit<Deliverable, "id">): Promise<User> => {
    console.log("addDeliverable called with:", newDeliverable);
    const user = await getUser();
    console.log("Current user:", user);
    if (!user) throw new Error("User not found");
    
    const currentDeliverables = user.preferences.deliverables || [];
    console.log("Current deliverables:", currentDeliverables);
    
    const deliverableWithId: Deliverable = {
        ...newDeliverable,
        id: Math.max(...currentDeliverables.map(d => d.id), 0) + 1,
    };
    console.log("New deliverable with ID:", deliverableWithId);
    
    const updatedDeliverables = [...currentDeliverables, deliverableWithId];
    console.log("Updated deliverables array:", updatedDeliverables);
    return updateUserDeliverables(updatedDeliverables);
};

export const deleteDeliverable = async (deliverableId: number): Promise<User> => {
    const user = await getUser();
    if (!user) throw new Error("User not found");
    
    const currentDeliverables = user.preferences.deliverables || [];
    const updatedDeliverables = currentDeliverables.filter(
        d => d.id !== deliverableId
    );
    
    return updateUserDeliverables(updatedDeliverables);
};

export const updateDeliverable = async (
    deliverableId: number, 
    updates: Partial<Deliverable>
): Promise<User> => {
    const user = await getUser();
    if (!user) throw new Error("User not found");
    
    const currentDeliverables = user.preferences.deliverables || [];
    const updatedDeliverables = currentDeliverables.map(d => 
        d.id === deliverableId 
            ? { ...d, ...updates, updatedAt: new Date().toISOString() }
            : d
    );
    
    return updateUserDeliverables(updatedDeliverables);
};

export const getConversations = async (params?: {
    limit?: number;
    skip?: number;
    archived?: boolean;
    processing_states?: string;
    search?: string;
}): Promise<ConversationSummary[]> => {
    try {
        const authHeaders = await getAuthHeaders();
        const userId = await getUserId();
        const url = new URL(`${API_BASE_URL}/conversations/all`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(url.toString(), {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        console.log("FETCHED_CONVERSATIONS", data);
        return data;
    } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }
};

export const getUnreadCountsByState = async (): Promise<Record<string, number>> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/conversations/unread-counts`, {
            headers: authHeaders,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch unread counts");
        }
        const data = await response.json();
        console.log("UNREAD_COUNTS", data);
        return data;
    } catch (error) {
        console.error("Error fetching unread counts:", error);
        throw error;
    }
};

export const getMessagesByConversationId = async (conversationId: string): Promise<{
    aiMessages: Message[];
    emailMessages: Message[];
} | null> => {
    try {
        const authHeaders = await getAuthHeaders();
        const currentUserId = await getUserId();
        
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
            headers: authHeaders
        });
        if (!response.ok) {
            throw new Error('Failed to fetch conversation');
        }

        const messages: Message[] = await response.json();
        
        // Filter messages by type
        const aiMessages = messages.filter((message: Message) => message.messageType === MessageType.AI_ASSISTANT);
        const emailMessages = messages.filter((message: Message) => message.messageType === MessageType.EMAIL);
        
        console.log("AI assistant messages:", aiMessages);
        console.log("Email messages:", emailMessages);
        
        return {
            aiMessages,
            emailMessages
        };
    } catch (error) {
        console.error('Error fetching conversation:', error);
        throw error;
    }
};

export const getConversationMessages = async (conversationId: string, params?: {
    limit?: number;
    skip?: number;
}): Promise<Message[]> => {
    try {
        const url = new URL(`${API_BASE_URL}/conversations/${conversationId}/messages`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error('Failed to fetch conversation messages');
        }

        const messages = await response.json();
        return messages;
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        throw error;
    }
};

export const sendMessage = async (
    conversationId: string,
    message: Omit<Message, 'id' | '_id' | 'createdAt' | 'updatedAt'>
): Promise<Message> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/messages/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to send message';
            
            // Provide more specific error messages based on status code
            switch (response.status) {
                case 401:
                    errorMessage = 'Unauthorized - please refresh the page and try again';
                    break;
                case 403:
                    errorMessage = 'Forbidden - you do not have permission to send this message';
                    break;
                case 404:
                    errorMessage = 'Conversation not found';
                    break;
                case 422:
                    errorMessage = 'Invalid message data - please check your input';
                    break;
                case 500:
                    errorMessage = 'Server error - please try again later';
                    break;
                case 503:
                    errorMessage = 'Service unavailable - please try again later';
                    break;
                default:
                    errorMessage = `Failed to send message (${response.status})`;
            }
            
            throw new Error(errorMessage);
        }

        const sentMessage: Message = await response.json();
        return sentMessage;
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Re-throw the error so the calling function can handle it
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred while sending the message');
        }
    }
};

export const sendEmail = async (emailRequest: any): Promise<any> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify({ emailRequest }),
        });
        console.log("EMAIL_RESPONSE", response);

        if (!response.ok) {
            const errorText = await response.text();
            console.log("EMAIL_ERROR", errorText);
            let errorMessage = 'Failed to send email';
            
            // Provide more specific error messages based on status code
            switch (response.status) {
                case 400:
                    errorMessage = 'Invalid email data - please check your input';
                    break;
                case 401:
                    errorMessage = 'Unauthorized - please refresh the page and try again';
                    break;
                case 403:
                    errorMessage = 'Forbidden - you do not have permission to send emails';
                    break;
                case 429:
                    errorMessage = 'Email rate limit exceeded - please try again later';
                    break;
                case 500:
                    errorMessage = 'Server error - please try again later';
                    break;
                case 503:
                    errorMessage = 'Email service unavailable - please try again later';
                    break;
                default:
                    errorMessage = `Failed to send email (${response.status})`;
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log("EMAIL_RESULT", result);
        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        
        // Re-throw the error so the calling function can handle it
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred while sending the email');
        }
    }
};

export const markConversationAsRead = async (conversationId: string): Promise<boolean> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/read`, {
            method: 'POST',
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error('Failed to mark conversation as read');
        }

        return true;
    } catch (error) {
        console.error('Error marking conversation as read:', error);
        throw error;
    }
};

export const updateConversationStatus = async (
    conversationId: string,
    status: ConversationStatus
): Promise<Conversation | null> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw new Error('Failed to update conversation status');
        }

        const updatedConversation = await response.json();
        return updatedConversation;
    } catch (error) {
        console.error('Error updating conversation status:', error);
        throw error;
    }
};

// Mock data for fallback when API is not available
export const mockConversations: ConversationSummary[] = [
    {
        _id: "1",
        uuid: "conv-1",
        name: "Adobe Creative",
        status: ConversationStatus.DRAFT,
        dealId: "deal-1",
        userId: "user-1",
        contactName: "Michael Anderson",
        contactEmail: "m.anderson@adobe.com",
        avatar: "/adobe-user.png",
        lastMessage: "Excited to get this started! Would you be available for a call this week?",
        lastMessageAt: "2025-01-15T09:15:00Z",
        unreadCount: 0,
        messageCount: 3,
        createdAt: "2025-01-13T08:00:00Z",
        updatedAt: "2025-01-15T09:15:00Z"
    },
    {
        _id: "2",
        uuid: "conv-2",
        name: "Microsoft Azure",
        status: ConversationStatus.ACTIVE,
        dealId: "deal-2",
        userId: "user-1",
        contactName: "Sarah Chen",
        contactEmail: "s.chen@microsoft.com",
        avatar: "/azure-user.png",
        lastMessage: "Your draft for the technical workshop has been reviewed...",
        lastMessageAt: "2025-01-15T08:00:00Z",
        unreadCount: 0,
        messageCount: 5,
        createdAt: "2025-01-12T10:00:00Z",
        updatedAt: "2025-01-15T08:00:00Z"
    },
    {
        _id: "3",
        uuid: "conv-3",
        name: "Shopify",
        status: ConversationStatus.COMPLETED,
        dealId: "deal-3",
        userId: "user-1",
        contactName: "David Thompson",
        contactEmail: "d.thompson@shopify.com",
        avatar: "/shopify-user.png",
        lastMessage: "Your payment for the Reels campaign has been processed...",
        lastMessageAt: "2025-01-15T06:00:00Z",
        unreadCount: 0,
        messageCount: 8,
        createdAt: "2025-01-10T14:00:00Z",
        updatedAt: "2025-01-15T06:00:00Z"
    }
];

/**
 * Add a new platform to the user's account
 */
export const addPlatform = async (platform: any): Promise<any> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/platforms`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(platform),
        });

        if (!response.ok) {
            throw new Error("Failed to add platform");
        }

        const newPlatform = await response.json();
        return newPlatform;
    } catch (error) {
        console.error("Error adding platform:", error);
        throw error;
    }
};

/**
 * Delete a platform from the user's account
 */
export const deletePlatform = async (platformName: string): Promise<void> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/platforms/${encodeURIComponent(platformName)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to delete platform");
        }
    } catch (error) {
        console.error("Error deleting platform:", error);
        throw error;
    }
};

/**
 * Update a platform in the user's account
 */
export const updatePlatform = async (platformName: string, updates: Partial<any>): Promise<any> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/platforms/${encodeURIComponent(platformName)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error("Failed to update platform");
        }

        const updatedPlatform = await response.json();
        return updatedPlatform;
    } catch (error) {
        console.error("Error updating platform:", error);
        throw error;
    }
};

/**
 * Get all users from the backend (no authentication required)
 */
export const getAllUsers = async (): Promise<User[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/all`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch all users");
        }

        const users = await response.json();
        console.log("Fetched users:", users);
        return users;
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};

/**
 * Get public user portfolio data by userId (no authentication required).
 * Returns null on failure to allow graceful error handling in the UI.
 */
export const getPublicUserPortfolio = async (userId: string): Promise<User | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/public`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return null;
        }

        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error("Error fetching public user portfolio:", error);
        return null;
    }
};

// ============================================
// BRANDS & CONTACTS CRM API
// ============================================

import { Brand, BrandContact, CRMContact } from "./models";

export type BrandsListResponse = {
    brands: Brand[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
};

export type ContactsListResponse = {
    contacts: CRMContact[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
};

export type BrandQueryParams = {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    is_agency?: boolean;
    sort_by?: string;
    sort_order?: "asc" | "desc";
};

export type ContactQueryParams = {
    page?: number;
    limit?: number;
    search?: string;
    is_agency_contact?: boolean;
    brand_id?: string;
};

export type BrandCreateData = {
    name: string;
    website?: string;
    category?: string;
    logo_url?: string;
    is_agency?: boolean;
    agency_name?: string;
    email_domain?: string;
    notes?: string;
};

export type ContactCreateData = {
    name: string;
    email: string;
    title?: string;
    phone?: string;
    is_agency_contact?: boolean;
    brand_id?: string;
    role?: string;
    is_primary?: boolean;
    notes?: string;
};

// Brand API Functions

export const getBrands = async (params?: BrandQueryParams): Promise<BrandsListResponse> => {
    try {
        const authHeaders = await getAuthHeaders();
        const url = new URL(`${API_BASE_URL}/brands/`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(url.toString(), {
            headers: authHeaders,
        });

        if (!response.ok) {
            // Try to get error details from response
            let errorMessage = `Failed to fetch brands (${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.error || errorMessage;
            } catch {
                // Ignore JSON parse errors
            }
            console.error("Brands API error:", response.status, errorMessage);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching brands:", error);
        throw error;
    }
};

export const getBrand = async (brandId: string): Promise<Brand> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch brand");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching brand:", error);
        throw error;
    }
};

export const createBrand = async (brandData: BrandCreateData): Promise<Brand> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(brandData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to create brand");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error creating brand:", error);
        throw error;
    }
};

export type BrandFindOrCreateData = {
    name: string;
    website?: string;
    category?: string;
};

export const findOrCreateBrand = async (brandData: BrandFindOrCreateData): Promise<Brand> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/find-or-create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(brandData),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`findOrCreateBrand failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to find or create brand (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error finding or creating brand:", error);
        throw error;
    }
};

export const updateBrand = async (brandId: string, updates: Partial<BrandCreateData>): Promise<Brand> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to update brand");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error updating brand:", error);
        throw error;
    }
};

export const deleteBrand = async (brandId: string): Promise<void> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
            method: "DELETE",
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to delete brand");
        }
    } catch (error) {
        console.error("Error deleting brand:", error);
        throw error;
    }
};

export const getBrandContacts = async (brandId: string): Promise<BrandContact[]> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}/contacts`, {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch brand contacts");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching brand contacts:", error);
        throw error;
    }
};

// Types for brand deals and conversations
export type BrandDeal = {
    uuid: string;
    title: string;
    company: string;
    status: string;
    value: number;
    valueCurrency: string;
    dealType: string;
    dateReceived?: string;
    dueDate?: string;
    lastActivity?: string;
    createdAt?: string;
};

export const getBrandDeals = async (brandId: string): Promise<BrandDeal[]> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}/deals`, {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch brand deals");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching brand deals:", error);
        throw error;
    }
};

export const getBrandConversations = async (brandId: string): Promise<ConversationSummary[]> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/conversations/brand/${brandId}`, {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch brand conversations");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching brand conversations:", error);
        throw error;
    }
};

export const linkContactToBrand = async (
    brandId: string, 
    contactId: string, 
    role?: string, 
    isPrimary?: boolean
): Promise<void> => {
    try {
        const authHeaders = await getAuthHeaders();
        const url = new URL(`${API_BASE_URL}/brands/${brandId}/contacts/${contactId}`);
        if (role) url.searchParams.append("role", role);
        if (isPrimary !== undefined) url.searchParams.append("is_primary", isPrimary.toString());

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to link contact to brand");
        }
    } catch (error) {
        console.error("Error linking contact to brand:", error);
        throw error;
    }
};

export const unlinkContactFromBrand = async (brandId: string, contactId: string): Promise<void> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/brands/${brandId}/contacts/${contactId}`, {
            method: "DELETE",
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to unlink contact from brand");
        }
    } catch (error) {
        console.error("Error unlinking contact from brand:", error);
        throw error;
    }
};

// Contact API Functions

export const getContacts = async (params?: ContactQueryParams): Promise<ContactsListResponse> => {
    try {
        const authHeaders = await getAuthHeaders();
        const url = new URL(`${API_BASE_URL}/contacts/`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(url.toString(), {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch contacts");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching contacts:", error);
        throw error;
    }
};

export const getContact = async (contactId: string): Promise<CRMContact> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch contact");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching contact:", error);
        throw error;
    }
};

export const createContact = async (contactData: ContactCreateData): Promise<CRMContact> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contacts/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(contactData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to create contact");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error creating contact:", error);
        throw error;
    }
};

export type ContactFindOrCreateData = {
    name: string;
    email: string;
    title?: string;
    brand_id?: string;
};

export const findOrCreateContact = async (contactData: ContactFindOrCreateData): Promise<CRMContact> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contacts/find-or-create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(contactData),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "No response body");
            console.error(`findOrCreateContact failed [${response.status}]:`, errorBody);
            throw new Error(`Failed to find or create contact (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error finding or creating contact:", error);
        throw error;
    }
};

export const updateContact = async (contactId: string, updates: Partial<ContactCreateData>): Promise<CRMContact> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to update contact");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error updating contact:", error);
        throw error;
    }
};

export const deleteContact = async (contactId: string): Promise<void> => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
            method: "DELETE",
            headers: authHeaders,
        });

        if (!response.ok) {
            throw new Error("Failed to delete contact");
        }
    } catch (error) {
        console.error("Error deleting contact:", error);
        throw error;
    }
};
