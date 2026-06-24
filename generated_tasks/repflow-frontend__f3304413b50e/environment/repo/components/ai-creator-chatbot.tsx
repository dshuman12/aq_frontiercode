"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, MessageCircle, Users, TrendingUp, DollarSign, Minimize2, Maximize2 } from "lucide-react";
import { CreatorProposal } from "@/contexts/SelectedUsersContext";

interface ChatMessage {
    id: string;
    type: "user" | "ai";
    content: string;
    timestamp: Date;
}

interface AICreatorChatbotProps {
    creators: CreatorProposal[];
    filteredCreators: CreatorProposal[];
}

const AICreatorChatbot: React.FC<AICreatorChatbotProps> = ({
    creators,
    filteredCreators,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            type: "ai",
            content: "Hi! I'm your AI assistant for creator insights. I can help you analyze the creators in your current view, compare their rates, suggest the best matches for campaigns, and provide detailed analytics. What would you like to know?",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
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

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: "user",
            content: inputValue.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/proposal-chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    creators: creators,
                    filteredCreators: filteredCreators,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get AI response");
            }

            const data = await response.json();
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: "ai",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: "ai",
                content: "Sorry, I encountered an error while processing your request. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const quickQuestions = [
        "Show me the top 5 creators by rate",
        "Which creators have the best engagement?",
        "Compare creators in my current filter",
        "Suggest creators for a $10K campaign",
        "What platforms are most popular?",
    ];

    const handleQuickQuestion = (question: string) => {
        setInputValue(question);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Widget */}
            <Card className={`w-96 bg-white shadow-xl border border-figma-green-primary/20 transition-all duration-300 ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-sage-primary/10 rounded-lg">
                            <Bot className="h-5 w-5 text-figma-green-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">AI Assistant</CardTitle>
                            <p className="text-xs text-gray-500">
                                {filteredCreators.length} of {creators.length} creators
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="h-8 w-8 p-0"
                        >
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <CardContent className="flex flex-col space-y-3 pt-0">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                            <div className="text-center">
                                <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="font-semibold text-sm">{creators.length}</p>
                            </div>
                            <div className="text-center">
                                <TrendingUp className="h-4 w-4 text-green-500 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Filtered</p>
                                <p className="font-semibold text-sm">{filteredCreators.length}</p>
                            </div>
                            <div className="text-center">
                                <DollarSign className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Avg Rate</p>
                                <p className="font-semibold text-sm">
                                    ${Math.round(
                                        filteredCreators.reduce((sum, c) => sum + c.campaignRate, 0) /
                                            Math.max(filteredCreators.length, 1) / 1000
                                    )}K
                                </p>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <ScrollArea className="h-64 border rounded-lg p-3">
                            <div className="space-y-3">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-lg p-2 text-sm ${
                                                message.type === "user"
                                                    ? "bg-sage-primary text-figma-forest-dark"
                                                    : "bg-gray-100 text-gray-900"
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                            <p className="text-xs opacity-70 mt-1">
                                                {message.timestamp.toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-lg p-2">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Quick Questions */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">Quick Questions:</p>
                            <div className="flex flex-wrap gap-1">
                                {quickQuestions.slice(0, 3).map((question, index) => (
                                    <Badge
                                        key={index}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-sage-primary/10 hover:border-figma-green-primary/50 text-xs px-2 py-1"
                                        onClick={() => handleQuickQuestion(question)}
                                    >
                                        {question}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="flex space-x-2">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about creators..."
                                disabled={isLoading}
                                className="flex-1 text-sm"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark h-9 px-3"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Chat Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark transition-all duration-300 ${
                    isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        </div>
    );
};

export default AICreatorChatbot;
