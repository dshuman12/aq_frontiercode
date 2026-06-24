"use client";
/**
 * Messages Page - Inbox for managing creator communications
 *
 * Categorization Logic (aligned with email agent classification):
 * - Sponsorship Conversations: Active sponsorship deals
 *   States: NEEDS_CLASSIFICATION, NEEDS_INFO, NEEDS_EVALUATION, NEEDS_NEGOTIATION,
 *           READY_FOR_DEAL, DEAL_CREATED, NEEDS_RETRY
 * - Other Conversations: Non-sponsorship communications
 *   States: REJECTED_NON_SPONSORSHIP
 * - Rejected: Rejected messages or errors
 *   States: REJECTED, ERROR_CLASSIFICATION_FAILED, ERROR_DEAL_CREATION_FAILED
 * - Archive: Completed or closed deals
 *   States: COMPLETE, GHOSTED, ABANDONED, LOST
 *
 * Features:
 * - Automatic read status tracking: Conversations marked as read immediately when opened
 * - Real-time unread count updates: Polling every 30s for folder badges and counts
 * - Live new email notifications: Toast (and optional browser notification) when new messages arrive
 * - Duplicate conversation consolidation: Single thread per unique email contact
 * - Message history preservation: All messages from duplicate threads preserved in consolidated conversation
 * - Proper categorization: Conversations filtered by metadata.processingState matching folder states
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    getConversations,
    getMessagesByConversationId,
    getUnreadCountsByState,
    getUserProfile,
    markConversationAsRead,
    sendEmail
} from "@/lib/api";
import { getRepflowUsername, getUserName } from "@/lib/auth-utils";
import { createDealForSubject } from "@/lib/deal-utils";
import {
    EmailFolder,
    FOLDER_CONFIGS,
    FOLDER_ROWS,
    getArchiveStatusBadge,
    getStatesForFolder,
    getUnreadCountForFolder
} from "@/lib/email-folders";
import { emailSubjectManager } from "@/lib/email-subject-manager";
import {
    ConversationSummary,
    Deal,
    Message,
    MessageStatus,
    MessageType
} from "@/lib/models";
import {
    Archive,
    Ban,
    Briefcase,
    Check,
    Edit3,
    FileText,
    Loader2,
    Mail,
    Search,
    Send,
    XCircle
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Helper function to format timestamp
const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, { 
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Determines if a message was sent by the creator (current user).
 * Received messages (brand, external) show on the left; sent (creator + AI/manual) on the right.
 */
const isMessageFromCreator = (message: Message): boolean => {
    // Normalize status (backend may send "Sent"/"Received" or omit it)
    const statusStr = message.status != null ? String(message.status).toLowerCase() : "";

    if (statusStr === MessageStatus.SENT) return true;
    if (statusStr === MessageStatus.RECEIVED) return false;

    // If sender is from an external domain (e.g. creatorconsult.com), treat as received (left)
    if (message.senderEmail) {
        const email = message.senderEmail.trim().toLowerCase();
        if (email.endsWith("@repflow.me")) return true;
        return false; // Any other domain = received
    }

    // Fallback for messages without senderEmail (e.g. optimistic): senderId === userId
    if (message.senderId && message.userId) {
        return message.senderId === message.userId;
    }

    return false;
};

/** Merge email and AI messages into one thread sorted by sentAt */
function mergeMessageThread(emailMessages: Message[], aiMessages: Message[]): Message[] {
    const combined = [...(emailMessages || []), ...(aiMessages || [])];
    combined.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    return combined;
}

/** Normalize message from API (backend may send snake_case) */
function getMessageField<T>(message: Message & Record<string, unknown>, camel: keyof Message, snake: string): T | undefined {
    const v = message[camel];
    if (v !== undefined && v !== null) return v as T;
    const s = (message as Record<string, unknown>)[snake];
    return s as T | undefined;
}

/** True when message is from the AI email agent (show on right in grey, labeled "Repflow Agent") */
function isFromAIAgent(message: Message & Record<string, unknown>): boolean {
    const msgType = getMessageField<string>(message, "messageType", "message_type");
    const automated = getMessageField<boolean>(message, "isAutomated", "is_automated");
    if (msgType === MessageType.AI_ASSISTANT || automated === true) return true;

    const senderEmail = (getMessageField<string>(message, "senderEmail", "sender_email") ?? "").toLowerCase();
    const statusStr = message.status != null ? String(message.status).toLowerCase() : "";
    const isRightSide = statusStr === MessageStatus.SENT
        || senderEmail.endsWith("@repflow.me")
        || (message.senderId && message.userId && message.senderId === message.userId);

    if (!isRightSide) return false;

    const senderName = String(getMessageField(message, "senderName", "sender_name") ?? "");
    if (/Repflow\s+Agent|'s\s+Agent/i.test(senderName)) return true;

    const content = String(getMessageField(message, "content", "content") ?? "").trim();
    if (!content) return false;

    // Agent signatures in body: "Repflow Agent", "...'s Agent", or line ending with "Agent"
    if (/\bRepflow\s+Agent\b/i.test(content)) return true;
    if (/'s\s+Agent\b/i.test(content)) return true;
    if (/\bAgent\s*$/im.test(content)) return true;
    return false;
}

export default function MessagesPage() {
    const { toast } = useToast();
    
    // State for conversations and loading
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingFolderConversations, setLoadingFolderConversations] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    
    // State for folder selection
    const [selectedFolder, setSelectedFolder] = useState<EmailFolder>(EmailFolder.SPONSORSHIP);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    // State for search
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    
    // State for email history
    const [emailChatHistory, setEmailChatHistory] = useState<Message[]>([]);
    
    // State for drafts
    const [currentDraft, setCurrentDraft] = useState<Message | null>(null);
    const [isEditingDraft, setIsEditingDraft] = useState(false);
    
    // State for email compose
    const [emailSubject, setEmailSubject] = useState("");
    const [emailContent, setEmailContent] = useState("");
    const [isSubjectLocked, setIsSubjectLocked] = useState(false);
    const emailTextareaRef = useRef<HTMLTextAreaElement>(null);
    const draftTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    // State for user info (avatar used for "You" sent messages)
    const [userName, setUserName] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [userAvatar, setUserAvatar] = useState<string>("");

    // State for marking read status
    const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
    
    // Refs for auto-scrolling and for breaking effect dependency loops
    const emailChatRef = useRef<HTMLDivElement>(null);
    /** Ref for current selection so effects can read it without re-running when selection changes */
    const selectedConversationRef = useRef<ConversationSummary | null>(null);
    /** Ref for current conversations list used by polling to avoid deps that change every refresh */
    const conversationsRef = useRef<ConversationSummary[]>([]);
    /** Previous unread count per conversation uuid; used to detect new messages and show live notifications */
    const previousUnreadRef = useRef<Map<string, number>>(new Map());

    // Keep refs in sync with state (avoids selectedConversation/conversations in effect deps)
    selectedConversationRef.current = selectedConversation;
    conversationsRef.current = conversations;
    // Function to scroll to bottom of chat
    const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    };

    const resetTextareaHeight = () => {
        if (emailTextareaRef.current) {
            emailTextareaRef.current.style.height = 'auto';
            emailTextareaRef.current.style.height = '96px'; // Reset to min-h-24
        }
    };

    const resetDraftTextareaHeight = () => {
        if (draftTextareaRef.current) {
            draftTextareaRef.current.style.height = 'auto';
            draftTextareaRef.current.style.height = '256px'; // Reset to min-h-64
        }
    };

    // Load user info and profile (for avatar on sent messages)
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const [name, repflowUsername, profile] = await Promise.all([
                    getUserName(),
                    getRepflowUsername(),
                    getUserProfile().catch(() => null)
                ]);
                setUserName(name || "");
                setUserEmail(repflowUsername + "@repflow.me" || "");
                setUserAvatar(profile?.avatar || "");
            } catch (error) {
                console.error('Failed to load user info:', error);
            }
        };

        loadUserInfo();
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /**
     * Mark conversation as read when opened
     * Called immediately when user clicks on a conversation
     */
    const handleMarkAsRead = useCallback(async (conversation: ConversationSummary) => {
        // Skip if already marking as read or no unread messages
        if (markingAsRead.has(conversation.uuid) || conversation.unreadCount === 0) {
            return;
        }

        // Add to marking set to prevent duplicate calls
        setMarkingAsRead(prev => new Set(prev).add(conversation.uuid));

        // Optimistically update UI immediately for better UX
        setConversations(prev => prev.map(c =>
            c.uuid === conversation.uuid
                ? { ...c, unreadCount: 0 }
                : c
        ));

        if (selectedConversationRef.current?.uuid === conversation.uuid) {
            setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
        }

        try {
            // Make API call to persist the read status
            await markConversationAsRead(conversation.uuid);

            // Refresh unread counts for folders immediately
            await fetchUnreadCounts();
        } catch (error) {
            console.error("Failed to mark conversation as read:", error);
            // Revert optimistic update on error
            setConversations(prev => prev.map(c =>
                c.uuid === conversation.uuid
                    ? { ...c, unreadCount: conversation.unreadCount }
                    : c
            ));

            if (selectedConversationRef.current?.uuid === conversation.uuid) {
                setSelectedConversation(prev => prev ? { ...prev, unreadCount: conversation.unreadCount } : null);
            }

            toast({
                title: "Failed to mark as read",
                description: "Could not update message status. Please try again.",
                variant: "destructive",
            });
        } finally {
            // Remove from marking set
            setMarkingAsRead(prev => {
                const next = new Set(prev);
                next.delete(conversation.uuid);
                return next;
            });
        }
    }, [markingAsRead, toast]);

    /**
     * Deduplicate conversations by email address
     * Ensures single thread per unique email contact with all message history preserved
     */
    const deduplicateConversations = useCallback((conversations: ConversationSummary[]): ConversationSummary[] => {
        const emailMap = new Map<string, ConversationSummary[]>();

        // Group conversations by email address (case-insensitive)
        conversations.forEach(convo => {
            if (convo.contactEmail) {
                const email = convo.contactEmail.toLowerCase().trim();
                if (!emailMap.has(email)) {
                    emailMap.set(email, []);
                }
                emailMap.get(email)!.push(convo);
            }
        });

        // Consolidate duplicates: keep the most recent conversation, merge metadata
        const consolidated: ConversationSummary[] = [];
        const processedEmails = new Set<string>();

        conversations.forEach(convo => {
            if (!convo.contactEmail) {
                // Keep conversations without email addresses as-is
                consolidated.push(convo);
                return;
            }

            const email = convo.contactEmail.toLowerCase().trim();
            if (processedEmails.has(email)) {
                return; // Already processed this email
            }

            const duplicates = emailMap.get(email);
            if (!duplicates || duplicates.length === 1) {
                // No duplicates, keep as-is
                consolidated.push(convo);
                processedEmails.add(email);
                return;
            }

            // Multiple conversations with same email - consolidate
            // Sort by lastMessageAt (most recent first)
            duplicates.sort((a, b) => {
                const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return timeB - timeA;
            });

            // Use the most recent conversation as the base
            const primary = duplicates[0];
            
            // Merge unread counts and message counts from all duplicates
            const totalUnread = duplicates.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            const totalMessages = duplicates.reduce((sum, c) => sum + (c.messageCount || 0), 0);

            // Merge metadata (preserve all tags, processing states, etc.)
            const mergedMetadata = {
                ...primary.metadata,
                tags: Array.from(new Set(
                    duplicates.flatMap(c => c.metadata?.tags || [])
                )),
                // Keep the most recent processing state
                processingState: primary.metadata?.processingState || duplicates.find(c => c.metadata?.processingState)?.metadata?.processingState,
                // Preserve all conversation UUIDs for reference
                mergedConversationIds: duplicates.map(c => c.uuid),
            };

            const consolidatedConvo: ConversationSummary = {
                ...primary,
                unreadCount: totalUnread,
                messageCount: totalMessages,
                metadata: mergedMetadata,
            };

            consolidated.push(consolidatedConvo);
            processedEmails.add(email);

            // Log consolidation for debugging
            if (duplicates.length > 1) {
                console.log(`Consolidated ${duplicates.length} conversations for ${email}:`, {
                    primary: primary.uuid,
                    merged: duplicates.map(c => c.uuid),
                    totalUnread,
                    totalMessages,
                });
            }
        });

        return consolidated;
    }, []);

    /**
     * Load conversations when folder or search changes
     * Filters by processing state and deduplicates by email address
     */
    useEffect(() => {
        const loadConversations = async () => {
            // Use different loading states for initial load vs folder switching
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setLoadingFolderConversations(true);
            }
            
            try {
                // Get processing states for the selected folder
                // If searching, we don't send processing_states (backend ignores it anyway, but cleaner this way)
                const processing_states = debouncedSearchQuery ? undefined : getStatesForFolder(selectedFolder);
                
                const data = await getConversations({ 
                    processing_states,
                    search: debouncedSearchQuery || undefined
                });
                
                // Deduplicate conversations by email address
                const deduplicated = deduplicateConversations(data);
                
                console.log("Loaded conversations:", {
                    raw: data.length,
                    deduplicated: deduplicated.length,
                    folder: selectedFolder,
                });
                
                setConversations(deduplicated);
                
                // Only auto-select first conversation on initial load or when search results change
                // When switching folders, keep the current email thread open if it still exists
                if (isInitialLoad || debouncedSearchQuery) {
                    if (deduplicated.length > 0) {
                        setSelectedConversation(deduplicated[0]);
                        // Mark first conversation as read if it has unread messages
                        if (deduplicated[0].unreadCount > 0) {
                            handleMarkAsRead(deduplicated[0]);
                        }
                    } else {
                        setSelectedConversation(null);
                    }
                    setIsInitialLoad(false);
                } else {
                    // When switching folders, try to keep the selected conversation if it still exists (use ref to avoid effect re-running when selection changes)
                    const currentSelected = selectedConversationRef.current;
                    if (currentSelected) {
                        const stillExists = deduplicated.find(c => c.uuid === currentSelected.uuid);
                        if (stillExists) {
                            setSelectedConversation(stillExists);
                        } else {
                            const merged = deduplicated.find(c => 
                                c.metadata?.mergedConversationIds?.includes(currentSelected.uuid)
                            );
                            if (merged) {
                                setSelectedConversation(merged);
                            } else if (deduplicated.length > 0) {
                                setSelectedConversation(deduplicated[0]);
                            } else {
                                setSelectedConversation(null);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load conversations:', error);
                toast({
                    title: "Failed to load conversations",
                    description: "Could not load your messages. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
                setLoadingFolderConversations(false);
            }
        };

        loadConversations();
    }, [selectedFolder, isInitialLoad, debouncedSearchQuery, handleMarkAsRead, deduplicateConversations, toast]);

    // Unread counts state
    const [folderUnreadCounts, setFolderUnreadCounts] = useState<Record<string, number>>({});

    /**
     * Fetch unread counts by processing state
     * Used for real-time badge updates across folder tabs
     */
    const fetchUnreadCounts = useCallback(async () => {
        try {
            const counts = await getUnreadCountsByState();
            setFolderUnreadCounts(counts);
        } catch (error) {
            console.error('Failed to load unread counts:', error);
        }
    }, []);

    /**
     * Initial load and poll for unread counts
     * Updates folder badges in real-time (every 30 seconds)
     */
    useEffect(() => {
        fetchUnreadCounts();

        // Poll every 30 seconds for better real-time feel
        const interval = setInterval(fetchUnreadCounts, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCounts]);

    // Track the UUID of the currently loaded conversation to prevent unnecessary reloads
    const loadedConversationUuidRef = useRef<string | null>(null);

    // Function to manually refresh messages for the current conversation
    const refreshCurrentMessages = useCallback(async () => {
        if (!selectedConversationRef.current) return;

        try {
            const messages = await getMessagesByConversationId(selectedConversationRef.current.uuid);
            if (messages) {
                setEmailChatHistory(mergeMessageThread(messages.emailMessages || [], messages.aiMessages || []));
                // Scroll to bottom when new messages arrive
                setTimeout(() => {
                    scrollToBottom(emailChatRef);
                }, 100);
            }
        } catch (error) {
            console.error('Failed to refresh messages:', error);
        }
    }, []);

    /**
     * Poll for conversation updates (new messages, status changes).
     * Uses refs for current conversations/selection so this effect does not re-run when they change (avoids loop).
     * Shows live notification (toast + optional browser notification) when new messages are detected.
     */
    useEffect(() => {
        if (isInitialLoad) return;

        const refreshConversations = async () => {
            try {
                const processing_states = debouncedSearchQuery ? undefined : getStatesForFolder(selectedFolder);
                const data = await getConversations({
                    processing_states,
                    search: debouncedSearchQuery || undefined
                });
                const deduplicated = deduplicateConversations(data);

                const currentConversations = conversationsRef.current;
                const prevUnreadMap = previousUnreadRef.current;

                // Detect conversations that gained new unread messages (skip on first run when prev map is empty)
                const withNewMessages = prevUnreadMap.size > 0
                    ? deduplicated.filter((c) => (c.unreadCount ?? 0) > (prevUnreadMap.get(c.uuid) ?? 0))
                    : [];

                const hasChanges = JSON.stringify(deduplicated) !== JSON.stringify(currentConversations);
                if (hasChanges) {
                    setConversations(deduplicated);

                    const currentSelected = selectedConversationRef.current;
                    if (currentSelected) {
                        const updatedSelected = deduplicated.find(c => c.uuid === currentSelected.uuid);
                        if (updatedSelected) {
                            // Only update selectedConversation if unread count changed
                            // This prevents unnecessary message reloads while keeping UI in sync
                            if (updatedSelected.unreadCount !== currentSelected.unreadCount) {
                                setSelectedConversation(updatedSelected);
                            }
                        } else {
                            // Conversation was merged or removed
                            const merged = deduplicated.find(c =>
                                c.metadata?.mergedConversationIds?.includes(currentSelected.uuid)
                            );
                            if (merged) setSelectedConversation(merged);
                        }
                    }
                }

                // Persist current unread snapshot for next poll
                previousUnreadRef.current = new Map(deduplicated.map((c) => [c.uuid, c.unreadCount ?? 0]));

                // Live notification: show toast for new messages in other conversations
                // and refresh messages if new messages arrived in the currently open conversation
                if (withNewMessages.length > 0) {
                    const openConvoId = selectedConversationRef.current?.uuid;
                    const currentConvoHasNew = openConvoId && withNewMessages.some(c => c.uuid === openConvoId);
                    const othersWithNew = openConvoId
                        ? withNewMessages.filter((c) => c.uuid !== openConvoId)
                        : withNewMessages;

                    // Refresh messages if the currently open conversation has new messages
                    if (currentConvoHasNew) {
                        refreshCurrentMessages();
                        // Automatically mark as read since user is viewing the conversation
                        const currentConvo = withNewMessages.find(c => c.uuid === openConvoId);
                        if (currentConvo) {
                            handleMarkAsRead(currentConvo);
                        }
                    }

                    // Show notification for new messages in other conversations
                    if (othersWithNew.length > 0) {
                        const first = othersWithNew[0];
                        const label = first.metadata?.brandName || first.name || "Someone";
                        toast({
                            title: "New message",
                            description: `You have a new message from ${label}.`,
                        });
                        // Browser notification when tab is in background (request permission if needed)
                        if (typeof window !== "undefined" && document.visibilityState === "hidden") {
                            if ("Notification" in window) {
                                if (Notification.permission === "granted") {
                                    new Notification("New message", {
                                        body: `From ${label}`,
                                        icon: "/favicon.ico",
                                    });
                                } else if (Notification.permission === "default") {
                                    Notification.requestPermission().then((p) => {
                                        if (p === "granted") {
                                            new Notification("New message", {
                                                body: `From ${label}`,
                                                icon: "/favicon.ico",
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                }

                await fetchUnreadCounts();
            } catch (error) {
                console.error('Failed to refresh conversations:', error);
            }
        };

        const interval = setInterval(refreshConversations, 30000);
        return () => clearInterval(interval);
    }, [selectedFolder, debouncedSearchQuery, isInitialLoad, deduplicateConversations, toast, refreshCurrentMessages, handleMarkAsRead, fetchUnreadCounts]);



    /**
     * Handle conversation selection
     * Immediately marks conversation as read when clicked
     */
    const handleConversationSelect = useCallback((conversation: ConversationSummary) => {
        setSelectedConversation(conversation);
        // Mark as read immediately when conversation is opened
        handleMarkAsRead(conversation);
    }, [handleMarkAsRead]);

    // Load messages when selected conversation UUID changes (not when other properties change)
    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedConversation) {
                setEmailChatHistory([]);
                loadedConversationUuidRef.current = null;
                return;
            }

            // Only reload if the conversation UUID actually changed
            if (loadedConversationUuidRef.current === selectedConversation.uuid) {
                return;
            }

            console.log("Loading messages for conversation:", selectedConversation.uuid);
            setLoadingConversation(true);
            loadedConversationUuidRef.current = selectedConversation.uuid;

            try {
                const messages = await getMessagesByConversationId(selectedConversation.uuid);
                console.log("Loaded messages:", messages);
                if (messages) {
                    setEmailChatHistory(mergeMessageThread(messages.emailMessages || [], messages.aiMessages || []));
                    // Scroll to bottom when messages are loaded
                    setTimeout(() => {
                        scrollToBottom(emailChatRef);
                    }, 100);
                }
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setLoadingConversation(false);
            }
        };

        loadMessages();
    }, [selectedConversation?.uuid]); // Only depend on UUID, not entire object

    // Set consistent subject when conversation changes
    useEffect(() => {
        if (selectedConversation && selectedConversation.dealId) {
            // Create a minimal deal object for subject generation with actual creator name
            const dealForSubject = {
                ...createDealForSubject(selectedConversation),
                createdBy: userName || "Creator", // Use actual creator name
            } as Deal;

            // Get or generate consistent subject
            const consistentSubject = emailSubjectManager.getConsistentSubject(dealForSubject);
            setEmailSubject(consistentSubject);
            setIsSubjectLocked(true);
        } else {
            setEmailSubject("");
            setIsSubjectLocked(false);
        }
    }, [selectedConversation, userName]);

    const handleSendEmail = async () => {
        if (!selectedConversation || !emailContent.trim()) {
            toast({
                title: "Missing information",
                description: "Please enter email content.",
                variant: "destructive",
            });
            return;
        }

        if (!selectedConversation.contactEmail) {
            toast({
                title: "Missing recipient",
                description: "No email address found for this conversation.",
                variant: "destructive",
            });
            return;
        }

        // Saved outside try so the catch block can restore content on error
        let savedContent = emailContent;

        try {
            // Get consistent subject for this deal with actual creator name
            const dealForSubject = {
                ...createDealForSubject(selectedConversation),
                createdBy: userName || "Creator",
            } as Deal;
            const consistentSubject = emailSubjectManager.getConsistentSubject(dealForSubject);

            // Create optimistic message to show immediately
            const optimisticMessage: Message = {
                id: `temp-${Date.now()}`,
                conversationId: selectedConversation.uuid,
                dealId: selectedConversation.dealId,
                userId: selectedConversation.userId,
                senderId: selectedConversation.userId,
                senderName: userName || "You",
                senderEmail: userEmail,
                senderAvatar: undefined,
                content: emailContent,
                messageType: MessageType.EMAIL,
                status: MessageStatus.SENT,
                sentAt: new Date().toISOString(),
                threadPosition: 0,
                isInternal: false,
                isAutomated: false,
                priority: 0,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                emailData: {
                    subject: consistentSubject,
                    toEmails: [selectedConversation.contactEmail],
                    ccEmails: [],
                    bccEmails: [],
                },
            };

            // Optimistically add the message to the chat history
            setEmailChatHistory(prev => [...prev, optimisticMessage]);

            // Scroll to bottom to show the new message
            setTimeout(() => scrollToBottom(emailChatRef), 100);

            // Save content before clearing so it can be restored on error
            savedContent = emailContent;
            setEmailSubject("");
            setEmailContent("");

            // Reset textarea height to normal size
            resetTextareaHeight();

            // Create email request for the email API
            const emailRequest = {
                to_addresses: [selectedConversation.contactEmail],
                subject: consistentSubject,
                body_text: savedContent,
                from_address: userEmail,
                deal_id: selectedConversation.dealId,
                user_id: selectedConversation.userId,
            };

            // Send email using the email API
            const emailResult = await sendEmail(emailRequest);
            if (emailResult && emailResult.result) {
                // Email was sent successfully - show success toast
                toast({
                    title: "Email sent successfully!",
                    description: "Your email has been delivered.",
                    variant: "default",
                });

                // Reload messages from backend to get the actual saved message
                try {
                    // Use our refresh function for consistency
                    await refreshCurrentMessages();

                    // Refresh conversations list to update last message time
                    const processing_states = getStatesForFolder(selectedFolder);
                    const updatedConversations = await getConversations({
                        processing_states,
                        search: debouncedSearchQuery || undefined
                    });
                    // Deduplicate updated conversations
                    const deduplicated = deduplicateConversations(updatedConversations);
                    setConversations(deduplicated);

                    // Refresh unread counts
                    await fetchUnreadCounts();
                } catch (reloadError) {
                    console.warn('Failed to reload messages:', reloadError);
                }
            } else {
                throw new Error('Failed to send email - no response from email service');
            }
        } catch (error) {
            console.error('Failed to send email:', error);

            // Remove the optimistic message on error
            setEmailChatHistory(prev => prev.filter(msg => !msg.id?.startsWith('temp-')));

            // Restore the email content so user can try again
            setEmailContent(savedContent);

            // Provide more specific error messages based on the error type
            let errorTitle = "Failed to send email";
            let errorDescription = "Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorTitle = "Network error";
                    errorDescription = "Please check your internet connection and try again.";
                } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
                    errorTitle = "Authentication error";
                    errorDescription = "Please refresh the page and try again.";
                } else if (error.message.includes('server') || error.message.includes('500')) {
                    errorTitle = "Server error";
                    errorDescription = "Our email servers are experiencing issues. Please try again later.";
                } else if (error.message.includes('timeout')) {
                    errorTitle = "Request timeout";
                    errorDescription = "The request took too long. Please try again.";
                } else if (error.message.includes('rate limit') || error.message.includes('429')) {
                    errorTitle = "Rate limit exceeded";
                    errorDescription = "Too many emails sent. Please wait a moment and try again.";
                } else if (error.message.includes('Invalid email')) {
                    errorTitle = "Invalid email address";
                    errorDescription = "Please check the recipient email address.";
                } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
                    errorTitle = "Permission denied";
                    errorDescription = "You do not have permission to send emails.";
                }
            }
            
            toast({
                title: errorTitle,
                description: errorDescription,
                variant: "destructive",
            });
        }
    };

    const handleSaveDraft = () => {
        setIsEditingDraft(false);
        // Reset draft textarea height to normal size
        resetDraftTextareaHeight();
        // In a real app, this would save the draft to the server
    };

    // Note: Duplicate detection and consolidation is now handled in deduplicateConversations()
    // This ensures single thread per email contact with all message history preserved


    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="page-padding pt-4 pb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Messages
                        </h2>
                        {/* <Button className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm">
                            New Conversation
                        </Button> */}
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Side - Conversation List */}
                <div className="w-full md:w-1/3 flex flex-col border-r bg-white">


                    {/* Folder Tabs */}
                    <div className="border-b bg-white p-3 space-y-2">
                        {FOLDER_ROWS.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-wrap gap-2">
                                {row.map((folder) => {
                                    const config = FOLDER_CONFIGS[folder];
                                    const isSelected = selectedFolder === folder;
                                    const unread = getUnreadCountForFolder(folder, folderUnreadCounts);
                                    return (
                                        <Button
                                            key={folder}
                                            onClick={() => setSelectedFolder(folder)}
                                            variant={isSelected ? "filterActive" : "filter"}
                                            size="sm"
                                            className="h-8 gap-1.5 px-3"
                                        >
                                            {config.icon === "Mail" && <Mail className="h-3.5 w-3.5" />}
                                            {config.icon === "Briefcase" && <Briefcase className="h-3.5 w-3.5" />}
                                            {config.icon === "XCircle" && <XCircle className="h-3.5 w-3.5" />}
                                            {config.icon === "Ban" && <Ban className="h-3.5 w-3.5" />}
                                            {config.icon === "Archive" && <Archive className="h-3.5 w-3.5" />}
                                            {config.label}
                                            {unread > 0 && (
                                                <Badge 
                                                    variant="destructive" 
                                                    className="ml-1 h-4 min-w-[1rem] px-1 rounded-full text-[9px] flex items-center justify-center p-0"
                                                >
                                                    {unread}
                                                </Badge>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Search Bar - Added above conversation list */}
                    <div className="p-3 border-b bg-white">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name, email, or brand..."
                                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto relative">
                        {/* Loading overlay for folder switching and initial load */}
                        {(loadingFolderConversations || (loading && isInitialLoad)) && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-sage-primary" />
                                    <span className="text-sm text-gray-600">Loading conversations...</span>
                                </div>
                            </div>
                        )}
                        
                        {conversations.length === 0 && !(loadingFolderConversations || (loading && isInitialLoad)) ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <Mail className="h-12 w-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations found</h3>
                                <p className="text-sm text-gray-500">
                                    {searchQuery
                                        ? `No results for "${searchQuery}"`
                                        : selectedFolder === EmailFolder.ALL_MAIL
                                            ? "Your conversations will appear here once you start messaging."
                                            : selectedFolder === EmailFolder.SPONSORSHIP
                                                ? "No active sponsorship conversations. Sponsorship opportunities will appear here."
                                                : selectedFolder === EmailFolder.NON_SPONSORSHIP
                                                    ? "No other conversations. Non-sponsorship messages will appear here."
                                                    : selectedFolder === EmailFolder.REJECTED
                                                        ? "No rejected messages. Rejected or error messages will appear here."
                                                        : selectedFolder === EmailFolder.ARCHIVE
                                                            ? "No archived conversations. Completed, ghosted, or lost deals will appear here."
                                                            : `No conversations in ${FOLDER_CONFIGS[selectedFolder].label}`}
                                </p>
                            </div>
                        ) : (
                            conversations.map((convo) => {
                                const processingState = convo.metadata?.processingState;
                                const archiveBadge = processingState ? getArchiveStatusBadge(processingState) : null;
                                
                                return (
                                    <div
                                        key={convo.uuid}
                                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                                            selectedConversation?.uuid === convo.uuid ? 'bg-sage-primary/10 border-l-4 border-l-sage-primary' : ''
                                        }`}
                                        onClick={() => handleConversationSelect(convo)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage
                                                    src={convo.avatar || "/placeholder.svg"}
                                                />
                                                <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold">
                                                    {convo.metadata?.brandName ? convo.metadata.brandName.charAt(0) : convo.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                {/* 1. Brand Name */}
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-sm text-gray-900 truncate ${convo.unreadCount > 0 ? "font-bold" : "font-medium"}`}>
                                                        {convo.metadata?.brandName || convo.name}
                                                    </p>
                                                    {convo.unreadCount > 0 && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center shrink-0 ml-2"
                                                        >
                                                            {convo.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                {/* 2. Contact Name */}
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {convo.contactName}
                                                </p>

                                                <div className="flex flex-col mt-1.5 gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        {/* 3. Status */}
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[10px] px-1.5 py-0 h-5 border-0 ${
                                                                (convo.status as string).toLowerCase() === 'active'
                                                                    ? "bg-blue-50 text-blue-700" 
                                                                    : "bg-gray-100 text-gray-600"
                                                            }`}
                                                        >
                                                            {convo.status}
                                                        </Badge>
                                                        
                                                        {selectedFolder === EmailFolder.ARCHIVE && archiveBadge && (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 py-0 h-5 ${archiveBadge.className}`}
                                                            >
                                                                {archiveBadge.label}
                                                            </Badge>
                                                        )}

                                                        {/* 4. Last message time/date */}
                                                        {convo.lastMessageAt && (
                                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                {formatTimestamp(convo.lastMessageAt)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 5. Tags */}
                                                    {convo.metadata?.tags && Array.isArray(convo.metadata.tags) && convo.metadata.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {convo.metadata.tags.map((tag: string) => (
                                                                <Badge
                                                                    key={tag}
                                                                    variant="outline"
                                                                    className={`text-[10px] px-1.5 py-0 h-5 border-orange-200 text-orange-700 bg-orange-50`}
                                                                >
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

                {/* Right Side - Email Preview & Draft */}
                <div className="w-full md:grow flex flex-col bg-white">
                    {/* <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-gray-600" />
                                <h3 className="font-semibold text-gray-900">
                                    Email Conversation
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Preview
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-figma-green-primary text-black hover:bg-figma-green-primary/90"
                                    onClick={handleSendDraft}
                                >
                                    <Send className="h-3 w-3 mr-1" />
                                    Send Email
                                </Button>
                            </div>
                        </div>
                    </div> */}

                    {/* Email Conversation View */}
                    <div ref={emailChatRef} className="flex-1 p-4 overflow-y-auto">
                        {loadingConversation ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span>Loading conversation...</span>
                            </div>
                        ) : emailChatHistory.length > 0 || selectedConversation ? (
                            <>
                                <div className="text-center mb-6">
                                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        Email Thread - {selectedConversation?.name}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {emailChatHistory.map((emailMsg) => {
                                            const isFromCreator = isMessageFromCreator(emailMsg);
                                            const isAI = isFromAIAgent(emailMsg);
                                            const rightBubbleStyle = isAI
                                                ? "bg-gray-200 text-gray-900 rounded-tr-md border-gray-300"
                                                : "bg-figma-green-primary text-white rounded-tr-md border-figma-green-primary";
                                            const rightLabel = isAI ? "Repflow Agent" : "You";
                                            return (
                                                <div
                                                    key={emailMsg.id ?? emailMsg._id ?? emailMsg.sentAt}
                                                    className={`flex gap-3 ${
                                                        isFromCreator
                                                            ? "flex-row-reverse"
                                                            : ""
                                                    }`}
                                                >
                                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                                        <AvatarImage
                                                            src={
                                                                isFromCreator
                                                                    ? isAI
                                                                        ? "/placeholder.svg"
                                                                        : (userAvatar || "/placeholder-user.png")
                                                                    : emailMsg.senderAvatar || "/placeholder.svg"
                                                            }
                                                        />
                                                        <AvatarFallback className={`font-semibold text-xs ${isAI ? "bg-gray-300 text-gray-700" : "bg-gray-200 text-gray-600"}`}>
                                                            {isFromCreator
                                                                ? rightLabel.charAt(0)
                                                                : emailMsg.senderName.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div
                                                        className={`max-w-full sm:max-w-lg ${
                                                            isFromCreator
                                                                ? "text-right"
                                                                : ""
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-medium text-gray-900">
                                                                {isFromCreator
                                                                    ? rightLabel
                                                                    : emailMsg.senderName}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {formatTimestamp(emailMsg.sentAt)}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`rounded-2xl border ${
                                                                isFromCreator
                                                                    ? rightBubbleStyle
                                                                    : "bg-white text-gray-900 rounded-tl-md border-gray-200"
                                                            }`}
                                                        >
                                                            {/* Email Header - omit for AI agent messages (no email envelope) */}
                                                            {emailMsg.emailData && (
                                                                <div
                                                                    className={`p-3 border-b ${
                                                                        isFromCreator
                                                                            ? isAI
                                                                                ? "border-gray-300"
                                                                                : "border-white/20"
                                                                            : "border-gray-200"
                                                                    }`}
                                                                >
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-start text-sm font-semibold">
                                                                            {emailMsg.emailData.subject}
                                                                        </div>
                                                                        <div className="text-xs space-y-1">
                                                                            <div className="flex items-start gap-2">
                                                                                <span
                                                                                    className={`font-medium ${
                                                                                        isFromCreator ? (isAI ? "text-gray-600" : "text-white/90") : "text-gray-600"
                                                                                    }`}
                                                                                >
                                                                                    From:
                                                                                </span>
                                                                                <span
                                                                                    className={
                                                                                        isFromCreator ? (isAI ? "text-gray-800" : "text-white/80") : "text-gray-800"
                                                                                    }
                                                                                >
                                                                                    {emailMsg.senderEmail}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-start gap-2">
                                                                                <span
                                                                                    className={`font-medium ${
                                                                                        isFromCreator ? (isAI ? "text-gray-600" : "text-white/90") : "text-gray-600"
                                                                                    }`}
                                                                                >
                                                                                    To:
                                                                                </span>
                                                                                <span
                                                                                    className={
                                                                                        isFromCreator ? (isAI ? "text-gray-800" : "text-white/80") : "text-gray-800"
                                                                                    }
                                                                                >
                                                                                    {emailMsg.emailData.toEmails.join(", ")}
                                                                                </span>
                                                                            </div>
                                                                            {emailMsg.emailData.ccEmails && emailMsg.emailData.ccEmails.length > 0 && (
                                                                                <div className="flex items-start gap-2">
                                                                                    <span
                                                                                        className={`font-medium ${
                                                                                            isFromCreator ? (isAI ? "text-gray-600" : "text-white/90") : "text-gray-600"
                                                                                        }`}
                                                                                    >
                                                                                        CC:
                                                                                    </span>
                                                                                    <span
                                                                                        className={
                                                                                            isFromCreator ? (isAI ? "text-gray-800" : "text-white/80") : "text-gray-800"
                                                                                        }
                                                                                    >
                                                                                        {emailMsg.emailData.ccEmails.join(", ")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {emailMsg.emailData.bccEmails && emailMsg.emailData.bccEmails.length > 0 && (
                                                                                <div className="flex items-start gap-2">
                                                                                    <span
                                                                                        className={`font-medium ${
                                                                                            isFromCreator ? (isAI ? "text-gray-600" : "text-white/90") : "text-gray-600"
                                                                                        }`}
                                                                                    >
                                                                                        BCC:
                                                                                    </span>
                                                                                    <span
                                                                                        className={
                                                                                            isFromCreator ? (isAI ? "text-gray-800" : "text-white/80") : "text-gray-800"
                                                                                        }
                                                                                    >
                                                                                        {emailMsg.emailData.bccEmails.join(", ")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Message content */}
                                                            <div className="p-4">
                                                                <div className="text-sm whitespace-pre-line leading-relaxed text-left">
                                                                    {emailMsg.content}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Select a conversation to view messages</p>
                                </div>
                            </div>
                        )}

                        {/* Current Draft as Pending Message */}
                        {currentDraft && (
                            <div className="mt-4">
                                <div className="flex gap-3 flex-row-reverse">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={userAvatar || "/placeholder-user.png"} />
                                        <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold text-xs">
                                            You
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-full md:max-w-6xl">
                                        <div className="flex items-center gap-2 mb-1 justify-end">
                                            <Badge
                                                variant="outline"
                                                className="text-xs bg-yellow-50 text-yellow-600 border-yellow-300"
                                            >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Draft
                                            </Badge>
                                            <span className="text-xs font-medium text-gray-900">
                                                You
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Now
                                            </span>
                                        </div>
                                        <div className="relative">
                                            {isEditingDraft ? (
                                                <div className="w-full border-2 border-dashed border-yellow-400 bg-yellow-50 rounded-2xl rounded-tr-md relative">
                                                    {/* Draft Email Header */}
                                                    {currentDraft.emailData && (
                                                        <div className="p-3 border-b border-yellow-300">
                                                            <div className="space-y-1">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {currentDraft.emailData.subject}
                                                                </div>
                                                                <div className="text-xs space-y-1 text-gray-700">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="font-medium text-gray-600">
                                                                            From:
                                                                        </span>
                                                                        <span>
                                                                            {currentDraft.senderEmail}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="font-medium text-gray-600">
                                                                            To:
                                                                        </span>
                                                                        <span>
                                                                            {currentDraft.emailData.toEmails.join(", ")}
                                                                        </span>
                                                                    </div>
                                                                    {currentDraft.emailData.ccEmails && currentDraft.emailData.ccEmails.length > 0 && (
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="font-medium text-gray-600">
                                                                                CC:
                                                                            </span>
                                                                            <span>
                                                                                {currentDraft.emailData.ccEmails.join(", ")}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Draft Content */}
                                                    <div className="w-full p-4">
                                                        <Textarea
                                                            ref={draftTextareaRef}
                                                            className="w-full min-h-64 min-w-full text-sm resize-none border-none bg-transparent p-0 focus:ring-0"
                                                            style={{ 
                                                                minWidth: '750px',
                                                                height: 'auto',
                                                                minHeight: '256px', // min-h-64
                                                                maxHeight: '512px', // max-h-128
                                                            }}
                                                            value={currentDraft.content}
                                                            onChange={(e) =>
                                                                setCurrentDraft({
                                                                    ...currentDraft,
                                                                    content: e.target.value,
                                                                })
                                                            }
                                                            onInput={(e) => {
                                                                const target = e.target as HTMLTextAreaElement;
                                                                target.style.height = 'auto';
                                                                target.style.height = Math.min(target.scrollHeight, 512) + 'px'; // 512px = max-h-128
                                                            }}
                                                        />
                                                        <div className="flex gap-2 mt-3 justify-end">
                                                            <Button
                                                                size="sm"
                                                                onClick={handleSaveDraft}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Save
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setIsEditingDraft(false)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-yellow-400 bg-yellow-50 text-gray-900 rounded-2xl rounded-tr-md relative">
                                                    {/* Draft Email Header */}
                                                    {currentDraft.emailData && (
                                                        <div className="p-3 border-b border-yellow-300">
                                                            <div className="space-y-1">
                                                                <div className="text-sm font-semibold">
                                                                    {currentDraft.emailData.subject}
                                                                </div>
                                                                <div className="text-xs space-y-1 text-gray-700">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="font-medium text-gray-600">
                                                                            From:
                                                                        </span>
                                                                        <span>
                                                                            {currentDraft.senderName} &lt;{currentDraft.senderEmail}&gt;
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="font-medium text-gray-600">
                                                                            To:
                                                                        </span>
                                                                        <span>
                                                                            {currentDraft.emailData.toEmails.join(", ")}
                                                                        </span>
                                                                    </div>
                                                                    {currentDraft.emailData.ccEmails && currentDraft.emailData.ccEmails.length > 0 && (
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="font-medium text-gray-600">
                                                                                CC:
                                                                            </span>
                                                                            <span>
                                                                                {currentDraft.emailData.ccEmails.join(", ")}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Draft Content */}
                                                    <div className="p-4">
                                                        <div className="text-sm whitespace-pre-line leading-relaxed">
                                                            {currentDraft.content}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="absolute top-2 right-2 h-6 w-6 p-0"
                                                        onClick={() => setIsEditingDraft(true)}
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Email Compose Box */}
                    <div className="p-4 border-t bg-gray-50">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Compose Email</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Subject"
                                        className="flex-1"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        disabled={isSubjectLocked}
                                    />
                                    {isSubjectLocked && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsSubjectLocked(false)}
                                            className="text-xs"
                                        >
                                            Unlock
                                        </Button>
                                    )}
                                </div>
                                {isSubjectLocked && (
                                    <p className="text-xs text-gray-500">
                                        Subject is locked to maintain consistency across all emails for this deal. 
                                        Click &quot;Unlock&quot; to customize.
                                    </p>
                                )}
                                <Textarea
                                    ref={emailTextareaRef}
                                    placeholder="Type your email message here..."
                                    className="min-h-24 max-h-96 resize-none"
                                    value={emailContent}
                                    onChange={(e) => setEmailContent(e.target.value)}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.min(target.scrollHeight, 384) + 'px'; // 384px = max-h-96
                                    }}
                                    style={{
                                        height: 'auto',
                                        minHeight: '96px', // min-h-24
                                        maxHeight: '384px', // max-h-96
                                    }}
                                />
                                <div className="flex justify-start gap-2">
                                    {/* <Button variant="outline" size="sm">
                                        Save Draft
                                    </Button> */}
                                    <Button 
                                        size="sm"
                                        className="bg-figma-green-primary text-black hover:bg-figma-green-primary/90"
                                        onClick={handleSendEmail}
                                    >
                                        <Send className="h-4 w-4 mr-1" />
                                        Send Email
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
