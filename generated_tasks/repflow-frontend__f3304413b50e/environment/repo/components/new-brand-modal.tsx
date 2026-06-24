"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BrandCreateData, createBrand } from "@/lib/api";
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type NewBrandModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

const CATEGORIES = [
    "Tech", "Fashion", "Gaming", "Finance", "Health & Wellness",
    "Food & Beverage", "Travel", "Entertainment", "Education",
    "Sports", "Beauty", "Automotive", "Real Estate", "Other",
];

export function NewBrandModal({ open, onOpenChange, onSuccess }: NewBrandModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<BrandCreateData>({
        name: "", website: "", category: "", logo_url: "",
        is_agency: false, agency_name: "", email_domain: "", notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { toast.error("Brand name is required"); return; }
        try {
            setIsSubmitting(true);
            await createBrand(formData);
            setFormData({ name: "", website: "", category: "", logo_url: "", is_agency: false, agency_name: "", email_domain: "", notes: "" });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to create brand");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-sage-primary" />
                        Add New Brand
                    </DialogTitle>
                    <DialogDescription>Add a new brand to your CRM.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Brand Name *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Nike" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <Label htmlFor="is_agency">Is this an agency?</Label>
                        <Switch id="is_agency" checked={formData.is_agency} onCheckedChange={(c) => setFormData({ ...formData, is_agency: c })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Brand"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
