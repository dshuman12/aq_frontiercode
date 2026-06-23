'use server';

import { db } from "@/db";
import { attendance, employees } from "@/db/schema";
import { endOfDay, startOfDay } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const EmployeeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    cnic: z.string().min(1, "CNIC is required"),
    phone: z.string().optional(),
    salary: z.coerce.number().min(0),
});

const AttendanceSchema = z.object({
    employeeId: z.string().min(1),
    status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']),
    date: z.string().optional(), // ISO string
});

export async function createEmployee(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    if (rawData.phone === "") delete rawData.phone;

    const validatedFields = EmployeeSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    try {
        await db.insert(employees).values({
            ...validatedFields.data,
            salary: validatedFields.data.salary.toString(),
            isActive: true
        });
        revalidateTag('employees', 'max');
        return { success: true };
    } catch (error: any) {
        if (error.code === '23505') {
            return { error: "Employee with this CNIC already exists" };
        }
        return { error: "Failed to create employee" };
    }
}

export async function markAttendance(data: any) {
    const validated = AttendanceSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid data" };

    const { employeeId, status, date } = validated.data;
    const attendanceDate = date ? new Date(date) : new Date();

    try {
        // Check if attendance already exists for this day
        const existing = await db.select().from(attendance).where(
            and(
                eq(attendance.employeeId, employeeId),
                gte(attendance.date, startOfDay(attendanceDate)),
                lte(attendance.date, endOfDay(attendanceDate))
            )
        );

        if (existing.length > 0) {
            // Update
            await db.update(attendance)
                .set({ status })
                .where(eq(attendance.id, existing[0].id));
        } else {
            // Insert
            await db.insert(attendance).values({
                employeeId,
                status,
                date: attendanceDate,
                payment: 'UNPAID' // Default
            });
        }
        
        revalidateTag('employees', 'max');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to mark attendance" };
    }
}
