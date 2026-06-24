"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BrandCreateData, BrandDeal, getBrandConversations, getBrandDeals, unlinkContactFromBrand, updateBrand } from "@/lib/api";
import { Brand, BrandContact, ConversationSummary } from "@/lib/models";
import { formatRelativeTime } from "@/lib/utils";
import {
    AlertTriangle,
    Briefcase,
    Building2,
    Calendar,
    DollarSign,
    ExternalLink,
    Loader2,
    Mail,
    MessageSquare,
    Pencil,
    Phone,
    Plus,
    Save,
    Star,
    Trash2,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EditContactModal } from "./edit-contact-modal";
import { NewContactModal } from "./new-contact-modal";

type BrandDetailSheetProps = {
    brand: Brand | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
};

export function BrandDetailSheet({
    brand,
    open,
    onOpenChange,
    onUpdate,
}: BrandDetailSheetProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<BrandCreateData>>({});
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    
    // Deals tab state
    const [deals, setDeals] = useState<BrandDeal[]>([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [dealsError, setDealsError] = useState<string | null>(null);
    
    // Messages tab state
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [conversationsError, setConversationsError] = useState<string | null>(null);
    
    // Contact deletion state
    const [contactToDelete, setContactToDelete] = useState<{ uuid: string; name: string } | null>(null);
    const [isDeletingContact, setIsDeletingContact] = useState(false);
    
    // Contact editing state
    const [contactToEdit, setContactToEdit] = useState<BrandContact | null>(null);

    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name,
                website: brand.website,
                category: brand.category,
                logo_url: brand.logoUrl,
                is_agency: brand.isAgency,
                agency_name: brand.agencyName,
                email_domain: brand.emailDomain,
                notes: brand.notes,
            });
        }
    }, [brand]);

    const handleSave = async () => {
        if (!brand) return;

        try {
            setIsSaving(true);
            await updateBrand(brand.uuid, formData);
            toast.success("Brand updated successfully");
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error("Error updating brand:", error);
            toast.error("Failed to update brand");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (brand) {
            setFormData({
                name: brand.name,
                website: brand.website,
                category: brand.category,
                logo_url: brand.logoUrl,
                is_agency: brand.isAgency,
                agency_name: brand.agencyName,
                email_domain: brand.emailDomain,
                notes: brand.notes,
            });
        }
        setIsEditing(false);
    };

    const formatAmount = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Fetch deals for the brand
    const fetchDeals = async () => {
        if (!brand) return;
        setLoadingDeals(true);
        setDealsError(null);
        try {
            const data = await getBrandDeals(brand.uuid);
            setDeals(data);
        } catch (error) {
            console.error("Error fetching deals:", error);
            setDealsError("Failed to load deals");
        } finally {
            setLoadingDeals(false);
        }
    };

    // Fetch conversations for the brand
    const fetchConversations = async () => {
        if (!brand) return;
        setLoadingConversations(true);
        setConversationsError(null);
        try {
            const data = await getBrandConversations(brand.uuid);
            setConversations(data);
        } catch (error) {
            console.error("Error fetching conversations:", error);
            setConversationsError("Failed to load messages");
        } finally {
            setLoadingConversations(false);
        }
    };

    // Handle removing a contact from the brand
    const handleRemoveContact = async () => {
        if (!brand || !contactToDelete) return;
        
        setIsDeletingContact(true);
        try {
            await unlinkContactFromBrand(brand.uuid, contactToDelete.uuid);
            toast.success(`${contactToDelete.name} removed from ${brand.name}`);
            onUpdate?.();
        } catch (error) {
            console.error("Error removing contact:", error);
            toast.error("Failed to remove contact");
        } finally {
            setIsDeletingContact(false);
            setContactToDelete(null);
        }
    };

    // Handle contact creation success
    const handleContactCreated = () => {
        setShowAddContactModal(false);
        toast.success("Contact created successfully");
        onUpdate?.();
    };

    // Get status color for deals
    const getStatusColor = (status: string) => {
        const statusColors: Record<string, string> = {
            "New Offer": "bg-blue-50 text-blue-700 border-blue-200",
            "Negotiating": "bg-yellow-50 text-yellow-700 border-yellow-200",
            "Contracting": "bg-orange-50 text-orange-700 border-orange-200",
            "Drafting": "bg-purple-50 text-purple-700 border-purple-200",
            "Live": "bg-green-50 text-green-700 border-green-200",
            "Complete": "bg-emerald-50 text-emerald-700 border-emerald-200",
            "Archive": "bg-gray-50 text-gray-700 border-gray-200",
            "Lost": "bg-red-50 text-red-700 border-red-200",
            "Abandoned": "bg-gray-100 text-gray-500 border-gray-300",
        };
        return statusColors[status] || "bg-gray-50 text-gray-700 border-gray-200";
    };

    if (!brand) return null;

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-sage-primary/10 flex items-center justify-center">
                                    {brand.logoUrl ? (
                                        <img
                                            src={brand.logoUrl}
                                            alt={brand.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="h-6 w-6 text-sage-primary" />
                                    )}
                                </div>
                                <div>
                                    <SheetTitle className="text-xl">{brand.name}</SheetTitle>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge
                                            variant="outline"
                                            className={brand.isAgency
                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                            }
                                        >
                                            {brand.isAgency ? "Agency" : "Direct Brand"}
                                        </Badge>
                                        {brand.category && (
                                            <Badge variant="outline">{brand.category}</Badge>
                                        )}
                                    </div>
                                    <SheetDescription className="sr-only">
                                        Brand details and contact information for {brand.name}
                                    </SheetDescription>
                                </div>
                            </div>

                        </div>
                    </SheetHeader>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-b">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-green-600">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-lg font-bold">{formatAmount(brand.totalRevenue)}</span>
                            </div>
                            <p className="text-xs text-gray-500">Total Revenue</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-600">
                                <Briefcase className="h-4 w-4" />
                                <span className="text-lg font-bold">{brand.dealCount}</span>
                            </div>
                            <p className="text-xs text-gray-500">Deals</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-purple-600">
                                <Users className="h-4 w-4" />
                                <span className="text-lg font-bold">{brand.contactsCount}</span>
                            </div>
                            <p className="text-xs text-gray-500">Contacts</p>
                        </div>
                    </div>

                    <Tabs defaultValue="contacts" className="mt-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="contacts">
                                <Users className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Contacts</span>
                            </TabsTrigger>
                            <TabsTrigger value="details">
                                <Building2 className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Details</span>
                            </TabsTrigger>
                            <TabsTrigger value="deals" onClick={fetchDeals}>
                                <Briefcase className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Deals</span>
                            </TabsTrigger>
                            <TabsTrigger value="messages" onClick={fetchConversations}>
                                <MessageSquare className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Messages</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Contacts Tab */}
                        <TabsContent value="contacts" className="mt-4 space-y-4">
                            <div className="flex justify-end">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowAddContactModal(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Contact
                                </Button>
                            </div>
                            
                            {brand.contacts && brand.contacts.length > 0 ? (
                                brand.contacts.map((contact) => (
                                    <div
                                        key={contact.uuid}
                                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-gray-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">{contact.name}</p>
                                                        {contact.isPrimary && (
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                        )}
                                                        {contact.isAgencyContact && (
                                                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                                Agency
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {contact.title && (
                                                        <p className="text-sm text-gray-500">{contact.title}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-500 hover:text-sage-primary hover:bg-sage-primary/10"
                                                    onClick={() => setContactToEdit(contact)}
                                                    title="Edit contact"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setContactToDelete({ uuid: contact.uuid, name: contact.name })}
                                                    title="Remove contact"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
                                            <a
                                                href={`mailto:${contact.email}`}
                                                className="flex items-center gap-1.5 hover:text-sage-primary"
                                            >
                                                <Mail className="h-4 w-4" />
                                                {contact.email}
                                            </a>
                                            {contact.phone && (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="h-4 w-4" />
                                                    {contact.phone}
                                                </span>
                                            )}
                                        </div>
                                        {contact.role && (
                                            <p className="mt-2 text-xs text-gray-500">
                                                Role: {contact.role}
                                            </p>
                                        )}
                                        {contact.notes && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                                                <p className="text-xs text-gray-400 mb-1 uppercase font-semibold">Notes</p>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p>No contacts linked to this brand</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={() => setShowAddContactModal(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Contact
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        {/* Details Tab */}
                        <TabsContent value="details" className="mt-4 space-y-4">
                            {!isEditing && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit Details
                                    </Button>
                                </div>
                            )}
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Brand Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ""}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            value={formData.website || ""}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Input
                                            id="category"
                                            value={formData.category || ""}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="e.g., Tech, Fashion, Gaming"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="is_agency">Brand type</Label>
                                                <p className="text-xs text-gray-500 mt-0.5">Direct (off) or Agency (on)</p>
                                            </div>
                                            <Switch
                                                id="is_agency"
                                                checked={formData.is_agency || false}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_agency: checked })}
                                            />
                                        </div>
                                    </div>
                                    {formData.is_agency && (
                                        <div className="space-y-2">
                                            <Label htmlFor="agency_name">Agency Name</Label>
                                            <Input
                                                id="agency_name"
                                                value={formData.agency_name || ""}
                                                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="email_domain">Email Domain</Label>
                                        <Input
                                            id="email_domain"
                                            value={formData.email_domain || ""}
                                            onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
                                            placeholder="e.g., example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea
                                            id="notes"
                                            value={formData.notes || ""}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Add notes about this brand..."
                                            rows={4}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            className="flex-1 bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            <Save className="h-4 w-4 mr-1" />
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </Button>
                                        <Button variant="outline" onClick={handleCancel}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Website</span>
                                        {brand.website ? (
                                            <a
                                                href={brand.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-sage-primary hover:underline flex items-center gap-1"
                                            >
                                                {brand.website.replace(/^https?:\/\//, '')}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-400">Not set</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Category</span>
                                        {brand.category ? (
                                            <Badge variant="outline">{brand.category}</Badge>
                                        ) : (
                                            <span className="text-sm text-gray-400">Not set</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Email Domain</span>
                                        {brand.emailDomain ? (
                                            <span className="text-sm text-gray-900 font-medium">@{brand.emailDomain}</span>
                                        ) : (
                                            <span className="text-sm text-gray-400">Not set</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Brand type</span>
                                        <span className="text-sm text-gray-900 font-medium">{brand.isAgency ? "Agency" : "Direct"}</span>
                                    </div>

                                    {brand.isAgency && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-600">Parent Agency</span>
                                            {brand.agencyName ? (
                                                <span className="text-sm text-gray-900 font-medium">{brand.agencyName}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">Not set</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Current Status</span>
                                        {brand.currentStatus ? (
                                            <Badge variant="outline">{brand.currentStatus}</Badge>
                                        ) : (
                                            <span className="text-sm text-gray-400">No active deals</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Last Contact</span>
                                        {brand.lastTouchpoint ? (
                                            <span className="text-sm text-gray-900 flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatRelativeTime(brand.lastTouchpoint)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">Never</span>
                                        )}
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600 block mb-1">Notes</span>
                                        {brand.notes ? (
                                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{brand.notes}</p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No notes added yet</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Created</span>
                                        <span className="text-sm text-gray-900">
                                            {new Date(brand.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Deals Tab */}
                        <TabsContent value="deals" className="mt-4">
                            {loadingDeals ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-sage-primary" />
                                </div>
                            ) : dealsError ? (
                                <div className="text-center py-8 text-red-500">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                                    <p>{dealsError}</p>
                                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchDeals}>
                                        Retry
                                    </Button>
                                </div>
                            ) : deals.length > 0 ? (
                                <div className="space-y-3">
                                    {deals.map((deal) => (
                                        <div
                                            key={deal.uuid}
                                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{deal.title}</p>
                                                    <p className="text-sm text-gray-500">{deal.brand?.name ?? 'Unknown Company'}</p>
                                                </div>
                                                <Badge variant="outline" className={getStatusColor(deal.status)}>
                                                    {deal.status}
                                                </Badge>
                                            </div>
                                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                                    <DollarSign className="h-4 w-4" />
                                                    {formatAmount(deal.value)}
                                                </span>
                                                <span className="text-gray-400">|</span>
                                                <span>{deal.dealType}</span>
                                                {deal.dateReceived && (
                                                    <>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(deal.dateReceived).toLocaleDateString()}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p>No deals linked to this brand yet</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Link deals to this brand to see them here
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Messages Tab */}
                        <TabsContent value="messages" className="mt-4">
                            {loadingConversations ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-sage-primary" />
                                </div>
                            ) : conversationsError ? (
                                <div className="text-center py-8 text-red-500">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                                    <p>{conversationsError}</p>
                                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchConversations}>
                                        Retry
                                    </Button>
                                </div>
                            ) : conversations.length > 0 ? (
                                <div className="space-y-3">
                                    {conversations.map((conversation) => (
                                        <a
                                            key={conversation.uuid}
                                            href={`/creator/messages?conversation=${conversation.uuid}`}
                                            className="block p-4 border border-gray-200 rounded-lg hover:border-sage-primary hover:bg-sage-primary/5 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <MessageSquare className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{conversation.contactName}</p>
                                                        {conversation.contactEmail && (
                                                            <p className="text-sm text-gray-500">{conversation.contactEmail}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {conversation.unreadCount > 0 && (
                                                    <Badge className="bg-sage-primary text-white">
                                                        {conversation.unreadCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            {conversation.lastMessage && (
                                                <p className="mt-2 text-sm text-gray-600 truncate">
                                                    {conversation.lastMessage}
                                                </p>
                                            )}
                                            {conversation.lastMessageAt && (
                                                <p className="mt-1 text-xs text-gray-400">
                                                    {formatRelativeTime(conversation.lastMessageAt)}
                                                </p>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p>No message history found</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Messages with contacts from this brand will appear here
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            {/* Add Contact Modal */}
            <NewContactModal
                open={showAddContactModal}
                onOpenChange={setShowAddContactModal}
                onSuccess={handleContactCreated}
                defaultBrandId={brand?.uuid}
            />

            {/* Edit Contact Modal */}
            <EditContactModal
                open={!!contactToEdit}
                onOpenChange={(open) => !open && setContactToEdit(null)}
                onSuccess={() => {
                    setContactToEdit(null);
                    onUpdate?.();
                }}
                contact={contactToEdit}
                brandId={brand?.uuid}
            />

            {/* Delete Contact Confirmation Dialog */}
            <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{contactToDelete?.name}</strong> from <strong>{brand?.name}</strong>?
                            This will unlink the contact from this brand, but will not delete the contact entirely.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingContact}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveContact}
                            disabled={isDeletingContact}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isDeletingContact ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                "Remove"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
