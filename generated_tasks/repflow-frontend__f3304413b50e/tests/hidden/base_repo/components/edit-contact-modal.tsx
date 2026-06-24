"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ContactCreateData, updateContact } from "@/lib/api";
import { BrandContact } from "@/lib/models";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EditContactModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    contact: BrandContact | null;
    brandId?: string;
};

type EditContactFormData = {
    name: string;
    email: string;
    title: string;
    phone: string;
    is_agency_contact: boolean;
    notes: string;
};

export function EditContactModal({ open, onOpenChange, onSuccess, contact, brandId }: EditContactModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<EditContactFormData>({
        name: "",
        email: "",
        title: "",
        phone: "",
        is_agency_contact: false,
        notes: "",
    });

    // Reset form data when contact changes or modal opens
    useEffect(() => {
        if (open && contact) {
            setFormData({
                name: contact.name || "",
                email: contact.email || "",
                title: contact.title || "",
                phone: contact.phone || "",
                is_agency_contact: contact.isAgencyContact || false,
                notes: contact.notes || "",
            });
        }
    }, [open, contact]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!contact) {
            toast.error("No contact selected");
            return;
        }
        
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        
        try {
            setIsSubmitting(true);
            
            // Build update payload - only include fields that have values
            const updatePayload: Partial<ContactCreateData> = {
                name: formData.name.trim(),
                email: formData.email.trim(),
            };
            
            if (formData.title?.trim()) {
                updatePayload.title = formData.title.trim();
            }
            if (formData.phone?.trim()) {
                updatePayload.phone = formData.phone.trim();
            }
            updatePayload.is_agency_contact = formData.is_agency_contact;
            if (formData.notes?.trim()) {
                updatePayload.notes = formData.notes.trim();
            }
            
            await updateContact(contact.uuid, updatePayload);
            toast.success("Contact updated successfully");
            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error updating contact:", error);
            toast.error(error.message || "Failed to update contact");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onOpenChange(false);
        }
    };

    if (!contact) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-sage-primary" />
                        Edit Contact
                    </DialogTitle>
                    <DialogDescription>
                        Update contact information for {contact.name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Name *</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-email">Email *</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Job Title</Label>
                        <Input
                            id="edit-title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Marketing Manager"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                            id="edit-phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 234 567 8900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes</Label>
                        <Textarea
                            id="edit-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any notes about this contact..."
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2 py-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="edit-is_agency">Contact type</Label>
                                <p className="text-xs text-gray-500 mt-0.5">Brand Direct (off) or Agency (on)</p>
                            </div>
                            <Switch
                                id="edit-is_agency"
                                checked={formData.is_agency_contact}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_agency_contact: checked })}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {formData.is_agency_contact ? "Agency" : "Brand Direct"}
                        </p>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
