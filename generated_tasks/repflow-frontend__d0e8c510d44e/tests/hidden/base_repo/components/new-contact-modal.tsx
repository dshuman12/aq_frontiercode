"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ContactCreateData, createContact, getBrands } from "@/lib/api";
import { Brand } from "@/lib/models";
import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type NewContactModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    defaultBrandId?: string;
};

export function NewContactModal({ open, onOpenChange, onSuccess, defaultBrandId }: NewContactModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [formData, setFormData] = useState<ContactCreateData>({
        name: "", email: "", title: "", phone: "",
        is_agency_contact: false, brand_id: defaultBrandId || "", role: "", is_primary: false, notes: "",
    });

    useEffect(() => {
        if (open) {
            getBrands({ limit: 100 }).then(res => setBrands(res.brands)).catch(console.error);
            if (defaultBrandId) setFormData(f => ({ ...f, brand_id: defaultBrandId }));
        }
    }, [open, defaultBrandId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error("Name and email are required"); return;
        }
        try {
            setIsSubmitting(true);
            await createContact(formData);
            setFormData({ name: "", email: "", title: "", phone: "", is_agency_contact: false, brand_id: "", role: "", is_primary: false, notes: "" });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to create contact");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-sage-primary" />
                        Add New Contact
                    </DialogTitle>
                    <DialogDescription>Add a new contact to your CRM.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Job Title</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Marketing Manager" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="space-y-2">
                        <Label>Link to Brand</Label>
                        <Select value={formData.brand_id || "unlinked"} onValueChange={(v) => setFormData({ ...formData, brand_id: v === "unlinked" ? "" : v })}>
                            <SelectTrigger><SelectValue placeholder="Select a brand (optional)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unlinked">No brand</SelectItem>
                                {brands.map((b) => <SelectItem key={b.uuid} value={b.uuid}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {formData.brand_id && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role at Brand</Label>
                                <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g., Main Contact" />
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <Label htmlFor="is_primary">Primary Contact</Label>
                                <Switch id="is_primary" checked={formData.is_primary} onCheckedChange={(c) => setFormData({ ...formData, is_primary: c })} />
                            </div>
                        </>
                    )}
                    <div className="flex items-center justify-between py-2">
                        <Label htmlFor="is_agency">Agency Contact</Label>
                        <Switch id="is_agency" checked={formData.is_agency_contact} onCheckedChange={(c) => setFormData({ ...formData, is_agency_contact: c })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any notes about this contact..." rows={3} />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Contact"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
