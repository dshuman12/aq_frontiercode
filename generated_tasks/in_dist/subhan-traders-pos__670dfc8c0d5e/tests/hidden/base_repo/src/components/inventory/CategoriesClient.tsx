'use client';

import { CategoryForm, DeleteCategoryButton, EditCategoryButton } from "@/components/inventory/CategoryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOfflineData, useOnlineStatus } from "@/hooks/use-offline-data";
import { getAllCategories } from "@/offline/offline-service";
import { CloudOff, RefreshCw } from "lucide-react";

interface Category {
    id: string;
    name: string;
}

// Server fetcher
async function fetchCategoriesFromServer(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
    }));
}

// Offline fetcher
async function fetchCategoriesOffline(): Promise<Category[]> {
    const categories = await getAllCategories();
    return categories.map(c => ({
        id: c.id,
        name: c.name,
    }));
}

export function CategoriesClient() {
    const isOnline = useOnlineStatus();
    
    const { data: categories, isLoading, isOffline, refetch } = useOfflineData(
        fetchCategoriesFromServer,
        fetchCategoriesOffline,
        { refreshOnOnline: true, staleTime: 120000, cacheKey: 'categories-list' }
    );

    const categoryList = categories || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
                    {isOffline && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <CloudOff className="h-3 w-3 mr-1" />
                            Offline Data
                        </Badge>
                    )}
                </div>
                <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CategoryForm onSuccess={refetch} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoryList.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">No categories found.</TableCell>
                                    </TableRow>
                                )}
                                {categoryList.map((cat) => (
                                    <TableRow key={cat.id}>
                                        <TableCell>{cat.name}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <EditCategoryButton
                                                    categoryId={cat.id}
                                                    categoryName={cat.name}
                                                    onSuccess={refetch}
                                                />
                                                <DeleteCategoryButton categoryId={cat.id} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
