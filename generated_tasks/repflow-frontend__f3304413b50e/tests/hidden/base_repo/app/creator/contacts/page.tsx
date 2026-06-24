"use client";

import { BrandDetailSheet } from "@/components/brand-detail-sheet";
import { NewBrandModal } from "@/components/new-brand-modal";
import { NewContactModal } from "@/components/new-contact-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BrandQueryParams,
  deleteBrand,
  getBrand,
  getBrands,
} from "@/lib/api";
import { Brand } from "@/lib/models";
import { sortBrandsByRevenue } from "@/lib/sort-utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Filter,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Users
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ContactsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);
    const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
    const [filters] = useState<BrandQueryParams>({});
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [agencyFilter, setAgencyFilter] = useState<boolean | null>(null);
    const [totalBrands, setTotalBrands] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>("updated_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load brands
    const loadBrands = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams: BrandQueryParams = {
                page,
                limit: 50,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters,
            };
            if (debouncedSearchQuery) {
                queryParams.search = debouncedSearchQuery;
            }
            if (categoryFilter) {
                queryParams.category = categoryFilter;
            }
            if (agencyFilter !== null) {
                queryParams.is_agency = agencyFilter;
            }
            const response = await getBrands(queryParams);
            // When sorting by revenue, sort numerically on the client so order is correct
            // (backend may sort as string; $10,000 would come before $2,000 alphabetically)
            const brandsToSet =
                sortBy === "total_revenue"
                    ? sortBrandsByRevenue(response.brands, sortOrder)
                    : response.brands;
            setBrands(brandsToSet);
            setTotalBrands(response.total);
            setHasMore(response.has_more);
        } catch (err: any) {
            console.error("Error loading brands:", err);
            setError(err.message || "Failed to load brands");
        } finally {
            setLoading(false);
        }
    }, [page, sortBy, sortOrder, filters, debouncedSearchQuery, categoryFilter, agencyFilter]);

    useEffect(() => {
        loadBrands();
    }, [loadBrands]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("desc");
        }
        setPage(1); // Reset to first page when sorting changes
    };

    // Toggle brand expansion
    const toggleBrandExpansion = async (brandId: string) => {
        const newExpanded = new Set(expandedBrands);
        if (newExpanded.has(brandId)) {
            newExpanded.delete(brandId);
        } else {
            newExpanded.add(brandId);
            // Load brand details with contacts if not already loaded
            try {
                const brandWithContacts = await getBrand(brandId);
                setBrands(prev => prev.map(b => 
                    b.uuid === brandId ? { ...b, contacts: brandWithContacts.contacts } : b
                ));
            } catch (error) {
                console.error("Error loading brand contacts:", error);
            }
        }
        setExpandedBrands(newExpanded);
    };

    // Open brand detail sheet
    const openBrandDetail = async (brand: Brand) => {
        try {
            const brandWithContacts = await getBrand(brand.uuid);
            setSelectedBrand(brandWithContacts);
            setIsDetailSheetOpen(true);
        } catch (error) {
            console.error("Error loading brand details:", error);
            toast.error("Failed to load brand details");
        }
    };

    // Handle brand deletion
    const handleDeleteBrand = async (brandId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this brand? All contacts will be unlinked.")) {
            return;
        }
        try {
            await deleteBrand(brandId);
            toast.success("Brand deleted successfully");
            loadBrands();
        } catch (error) {
            console.error("Error deleting brand:", error);
            toast.error("Failed to delete brand");
        }
    };

    // Handle brand creation success
    const handleBrandCreated = () => {
        setIsNewBrandModalOpen(false);
        loadBrands();
        toast.success("Brand created successfully");
    };

    // Handle brand update success
    const handleBrandUpdate = async () => {
        await loadBrands();
        if (selectedBrand) {
            try {
                const refreshed = await getBrand(selectedBrand.uuid);
                setSelectedBrand(refreshed);
            } catch (error) {
                console.error("Error refreshing selected brand:", error);
            }
        }
    };

    // Handle contact creation success
    const handleContactCreated = () => {
        setIsNewContactModalOpen(false);
        handleBrandUpdate();
        toast.success("Contact created successfully");
    };

    // Get status badge color
    const getStatusBadgeClass = (status?: string) => {
        switch (status?.toLowerCase()) {
            case "active":
            case "live":
                return "bg-green-100 text-green-700 border-green-200";
            case "negotiating":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "new offer":
                return "bg-purple-100 text-purple-700 border-purple-200";
            case "complete":
                return "bg-gray-100 text-gray-700 border-gray-200";
            default:
                return "bg-gray-100 text-gray-500 border-gray-200";
        }
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatAmount = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Get unique categories from brands
    const categories = [...new Set(brands.map(b => b.category).filter(Boolean))];

    return (
        <>
            <div className="flex-1 px-4 pt-4 md:px-8 md:pt-8 space-y-6 bg-gray-50 min-h-screen">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Contacts
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your brand relationships and contacts
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search brands or contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-sage-primary/50 focus:border-transparent"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="bg-white border-gray-200 hover:bg-gray-50 w-full sm:w-auto justify-center"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsNewBrandModalOpen(true)}>
                                    <Building2 className="mr-2 h-4 w-4" />
                                    New Brand
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsNewContactModalOpen(true)}>
                                    <Users className="mr-2 h-4 w-4" />
                                    New Contact
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="bg-white border-gray-200 hover:bg-gray-50"
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                Type
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuCheckboxItem
                                checked={agencyFilter === null}
                                onCheckedChange={() => setAgencyFilter(null)}
                            >
                                All Types
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={agencyFilter === false}
                                onCheckedChange={() => setAgencyFilter(false)}
                            >
                                Direct Brands
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={agencyFilter === true}
                                onCheckedChange={() => setAgencyFilter(true)}
                            >
                                Agencies
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {categories.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="bg-white border-gray-200 hover:bg-gray-50"
                                >
                                    <Briefcase className="mr-2 h-4 w-4" />
                                    Category
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuCheckboxItem
                                    checked={categoryFilter === null}
                                    onCheckedChange={() => setCategoryFilter(null)}
                                >
                                    All Categories
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                {categories.map((category) => (
                                    <DropdownMenuCheckboxItem
                                        key={category}
                                        checked={categoryFilter === category}
                                        onCheckedChange={() => setCategoryFilter(category || null)}
                                    >
                                        {category}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <div className="ml-auto text-sm text-gray-500 w-full sm:w-auto text-right">
                        {totalBrands} brand{totalBrands !== 1 ? "s" : ""}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sage-primary/10 rounded-lg">
                                    <Building2 className="h-5 w-5 text-sage-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Brands</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalBrands}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatAmount(brands.reduce((sum, b) => sum + b.totalRevenue, 0))}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Deals</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {brands.reduce((sum, b) => sum + b.dealCount, 0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Agencies</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {brands.filter(b => b.isAgency).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading brands...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={loadBrands} variant="outline">
                                Retry
                            </Button>
                        </div>
                    </div>
                )}

                {/* Brands Table */}
                {!loading && !error && (
                    <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 min-w-[200px] cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("name")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Brand
                                                {sortBy === "name" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 min-w-[120px] cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("category")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Category
                                                {sortBy === "category" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("type")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Type
                                                {sortBy === "type" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-gray-700 h-12">Contacts</TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 text-right cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("total_revenue")}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Revenue
                                                {sortBy === "total_revenue" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 text-center cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("deal_count")}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Deals
                                                {sortBy === "deal_count" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 min-w-[120px] cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("last_touchpoint")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Last Contact
                                                {sortBy === "last_touchpoint" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="font-semibold text-gray-700 cursor-pointer hover:text-sage-primary transition-colors h-12"
                                            onClick={() => handleSort("status")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Status
                                                {sortBy === "status" ? (
                                                    sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-10 h-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>

                                {brands.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Building2 className="h-8 w-8 text-gray-300" />
                                                <p>No brands found</p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsNewBrandModalOpen(true)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add your first brand
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    brands.map((brand) => (
                                        <>
                                            {/* Brand Row */}
                                            <TableRow
                                                key={brand.uuid}
                                                className="cursor-pointer hover:bg-gray-50 transition-colors group"
                                                onClick={() => openBrandDetail(brand)}
                                            >
                                                <TableCell className="py-3 pl-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleBrandExpansion(brand.uuid);
                                                        }}
                                                    >
                                                        {expandedBrands.has(brand.uuid) ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-500" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-sage-primary/10 flex items-center justify-center">
                                                            {brand.logoUrl ? (
                                                                <img
                                                                    src={brand.logoUrl}
                                                                    alt={brand.name}
                                                                    className="w-8 h-8 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <Building2 className="h-4 w-4 text-sage-primary" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{brand.name}</p>
                                                            {brand.website && (
                                                                <a
                                                                    href={brand.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-gray-500 hover:text-sage-primary flex items-center gap-1"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {brand.website.replace(/^https?:\/\//, '')}
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {brand.category ? (
                                                        <Badge variant="outline" className="font-normal">
                                                            {brand.category}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Badge
                                                        variant="outline"
                                                        className={brand.isAgency
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }
                                                    >
                                                        {brand.isAgency ? "Agency" : "Direct"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <Users className="h-4 w-4" />
                                                        <span>{brand.contactsCount}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-right font-medium text-gray-900">
                                                    {formatCurrency(brand.totalRevenue)}
                                                </TableCell>
                                                <TableCell className="py-3 text-center text-gray-600">
                                                    {brand.dealCount}
                                                </TableCell>
                                                <TableCell className="py-3 text-gray-500 text-sm">
                                                    {brand.lastTouchpoint
                                                        ? formatRelativeTime(brand.lastTouchpoint)
                                                        : "-"}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {brand.currentStatus ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={getStatusBadgeClass(brand.currentStatus)}
                                                        >
                                                            {brand.currentStatus}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3 pr-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openBrandDetail(brand);
                                                                }}
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit Brand
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={(e) => handleDeleteBrand(brand.uuid, e)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete Brand
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded Contacts */}
                                            {expandedBrands.has(brand.uuid) && brand.contacts && brand.contacts.length > 0 && (
                                                brand.contacts.map((contact) => (
                                                    <TableRow
                                                        key={contact.uuid}
                                                        className="bg-gray-50/50 hover:bg-gray-100/50"
                                                    >
                                                        <TableCell className="py-2 pl-4"></TableCell>
                                                        <TableCell className="py-2 pl-12" colSpan={2}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                                                                    <Users className="h-3.5 w-3.5 text-gray-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-medium text-gray-800 text-sm">
                                                                            {contact.name}
                                                                        </p>
                                                                        {contact.isPrimary && (
                                                                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                                        )}
                                                                    </div>
                                                                    {contact.title && (
                                                                        <p className="text-xs text-gray-500">{contact.title}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {contact.isAgencyContact && (
                                                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                                    Agency
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2" colSpan={2}>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                <a
                                                                    href={`mailto:${contact.email}`}
                                                                    className="hover:text-sage-primary"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {contact.email}
                                                                </a>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2" colSpan={2}>
                                                            {contact.phone && (
                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                    <span>{contact.phone}</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-xs text-gray-500">
                                                            {contact.role && (
                                                                <span>{contact.role}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2"></TableCell>
                                                    </TableRow>
                                                ))
                                            )}

                                            {/* Empty contacts state */}
                                            {expandedBrands.has(brand.uuid) && (!brand.contacts || brand.contacts.length === 0) && (
                                                <TableRow className="bg-gray-50/50">
                                                    <TableCell className="py-4 pl-4"></TableCell>
                                                    <TableCell className="py-4 pl-12 text-gray-500 text-sm" colSpan={9}>
                                                        No contacts linked to this brand
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    </Card>
                )}

                {/* Pagination */}
                {!loading && !error && hasMore && (
                    <div className="flex justify-center py-4">
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => p + 1)}
                        >
                            Load More
                        </Button>
                    </div>
                )}
            </div>

            {/* Brand Detail Sheet */}
            <BrandDetailSheet
                brand={selectedBrand}
                open={isDetailSheetOpen}
                onOpenChange={setIsDetailSheetOpen}
                onUpdate={handleBrandUpdate}
            />

            {/* New Brand Modal */}
            <NewBrandModal
                open={isNewBrandModalOpen}
                onOpenChange={setIsNewBrandModalOpen}
                onSuccess={handleBrandCreated}
            />

            {/* New Contact Modal */}
            <NewContactModal
                open={isNewContactModalOpen}
                onOpenChange={setIsNewContactModalOpen}
                onSuccess={handleContactCreated}
            />
        </>
    );
}
