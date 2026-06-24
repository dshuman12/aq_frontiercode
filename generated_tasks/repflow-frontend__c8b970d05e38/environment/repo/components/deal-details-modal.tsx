import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateDeal, updateContact, createContact, linkContactToBrand, getBrand } from "@/lib/api";
import { getAuthHeaders, getRepflowUsername, getUserId, getUserName } from "@/lib/auth-utils";
import { generateEmailRequest, previewEmailRequest, validateEmailRequest } from "@/lib/email-generator";
import { QuickActionType } from "@/lib/email-templates";
import { Deal, DealStatus, DealType, Brand } from "@/lib/models";
import { formatTimestamp, getContentIcon, getDueDateUrgency } from "@/lib/utils";
import {
    CheckCircle,
    Clock,
    Copy,
    Crown,
    Edit,
    ExternalLink,
    FileText,
    Link,
    MessageCircle,
    Pause,
    PenTool,
    Play,
    Plus,
    Receipt,
    RefreshCw,
    Save,
    Send,
    Star,
    Trash2,
    Upload,
    X,
    XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmailPreviewModal } from "./email-settings-modal";
import { BrandDetailSheet } from "./brand-detail-sheet";

type DealDetailsModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deal: Deal;
    onDealUpdate?: (updatedDeal: Deal) => void;
};

export function DealDetailsModal({
    open,
    onOpenChange,
    deal,
    onDealUpdate,
}: DealDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedDeal, setEditedDeal] = useState<Deal>(deal);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const [pendingEmailRequest, setPendingEmailRequest] = useState<any>(null);
    const [pendingActionType, setPendingActionType] = useState<QuickActionType | null>(null);
    const [pendingContactInfo, setPendingContactInfo] = useState<{ name: string; email: string } | null>(null);

    // Brand detail sheet state
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [isBrandSheetOpen, setIsBrandSheetOpen] = useState(false);

    // Contact editing state (separate from deal since contacts are now in CRM)
    const [editedContact, setEditedContact] = useState<{
        name: string;
        role: string;
        email: string;
    }>({
        name: deal.contact?.name || '',
        role: deal.contact?.role || deal.contact?.title || '',
        email: deal.contact?.email || '',
    });

    // Handle quick action clicks with email generation
    const handleQuickAction = async (actionType: QuickActionType) => {
        // For actions that don't require a contact email, handle directly
        if (actionType === "Archive Deal") {
            await handleArchiveAction();
            return;
        }

        try {
            const userName = await getUserName();
            const repflowUsername = await getRepflowUsername();
            const currentUserId = await getUserId();

            // Build a deal snapshot that includes the latest contact info
            // (either from the backend-populated contact or from local edits)
            const dealWithContact: Deal = {
                ...editedDeal,
                contact: editedDeal.contact?.email
                    ? editedDeal.contact
                    : editedContact.email
                        ? { ...editedDeal.contact!, name: editedContact.name, email: editedContact.email, uuid: editedDeal.contactId || "", isAgencyContact: false, isPrimary: true }
                        : editedDeal.contact,
            };

            // Generate email request
            const emailRequest = await generateEmailRequest(actionType, dealWithContact, {
                fromAddress: repflowUsername + "@repflow.me" || undefined,
                currentUserId: currentUserId || undefined,
            });
            
            if (!emailRequest) {
                toast.error("Unable to generate email: No contact email found. Please add a contact first.");
                return;
            }

            // Validate email request
            if (!validateEmailRequest(emailRequest)) {
                toast.error("Invalid email request generated");
                return;
            }

            // Preview email for debugging
            previewEmailRequest(emailRequest);

            // Get primary contact info for the preview modal
            const primaryContact = dealWithContact.contact;
            const contactInfo = primaryContact ? {
                name: primaryContact.name,
                email: primaryContact.email || emailRequest.to_addresses[0]
            } : {
                name: emailRequest.to_addresses[0]?.split('@')[0] || "there",
                email: emailRequest.to_addresses[0]
            };

            // Show preview modal instead of sending directly
            setPendingEmailRequest(emailRequest);
            setPendingActionType(actionType);
            setPendingContactInfo(contactInfo);
            setShowEmailPreview(true);

        } catch (error: any) {
            console.error("Error generating email:", error);
            toast.error(`Failed to generate email: ${error.message}`);
        }
    };

    /** Archive deal directly without requiring a contact/email */
    const handleArchiveAction = async () => {
        try {
            setIsLoading(true);
            const updated = await updateDeal(deal.uuid, {
                ...editedDeal,
                status: "Archive" as DealStatus,
                updatedAt: new Date().toISOString(),
            });
            setEditedDeal(prev => ({ ...prev, status: "Archive" as DealStatus }));
            onDealUpdate?.(updated);
            toast.success("Deal archived successfully");
        } catch (error) {
            console.error("Error archiving deal:", error);
            toast.error("Failed to archive deal");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle actual email sending from preview modal
    const handleSendEmailFromPreview = async (emailRequest: any) => {
        try {
            setIsSendingEmail(true);

            // Get authorization headers from client session
            const authHeaders = await getAuthHeaders();

            // Send email via API with auth headers in request headers
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({ emailRequest }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send email');
            }

            const result = await response.json();
            toast.success(`Email sent successfully! (${pendingActionType})`);

            // Persist the deal status change to the backend after successful email send
            let newStatus: DealStatus | null = null;
            if (pendingActionType === "Accept") {
                newStatus = "Contracting";
            } else if (pendingActionType === "Reject") {
                newStatus = "Archive";
            }

            if (newStatus) {
                try {
                    const updated = await updateDeal(deal.uuid, {
                        ...editedDeal,
                        status: newStatus,
                        updatedAt: new Date().toISOString(),
                    });
                    setEditedDeal(prev => ({ ...prev, status: newStatus! }));
                    onDealUpdate?.(updated);
                } catch (err) {
                    console.error("Error updating deal status after email:", err);
                    toast.error("Email sent but failed to update deal status");
                }
            }

        } catch (error: any) {
            console.error("Error sending email:", error);
            toast.error(`Failed to send email: ${error.message}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    // Open brand detail sheet
    const openBrandDetail = async () => {
        if (!deal.brandId) {
            toast.error("No brand associated with this deal");
            return;
        }
        
        try {
            const brandData = await getBrand(deal.brandId);
            setSelectedBrand(brandData);
            setIsBrandSheetOpen(true);
        } catch (error) {
            console.error("Error loading brand:", error);
            toast.error("Failed to load brand details");
        }
    };

    /** Whether this deal has a contact with a valid email address.
     *  Checks both the populated contact from the backend AND the locally-edited contact fields,
     *  so that buttons enable immediately after the user types an email. */
    const hasContactEmail = Boolean(editedDeal.contact?.email || editedContact.email);

    // Define quick actions with email generation (preserving all original actions).
    // Actions that send emails are marked with requiresEmail so they can be
    // disabled when no contact email is available.
    const getQuickActions = () => ({
        "New Offer": [
            {
                title: "Accept",
                icon: <CheckCircle className="w-4 h-4" />,
                onClick: () => handleQuickAction("Accept"),
                requiresEmail: true,
            },
            {
                title: "Reject",
                icon: <XCircle className="w-4 h-4" />,
                onClick: () => handleQuickAction("Reject"),
                requiresEmail: true,
            },
            {
                title: "Counter",
                icon: <RefreshCw className="w-4 h-4" />,
                onClick: () => handleQuickAction("Counter"),
                requiresEmail: true,
            },
        ],
        Negotiating: [
            {
                title: "Accept",
                icon: <CheckCircle className="w-4 h-4" />,
                onClick: () => handleQuickAction("Accept"),
                requiresEmail: true,
            },
            {
                title: "Reject",
                icon: <XCircle className="w-4 h-4" />,
                onClick: () => handleQuickAction("Reject"),
                requiresEmail: true,
            },
            {
                title: "Counter",
                icon: <RefreshCw className="w-4 h-4" />,
                onClick: () => handleQuickAction("Counter"),
                requiresEmail: true,
            },
        ],
        Contracting: [
            {
                title: "Request Contract",
                icon: <FileText className="w-4 h-4" />,
                onClick: () => handleQuickAction("Request Contract"),
                requiresEmail: true,
            },
            {
                title: "Follow Up",
                icon: <Send className="w-4 h-4" />,
                onClick: () => handleQuickAction("Follow Up"),
                requiresEmail: true,
            },
        ],
        Drafting: [
            {
                title: "Submit Script",
                icon: <PenTool className="w-4 h-4" />,
                onClick: () => {
                    toast.info("Add your script/draft links in the Deliverables section below, then save.");
                },
                requiresEmail: false,
            },
            {
                title: "Submit Draft",
                icon: <Upload className="w-4 h-4" />,
                onClick: () => {
                    toast.info("Add your draft links in the Deliverables section below, then save.");
                },
                requiresEmail: false,
            },
            {
                title: "Follow Up",
                icon: <Send className="w-4 h-4" />,
                onClick: () => handleQuickAction("Follow Up"),
                requiresEmail: true,
            },
        ],
        Live: [
            {
                title: "Submit Content",
                icon: <Upload className="w-4 h-4" />,
                onClick: () => handleQuickAction("Send Deliverables"),
                requiresEmail: true,
            },
            {
                title: "Invoice",
                icon: <Receipt className="w-4 h-4" />,
                onClick: () => handleQuickAction("Request Payment"),
                requiresEmail: true,
            },
            {
                title: "Follow Up",
                icon: <Send className="w-4 h-4" />,
                onClick: () => handleQuickAction("Follow Up"),
                requiresEmail: true,
            },
        ],
        Complete: [
            {
                title: "Archive Deal",
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => handleQuickAction("Archive Deal"),
                requiresEmail: false,
            },
        ],
        Archive: [],
        Lost: [],
        Abandoned: [],
    });

    // Reset edit state when deal changes or modal opens/closes
    useEffect(() => {
        setEditedDeal(deal);
        setEditedContact({
            name: deal.contact?.name || '',
            role: deal.contact?.role || deal.contact?.title || '',
            email: deal.contact?.email || '',
        });
        setIsEditing(false);
    }, [deal, open]);

    const dueDateUrgency = getDueDateUrgency(deal.dueDate);

    const handleSave = async () => {
        if (!editedDeal.uuid) return;

        // Basic validation
        if (!editedDeal.title) {
            toast.error("Deal title is required");
            return;
        }

        if (!editedDeal.value || editedDeal.value <= 0) {
            toast.error("Deal value must be greater than 0");
            return;
        }

        if (!editedDeal.dealType) {
            toast.error("Deal type is required");
            return;
        }

        if (!editedDeal.status) {
            toast.error("Deal status is required");
            return;
        }

        // Validate deliverables
        const invalidDeliverables = editedDeal.deliverables.some(
            (deliverable) => {
                const content = deliverable.contents?.[0];
                return !content?.text?.trim() || !content?.contentType?.trim();
            }
        );

        if (invalidDeliverables) {
            toast.error("All deliverables must have a type and description");
            return;
        }

        setIsLoading(true);
        try {
            const updatedDeal = await updateDeal(editedDeal.uuid, {
                ...editedDeal,
                updatedAt: new Date().toISOString(),
            });
            onDealUpdate?.(updatedDeal);
            setIsEditing(false);
            toast.success("Deal updated successfully");
        } catch (error) {
            console.error("Error updating deal:", error);
            toast.error("Failed to update deal");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditedDeal(deal);
        setIsEditing(false);
    };

    const handleSaveContact = async () => {
        if (!editedContact.email) {
            toast.error("Contact email is required");
            return;
        }

        try {
            setIsLoading(true);

            let contactId = deal.contactId;

            if (contactId) {
                // Update existing contact
                await updateContact(contactId, {
                    name: editedContact.name,
                    email: editedContact.email,
                    title: editedContact.role,
                });
            } else {
                // Create a new contact when the deal doesn't have one yet
                const newContact = await createContact({
                    name: editedContact.name || "Unknown",
                    email: editedContact.email,
                    title: editedContact.role,
                });
                contactId = newContact.uuid;
            }
            
            // Link contact to brand if brandId exists
            if (deal.brandId && contactId) {
                try {
                    await linkContactToBrand(
                        deal.brandId,
                        contactId,
                        editedContact.role,
                        true
                    );
                } catch {
                    // Non-fatal: linking may fail if the brand doesn't exist yet
                    console.warn("Could not link contact to brand");
                }
            }
            
            toast.success("Contact saved successfully");
            
            // Persist the contactId on the deal and pass the populated contact
            // so the parent's board refresh picks it up.
            const dealPayload = {
                ...editedDeal,
                contactId,
                updatedAt: new Date().toISOString(),
            };
            const refreshedDeal = await updateDeal(deal.uuid, dealPayload);

            // Manually attach the contact info so it's available immediately
            // (the PUT response may not include the populated contact object)
            refreshedDeal.contact = {
                uuid: contactId,
                name: editedContact.name,
                email: editedContact.email,
                title: editedContact.role,
                isAgencyContact: false,
                isPrimary: true,
            };

            // Update local state and notify the parent
            setEditedDeal(refreshedDeal);
            onDealUpdate?.(refreshedDeal);
        } catch (error) {
            console.error("Error updating contact:", error);
            toast.error("Failed to update contact");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFieldChange = (field: keyof Deal, value: any) => {
        setEditedDeal((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleDeliverableChange = (
        index: number,
        field: string,
        value: any
    ) => {
        setEditedDeal((prev) => ({
            ...prev,
            deliverables: prev.deliverables.map((deliverable, i) => {
                if (i !== index) return deliverable;
                
                // Handle nested content fields (contentType, text)
                if (field === 'contentType' || field === 'text') {
                    return {
                        ...deliverable,
                        contents: [{
                            ...deliverable.contents[0],
                            [field]: value
                        }]
                    };
                }
                
                // Handle top-level fields (draftLink, invoiceLink, etc.)
                return { ...deliverable, [field]: value };
            }),
        }));
    };

    const addDeliverable = () => {
        setEditedDeal((prev) => ({
            ...prev,
            deliverables: [
                ...prev.deliverables,
                {
                    contents: [{
                        contentType: "youtube",
                        text: "",
                    }],
                    isBundle: false,
                    draftLink: null,
                    invoiceLink: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
        }));
    };

    const removeDeliverable = (index: number) => {
        setEditedDeal((prev) => ({
            ...prev,
            deliverables: prev.deliverables.filter((_, i) => i !== index),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[75vw] max-h-[90vh] p-0 overflow-auto">
                {/* Header: pr-12 reserves space so the dialog's close (X) button doesn't clip the Edit button */}
                <DialogHeader className="p-6 pr-12 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-2xl font-bold flex flex-col items-start gap-1">
                                {isEditing ? (
                                    <Input
                                        value={editedDeal.title}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                "title",
                                                e.target.value
                                            )
                                        }
                                        className="text-2xl font-bold border-dashed border-gray-300 bg-transparent px-2"
                                        placeholder="Deal title"
                                    />
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span>{editedDeal.brand?.name || editedDeal.title}</span>
                                            {editedDeal.brand?.name && deal.brandId && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={openBrandDetail}
                                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                        {editedDeal.brand?.name && editedDeal.brand.name !== editedDeal.title && (
                                            <span className="text-sm font-normal text-gray-500">
                                                Deal: {editedDeal.title}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {deal.isHighValue && (
                                    <div className="flex items-center gap-1 bg-yellow-400 text-black text-xs font-medium px-2 py-1 rounded-md">
                                        <Crown className="h-4 w-4 fill-black" />
                                        High Value
                                    </div>
                                )}
                                {deal.isPriority && (
                                    <div className="flex items-center gap-1 bg-green-400 text-xs font-medium px-2 py-1 rounded-md">
                                        <Star className="h-4 w-4 fill-black" />
                                        Priority
                                    </div>
                                )}
                                {dueDateUrgency === "soon" && (
                                    <div className="flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-medium px-2 py-1 rounded-md">
                                        <Clock className="h-4 w-4" />
                                        Due soon
                                    </div>
                                )}
                                {dueDateUrgency === "overdue" && (
                                    <div className="flex items-center gap-1 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-md">
                                        <Clock className="h-4 w-4" />
                                        Overdue
                                    </div>
                                )}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 hover:bg-gray-50"
                                        disabled={isLoading}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            await handleSave();
                                            // Save contact whenever the user has entered an email
                                            if (editedContact.email) {
                                                await handleSaveContact();
                                            }
                                        }}
                                        size="sm"
                                        className="bg-figma-green-primary hover:bg-figma-green-primary/90 text-white"
                                        disabled={isLoading}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isLoading ? "Saving..." : "Save"}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white border-gray-300 hover:bg-gray-50"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* TODO: Add brand website link and brand category list */}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>Date Received: {deal.dateReceived}</span>
                        <span>Type: {deal.dealType}</span>
                    </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex h-full overflow-hidden">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Deal Details */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                    Deal Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Deal Type
                                        </p>
                                        {isEditing ? (
                                            <Select
                                                value={editedDeal.dealType}
                                                onValueChange={(
                                                    value: DealType
                                                ) =>
                                                    handleFieldChange(
                                                        "dealType",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Flat Rate">
                                                        Flat Rate
                                                    </SelectItem>
                                                    <SelectItem value="Affiliate">
                                                        Affiliate
                                                    </SelectItem>
                                                    <SelectItem value="UGC">UGC</SelectItem>
                                                    <SelectItem value="Sponsored Post">
                                                        Sponsored Post
                                                    </SelectItem>
                                                    <SelectItem value="Brand Partnership">
                                                        Brand Partnership
                                                    </SelectItem>
                                                    <SelectItem value="Revenue Share">
                                                        Revenue Share
                                                    </SelectItem>
                                                    <SelectItem value="Performance / Hybrid">
                                                        Performance / Hybrid
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900">
                                                {editedDeal.dealType}
                                            </p>
                                        )}
                                    </div>
                                    {/* Display rate based on deal type */}
                                    {editedDeal.dealType === "Flat Rate" ? (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-500 mb-2">
                                                Flat Rate
                                            </p>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editedDeal.value}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            "value",
                                                            Number(e.target.value)
                                                        )
                                                    }
                                                    className="text-lg font-semibold"
                                                />
                                            ) : (
                                                <p className="text-lg font-semibold text-gray-900">
                                                    ${editedDeal.value.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    ) : editedDeal.dealType === "Performance / Hybrid" ? (
                                        <>
                                            {editedDeal.performanceRate && (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Performance Rate
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedDeal.performanceRate || ""}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "performanceRate",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="e.g., $10 per sale"
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {editedDeal.performanceRate || "Not set"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {editedDeal.value > 0 && (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Estimated Value
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            value={editedDeal.value}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "value",
                                                                    Number(e.target.value)
                                                                )
                                                            }
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            ${editedDeal.value.toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : editedDeal.dealType === "Affiliate" || editedDeal.dealType === "Revenue Share" ? (
                                        <>
                                            {editedDeal.performanceRate && (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        {editedDeal.dealType === "Affiliate" ? "Commission" : "Revenue Share"}
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedDeal.performanceRate || ""}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "performanceRate",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder={editedDeal.dealType === "Affiliate" ? "e.g., 10% or $5 per sale" : "e.g., 20%"}
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {editedDeal.performanceRate || "Not set"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {editedDeal.value > 0 && (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Estimated Value
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            value={editedDeal.value}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "value",
                                                                    Number(e.target.value)
                                                                )
                                                            }
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            ${editedDeal.value.toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Brand Partnership, Sponsored Post, UGC - can have either flat or performance */}
                                            {editedDeal.value > 0 && !editedDeal.performanceRate ? (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Flat Rate
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            value={editedDeal.value}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "value",
                                                                    Number(e.target.value)
                                                                )
                                                            }
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            ${editedDeal.value.toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : editedDeal.performanceRate ? (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Performance Rate
                                                    </p>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedDeal.performanceRate}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    "performanceRate",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="e.g., $10 per sale"
                                                            className="text-lg font-semibold"
                                                        />
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {editedDeal.performanceRate}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Rate
                                                    </p>
                                                    <p className="text-lg font-semibold text-gray-500">
                                                        Not set
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Status
                                        </p>
                                        {isEditing ? (
                                            <Select
                                                value={editedDeal.status}
                                                onValueChange={(
                                                    value: DealStatus
                                                ) =>
                                                    handleFieldChange(
                                                        "status",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="New Offer">
                                                        New Offer
                                                    </SelectItem>
                                                    <SelectItem value="Negotiating">
                                                        Negotiating
                                                    </SelectItem>
                                                    <SelectItem value="Contracting">
                                                        Contracting
                                                    </SelectItem>
                                                    <SelectItem value="Drafting">
                                                        Drafting
                                                    </SelectItem>
                                                    <SelectItem value="Live">
                                                        Live
                                                    </SelectItem>
                                                    <SelectItem value="Complete">
                                                        Complete
                                                    </SelectItem>
                                                    <SelectItem value="Archive">
                                                        Archive
                                                    </SelectItem>
                                                    <SelectItem value="Lost">
                                                        Lost
                                                    </SelectItem>
                                                    <SelectItem value="Abandoned">
                                                        Abandoned
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900">
                                                {editedDeal.status}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Due Date
                                        </p>
                                        {isEditing ? (
                                            <Input
                                                value={editedDeal.dueDate || ""}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        "dueDate",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Enter due date"
                                                className="text-lg font-semibold"
                                            />
                                        ) : (
                                            <p className="text-lg font-semibold">
                                                {editedDeal.dueDate}
                                            </p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Source
                                        </p>
                                        {isEditing ? (
                                            <Select
                                                value={editedDeal.source || "inbound"}
                                                onValueChange={(value) =>
                                                    handleFieldChange("source", value)
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="inbound">Inbound</SelectItem>
                                                    <SelectItem value="shared">Shared</SelectItem>
                                                    <SelectItem value="Repflow">Repflow</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900">
                                                {editedDeal.source
                                                    ? editedDeal.source.charAt(0).toUpperCase() + editedDeal.source.slice(1)
                                                    : "Inbound"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Time in Stage
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {(deal as any).timeInStage || "2 "}
                                            days
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Brand Contact */}
                            <div>
                                <h4 className="text-md font-medium mb-4 text-gray-700 ml-4">
                                    Brand Contact
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Contact Name
                                        </p>
                                        {isEditing ? (
                                            <Input
                                                value={editedContact.name}
                                                onChange={(e) => {
                                                    setEditedContact(prev => ({
                                                        ...prev,
                                                        name: e.target.value,
                                                    }));
                                                }}
                                                placeholder="Enter contact name"
                                                className="text-lg font-semibold"
                                            />
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900">
                                                {editedContact.name || "Not specified"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Contact Method
                                        </p>
                                        {isEditing ? (
                                            <Select
                                                value={editedContact.role}
                                                onValueChange={(value) => {
                                                    setEditedContact(prev => ({
                                                        ...prev,
                                                        role: value,
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Email">
                                                        Email
                                                    </SelectItem>
                                                    <SelectItem value="Phone">
                                                        Phone
                                                    </SelectItem>
                                                    <SelectItem value="LinkedIn">
                                                        LinkedIn
                                                    </SelectItem>
                                                    <SelectItem value="Slack">
                                                        Slack
                                                    </SelectItem>
                                                    <SelectItem value="Discord">
                                                        Discord
                                                    </SelectItem>
                                                    <SelectItem value="Other">
                                                        Other
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900">
                                                {editedContact.role || "Not specified"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Contact Information
                                        </p>
                                        {isEditing ? (
                                            <Input
                                                value={editedContact.email}
                                                onChange={(e) => {
                                                    setEditedContact(prev => ({
                                                        ...prev,
                                                        email: e.target.value,
                                                    }));
                                                }}
                                                placeholder="Enter email or phone"
                                                className="text-lg font-semibold"
                                            />
                                        ) : (
                                            <p className="text-lg font-semibold text-gray-900 overflow-hidden text-ellipsis">
                                                {editedContact.email || "Not specified"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Brand Comments */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Brand Comments
                                    </h3>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-700">
                                        {deal.comments || "No comments yet..."}
                                    </p>
                                </div>
                            </div>

                            {/* Internal Comments */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Internal Comments
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-figma-green-primary border-figma-green-primary hover:bg-figma-green-primary hover:text-bg-figma-green-primary"
                                    >
                                        <MessageCircle className="w-4 h-4 mr-1" />
                                        Add Comment
                                    </Button>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    {isEditing ? (
                                        <Textarea
                                            value={editedDeal.comments || ""}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    "comments",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Add internal comments..."
                                            className="min-h-[80px] text-sm"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700">
                                            {editedDeal.comments ||
                                                "No internal comments yet..."}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Deliverables */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Deliverables
                                    </h3>
                                    {isEditing && (
                                        <Button
                                            onClick={addDeliverable}
                                            variant="outline"
                                            size="sm"
                                            className="text-figma-green-primary border-figma-green-primary hover:bg-figma-green-primary hover:text-white"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Deliverable
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {editedDeal.deliverables.map(
                                        (item, index) => {
                                            const content = item.contents?.[0];
                                            if (!content) return null;
                                            return (
                                                <div
                                                    key={index}
                                                    className="border border-gray-200 rounded-lg p-4"
                                                >
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-4 h-4 flex items-center justify-center text-figma-green-primary">
                                                            {getContentIcon(
                                                                content.contentType
                                                            )}
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <Select
                                                                    value={
                                                                        content.contentType
                                                                    }
                                                                    onValueChange={(
                                                                        value
                                                                    ) =>
                                                                        handleDeliverableChange(
                                                                            index,
                                                                            "contentType",
                                                                            value
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-32">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="youtube">
                                                                            YouTube
                                                                        </SelectItem>
                                                                        <SelectItem value="tiktok">
                                                                            TikTok
                                                                        </SelectItem>
                                                                        <SelectItem value="instagram">
                                                                            Instagram
                                                                        </SelectItem>
                                                                        <SelectItem value="twitter">
                                                                            Twitter
                                                                        </SelectItem>
                                                                        <SelectItem value="video">
                                                                            Video
                                                                        </SelectItem>
                                                                        <SelectItem value="podcast">
                                                                            Podcast
                                                                        </SelectItem>
                                                                        <SelectItem value="blog">
                                                                            Blog
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Input
                                                                    value={
                                                                        content.text
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleDeliverableChange(
                                                                            index,
                                                                            "text",
                                                                            e.target
                                                                                .value
                                                                        )
                                                                    }
                                                                    placeholder="Deliverable description"
                                                                    className="flex-1"
                                                                />
                                                                <Button
                                                                    onClick={() =>
                                                                        removeDeliverable(
                                                                            index
                                                                        )
                                                                    }
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-700 font-medium">
                                                                {content.text}
                                                            </p>
                                                        )}
                                                    </div>

                                                {/* Stage-specific fields */}
                                                {deal.status === "Drafting" && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-gray-500">
                                                            Draft Link
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder="Paste draft link here..."
                                                                className="text-sm h-8"
                                                                value={
                                                                    item.draftLink ||
                                                                    ""
                                                                }
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8"
                                                            >
                                                                <Link className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {deal.status === "Complete" && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-gray-500">
                                                            Invoice/Tracking
                                                            Link
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder="Paste invoice/tracking link here..."
                                                                className="text-sm h-8"
                                                                value={
                                                                    item.invoiceLink ||
                                                                    ""
                                                                }
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8"
                                                            >
                                                                <Receipt className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            {/* Brief */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Brief
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        className="text-figma-green-primary p-0 h-auto"
                                    >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        View Brief
                                    </Button>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Brief Link
                                                </p>
                                                {isEditing ? (
                                                    <Input
                                                        value={
                                                            editedDeal.brief
                                                                .link
                                                        }
                                                        onChange={(e) =>
                                                            setEditedDeal(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    brief: {
                                                                        ...prev.brief,
                                                                        link: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                })
                                                            )
                                                        }
                                                        placeholder="Enter brief link"
                                                        className="text-sm"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-500">
                                                        {editedDeal.brief.link}
                                                    </p>
                                                )}
                                            </div>
                                            {!isEditing && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Promo Code
                                                </p>
                                                {isEditing ? (
                                                    <Input
                                                        value={
                                                            editedDeal.brief
                                                                .promoCode
                                                        }
                                                        onChange={(e) =>
                                                            setEditedDeal(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    brief: {
                                                                        ...prev.brief,
                                                                        promoCode:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    },
                                                                })
                                                            )
                                                        }
                                                        placeholder="Enter promo code"
                                                        className="text-sm"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-500">
                                                        {
                                                            editedDeal.brief
                                                                .promoCode
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                            {!isEditing && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Communication History */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                    Communication History
                                </h3>
                                <div className="space-y-4">
                                    {deal.communicationHistory.map(
                                        (msg, index) => (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-lg ${
                                                    msg.isYou
                                                        ? "bg-indigo-50"
                                                        : "bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                                src={
                                                                    msg.avatar ||
                                                                    "/placeholder.svg"
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {msg.sender.slice(
                                                                    0,
                                                                    2
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-gray-900">
                                                            {msg.sender}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {formatTimestamp(
                                                            msg.timestamp
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 ml-11">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="w-[30%] p-6 space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                Quick Actions
                            </h3>

                            {/* Show helper when email actions are blocked */}
                            {!hasContactEmail && getQuickActions()[
                                deal.status as keyof ReturnType<typeof getQuickActions>
                            ]?.some((a) => a.requiresEmail) && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                                    Add a contact with an email address to enable email actions.
                                </p>
                            )}

                            <div className="space-y-3">
                                {/* Stage-specific actions */}
                                {getQuickActions()[
                                    deal.status as keyof ReturnType<typeof getQuickActions>
                                ]?.map((action, index) => {
                                    const isDisabled = isSendingEmail || (action.requiresEmail && !hasContactEmail);
                                    return (
                                        <Button
                                            key={index}
                                            onClick={action.onClick}
                                            variant="outline"
                                            className="w-full justify-start bg-white border-gray-200 hover:bg-gray-50"
                                            disabled={isDisabled}
                                            title={action.requiresEmail && !hasContactEmail ? "Requires a contact with an email address" : undefined}
                                        >
                                            <span className="mr-2">
                                                {action.icon}
                                            </span>
                                            {action.title}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Key Contacts */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                Key Contacts
                            </h3>
                            <div className="space-y-4">
                                {deal.contact ? (
                                    <div
                                        className="flex items-center gap-3"
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src="/placeholder.svg"
                                            />
                                            <AvatarFallback>
                                                {deal.contact.name?.slice(0, 2) || 'NA'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {deal.contact.name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {deal.contact.title || deal.contact.role}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {deal.contact.email ||
                                                    "No email"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No contact assigned</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* Email Preview Modal */}
            <EmailPreviewModal
                open={showEmailPreview}
                onOpenChange={setShowEmailPreview}
                emailRequest={pendingEmailRequest}
                actionType={pendingActionType || "Accept"}
                contactInfo={pendingContactInfo}
                onSendEmail={handleSendEmailFromPreview}
            />

            {/* Brand Detail Sheet */}
            <BrandDetailSheet
                brand={selectedBrand}
                open={isBrandSheetOpen}
                onOpenChange={setIsBrandSheetOpen}
                onUpdate={async () => {
                    const refreshedDeal = await updateDeal(deal.uuid, editedDeal);
                    onDealUpdate?.(refreshedDeal);
                }}
            />
        </Dialog>
    );
}
