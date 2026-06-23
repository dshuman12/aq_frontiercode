import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { CurrentDate } from "./_components/current-date";
import { DailyAttendance } from "./_components/daily-attendance";

export default function AttendancePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" asChild>
                    <Link href="/employees"><ChevronLeft /></Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Today's Attendance</h2>
                <div className="ml-auto text-muted-foreground">
                    
                    {/* Date moved to dynamic component or client component if needed, or just left out of static shell if it must match server time */}
                    <Suspense>
                    <CurrentDate />
                    </Suspense>
                </div>
            </div>

            <Suspense fallback={<AttendanceSkeleton />}>
                <DailyAttendance />
            </Suspense>
        </div>
    );
}

function AttendanceSkeleton() {
    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
