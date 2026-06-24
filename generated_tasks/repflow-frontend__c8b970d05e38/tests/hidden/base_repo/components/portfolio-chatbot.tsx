"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot,
    Loader2,
    MessageCircle,
    Minimize2,
    Send,
    User,
    X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface PortfolioChatbotProps {
    userData: any;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export default function PortfolioChatbot({ 
    userData, 
    isMinimized, 
    onToggleMinimize 
}: PortfolioChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    context: {
                        userData,
                        type: 'portfolio_inquiry'
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const contactEmail = userData?.profile?.repflow_username
                ? `${userData.profile.repflow_username}@repflow.me`
                : null;
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: contactEmail
                    ? `I'm sorry, I'm having trouble connecting right now. Please try again later or contact the creator directly at ${contactEmail}`
                    : "I'm sorry, I'm having trouble connecting right now. Please try again later.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessageContent = (content: string) => {
        // Convert mailto: links to clickable links
        const mailtoRegex = /mailto:([^\s]+)/g;
        const parts = content.split(mailtoRegex);
        
        if (parts.length === 1) {
            return content;
        }
        
        return parts.map((part, index) => {
            // Odd indices are the captured email addresses
            if (index % 2 === 1) {
                return (
                    <a
                        key={index}
                        href={`mailto:${part}`}
                        className="text-sage-primary hover:underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const getInitialMessage = () => {
        if (!userData) return "Hello! I'm here to help answer questions about this creator.";
        const creatorName = userData?.profile?.name || 'this creator';
        return `Hello! I'm here to help answer questions about ${creatorName}. I can tell you about their social media presence, demographics, and more. What would you like to know?`;
    };

    const initializeChat = () => {
        if (messages.length === 0) {
            const initialMessage: Message = {
                id: 'initial',
                role: 'assistant',
                content: getInitialMessage(),
                timestamp: new Date()
            };
            setMessages([initialMessage]);
        }
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    onClick={() => {
                        setIsOpen(true);
                        initializeChat();
                    }}
                    className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark rounded-full p-3 shadow-lg"
                    size="lg"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    onClick={() => {
                        setIsOpen(true);
                        initializeChat();
                    }}
                    className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark rounded-full p-3 shadow-lg"
                    size="lg"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
            <Card className="shadow-xl border-0 bg-white">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-sage-primary/10 rounded-full">
                                <Bot className="h-4 w-4 text-sage-primary" />
                            </div>
                            <CardTitle className="text-sm font-medium">
                                Ask about {userData?.profile?.name || 'this creator'}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleMinimize}
                                className="h-6 w-6 p-0"
                            >
                                <Minimize2 className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="h-6 w-6 p-0"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-80 px-4">
                        <div className="space-y-4 py-2">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                            message.role === 'user'
                                                ? 'bg-sage-primary text-figma-forest-dark'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {message.role === 'assistant' && (
                                                <Bot className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            )}
                                            {message.role === 'user' && (
                                                <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <div className="text-sm whitespace-pre-wrap">
                                                    {renderMessageContent(message.content)}
                                                </div>
                                                <p className="text-xs opacity-70 mt-1">
                                                    {formatTime(message.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-[80%]">
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-3 w-3" />
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span className="text-sm text-gray-600">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    
                    <div className="border-t p-3">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about this creator..."
                                disabled={isLoading}
                                className="flex-1 text-sm"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                size="sm"
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        {userData?.profile?.repflow_username && (
                            <div className="mt-2 text-xs text-gray-500 text-center">
                                Can&apos;t find what you&apos;re looking for? Contact{" "}
                                <a
                                    href={`mailto:${userData.profile.repflow_username}@repflow.me`}
                                    className="text-sage-primary hover:underline"
                                >
                                    {userData.profile.repflow_username}@repflow.me
                                </a>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
