"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getMessagesByConversationId
} from "@/lib/api";
import { getRepflowUsername, getUserName } from "@/lib/auth-utils";
import {
  ConversationSummary,
  Message,
  MessageType
} from "@/lib/models";
import {
  Bot,
  FileText,
  Send,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

interface AIAssistantProps {
    selectedConversation: ConversationSummary | null;
    onDraftCreated?: (draft: Message) => void;
}

export default function AIAssistant({ selectedConversation, onDraftCreated }: AIAssistantProps) {
    const { toast } = useToast();
    
    // State for AI chat
    const [aiChatHistory, setAiChatHistory] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    // State for user info
    const [userName, setUserName] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    
    // Refs for auto-scrolling
    const aiChatRef = useRef<HTMLDivElement>(null);
    
    // Function to scroll to bottom of chat
    const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    };

    // Load user info on component mount
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const [name, repflowUsername] = await Promise.all([
                    getUserName(),
                    getRepflowUsername()
                ]);
                setUserName(name || "");
                setUserEmail(repflowUsername + "@repflow.me" || "");
            } catch (error) {
                console.error('Failed to load user info:', error);
            }
        };
        loadUserInfo();
    }, []);

    // Load AI chat history when conversation changes
    useEffect(() => {
        if (selectedConversation) {
            const loadMessages = async () => {
                try {
                    const messages = await getMessagesByConversationId(selectedConversation.uuid);
                    if (messages) {
                        setAiChatHistory(messages.aiMessages || []);
                        // Scroll to bottom when messages are loaded
                        setTimeout(() => {
                            scrollToBottom(aiChatRef);
                        }, 100);
                    }
                } catch (error) {
                    console.error('Failed to load AI messages:', error);
                }
            };
            loadMessages();
        }
    }, [selectedConversation]);

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || !selectedConversation) return;

        // Add user message to chat history immediately
        const userMessage: Message = {
            id: `chat-${Date.now()}`,
            messageType: MessageType.AI_ASSISTANT,
            content: currentMessage,
            status: "sent" as any,
            conversationId: selectedConversation.uuid,
            dealId: selectedConversation.dealId,
            userId: selectedConversation.userId,
            senderName: userName || "You",
            senderEmail: userEmail || "",
            senderAvatar: "/placeholder-user.png",
            threadPosition: 0,
            isInternal: false,
            isAutomated: false,
            priority: 0,
            tags: [],
            sentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setAiChatHistory(prev => [...prev, userMessage]);
        setCurrentMessage("");
        
        // Set processing state and scroll
        setIsAiProcessing(true);
        setTimeout(() => scrollToBottom(aiChatRef), 100);

        console.log("selectedConversation", selectedConversation);

        try {
            // Call OpenAI API
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: currentMessage,
                    conversationId: selectedConversation.uuid,
                    dealId: selectedConversation.dealId,
                    context: {
                        conversationName: selectedConversation.name,
                        contactName: selectedConversation.contactName,
                        contactEmail: selectedConversation.contactEmail,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            
            // Add AI response to chat history
            const aiResponse: Message = {
                id: `ai-${Date.now()}`,
                messageType: MessageType.AI_ASSISTANT,
                content: data.message,
                status: "sent" as any,
                conversationId: selectedConversation.uuid,
                dealId: selectedConversation.dealId,
                userId: selectedConversation.userId,
                senderName: "AI Assistant",
                senderEmail: "ai@repflow.com",
                senderAvatar: "/placeholder-user.png",
                threadPosition: 0,
                isInternal: false,
                isAutomated: true,
                priority: 0,
                tags: [],
                aiData: {
                    assistantId: "gpt-4",
                    assistantName: "AI Assistant",
                    modelUsed: "gpt-4",
                    totalTokens: data.usage?.total_tokens || 0,
                },
                sentAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            setAiChatHistory(prev => [...prev, aiResponse]);
            // Scroll to bottom after AI response
            setTimeout(() => scrollToBottom(aiChatRef), 100);
        } catch (error) {
            console.error('Error getting AI response:', error);
            
            // Add error message to chat history
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                messageType: MessageType.AI_ASSISTANT,
                content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
                status: "sent" as any,
                conversationId: selectedConversation.uuid,
                dealId: selectedConversation.dealId,
                userId: selectedConversation.userId,
                senderName: "AI Assistant",
                senderEmail: "ai@repflow.com",
                senderAvatar: "/placeholder-user.png",
                threadPosition: 0,
                isInternal: false,
                isAutomated: true,
                priority: 0,
                tags: [],
                sentAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            setAiChatHistory(prev => [...prev, errorMessage]);
            // Scroll to bottom after error response
            setTimeout(() => scrollToBottom(aiChatRef), 100);
        } finally {
            // Clear processing state
            setIsAiProcessing(false);
        }
    };

    const createDraftFromAIResponse = (aiMessage: Message) => {
        if (!selectedConversation) return;

        // Parse the AI response to extract email components
        const content = aiMessage.content;
        
        // Extract subject line (look for "Subject:" or similar patterns)
        const subjectMatch = content.match(/Subject:\s*(.+)/i);
        
        // Extract email body (everything after the subject or greeting)
        let emailBody = content;
        if (subjectMatch) {
            emailBody = content.replace(/Subject:\s*.+/i, '').trim();
        }
        
        // Remove common AI assistant phrases
        emailBody = emailBody.replace(/^(Here's|Here is) (a draft|an email|a response) (for|to) (you|your conversation):?\s*/i, '');
        emailBody = emailBody.replace(/^(I've drafted|I've written) (an email|a response) (for|to) (you|your conversation):?\s*/i, '');
        emailBody = emailBody.replace(/\n\n(?:Note:|Please note:|Remember:|Make sure to).*$/i, '');
        
        // Create draft message
        const draftMessage: Message = {
            id: `draft-${Date.now()}`,
            messageType: MessageType.EMAIL,
            content: emailBody,
            status: "draft" as any,
            conversationId: selectedConversation.uuid,
            dealId: selectedConversation.dealId,
            userId: selectedConversation.userId,
            senderName: userName || "You",
            senderEmail: userEmail || "",
            senderId: selectedConversation.userId,
            threadPosition: 0,
            isInternal: false,
            isAutomated: false,
            priority: 0,
            tags: [],
            emailData: {
                subject: subjectMatch ? subjectMatch[1].trim() : "Draft Email",
                toEmails: [selectedConversation.contactEmail || ""],
                ccEmails: [],
                bccEmails: [],
                attachments: [],
                headers: {},
                isImportant: false,
            },
            sentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Call the callback to handle draft creation
        if (onDraftCreated) {
            onDraftCreated(draftMessage);
        }
    };

    return (
        <div className="w-1/3 flex flex-col border-r bg-white">
            <div className="p-4 border-b bg-blue-50">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                        AI Assistant
                    </h3>
                    <Badge
                        variant="secondary"
                        className="text-xs bg-blue-100 text-blue-700"
                    >
                        Online
                    </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                    Chat with your AI assistant to help draft
                    professional responses
                </p>
            </div>

            {/* Chat Messages */}
            <div ref={aiChatRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {aiChatHistory.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${
                            msg.senderName != "AI Assistant"
                                ? "flex-row-reverse"
                                : ""
                        }`}
                    >
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {msg.senderName != "AI Assistant" ? (
                                <User className="h-4 w-4 text-gray-600" />
                            ) : (
                                <Bot className="h-4 w-4 text-blue-600" />
                            )}
                        </div>
                        <div
                            className={`${
                                msg.senderName != "AI Assistant"
                                    ? "max-w-2xl text-right"
                                    : "max-w-sm"
                            }`}
                        >
                            <div
                                className={`p-3 rounded-2xl ${
                                    msg.senderName != "AI Assistant"
                                        ? "bg-figma-green-primary text-white rounded-tr-md"
                                        : "bg-gray-100 text-gray-900 rounded-tl-md"
                                }`}
                            >
                                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                {msg.senderName === "AI Assistant" && (
                                    <div className="mt-3 pt-2 border-t border-gray-200">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 px-2"
                                            onClick={() => createDraftFromAIResponse(msg)}
                                        >
                                            <FileText className="h-3 w-3 mr-1" />
                                            Create Draft
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {formatTimestamp(msg.sentAt)}
                            </p>
                        </div>
                    </div>
                ))}
                
                {/* AI Processing Bubble */}
                {isAiProcessing && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="max-w-sm">
                            <div className="p-3 rounded-2xl bg-gray-100 text-gray-900 rounded-tl-md">
                                <div className="flex items-center gap-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t bg-gray-50">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <Textarea
                            placeholder="Ask your AI assistant anything..."
                            className="pr-12 min-h-10 max-h-32 resize-none bg-white border-gray-200 rounded-2xl"
                            value={currentMessage}
                            onChange={(e) =>
                                setCurrentMessage(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            rows={1}
                            style={{
                                height: 'auto',
                                minHeight: '40px',
                                maxHeight: '128px',
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                            }}
                        />
                        <Button
                            size="icon"
                            className="absolute right-1 bottom-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
                            onClick={handleSendMessage}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
