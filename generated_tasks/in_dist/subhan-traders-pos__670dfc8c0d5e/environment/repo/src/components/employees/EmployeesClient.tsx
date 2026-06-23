'use client';

import { AddEmployeeDialog } from "@/components/employees/EmployeeForm";
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
import { getAllEmployees } from "@/offline/offline-service";
import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
    id: string;
    name: string;
    cnic: string;
    phone: string | null;
    salary: number;
    isActive: boolean;
}

// Server fetcher
async function fetchEmployeesFromServer(): Promise<Employee[]> {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Failed to fetch employees');
    const data = await res.json();
    return data.map((e: any) => ({
        id: e.id,
        name: e.name,
        cnic: e.cnic,
        phone: e.phone,
        salary: parseFloat(e.salary || '0'),
        isActive: e.isActive,
    }));
}

// Offline fetcher
async function fetchEmployeesOffline(): Promise<Employee[]> {
    const employees = await getAllEmployees();
    return employees.map(e => ({
        id: e.id,
        name: e.name,
        cnic: e.cnic,
        phone: e.phone,
        salary: e.salary,
        isActive: e.isActive,
    }));
}

function EmployeesSkeletonRow() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
    );
}

export function EmployeesClient() {
    const isOnline = useOnlineStatus();
    const t = useTranslations("employees");
    const tc = useTranslations("common");
    
    const { data: employees, isLoading, isOffline, refetch } = useOfflineData(
        fetchEmployeesFromServer,
        fetchEmployeesOffline,
        { refreshOnOnline: true, staleTime: 60000, cacheKey: 'employees-list' }
    );

    const employeeList = employees || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
                    {isOffline && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <CloudOff className="h-3 w-3 mr-1" />
                            {tc("offlineData")}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/employees/attendance">{tc("viewAttendance")}</Link>
                    </Button>
                    <AddEmployeeDialog />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{tc("name")}</TableHead>
                            <TableHead>{tc("cnic")}</TableHead>
                            <TableHead>{tc("phone")}</TableHead>
                            <TableHead>{t("salary")}</TableHead>
                            <TableHead>{tc("status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => <EmployeesSkeletonRow key={i} />)
                        ) : employeeList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">{t("noEmployeesFound")}</TableCell>
                            </TableRow>
                        ) : (
                            employeeList.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell>{emp.cnic}</TableCell>
                                    <TableCell>{emp.phone || '-'}</TableCell>
                                    <TableCell>Rs. {emp.salary}</TableCell>
                                    <TableCell>{emp.isActive ? tc("active") : tc("inactive")}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
