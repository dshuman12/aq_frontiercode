"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { markAttendance } from "@/lib/actions/employee.actions";
import { useState } from "react";
import { toast } from "sonner";

export function AttendanceMarker({ employeeId, currentStatus, date }: { employeeId: string, currentStatus?: string, date: string }) {
    const [status, setStatus] = useState(currentStatus || "ABSENT"); // Default logic if null, handled by parent ideally

    async function handleChange(val: string) {
        setStatus(val);
        const result = await markAttendance({
            employeeId,
            status: val,
            date
        });
        
        if (result.success) {
            toast.success("Attendance updated");
        } else {
            toast.error("Failed to update");
        }
    }

    return (
        <Select value={status} onValueChange={handleChange}>
            <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Mark" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LEAVE">Leave</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
            </SelectContent>
        </Select>
    );
}
