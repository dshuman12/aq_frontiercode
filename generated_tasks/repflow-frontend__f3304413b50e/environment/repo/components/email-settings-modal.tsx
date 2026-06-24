"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Mail, User, Send, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { EmailRequest } from "@/lib/email-generator";
import { QuickActionType } from "@/lib/email-templates";

type EmailPreviewModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    emailRequest: EmailRequest | null;
    actionType: QuickActionType;
    contactInfo?: { name: string; email: string } | null;
    onSendEmail: (emailRequest: EmailRequest) => void;
};

type EmailChipProps = {
    email: string;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    locked?: boolean;
};

function EmailChip({ email, isSelected, onSelect, onDelete, locked = false }: EmailChipProps) {
    return (
        <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border cursor-pointer transition-colors ${
                isSelected 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={onSelect}
        >
            <span>{email}</span>
            {!locked && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

type ToggleChipProps = {
    label: string;
    isActive: boolean;
    onClick: () => void;
};

function ToggleChip({ label, isActive, onClick }: ToggleChipProps) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-1 rounded-md text-sm border transition-colors ${
                isActive 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
}

type EmailInputFieldProps = {
    label: string;
    defaultEmails: string[];
    emails: string[];
    setEmails: (emails: string[]) => void;
    placeholder: string;
    required?: boolean;
    customLabelSection?: React.ReactNode;
};

function EmailInputField({ label, defaultEmails, emails, setEmails, placeholder, required, customLabelSection }: EmailInputFieldProps) {
    const [inputValue, setInputValue] = useState("");
    const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Email validation helper
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    const addEmail = (email: string) => {
        const trimmedEmail = email.trim();
        if (trimmedEmail && isValidEmail(trimmedEmail) && !emails.includes(trimmedEmail)) {
            setEmails([...emails, trimmedEmail]);
            setInputValue("");
            setSelectedChipIndex(null);
        }
    };

    const removeEmail = (index: number) => {
        const newEmails = emails.filter((_, i) => i !== index);
        setEmails(newEmails);
        setSelectedChipIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                addEmail(inputValue);
            }
        } else if (e.key === 'Backspace') {
            if (inputValue === '') {
                if (selectedChipIndex !== null) {
                    // Delete the selected chip
                    removeEmail(selectedChipIndex);
                } else if (emails.length > 0) {
                    // Select the last chip
                    setSelectedChipIndex(emails.length - 1);
                }
            } else {
                // Clear selection when typing
                setSelectedChipIndex(null);
            }
        } else {
            // Clear selection when typing
            setSelectedChipIndex(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setSelectedChipIndex(null);
    };

    const handleChipSelect = (index: number) => {
        setSelectedChipIndex(index === selectedChipIndex ? null : index);
        inputRef.current?.focus();
    };

    const handleChipDelete = (index: number) => {
        removeEmail(index);
    };

    return (
        <div className="space-y-2">
            {customLabelSection || (
                <Label className="text-sm font-medium">
                    {label} {required && '*'}
                </Label>
            )}
            <div className="flex flex-wrap items-center gap-1 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                {defaultEmails.map((email, index) => (
                    <EmailChip
                        key={index}
                        email={email}
                        isSelected={selectedChipIndex === index}
                        onSelect={() => handleChipSelect(index)}
                        onDelete={() => handleChipDelete(index)}
                        locked={true}
                    />
                ))}
                {emails.map((email, index) => (
                    <EmailChip
                        key={index}
                        email={email}
                        isSelected={selectedChipIndex === index}
                        onSelect={() => handleChipSelect(index)}
                        onDelete={() => handleChipDelete(index)}
                    />
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={emails.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[120px] outline-none bg-transparent"
                />
            </div>
        </div>
    );
}

export function EmailPreviewModal({ 
    open, 
    onOpenChange, 
    emailRequest, 
    actionType, 
    contactInfo,
    onSendEmail 
}: EmailPreviewModalProps) {
    const [toAddresses, setToAddresses] = useState<string[]>([]);
    const [ccAddresses, setCcAddresses] = useState<string[]>([]);
    const [bccAddresses, setBccAddresses] = useState<string[]>([]);
    const [subject, setSubject] = useState("");
    const [bodyText, setBodyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showCC, setShowCC] = useState(false);
    const [showBCC, setShowBCC] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (open && emailRequest) {
            setToAddresses([]);
            const ccEmails = emailRequest.cc_addresses || [];
            const bccEmails = emailRequest.bcc_addresses || [];
            setCcAddresses(ccEmails);
            setBccAddresses(bccEmails);
            setSubject(emailRequest.subject);
            setBodyText(emailRequest.body_text || "");
            // Show CC/BCC if they have existing content
            setShowCC(ccEmails.length > 0);
            setShowBCC(bccEmails.length > 0);
        }
    }, [open, emailRequest]);

    // Combine pre-filled (locked) recipients with user-added recipients for validation & sending
    const allToAddresses = [...(emailRequest?.to_addresses || []), ...toAddresses].filter(e => e.trim() !== "");
    const allCcAddresses = [...(emailRequest?.cc_addresses || []), ...ccAddresses].filter(e => e.trim() !== "");
    const allBccAddresses = [...(emailRequest?.bcc_addresses || []), ...bccAddresses].filter(e => e.trim() !== "");

    const handleSendEmail = async () => {
        if (!emailRequest || allToAddresses.length === 0) {
            toast.error("Please add at least one recipient email address");
            return;
        }

        if (!subject.trim()) {
            toast.error("Please enter a subject");
            return;
        }

        if (!bodyText.trim()) {
            toast.error("Please enter email content");
            return;
        }

        setIsSending(true);
        
        // Create updated email request merging default + user-added recipients
        const updatedEmailRequest: EmailRequest = {
            ...emailRequest,
            to_addresses: allToAddresses,
            cc_addresses: allCcAddresses,
            bcc_addresses: allBccAddresses,
            subject: subject.trim(),
            body_text: bodyText.trim(),
            body_html: bodyText.trim().replace(/\n/g, '<br>'),
        };

        try {
            await onSendEmail(updatedEmailRequest);
            onOpenChange(false);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Failed to send email");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="pt-4 px-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email Composer - {actionType}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Email Form */}
                    <Card className="rounded-none border-none">
                        <CardContent className="p-4 space-y-4">
                            {/* To Recipients */}
                            <EmailInputField
                                label="To"
                                defaultEmails={emailRequest?.to_addresses || []}
                                emails={toAddresses}
                                setEmails={setToAddresses}
                                placeholder="recipient@example.com"
                                required
                                customLabelSection={
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-medium">To *</Label>
                                        <div className="flex gap-1">
                                            <ToggleChip
                                                label="CC"
                                                isActive={showCC}
                                                onClick={() => setShowCC(!showCC)}
                                            />
                                            <ToggleChip
                                                label="BCC"
                                                isActive={showBCC}
                                                onClick={() => setShowBCC(!showBCC)}
                                            />
                                        </div>
                                    </div>
                                }
                            />

                            {/* CC Recipients - Conditionally Rendered */}
                            {showCC && (
                                <EmailInputField
                                    label="CC"
                                    defaultEmails={emailRequest?.cc_addresses || []}
                                    emails={ccAddresses}
                                    setEmails={setCcAddresses}
                                    placeholder="cc@example.com"
                                />
                            )}

                            {/* BCC Recipients - Conditionally Rendered */}
                            {showBCC && (
                                <EmailInputField
                                    label="BCC"
                                    defaultEmails={emailRequest?.bcc_addresses || []}
                                    emails={bccAddresses}
                                    setEmails={setBccAddresses}
                                    placeholder="bcc@example.com"
                                />
                            )}

                            {/* Subject */}
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
                                <Input
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Email subject"
                                    className={`h-9 ${subject.trim() ? "" : "border-red-500"}`}
                                />
                            </div>

                            {/* Body */}
                            <div className="space-y-2">
                                <Label htmlFor="body" className="text-sm font-medium">Message *</Label>
                                <Textarea
                                    id="body"
                                    value={bodyText}
                                    onChange={(e) => setBodyText(e.target.value)}
                                    placeholder="Email message content"
                                    rows={16}
                                    className={bodyText.trim() ? "" : "border-red-500"}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons - Fixed at bottom */}
                    <div className="sticky bottom-0 left-0 right-0 bg-white flex justify-end gap-3 p-4 mt-6 border-t shadow-lg z-10">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendEmail}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            disabled={isSending || allToAddresses.length === 0 || !subject.trim() || !bodyText.trim()}
                        >
                            {isSending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Email
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Export both for backward compatibility
export { EmailPreviewModal as EmailSettingsModal };

