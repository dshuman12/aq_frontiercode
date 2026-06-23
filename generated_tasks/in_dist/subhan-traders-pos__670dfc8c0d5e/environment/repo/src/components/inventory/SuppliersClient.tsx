'use client';

import { AddSupplierDialog } from "@/components/inventory/SupplierForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOfflineData, useOnlineStatus } from "@/hooks/use-offline-data";
import { getAllSuppliers } from "@/offline/offline-service";
import { CloudOff, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Supplier {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    remainingAmount: number;
}

// Server fetcher
async function fetchSuppliersFromServer(): Promise<Supplier[]> {
    const res = await fetch('/api/suppliers');
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    const data = await res.json();
    return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        address: s.address,
        remainingAmount: parseFloat(s.remainingAmount || '0'),
    }));
}

// Offline fetcher
async function fetchSuppliersOffline(): Promise<Supplier[]> {
    const suppliers = await getAllSuppliers();
    return suppliers.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        address: s.address,
        remainingAmount: s.remainingAmount,
    }));
}

function SuppliersSkeletonRow() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell className="text-center">
                <Skeleton className="h-8 w-16 mx-auto rounded-md" />
            </TableCell>
        </TableRow>
    );
}

export function SuppliersClient() {
    const isOnline = useOnlineStatus();
    
    const { data: suppliers, isLoading, isOffline, refetch } = useOfflineData(
        fetchSuppliersFromServer,
        fetchSuppliersOffline,
        { refreshOnOnline: true, staleTime: 60000, cacheKey: 'suppliers-list' }
    );

    const supplierList = suppliers || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
                    {isOffline && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <CloudOff className="h-3 w-3 mr-1" />
                            Offline Data
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <AddSupplierDialog />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Balance Due</TableHead>
                            <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(6)].map((_, i) => <SuppliersSkeletonRow key={i} />)
                        ) : supplierList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No suppliers found.</TableCell>
                            </TableRow>
                        ) : (
                            supplierList.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.phone}</TableCell>
                                    <TableCell>{supplier.address || '-'}</TableCell>
                                    <TableCell className={supplier.remainingAmount > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                        Rs. {supplier.remainingAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/inventory/suppliers/${supplier.id}`}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
